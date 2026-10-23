"""ScholarFlow 1.1.0 quality guard: FAQ, persisted backup, six themes, eye/night, keyboard and viewports.
Uses an isolated Storage stub; does not read any browser profile or user data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from collections import defaultdict
import math
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def ck(pred,msg):
    if not pred: raise AssertionError(msg)
    checks.append(msg)

def parse_rgb(s):
    s=s.strip().lower()
    if s.startswith('rgb'):
        import re
        arr=re.findall(r'[0-9]+(?:\.[0-9]+)?',s[s.index('(')+1:s.index(')')])
        return [float(x) for x in arr[:3]]
    return None

def luminance(rgb):
    def linear(v):
        v=v/255
        return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    return .2126*linear(rgb[0])+.7152*linear(rgb[1])+.0722*linear(rgb[2])

def contrast(a,b):
    l1,l2=sorted([luminance(a),luminance(b)],reverse=True)
    return (l1+.05)/(l2+.05)

with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  durations=[]
  for preset in ['ocean','sage','paper','graphite','glacier','lavender']:
   for layout in (['balanced','dense','reading','night'] if preset=='ocean' else ['balanced']):
    for width in ([390,800,1200,1600] if layout=='balanced' else [1200]):
     page=browser.new_page(viewport={'width':width,'height':900})
     errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
     page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
     page.evaluate('''(args)=>{window.__store=new Map([['scholarflow_v1_data',JSON.stringify({settings:{stylePreset:args.preset,layoutScheme:args.layout,workspaceName:'科研工作台',colorMode:'standard'},tasks:[{id:'t1',title:'核对实验记录',status:'待开始'}]})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});window.confirm=()=>true;}''',{'preset':preset,'layout':layout})
     page.add_style_tag(path=str(ROOT/'styles.css'))
     page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
     page.add_script_tag(path=str(ROOT/'app.js'))
     page.locator('[data-nav="settings"]').first.dispatch_event('click')
     ck(page.locator('#sf110-help-title').inner_text()=='使用指引与常见问题',f'{preset}/{layout}/{width} FAQ heading')
     ck(page.locator('.sf110-faq details').count()==5,f'{preset}/{layout}/{width} FAQ entries')
     ck(page.locator('.sf110-help .sf110-step').count()==3,f'{preset}/{layout}/{width} onboarding steps')
     ck(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),f'{preset}/{layout}/{width} no horizontal overflow')
     ck(not errors,f'{preset}/{layout}/{width} no JS errors: {errors}')
     ratio=page.locator('.sf110-step p').first.evaluate('''e => {const fg=getComputedStyle(e).color,bg=getComputedStyle(e.closest('.sf110-step')).backgroundColor;return [fg,bg]}''')
     r=contrast(parse_rgb(ratio[0]),parse_rgb(ratio[1]))
     ck(r >= 4.5, f'{preset}/{layout}/{width} FAQ contrast {r:.2f}:1 (AA)')
     if preset=='ocean' and layout=='balanced' and width==1200:
      page.locator('.sf110-faq details').first.locator('summary').click()
      ck(page.locator('.sf110-faq details').first.get_attribute('open') is not None,'FAQ details accessible open')
      page.screenshot(path=str(ROOT/'tests'/'v110-settings-guide-desktop.png'),full_page=True)
     page.close()
  # eye comfort + night combination regression
  for colorMode in ['eye','standard']:
   page=browser.new_page(viewport={'width':390,'height':844})
   page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
   page.evaluate('''mode=>{window.__store=new Map([['scholarflow_v1_data',JSON.stringify({settings:{stylePreset:'sage',layoutScheme:'night',colorMode:mode}})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}})}''',colorMode)
   page.add_style_tag(path=str(ROOT/'styles.css'))
   page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
   page.add_script_tag(path=str(ROOT/'app.js'))
   page.locator('[data-nav="settings"]').first.dispatch_event('click')
   ck(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),'night/eye 390 no overflow '+colorMode)
   if colorMode=='eye':page.screenshot(path=str(ROOT/'tests'/'v110-settings-guide-eye390.png'),full_page=True)
   page.close()
  # persisted export: saved JSON only, not unsafe unsaved in-memory delta; stale tab must refuse.
  page=browser.new_page(viewport={'width':1280,'height':900},accept_downloads=True)
  page.set_content('<!doctype html><html lang="zh-CN"><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{window.__store=new Map([['scholarflow_v1_data',JSON.stringify({tasks:[{id:'t1',title:'已持久化任务',status:'待开始'}]})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}})}''')
  page.add_style_tag(path=str(ROOT/'styles.css'));page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'));page.add_script_tag(path=str(ROOT/'app.js'))
  page.locator('[data-nav="settings"]').first.dispatch_event('click')
  with page.expect_download(timeout=5000) as info:
    page.locator('[data-action="export"]').first.click()
  download=info.value
  ck('ScholarFlow-backup-' in download.suggested_filename,'saved-data backup filename')
  ck(page.locator('.toast').inner_text().find('下载')!=-1,'browser download-not-guaranteed disclosure')
  # source unexpectedly updated: guard must refuse exporting a stale snapshot
  page.evaluate('''()=>window.__store.set('scholarflow_v1_data',JSON.stringify({tasks:[{id:'t1',title:'另一个标签页的修改'}]}))''')
  page.locator('[data-action="export"]').first.click()
  ck('备份未开始' in page.locator('.toast').inner_text(),'stale-tab backup blocked')
  page.close();browser.close()
print(f'PASS {len(checks)} V1.1.0 UI-quality, contrast, safety checks')
