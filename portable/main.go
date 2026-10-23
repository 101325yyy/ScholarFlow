// ScholarFlow 1.1.0 portable loopback web launcher.
// Build-time embeds application assets: end user receives executable, not standalone sources.
// Embedded browser JS remains inherently inspectable; this is not encryption or DRM.
package main

import (
 "bytes"
 "context"
 "crypto/rand"
 "crypto/subtle"
 "embed"
 "encoding/base64"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "io/fs"
 "log"
 "net"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "strings"
 "time"
)

//go:embed static
var embedded embed.FS
const host = "127.0.0.1:8765"
var token string
var files fs.FS
var pythonExecutable = ""

func makeToken() string { b:=make([]byte,32); if _,err:=rand.Read(b);err!=nil{log.Fatal(err)};return base64.RawURLEncoding.EncodeToString(b) }
func jsonReply(w http.ResponseWriter,status int,body any){ w.Header().Set("Content-Type","application/json; charset=utf-8");w.Header().Set("Cache-Control","no-store");w.WriteHeader(status);_ = json.NewEncoder(w).Encode(body) }
func errorReply(w http.ResponseWriter,status int,message string){jsonReply(w,status,map[string]string{"error":message})}
func sameOrigin(r *http.Request) bool {
 if r.Host!="127.0.0.1:8765" && r.Host!="localhost:8765" { return false }
 origin:=r.Header.Get("Origin")
 return origin=="" || origin=="http://127.0.0.1:8765" || origin=="http://localhost:8765"
}
func python() string {
 if pythonExecutable!="" {return pythonExecutable}
 for _,candidate:=range []string{"python3","python"}{if _,err:=exec.LookPath(candidate);err==nil{pythonExecutable=candidate;return candidate}}
 return ""
}
const pythonCode=`import json,sys
req=json.load(sys.stdin)
try:
 import argostranslate.translate as tr
 langs={x.code:x for x in tr.get_installed_languages()}
 available='en' in langs and 'zh' in langs and bool(langs['en'].get_translation(langs['zh']))
 if req.get('health'):
  print(json.dumps({'ready':available,'engine':'Argos Translate (offline)'}))
 elif not available:
  print(json.dumps({'error':'离线语言包未安装，请在源码版中使用 setup-local-translation 安装'}))
 else:
  out=tr.translate(req['q'],'en','zh')
  print(json.dumps({'translatedText':out,'engine':'offline-argos'},ensure_ascii=False))
except Exception as e:
 print(json.dumps({'ready':False} if req.get('health') else {'error':'本机离线翻译不可用'},ensure_ascii=False))`
