"""Home graduation and cross-module visual regression, isolated in-memory data.
No network or real user profile is accessed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
widths=(320,360,390,430,650,768,1024,1280,1440,1920)
presets=('ocean','sage','paper','graphite','glacier','lavender')
checks=0

def ok(v,msg):
 global checks
 checks+=1
 assert v,msg

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in widths:
  pg=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  errors=[];pg.on('pageerror',lambda exc:errors.append(str(exc)))
  pg.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.evaluate('''()=>{window.__mem=new Map([['scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',layoutScheme:'balanced'},profile:{name:'研究者',degree:'博士研究生',major:'材料科学与工程',cohort:'2025级',researchDirection:'复杂材料耐久性研究与机理分析',graduationDate:'2026-12-30'},tasks:[{id:'t1',title:'研究任务',status:'待开始'}]})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)||null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.confirm=()=>true}''')
  for file in ('styles.css','research-suite.css'):pg.add_style_tag(path=str(R/file))
  for file in ('pdf-intelligence.js','research-suite.js','app.js'):pg.add_script_tag(path=str(R/file))
  source=pg.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for preset in presets:
   for mode,layout in (('standard','balanced'),('eye','balanced'),('standard','night')):
    data=pg.evaluate('''v=>{
      Object.assign(document.documentElement.dataset,{sfPreset:v.p,sfMode:v.m,sfLayout:v.l});
      let hero=document.querySelector('.dash-hero'),card=document.querySelector('.sf37-graduation'),cta=card?.querySelector('.sf14-grad-edit'),metric=card?.querySelector('#sf14-days'),footer=card?.querySelector('.sf37-grad-footer'),head=card?.querySelector('.sf37-grad-head');
      const r=e=>e.getBoundingClientRect();const a=r(card),b=r(cta),c=r(hero),d=r(metric),f=r(footer),h=r(head);
      return {overflow:document.documentElement.scrollWidth>innerWidth+2,inside:b.left>=a.left-1&&b.right<=a.right+1&&b.top>=a.top-1&&b.bottom<=a.bottom+1,
       insideHero:a.left>=c.left-1&&a.right<=c.right+1,stacked:f.top>=h.bottom,readable:parseFloat(getComputedStyle(metric).fontSize)>=33,ctaWidth:b.width,missing:!metric.textContent.trim(),width:a.width,contrastColor:getComputedStyle(metric).color};
    }''',{'p':preset,'m':mode,'l':layout})
    ok(not data['overflow'],f'{width}/{preset}/{mode}: horizontal overflow')
    ok(data['inside'],f'{width}/{preset}/{mode}: CTA outside countdown: {data}')
    ok(data['insideHero'],f'{width}/{preset}/{mode}: countdown outside hero')
    ok(data['stacked'],f'{width}/{preset}/{mode}: countdown caption/foot collide')
    ok(data['readable'] and not data['missing'],f'{width}/{preset}/{mode}: countdown metric')
    ok(data['ctaWidth']>=65,f'{width}/{preset}/{mode}: date action too narrow')
  pg.evaluate("Object.assign(document.documentElement.dataset,{sfPreset:'ocean',sfMode:'standard',sfLayout:'balanced'})")
  for page in ('home','tasks','advisor','literature','notes','simulations','experiments','papers','statistics','files','settings'):
   pg.locator(f'nav [data-nav="{page}"]').first.dispatch_event('click')
   ok(pg.locator('#sf-main-content').count()==1,f'{width}/{page}: main missing')
   ok(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width}/{page}: route overflows')
  pg.locator('[data-nav="home"]').first.dispatch_event('click')
  pg.locator('.sf37-grad-footer button[data-nav="settings"]').dispatch_event('click')
  ok(pg.locator('#appearanceForm').count()==1,f'{width}: graduation edit does not navigate')
  ok(pg.evaluate("localStorage.getItem('scholarflow_v1_data')")==source,f'{width}: visual nav mutated data')
  ok(not errors,f'{width}: uncaught JS errors {errors}')
  pg.close()
 browser.close()
print('PASS',checks,'responsive graduation and cross-page assertions')
