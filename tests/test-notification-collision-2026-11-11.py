"""Regression: real-app toast layout against cloud status, mobile bottom navigation and dialogs.
Run: python tests/test-notification-collision-2026-11-11.py
Uses no real account, external network, or persistent user profile.
"""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
WIDTHS=(320,360,390,430,650,651,768,1024,1440,1920)
PART=os.getenv('SF_TEST_PART','all')
if PART=='a': WIDTHS=WIDTHS[:5]
elif PART=='b': WIDTHS=WIDTHS[5:]
PRESETS=('ocean','sage','paper','graphite','glacier','lavender')
MODES=('standard','eye')
LAYOUTS=('balanced','night')
failures=[]
checks=0
rounds=0

def ck(v,msg):
 global checks
 checks+=1
 if not v: failures.append(msg)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in WIDTHS:
  pg=browser.new_page(viewport={'width':width,'height':750},reduced_motion='reduce')
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.evaluate("""() => {window.__store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,String(v)),removeItem:k=>window.__store.delete(k)}})}""")
  for f in ('styles.css','site/online.css','site/cloud.css','site/research-suite.css'):
   pg.add_style_tag(path=str(ROOT/f))
  for f in ('pdf-intelligence.js','site/research-suite.js','app.js','cloud-sync.js'):
   pg.add_script_tag(path=str(ROOT/f))
  ck(pg.locator('.sf-cloud-trigger').count()==1,f'{width}: cloud status button exists')
  ck(pg.locator('[data-action="sf-bear-note"]').count()==1,f'{width}: existing bear action preserved')
  pg.locator('.sf-cloud-trigger').evaluate('(e)=>e.textContent="自动同步已启用"')
  data_before=pg.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for preset in PRESETS:
   for mode in MODES:
    for layout in LAYOUTS:
     rounds+=1
     tag=f'{width}/{preset}/{mode}/{layout}'
     pg.evaluate('''({preset,mode,layout})=>{let x=document.documentElement;x.dataset.sfPreset=preset;x.dataset.sfMode=mode;x.dataset.sfLayout=layout;}''',dict(preset=preset,mode=mode,layout=layout))
     pg.locator('[data-action="sf-bear-note"]').first.dispatch_event('click')
     d=pg.evaluate('''() => {
       let a=document.querySelector('.sf-joy-toast'),b=document.querySelector('.sf-cloud-trigger'),bottom=document.querySelector('.suite-bottom-bar');
       if(!a||!b)return {missing:true};
       let t=a.getBoundingClientRect(),c=b.getBoundingClientRect(),n=bottom?.getBoundingClientRect();
       const overlap=(x,y)=>x&&y&&x.width>0&&y.width>0&&Math.min(x.right,y.right)>Math.max(x.left,y.left)+1&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top)+1;
       let style=getComputedStyle(a);
       return {overlap:overlap(t,c),navOverlap:bottom?overlap(t,n):false,top:t.top,bottom:t.bottom,left:t.left,right:t.right,
         cloudTop:c.top,gap:c.top-t.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,
         pageWidth:document.documentElement.scrollWidth,visibility:style.visibility,fontSize:style.fontSize};}''')
     ck(not d.get('missing'),tag+' toast and cloud button exist')
     if not d.get('missing'):
      ck(not d['overlap'],tag+' cloud status overlaps bear message')
      ck(not d['navOverlap'],tag+' mobile navigation overlaps bear message')
      ck(d['left']>=-1 and d['right']<=width+1,tag+' toast clipped horizontally')
      ck(d['top']>=0 and d['bottom']<=750+1,tag+' toast clipped vertically')
      ck(d['visibility']=='visible',tag+' toast not visible')
      ck(d['pageWidth']<=width+2,tag+' page overflows horizontally')
     ck(not errors,tag+' uncaught JS errors: '+repr(errors[:2]))
  # Preserve the sidebar bear action: clicking it inside an open drawer must show feedback.
  if width<=650:
   pg.locator('.mobile-menu').first.dispatch_event('click')
   pg.locator('.sf-bear-button').first.dispatch_event('click')
   ck(pg.locator('.sf-joy-toast').evaluate('(e)=>getComputedStyle(e).visibility')=='visible',f'{width}: drawer bear action unexpectedly hidden')
   pg.locator('.mobile-menu').first.dispatch_event('click')
  # Additional actual interactions at each width: background dialog, general feedback, no cloud dock.
  pg.locator('[data-action="sf-bear-note"]').first.dispatch_event('click')
  pg.evaluate('''() => {document.body.classList.add('sf-cloud-dialog-open');}''')
  pg.wait_for_timeout(65)
  ck(pg.locator('.sf-joy-toast').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden',f'{width}: notification obscures cloud modal')
  pg.evaluate('document.body.classList.remove("sf-cloud-dialog-open")')
  pg.wait_for_timeout(65) # allow Chromium to settle after the class transition
  ck(pg.locator('.sf-joy-toast').evaluate('(e)=>getComputedStyle(e).visibility')=='visible',f'{width}: notification not restored after closing modal')
  pg.evaluate('''() => {let t=document.createElement('div');t.className='toast';t.textContent='记录已安全保存';document.body.append(t);}''')
  pg.locator('[data-action="sf-bear-note"]').first.dispatch_event('click')
  rect=pg.evaluate('''() => {let a=document.querySelector('.sf-joy-toast').getBoundingClientRect(),b=document.querySelector('.toast').getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)+1 && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;}''')
  ck(not rect,f'{width}: regular notification overlaps bear note')
  r2=pg.evaluate('''() => {let a=document.querySelector('.toast').getBoundingClientRect(),b=document.querySelector('.sf-cloud-trigger').getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)+1 && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;}''')
  ck(not r2,f'{width}: regular notification overlaps cloud status button')
  pg.evaluate('''() => {document.querySelector('.toast')?.remove();document.querySelector('.sf-cloud-dock')?.remove();}''')
  pg.locator('[data-action="sf-bear-note"]').first.dispatch_event('click')
  rect=pg.evaluate('''() => {let a=document.querySelector('.sf-joy-toast').getBoundingClientRect(),b=document.querySelector('.suite-bottom-bar')?.getBoundingClientRect();return !!b&&b.width>0&&Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;}''')
  ck(not rect,f'{width}: no-cloud notification overlaps mobile bottom navigation')
  ck(pg.evaluate("localStorage.getItem('scholarflow_v1_data')")==data_before,f'{width}: UI actions changed research records')
  pg.close()
 browser.close()
print(f'notification collision scenarios: {rounds}; checks: {checks-len(failures)}/{checks}; failures: {len(failures)}')
for failure in failures[:30]:print('FAIL',failure)
if failures:raise SystemExit(1)
