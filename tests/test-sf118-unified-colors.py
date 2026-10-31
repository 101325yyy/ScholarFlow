from pathlib import Path
from playwright.sync_api import sync_playwright
import json,collections
R=Path(__file__).resolve().parents[1]
WIDTHS=[360,390,768,1280,1920]
PRESETS=['ocean','sage','paper','graphite','glacier','lavender']
MODES=[('balanced','standard'),('balanced','eye'),('night','standard')]
CHECKS=0;FAILED=[]
SELECTORS=['.sf14-graduation.sf37-graduation','.hero-achievement.hero-outcomes.sf13-outcomes','.sf36-profile-row>div','.hero-outcome-stat','.sf13-profile-link','.sf14-grad-edit','.hero-outcomes>button']
def check(ok,desc):
 global CHECKS
 CHECKS+=1
 if not ok:FAILED.append(desc)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in WIDTHS:
  page=b.new_page(viewport={'width':width,'height':880},reduced_motion='reduce')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{window.__mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)||null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',colorMode:'standard',layoutScheme:'balanced'},profile:{name:'示例用户',degree:'博士研究生',major:'力学',cohort:'2025级',researchDirection:'复合材料XX',graduationDate:'2026-12-30'},papers:[{id:'p',title:'一篇论文',category:'发表论文'}]}))}''')
  page.add_style_tag(path=str(R/'styles.css'))
  page.add_script_tag(path=str(R/'pdf-intelligence.js'))
  page.add_script_tag(path=str(R/'app.js'))
  raw=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for preset in PRESETS:
   for layout,mode in MODES:
    info=page.evaluate('''({preset,layout,mode,selectors})=>{const d=document.documentElement.dataset;d.sfPreset=preset;d.sfLayout=layout;d.sfMode=mode;const a=selectors.map(s=>{const e=document.querySelector('.dash-hero '+s);if(!e)return null;const cs=getComputedStyle(e);const rect=e.getBoundingClientRect();return {width:cs.borderTopWidth,color:cs.borderTopColor,background:cs.backgroundColor,box:{left:rect.left,right:rect.right},focus:cs.outlineWidth}});return {a,overflow:document.documentElement.scrollWidth>innerWidth+2}}''',{'preset':preset,'layout':layout,'mode':mode,'selectors':SELECTORS})
    tag=f'{width}/{preset}/{layout}/{mode}'
    check(not info['overflow'],tag+' viewport overflow')
    for i,item in enumerate(info['a']):
     check(item is not None,tag+' missing '+SELECTORS[i]);
     if item is None:continue
     check(item['width']=='1px',tag+' '+SELECTORS[i]+' border='+item['width'])
     check(item['box']['left']>=-2 and item['box']['right']<=width+2,tag+' '+SELECTORS[i]+' offscreen')
    a=info['a']
    if all(x for x in a):
     check(a[0]['color']==a[1]['color'],tag+' hero panel stroke mismatch')
     check(a[2]['color']==a[3]['color'],tag+' inner stroke mismatch')
     check(a[4]['color']==a[5]['color']==a[6]['color'],tag+' action stroke mismatch')
  check(not errors,f'{width} js errors {errors}')
  check(page.evaluate("localStorage.getItem('scholarflow_v1_data')")==raw,f'{width} no data changes from CSS')
  page.locator('.sf14-grad-edit').dispatch_event('click')
  check(page.locator('.settings-intro').count()>0,f'{width} countdown edit navigates')
  page.close()
 b.close()
print('ASSERTIONS',CHECKS,'FAILED',len(FAILED))
for i in FAILED[:35]:print('FAIL',i)
if FAILED:raise SystemExit(1)
