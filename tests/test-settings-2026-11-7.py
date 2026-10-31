from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
errors=[]; count=0
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,650,768,1024,1280,1440,1920]:
  pg=b.new_page(viewport={'width':width,'height':930},reduced_motion='reduce')
  pg.on('pageerror', lambda err:errors.append(str(err)))
  pg.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.add_style_tag(path=str(R/'styles.css'))
  pg.add_style_tag(path=str(R/'research-suite.css'))
  pg.add_script_tag(path=str(R/'pdf-intelligence.js'))
  pg.add_script_tag(path=str(R/'research-suite.js'))
  pg.add_script_tag(path=str(R/'app.js'))
  pg.locator('nav [data-nav="settings"]').first.dispatch_event('click')
  assert pg.locator('#profileForm').count()==1
  assert pg.locator('#appearanceForm').count()==1
  assert pg.locator('#translationForm').count()==1
  assert pg.locator('.sf-settings-secondary > .sf-translation-card').count()==1
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+2'), width
  r=pg.evaluate('''() => {const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};return {a:rect('.settings-v131-primary>.card'),b:rect('.settings-v131-primary>.preview-card'),c:rect('.settings-appearance-card'),d:rect('.sf-settings-secondary'),t:rect('.sf-translation-card'),x:rect('.sf-settings-secondary>.card:last-child')}}''')
  if width>=1024:
   assert abs(r['c']['top']-r['d']['top'])<=2, (width,'settings grid head',r)
   assert abs(r['a']['top']-r['b']['top'])<=2, (width,'profile head',r)
   assert abs(r['a']['bottom']-r['b']['bottom'])<=2, (width,'profile lower alignment',r)
   assert r['d']['left']>=r['c']['right']-1, (width,'secondary separate',r)
   assert r['x']['top']>=r['t']['bottom'], (width,'backup below translation',r)
  else:
   assert r['d']['top']>=r['c']['bottom'],(width,'mobile vertical',r)
  count+=7
  pg.close()
 print('PASS UI settings geometries:',count,'checks across 8 widths')
 assert not errors,errors
 b.close()
