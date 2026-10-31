"""Account UI geometry / themes / keyboard. Isolated Chromium + fake SDK."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
N=0
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in (320,360,390,650,768,1440):
  p=b.new_page(viewport={'width':w,'height':820})
  p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div></body></html>')
  p.add_style_tag(path=str(R/'site/cloud.css'))
  p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
  p.evaluate('window.__setData({tasks:[],literature:[],settings:{}})')
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.locator('.sf-cloud-trigger').click()
  p.locator('[name=email]').fill('layout@example.org');p.locator('[name=password]').fill('password123')
  p.locator('[data-mode=login]').click()
  p.wait_for_function('ScholarCloudStatus().signedIn')
  for theme,mode in [('night','normal'),('classic','eye'),('classic','normal')]:
   p.evaluate('([layout,mode])=>{document.documentElement.setAttribute("data-sf-layout",layout);document.documentElement.setAttribute("data-sf-mode",mode)}',[theme,mode])
   data=p.evaluate('''() => {
     const panel=document.querySelector('.sf-cloud-panel').getBoundingClientRect();
     const first=document.querySelector('.sf-cloud-account-actions button').getBoundingClientRect();
     const second=document.querySelectorAll('.sf-cloud-account-actions button')[1].getBoundingClientRect();
     return {left:panel.left,right:panel.right,overlap:Math.min(first.right,second.right)-Math.max(first.left,second.left),w:first.width,h:first.height,sh:document.documentElement.scrollWidth,vw:innerWidth};
   }''')
   assert data['left']>=-2 and data['right']<=w+2,(w,theme,mode,data)
   assert data['overlap']<=0,(w,theme,mode,data)
   assert data['h']>=40,(w,theme,mode,data)
   assert data['sh']<=data['vw']+2,(w,theme,mode,data)
   N+=4
  p.keyboard.press('Escape');assert p.locator('.sf-cloud-panel').is_hidden();N+=1
  p.close()
 print('PASS account layout:',N,'checks across six widths and three themes')
 b.close()
