"""72 repeatable independent visual-state checks, 6 viewports x 6 palettes x 2 modes.
Uses browser-only test data. Every scenario restores its page to 'home' and tests 11 routes.
No live account, no PDF uploads, no remote network access.
"""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
ALL_WIDTHS=(320,360,390,768,1280,1920)
WIDTHS=ALL_WIDTHS if len(sys.argv)==1 else tuple(int(v) for v in sys.argv[1:])
PRESETS=('ocean','sage','paper','graphite','glacier','lavender')
MODES=('standard','eye')
ROUTES=('home','tasks','advisor','literature','notes','simulations','experiments','papers','statistics','files','settings')
SCENARIOS=0;ASSERTIONS=0

def ck(value,desc):
    global ASSERTIONS
    ASSERTIONS+=1
    if not value: raise AssertionError(desc)

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in WIDTHS:
  pg=b.new_page(viewport={'width':width,'height':870},reduced_motion='reduce')
  errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.evaluate('''()=>{
   const mem=new Map();mem.set('scholarflow_v1_data',JSON.stringify({settings:{stylePreset:'ocean',layoutScheme:'balanced',workspaceName:'ScholarFlow QA'},profile:{name:'测试研究者',graduationDate:'2027-06-20'},tasks:[{id:'t1',title:'研究任务',status:'待开始'}],literature:[{id:'l1',title:'中文 English 文献'}],notes:[],papers:[],simulations:[],experiments:[]}));
   Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}});
   window.SCHOLARFLOW_CLOUD_CONFIG={};window.confirm=()=>true;
  }''')
  for css in ('styles.css','research-suite.css','online.css','cloud.css'):pg.add_style_tag(path=str(R/'site'/css))
  for js in ('pdf-intelligence.js','research-suite.js','app.js','cloud-sync.js'):pg.add_script_tag(path=str(R/'site'/js))
  original=pg.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for preset in PRESETS:
   for mode in MODES:
    tag=f'{width}/{preset}/{mode}'
    pg.evaluate('''({preset,mode})=>{const root=document.documentElement;root.dataset.sfPreset=preset;root.dataset.sfMode=mode;root.dataset.sfLayout='balanced'}''',{'preset':preset,'mode':mode})
    ck(pg.evaluate('document.querySelectorAll("nav [data-nav]").length')==11,tag+' nav count')
    ck(pg.evaluate('document.querySelectorAll(".sf-cloud-trigger").length')==1,tag+' dock count')
    ck(pg.evaluate('ScholarCloudStatus().configured')==False,tag+' local offline fallback')
    ck(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),tag+' base overflow')
    pg.locator('nav [data-nav="home"]').first.dispatch_event('click')
    ck(pg.evaluate('document.querySelector(".dash-hero")!==null'),tag+' hero exists')
    for route in ROUTES:
     pg.locator(f'nav [data-nav="{route}"]').first.dispatch_event('click')
     ck(pg.locator('#sf-main-content').count()==1,tag+'/'+route+' landmark')
     ck(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),tag+'/'+route+' viewport overflow')
    ck(pg.evaluate("localStorage.getItem('scholarflow_v1_data')")==original,tag+' research data unchanged')
    ck(not errs,tag+' JS errors '+repr(errs))
    SCENARIOS+=1
    if SCENARIOS%12==0: print('CHECKPOINT',SCENARIOS,'/',len(WIDTHS)*12,'ASSERTIONS',ASSERTIONS,flush=True)
  pg.close()
 b.close()
print('PASS',SCENARIOS,'visual interaction scenarios;',ASSERTIONS,'assertions')
