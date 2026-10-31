"""Responsive and theme checks after navigation simplification."""
from playwright.sync_api import sync_playwright
from pathlib import Path
R=Path(__file__).resolve().parents[1]
N=0
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,650,1024,1440):
  p=b.new_page(viewport={'width':width,'height':860})
  errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  p.set_content('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>')
  for f in ('styles.css','research-suite.css'):p.add_style_tag(path=str(R/f))
  for f in ('pdf-intelligence.js','research-suite.js','app.js'):p.add_script_tag(path=str(R/f))
  for preset,mode,layout in [('ocean','standard','balanced'),('sage','eye','balanced'),('graphite','standard','night'),('lavender','standard','reading')]:
   p.evaluate('''v=>{document.documentElement.dataset.sfPreset=v.p;document.documentElement.dataset.sfMode=v.m;document.documentElement.dataset.sfLayout=v.l;}''',dict(p=preset,m=mode,l=layout))
   for route in ('home','tasks','planner','literature'):
    if route=='planner':p.locator('[data-suite-route="planner"]').first.dispatch_event('click')
    else:p.locator(f'[data-nav="{route}"]').first.dispatch_event('click')
    assert p.locator('.main').count()==1,(width,preset,route,'missing main')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),(width,preset,route,'overflow')
    assert not p.locator('[data-suite-route="knowledge"],[data-suite-route="reading"],[data-suite-route="search-all"]').count()
    N+=3
  assert not errs,(width,errs)
  N+=1
  p.close()
 b.close()
print('PASS',N,'theme/responsive assertions')
