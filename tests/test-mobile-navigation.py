from playwright.sync_api import sync_playwright
from pathlib import Path
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]/'site'
checks=[]
def ck(cond, desc):
 checks.append((bool(cond),desc))
 if not cond:print('FAIL',desc)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,768,1200]:
  page=browser.new_page(viewport={'width':width,'height':820},is_mobile=True,has_touch=True,device_scale_factor=1)
  page.set_default_timeout(10000)
  errors=[];page.on('pageerror', lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.add_style_tag(path=str(ROOT/'styles.css'))
  page.add_style_tag(path=str(ROOT/'online.css'))
  page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
  page.add_script_tag(path=str(ROOT/'app.js'))
  page.wait_for_selector('.topbar')
  ismobile=width<=900
  ck(page.locator('.nav').count()==11, f'{width} nav links present')
  ck(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width} no viewport overflow initial')
  if ismobile:
   ck(page.locator('.sidebar').evaluate('(e)=>e.inert'), f'{width} sidebar hidden inert')
   ck(page.locator('.mobile-menu').is_visible(), f'{width} opener visible')
   page.locator('[data-action="menu"]').click()
   ck(page.locator('.sidebar').evaluate('(e)=>e.classList.contains("show")'),f'{width} drawer opened')
   ck(page.locator('.sf-mobile-close').is_visible(), f'{width} close button visible')
   ck(page.locator('.sf-mobile-scrim').is_visible(),f'{width} backdrop visible')
   ck(page.locator('.main').evaluate('(e)=>e.inert'),f'{width} background inert')
   ck(page.evaluate('document.activeElement.classList.contains("sf-mobile-close")'),f'{width} drawer autofocus close')
   ck(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width} no drawer overflow')
   # close X
   page.locator('.sf-mobile-close').click()
   ck(not page.locator('.sf-mobile-scrim').is_visible(),f'{width} close button hides backdrop')
   ck(page.evaluate('!document.querySelector(".main").inert'),f'{width} main interactive again')
   # backdrop tap
   page.locator('[data-action="menu"]').click()
   page.locator('.sf-mobile-scrim').click(position={'x':width-12,'y':400})
   ck(not page.locator('.sf-mobile-scrim').is_visible(),f'{width} backdrop dismiss')
   # keyboard Escape
   page.locator('[data-action="menu"]').click()
   page.keyboard.press('Escape')
   ck(not page.locator('.sidebar').evaluate('(e)=>e.classList.contains("show")'),f'{width} Esc dismiss')
   # popstate browser back
   page.locator('[data-action="menu"]').click()
   page.go_back(wait_until='domcontentloaded')
   ck(not page.locator('.sidebar').evaluate('(e)=>e.classList.contains("show")'),f'{width} browser back dismiss')
   # navigation use JS dispatch_event to click covered nav safely
   page.locator('[data-action="menu"]').click()
   page.locator('#sf-mobile-sidebar [data-nav="tasks"]').click()
   ck(page.evaluate('location.hash==="#tasks"'),f'{width} route switched')
   ck(not page.locator('.sf-mobile-scrim').is_visible(),f'{width} nav closes drawer')
   ck(page.locator('.workspace-title h1').count()>0 or '待办事项' in page.locator('.main').inner_text(), f'{width} tasks rendered')
   ck(page.evaluate('location.hash==="#tasks"'),f'{width} task route stays selected')
   ck(not errors,f'{width} js errors {errors[:1]}')
  else:
   ck(not page.locator('.mobile-menu').is_visible(),f'{width} desktop menu hidden')
   ck(not page.locator('.sidebar').evaluate('(e)=>e.inert'),f'{width} desktop sidebar interactive')
  page.close()
 browser.close()
print('PASSED',sum(c for c,d in checks),'/',len(checks))
if not all(c for c,d in checks): raise SystemExit(1)
