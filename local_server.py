"""Loopback-only ScholarFlow server with optional Argos English->Chinese translation.
Run `python setup_local_translation.py` once to install the model, then `python local_server.py`.
No remote translation endpoints are contacted by this service.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote
import json
import threading
import os
import sys
import hmac
import secrets
import subprocess

ROOT = Path(__file__).resolve().parent
HOST = '127.0.0.1'
PORT = int(os.environ.get('SCHOLARFLOW_PORT','8765'))
_TRANSLATE_LOCK = threading.Lock()
_REVEAL_TOKEN = secrets.token_urlsafe(40)

def reveal_path(value):
    """Open only the OS file manager: reveal a file or open its folder, never execute it."""
    if not isinstance(value,str) or not value or len(value)>2048 or "\x00" in value:
        raise ValueError("路径不能为空或过长")
    # Convert to absolute native OS path and demand that it already exists.
    target=Path(value).expanduser()
    if not target.is_absolute():
        raise ValueError("必须提供绝对文件路径")
    if not target.exists():
        raise FileNotFoundError("目标文件或文件夹不存在")
    if os.name=="nt":
        # explorer.exe selects files or folders, without executing their content.
        subprocess.Popen(["explorer.exe", "/select,", str(target)])
    elif sys.platform=="darwin":
        subprocess.Popen(["open", "-R", str(target)])
    else:
        subprocess.Popen(["xdg-open", str(target if target.is_dir() else target.parent)])
    return True


def model_ready():
    try:
        import argostranslate.translate as translate
        languages={lang.code:lang for lang in translate.get_installed_languages()}
        return 'en' in languages and 'zh' in languages and bool(languages['en'].get_translation(languages['zh']))
    except (ImportError,ValueError,Exception):
        return False

def translate_text(text):
    try:
        import argostranslate.translate as translate
    except ImportError as exc:
        raise RuntimeError('缺少 argostranslate，请先运行 setup-local-translation.bat') from exc
    if not model_ready():
        raise RuntimeError('缺少英语→中文离线模型，请先运行 setup-local-translation.bat')
    # Python offline models can be sensitive to concurrent initialization.
    with _TRANSLATE_LOCK:
        return translate.translate(text,'en','zh')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT),**kwargs)

    def _allowed_origin(self):
        origin=self.headers.get('Origin','')
        host=self.headers.get('Host','')
        # Host + Origin checks limit cross-site calls to this loopback helper.
        return host in {f'{HOST}:{PORT}',f'localhost:{PORT}'} and (not origin or origin in {f'http://{HOST}:{PORT}',f'http://localhost:{PORT}'})

    def _json(self,body,code=200):
        raw=json.dumps(body,ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Access-Control-Allow-Origin',f'http://{HOST}:{PORT}')
        self.end_headers()
        self.wfile.write(raw)

    def _is_runtime_asset(self):
        clean=unquote(urlparse(self.path).path).lstrip('/')
        return clean in {'','index.html','styles.css','research-suite.css','app.js','research-suite.js','pwa.js','sw.js','manifest.webmanifest','pdf-intelligence.js','assets/graduate-bear.svg','assets/icon-192.png','assets/icon-512.png'}

    def do_HEAD(self):
        if not self._is_runtime_asset():
            self.send_error(404,'Not a public runtime asset');return
        return super().do_HEAD()

    def do_GET(self):
        if urlparse(self.path).path == '/api/file-reveal-token':
            if not self._allowed_origin(): return self._json({'error':'不允许跨站访问'},403)
            return self._json({'token':_REVEAL_TOKEN})
        if urlparse(self.path).path == '/api/translation-health':
            if not self._allowed_origin(): return self._json({'error':'不允许跨站访问'},403)
            ready=model_ready()
            return self._json({'ready':ready,'engine':'Argos Translate (offline)','message':'就绪' if ready else '请运行 setup-local-translation.bat 安装模型'})
        # The local web server only needs five static runtime files. Never serve
        # project sources, backups, notebooks or private PDF files accidentally
        # placed in the installation directory.
        if not self._is_runtime_asset():
            self.send_error(404,'Not a public runtime asset');return
        return super().do_GET()

    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.send_header('Referrer-Policy','no-referrer')
        return super().end_headers()

    def do_OPTIONS(self):
        if urlparse(self.path).path!='/api/translate' or not self._allowed_origin():
            self.send_error(403);return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',f'http://{HOST}:{PORT}')
        self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path == '/api/reveal-path':
            if not self._allowed_origin():return self._json({'error':'不允许跨站访问'},403)
            if not hmac.compare_digest(self.headers.get('X-ScholarFlow-Token',''),_REVEAL_TOKEN):
                return self._json({'error':'无效或过期的文件操作凭证'},403)
            if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json':
                return self._json({'error':'仅接受 JSON 请求'},415)
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=4096:return self._json({'error':'请求过大'},413)
                body=json.loads(self.rfile.read(size))
                reveal_path(body.get('path'))
                return self._json({'ok':True})
            except (ValueError,TypeError,FileNotFoundError) as exc:
                return self._json({'error':str(exc)[:160]},400)
            except OSError as exc:return self._json({'error':'系统文件管理器无法打开该位置'},503)
        if urlparse(self.path).path!='/api/translate':return self._json({'error':'not found'},404)
        if not self._allowed_origin():return self._json({'error':'不允许跨站访问'},403)
        if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json':return self._json({'error':'仅接受 JSON 请求'},415)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>30000:return self._json({'error':'摘要不能超过 30KB'},413)
            body=json.loads(self.rfile.read(size))
            q=body.get('q')
            if not isinstance(q,str) or not q.strip() or len(q)>16000:return self._json({'error':'请提供有效摘要'},400)
            if body.get('source','en')!='en' or body.get('target','zh')!='zh':return self._json({'error':'仅支持英译中'},400)
            translated=translate_text(q.strip())
            if not isinstance(translated,str) or not translated.strip():return self._json({'error':'离线翻译未返回文本'},502)
            return self._json({'translatedText':translated,'engine':'offline-argos'})
        except (ValueError,UnicodeDecodeError,json.JSONDecodeError):return self._json({'error':'JSON 请求格式错误'},400)
        except Exception as exc:return self._json({'error':str(exc)[:180]},503)

if __name__=='__main__':
    print(f'ScholarFlow 1.1.0 本地服务: http://{HOST}:{PORT}')
    print('离线翻译:', '准备就绪' if model_ready() else '未安装语言包，可运行 setup-local-translation.bat')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
