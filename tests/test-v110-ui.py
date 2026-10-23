"""1.1.0 UI-only acceptance. Uses isolated in-memory storage and Chromium.
Checks six palettes, four layouts, eye-comfort clarity and the reversible quiet action.
No user data are loaded or modified.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
COUNT=0

def ok(v,msg):
 global COUNT
 assert v,msg
 COUNT+=1

def load(page):
 page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{window.__mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)||null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'sage',colorMode:'eye',layoutScheme:'balanced'},profile:{name:'研究者',degree:'博士研究生',cohort:'示例年级',major:'力学',researchDirection:'示例研究方向'},tasks:[]}));window.confirm=()=>true}''')
 page.add_style_tag(path=str(ROOT/'styles.css'))
 page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
 page.add_script_tag(path=str(ROOT/'app.js'))

def text_contrast(page, selector, background):
 fg=page.locator(selector).first.evaluate('(e)=>getComputedStyle(e).color')
 def rgb(s):
  import re
  if s.startswith('#'): return [int(s[i:i+2],16) for i in (1,3,5)]
  return [int(x) for x in re.findall(r'\d+',s)[:3]]
 def lin(v):
  v=v/255
  return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 def lum(v): return sum(c*lin(n) for c,n in zip((.2126,.7152,.0722),v))
 a,b=lum(rgb(fg)),lum(rgb(background))
 return round((max(a,b)+.05)/(min(a,b)+.05),2)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (390,800,1200,1600):
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
  load(page)
  for palette in ('ocean','sage','paper','graphite','glacier','lavender'):
   for layout in ('balanced','dense','reading','night'):
    page.evaluate('''({palette,layout})=>{document.documentElement.dataset.sfPreset=palette;document.documentElement.dataset.sfLayout=layout;document.documentElement.dataset.sfMode='eye'}''',{'palette':palette,'layout':layout})
    # all interactive elements remain available independent of palette/typography
    ok(page.locator('.sf36-profile-row small').first.evaluate('e=>getComputedStyle(e).color')=='rgb(69, 97, 76)',f'{width}/{palette}/{layout} eye profile readable')
    ok(float(page.locator('.sf-day.other').first.evaluate('e=>getComputedStyle(e).opacity'))>=.85,f'{width}/{palette}/{layout} adjacent calendar day legible')
    ok(page.locator('.sf-joy-quiet').count()==1,f'{width}/{palette}/{layout} quiet shortcut exists')
    ok(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width}/{palette}/{layout} width')
   # audit more than a single page: check all modules on the same palette
   for module in ('tasks','literature','experiments','papers','settings'):
    page.locator(f'[data-nav="{module}"]').first.dispatch_event('click')
    ok(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width}/{palette}/{module} no overflow')
   page.locator('[data-nav="home"]').first.dispatch_event('click')
  # Explicit regression for night typography + eye-comfort palette conflict.
  page.evaluate("document.documentElement.dataset.sfLayout='night';document.documentElement.dataset.sfMode='eye'")
  ok(page.locator('.sidebar .nav.active').first.evaluate('e=>getComputedStyle(e).color')=='rgb(37, 77, 54)',f'{width} night/eye nav contrast')
  ok(page.locator('.search input').first.evaluate('e=>getComputedStyle(e).color')=='rgb(40, 68, 53)',f'{width} night/eye search contrast')
  ok(text_contrast(page,'.sf13-hero h1','#eaf4e7')>=4.5,f'{width} night/eye hero contrast')
  ok(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width} night/eye no overflow')
  page.evaluate("document.documentElement.dataset.sfLayout='balanced';document.documentElement.dataset.sfMode='eye'")
  ok(text_contrast(page,'.sf36-profile-row small','#f8fcf3')>=4.5,f'{width} profile contrast')
  ok(text_contrast(page,'.cal-week','#f7f8f0')>=4.5,f'{width} calendar weekday contrast')
  ok(text_contrast(page,'.sidebar .sf-module-heading','#f8faf3')>=4.5,f'{width} sidebar heading contrast')
  ok(text_contrast(page,'.sf-joy-ribbon-text p','#edf3e9')>=4.5,f'{width} companion hint contrast')
  saved=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
  page.locator('.sf-joy-quiet').click()
  ok(page.locator('.sf-joy-ribbon').count()==0,f'{width} quiet hides non-essential ribbon')
  ok(page.evaluate("localStorage.getItem('scholarflow_v1_data')")==saved,f'{width} quiet leaves records unchanged')
  page.locator('[data-action="sf-joy-toggle"]').first.dispatch_event('click')
  ok(page.locator('.sf-joy-ribbon').count()==1,f'{width} joy can be restored')
  ok(not errors,f'{width} JS errors: {errors}')
  page.close()
 browser.close()
 print(f'PASS {COUNT} 1.1.0 UI-only assertions')
