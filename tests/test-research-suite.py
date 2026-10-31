"""ScholarFlow 2026.11.3 plan/PDF/PWA acceptance. No historic knowledge/search screens."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
N=0

def ck(ok, msg):
 global N
 assert ok,msg
 N+=1
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,360,390,430,768,1024,1440):
  p=b.new_page(viewport={'width':width,'height':850})
  errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>')
  p.evaluate('''() => {window.__store=new Map([['scholarflow_v1_data',JSON.stringify({tasks:[],literature:[{id:'lit01',title:'研究方法'}],knowledgeLinks:[{id:'old'}],settings:{}})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});window.confirm=()=>true;}''')
  for f in ('styles.css','research-suite.css'):p.add_style_tag(path=str(ROOT/f))
  for f in ('pdf-intelligence.js','research-suite.js','app.js'):p.add_script_tag(path=str(ROOT/f))
  ck(p.locator('.suite-week-overview').count()==1,f'{width} compact home overview')
  ck(p.locator('.suite-nav').count()==1,f'{width} only weekly planner added')
  ck(p.locator('[data-suite-route=knowledge],[data-suite-route=reading],[data-suite-route=search-all]').count()==0,f'{width} retired pages absent')
  ck('研究效率' not in p.locator('.sidebar').inner_text(),f'{width} removed old nav heading')
  ck(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width} home overflow')
  p.locator('[data-suite-route="planner"]').first.dispatch_event('click')
  ck(p.locator('#suite-plan-form').count()==1,f'{width} planner available')
  ck(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width} planner overflow')
  if width==390:
   p.locator('#suite-plan-form [name=title]').fill('论文返修准备')
   p.locator('#suite-plan-form button[type=submit]').dispatch_event('click')
   ck(len(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).weeklyPlans'))==1,'plan persisted')
   ck(len(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).knowledgeLinks'))==1,'old knowledge links preserved for backup, no user-facing UI')
   p.locator('[data-suite-plan-check]').first.check()
   ck(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).weeklyPlans[0].done'),'checkbox persists')
   p.locator('[data-suite-plan-delete]').first.dispatch_event('click')
   ck(len(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).weeklyPlans'))==0,'delete persists')
   p.locator('[data-nav="literature"]').first.dispatch_event('click')
   ck(p.evaluate('typeof window.SFResearchSuite.pdfSidecarHtml')=='function','PDF annotation sidecar remains available')
  ck(not errors,f'{width} JS errors: {errors}')
  p.close()
 b.close()
site=ROOT/'site'
for f in ('index.html','app.js','styles.css','research-suite.js','research-suite.css','sw.js','pwa.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png'):
 ck((site/f).is_file(),f'site asset {f}')
manifest=json.loads((site/'manifest.webmanifest').read_text())
ck(manifest.get('display')=='standalone','installable PWA')
sw=(site/'sw.js').read_text()
ck("req.method!=='GET'" in sw,'no write intercept')
ck("u.origin!==self.location.origin" in sw,'same origin cache only')
print('PASS',N,'research suite assertions')
