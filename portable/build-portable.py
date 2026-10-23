"""Build 1.1.0 Windows x64 standalone browser launcher: no external Go packages needed."""
from pathlib import Path
import subprocess,shutil,os
root=Path(__file__).resolve().parents[1]
pkg=root/'portable'; static=pkg/'static'; static.mkdir(exist_ok=True)
for name in ('index.html','app.js','styles.css','pdf-intelligence.js'):shutil.copyfile(root/name,static/name)
shutil.copytree(root/'assets',static/'assets',dirs_exist_ok=True)
out=root/'release';out.mkdir(exist_ok=True)
for system,arch,name in [('windows','amd64','ScholarFlow-Windows-x64.exe')]:
 env={**os.environ,'GOOS':system,'GOARCH':arch,'CGO_ENABLED':'0'}
 subprocess.run(['go','build','-trimpath','-ldflags=-s -w','-o',str(out/name),'.'],cwd=pkg,check=True,env=env)
print('Built into',out)
