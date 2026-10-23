"""Current-release local loopback HTTP and API security test; no user data touched.
Usage: python tests/test-v110-http.py [--binary /path/to/ScholarFlow-1.1.0-Linux-x64]
"""
import argparse, subprocess, time, os, signal, sys, json, hashlib
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError

args=argparse.ArgumentParser()
args.add_argument('--binary',default='')
opts=args.parse_args()
root=Path(__file__).resolve().parents[1]
cmd=[opts.binary,'--no-open'] if opts.binary else [sys.executable,str(root/'local_server.py')]
process=subprocess.Popen(cmd,cwd=str(root),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
checks=0
try:
 for _ in range(90):
  time.sleep(.1)
  try:
   with urlopen('http://127.0.0.1:8765/',timeout=.3) as res:
    if res.status==200:break
  except Exception:continue
 else:raise RuntimeError('No server on 127.0.0.1:8765. Please close another ScholarFlow process.')
 for name in ('index.html','app.js','styles.css','pdf-intelligence.js','assets/graduate-bear.svg'):
  with urlopen('http://127.0.0.1:8765/'+name) as response:
   assert response.status==200
   assert hashlib.sha256(response.read()).digest()==hashlib.sha256((root/name).read_bytes()).digest()
   assert response.headers['X-Content-Type-Options']=='nosniff'
  checks+=1
 for path in ('README.md','package.json','V3-MANIFEST.json','no-such.pdf'):
  try: urlopen('http://127.0.0.1:8765/'+path);raise AssertionError('Protected path exposed '+path)
  except HTTPError as err:assert err.code==404
  checks+=1
 with urlopen('http://127.0.0.1:8765/api/translation-health') as res:
  obj=json.loads(res.read());assert type(obj.get('ready')) is bool
  checks+=1
 bad=Request('http://127.0.0.1:8765/api/reveal-path',data=b'{"path":"/"}',headers={'Content-Type':'application/json','X-ScholarFlow-Token':'invalid'},method='POST')
 try:urlopen(bad);raise AssertionError('No-token file reveal accepted')
 except HTTPError as err:assert err.code==403
 checks+=1
 badType=Request('http://127.0.0.1:8765/api/translate',data=b'{"q":"Research summary"}',headers={'Content-Type':'text/plain'},method='POST')
 try:urlopen(badType);raise AssertionError('Non-JSON translation accepted')
 except HTTPError as err:assert err.code==415
 checks+=1
 wrongOrigin=Request('http://127.0.0.1:8765/api/translation-health',headers={'Origin':'https://evil.example'})
 try:urlopen(wrongOrigin);raise AssertionError('Cross-origin request was accepted')
 except HTTPError as err:assert err.code==403
 checks+=1
 print('PASS',checks,'HTTP/API security checks', 'compiled binary' if opts.binary else 'Python local server')
finally:
 try:os.killpg(process.pid,signal.SIGTERM)
 except ProcessLookupError:pass
 try:process.wait(timeout=3)
 except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL)
