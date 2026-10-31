from playwright.sync_api import sync_playwright
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'site'
passed=0
fails=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390):
  pg=b.new_page(viewport={'width':width,'height':760},is_mobile=True,has_touch=True)
  pg.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.add_style_tag(path=str(ROOT/'styles.css'))
  pg.add_style_tag(path=str(ROOT/'online.css'))
  pg.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
  pg.add_script_tag(path=str(ROOT/'app.js'))
  for preset in ('ocean','sage','paper','graphite','glacier','lavender'):
   for mode,layout in (('standard','balanced'),('eye','balanced'),('standard','night')):
    pg.evaluate('''(opts)=>{let el=document.documentElement;el.dataset.sfPreset=opts.preset;el.dataset.sfMode=opts.mode;el.dataset.sfLayout=opts.layout}''',{'preset':preset,'mode':mode,'layout':layout})
    pg.locator('[data-action="menu"]').click()
    cur=pg.evaluate('''() => {const nav=document.querySelector('.sidebar'),scrim=document.querySelector('.sf-mobile-scrim');const n=nav.getBoundingClientRect();const close=nav.querySelector('.sf-mobile-close').getBoundingClientRect();const scr=scrim.getBoundingClientRect();return {navleft:n.left,navright:n.right,closeW:close.width,closeH:close.height,scrW:scr.width,focus:document.activeElement.className,scroll:document.documentElement.scrollWidth,inner:innerWidth}}''')
    ok=cur['navleft']>=-1 and cur['navright']<width and cur['closeW']>=44 and cur['closeH']>=44 and cur['scrW']==width and cur['scroll']<=cur['inner']+2
    passed+=int(ok)
    if not ok:fails.append((width,preset,mode,cur))
    pg.keyboard.press('Tab')
    focus=pg.evaluate("document.getElementById('sf-mobile-sidebar').contains(document.activeElement)")
    passed+=int(focus)
    if not focus:fails.append((width,preset,mode,'tab escaped drawer'))
    pg.locator('.sf-mobile-close').click()
    not_show=pg.evaluate('!document.documentElement.classList.contains("sf-drawer-open")')
    passed+=int(not_show)
    if not not_show:fails.append((width,preset,mode,'did not close'))
  pg.set_viewport_size({'width':1200,'height':760})
  pg.wait_for_timeout(40)
  val=pg.evaluate("!document.getElementById('sf-mobile-sidebar').inert")
  passed+=int(val)
  if not val:fails.append((width,'resize sidebar still inert'))
  pg.close()
 b.close()
print('Theme/mobile checks',passed,'/',2*6*3*3+2,'failures',fails[:5])
if fails: raise SystemExit(1)