func runTranslation(query string, health bool)(map[string]any,error){
 py:=python();if py=="" {return map[string]any{"ready":false,"error":"目标电脑未安装 Python/Argos 离线翻译"},nil}
 ctx,cancel:=context.WithTimeout(context.Background(),60*time.Second);defer cancel()
 cmd:=exec.CommandContext(ctx,py,"-c",pythonCode)
 raw,_:=json.Marshal(map[string]any{"q":query,"health":health})
 cmd.Stdin=bytes.NewReader(raw)
 out,err:=cmd.Output()
 if err!=nil{return nil,err}
 var obj map[string]any
 if err=json.Unmarshal(out,&obj);err!=nil{return nil,err};return obj,nil
}
func revealPath(target string)error{
 if target=="" || len(target)>2048 || strings.ContainsRune(target,0) || !filepath.IsAbs(target) {return errors.New("必须提供有效的绝对路径")}
 info,err:=os.Stat(target);if err!=nil{return errors.New("路径不存在")}
 var cmd *exec.Cmd
 switch runtime.GOOS {
 case "windows":cmd=exec.Command("explorer.exe","/select,",target)
 case "darwin":cmd=exec.Command("open","-R",target)
 default: if info.IsDir(){cmd=exec.Command("xdg-open",target)} else {cmd=exec.Command("xdg-open",filepath.Dir(target))}
 }
 return cmd.Start()
}
func handle(w http.ResponseWriter,r *http.Request){
 w.Header().Set("X-Content-Type-Options","nosniff")
 w.Header().Set("X-Frame-Options","DENY")
 w.Header().Set("Referrer-Policy","no-referrer")
 w.Header().Set("Cache-Control","no-store")
 p:=r.URL.Path
 if strings.HasPrefix(p,"/api/") {
  if !sameOrigin(r){errorReply(w,403,"不允许跨站访问");return}
  switch p {
  case "/api/file-reveal-token":
   if r.Method!="GET" {errorReply(w,405,"method not allowed");return}
   jsonReply(w,200,map[string]string{"token":token});return
  case "/api/reveal-path":
   if r.Method!="POST" {errorReply(w,405,"method not allowed");return}
   if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-ScholarFlow-Token")),[]byte(token))!=1 {errorReply(w,403,"文件操作凭证无效");return}
   if !strings.HasPrefix(r.Header.Get("Content-Type"),"application/json"){errorReply(w,415,"JSON required");return}
   var body struct{Path string `json:"path"`}
   if err:=json.NewDecoder(io.LimitReader(r.Body,4097)).Decode(&body);err!=nil {errorReply(w,400,"JSON 无效");return}
   if err:=revealPath(body.Path);err!=nil{errorReply(w,400,err.Error());return}
   jsonReply(w,200,map[string]any{"ok":true});return
  case "/api/translation-health":
   if r.Method!="GET"{errorReply(w,405,"method not allowed");return}
   obj,err:=runTranslation("",true);if err!=nil{jsonReply(w,200,map[string]any{"ready":false,"engine":"offline-argos"});return}
   jsonReply(w,200,obj);return
  case "/api/translate":
   if r.Method!="POST"{errorReply(w,405,"method not allowed");return}
   if !strings.HasPrefix(r.Header.Get("Content-Type"),"application/json"){errorReply(w,415,"JSON required");return}
   var body struct {Q string `json:"q"`;Source string `json:"source"`;Target string `json:"target"`}
   if err:=json.NewDecoder(io.LimitReader(r.Body,30001)).Decode(&body);err!=nil{errorReply(w,400,"JSON 无效");return}
   if strings.TrimSpace(body.Q)==""||len([]rune(body.Q))>16000 || body.Source!="en"||body.Target!="zh"{errorReply(w,400,"仅接受有效英中摘要");return}
   obj,err:=runTranslation(body.Q,false);if err!=nil{errorReply(w,503,"离线翻译环境不可用");return}
   if _,exists:=obj["error"];exists{jsonReply(w,503,obj);return}
   jsonReply(w,200,obj);return
  default:errorReply(w,404,"Not found");return
  }
 }
 if r.Method!="GET" && r.Method!="HEAD" {http.Error(w,"Method not allowed",405);return}
 if p=="/"{p="/index.html"}
 // Strict route allowlist means backup files, private PDFs, arbitrary paths not exposed.
 allowed:=map[string]string{"/index.html":"text/html; charset=utf-8","/app.js":"text/javascript; charset=utf-8","/styles.css":"text/css; charset=utf-8","/pdf-intelligence.js":"text/javascript; charset=utf-8","/assets/graduate-bear.svg":"image/svg+xml"}
 typ,ok:=allowed[p];if !ok{http.NotFound(w,r);return}
 data,err:=fs.ReadFile(files,strings.TrimPrefix(p,"/"));if err!=nil{http.NotFound(w,r);return}
 w.Header().Set("Content-Type",typ)
 if r.Method=="HEAD"{w.Header().Set("Content-Length",fmt.Sprint(len(data)));return}
 _,_=w.Write(data)
}
func openBrowser(){url:="http://"+host; var cmd *exec.Cmd
 switch runtime.GOOS {case "windows":cmd=exec.Command("rundll32.exe","url.dll,FileProtocolHandler",url)
 case "darwin":cmd=exec.Command("open",url)
 default:cmd=exec.Command("xdg-open",url)}
 _=cmd.Start()
}
func main(){var err error; files,err=fs.Sub(embedded,"static");if err!=nil{log.Fatal(err)}
 token=makeToken()
 listener,err:=net.Listen("tcp",host)
 if err!=nil{fmt.Fprintln(os.Stderr,"启动失败：端口 8765 已被占用。请先关闭旧版 ScholarFlow 本地服务，勿变更端口以免浏览器数据不可见。",err);os.Exit(1)}
 defer listener.Close()
 fmt.Println("ScholarFlow 1.1.0 启动成功：http://"+host)
 fmt.Println("仅监听 127.0.0.1；数据保存在当前浏览器，与其他电脑不自动同步。按 Ctrl+C 退出。")
 server:=&http.Server{Handler:http.HandlerFunc(handle),ReadHeaderTimeout:5*time.Second,ReadTimeout:60*time.Second,WriteTimeout:120*time.Second,IdleTimeout:60*time.Second}
 if len(os.Args)<2 || os.Args[1]!="--no-open"{go func(){time.Sleep(350*time.Millisecond);openBrowser()}()}
 if err:=server.Serve(listener);err!=nil&&err!=http.ErrServerClosed{log.Fatal(err)}
}
