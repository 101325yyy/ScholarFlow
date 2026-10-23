"""UI contrast matrix, 6 palettes x 2 comfort modes x 4 density presets x 4 viewports.
Uses isolated mock storage and reads computed CSS: no user data is accessed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
COUNT=0
FAILED=[]
def check(test, message):
 global COUNT
 COUNT+=1
 if not test: FAILED.append(message)
def rgb(text):
 if text.startswith('#'):return [int(text[i:i+2],16) for i in (1,3,5)]
 return [int(x) for x in re.findall(r'\d+',text)[:3]]
def luminance(rgb):
 parts=[v/255 for v in rgb]
 return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(parts,(.2126,.7152,.0722)))
def contrast(a,b):
 x,y=luminance(rgb(a)),luminance(rgb(b))
 return (max(x,y)+.05)/(min(x,y)+.05)
PALETTES=['ocean','sage','paper','graphite','glacier','lavender']
MODES=['standard','eye']
LAYOUTS=['balanced','dense','reading','night']
GET='''({selectors})=>{const out=[];
 for(const palette of ['ocean','sage','paper','graphite','glacier','lavender']){
  for(const mode of ['standard','eye']){
   for(const layout of ['balanced','dense','reading','night']){
    const d=document.documentElement.dataset;d.sfPreset=palette;d.sfMode=mode;d.sfLayout=layout;
    const styles=selectors.map(s=>{const el=document.querySelector(s);return el?{color:getComputedStyle(el).color,opacity:getComputedStyle(el).opacity}:null});
    out.push({palette,mode,layout,styles,avatarBg:getComputedStyle(document.querySelector('.avatar-settings-row')||document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+2});
   }
  }
 }
 return out;
}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (390,800,1200,1600):
  page=browser.new_page(viewport={'width':width,'height':900})
  page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{window.__mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)||null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',colorMode:'eye',layoutScheme:'balanced'},profile:{name:'示例用户',degree:'博士研究生',major:'力学',cohort:'2025级',researchDirection:'复合材料研究',graduationDate:'2028-12-30'},tasks:[]}))}''')
  page.add_style_tag(path=str(ROOT/'styles.css'))
  page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
  page.add_script_tag(path=str(ROOT/'app.js'))
  pages={
   'home':['.topbar-location','.cal-week','.sidebar-foot','.sf14-grad-edit','.sf14-grad-meta small','.sf36-profile-row small'],
   'settings':['.settings-intro .page-desc','.settings-grid .field label','.settings-grid .head h3','.settings-grid .mini','.preview-card .mini','.topbar-location','.avatar-settings-controls .mini','.avatar-settings-controls strong']
  }
  for part,selectors in pages.items():
   if part=='settings':page.locator('[data-nav="settings"]').first.dispatch_event('click')
   out=page.evaluate(GET,{'selectors':selectors})
   for row in out:
    base=f'{width}/{part}/{row["palette"]}/{row["mode"]}/{row["layout"]}'
    night=row['layout']=='night' and row['mode']=='standard'
    bg='#202e42' if night else '#f6f9f0' if row['mode']=='eye' else '#ffffff'
    check(not row['overflow'],base+' overflow')
    for sel,st in zip(selectors,row['styles']):
     check(st is not None,base+' missing '+sel)
     if st is None:continue
     actual_bg= '#eaf4e7' if part=='home' and row['mode']=='eye' and ('grad-' in sel or 'profile-row' in sel) else '#f8fcf3' if part=='home' and row['mode']=='eye' else bg
     # Profile text in standard hero is light on a navy gradient and belongs
     # to a separate background contrast test, not plain white.
     if part=='home' and row['mode']=='standard' and ('grad-' in sel or 'profile-row' in sel):continue
     if part=='settings' and 'avatar-settings-controls' in sel: actual_bg=row['avatarBg']
     ratio=contrast(st['color'],actual_bg)
     check(ratio>=4.5,base+f' {sel} contrast {ratio:.2f} ({st["color"]} on {actual_bg})')
  page.locator('[data-nav="home"]').first.dispatch_event('click')
  before=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
  page.locator('.eye-mode-toggle').click()
  check(page.locator('.eye-mode-toggle').get_attribute('aria-pressed') in ('true','false'),f'{width} toggle state exposed')
  check(page.evaluate("localStorage.getItem('scholarflow_v1_data')") is not None,f'{width} storage preserved')
  page.locator('.eye-mode-toggle').focus()
  page.keyboard.press('Tab')
  page.keyboard.press('Shift+Tab')
  check(page.locator('.eye-mode-toggle').evaluate("e=>getComputedStyle(e).outlineStyle")!='none',f'{width} focus visible')
  page.close()
 browser.close()
 print('Assertion checks:',COUNT,'FAIL:',len(FAILED))
 for item in FAILED[:30]:print('FAIL:',item)
 if FAILED:raise SystemExit(1)
