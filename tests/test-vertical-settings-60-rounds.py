from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
ROOT=Path(__file__).resolve().parents[1]
widths=[320,390,768,1280,1600]
layouts=['balanced','dense','reading','night']
presets=['ocean','sage','paper','graphite','glacier','lavender']
walls=['none','mist','paper-lines','stars','custom']
errors=[]; failures=[]; outcomes=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,**({'executable_path':'/usr/bin/chromium'} if Path('/usr/bin/chromium').exists() else {}),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':900},reduced_motion='reduce')
 page.on('pageerror', lambda e: errors.append(str(e)))
 page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
 png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOy+co8AAAAASUVORK5CYII='
 page.evaluate('''(png)=>{window.__store=new Map([['scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'测试科研工作台',wallpaperImage:png,wallpaper:'none'}})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,String(v)),removeItem:k=>window.__store.delete(k)}});window.confirm=()=>true}''',png)
 for f in ('styles.css',):page.add_style_tag(path=str(ROOT/f))
 for f in ('pdf-intelligence.js','app.js'):page.add_script_tag(path=str(ROOT/f))
 roundnum=0
 for wi,width in enumerate(widths):
  page.set_viewport_size({'width':width,'height':900})
  for li,layout in enumerate(layouts):
   for k in range(3):
    roundnum+=1
    preset=presets[(wi*3+li+k)%len(presets)]
    wall=walls[(li+wi+k)%len(walls)]
    eye='eye' if ((roundnum%3)==0) else 'standard'
    try:
     page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
     assert page.locator('#appearanceForm').count()==1
     assert page.locator('select[name="layoutScheme"] option').count()==4
     assert page.locator('select[name="stylePreset"] option').count()==6
     assert page.locator('select[name="wallpaper"] option').count()==5
     before=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
     page.locator('select[name="layoutScheme"]').select_option(layout)
     page.locator('select[name="stylePreset"]').select_option(preset)
     page.locator('select[name="wallpaper"]').select_option(wall)
     page.locator('select[name="colorMode"]').select_option(eye)
     assert page.evaluate("localStorage.getItem('scholarflow_v1_data')")==before,'unexpected save before submit'
     assert page.locator('#stylePresetPreview').get_attribute('data-preset')==preset
     assert page.locator('#layoutSchemeHelp').inner_text()
     assert page.locator('#wallpaperChoiceHelp').inner_text()
     page.locator('#appearanceForm button[type=submit]').click()
     got=page.evaluate("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings")
     for key,value in [('layoutScheme',layout),('stylePreset',preset),('wallpaper',wall),('colorMode',eye)]:
      assert got[key]==value, f'{key} {got[key]}!={value}'
     assert got['wallpaperImage']==png,'wallpaper image erased'
     assert got['workspaceName']=='测试科研工作台','workspace renamed'
     assert page.evaluate('document.documentElement.dataset.sfPreset')==preset
     assert page.evaluate('document.documentElement.dataset.sfLayout')==layout
     assert page.evaluate('document.documentElement.dataset.sfWallpaper')==wall
     assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),'overflow settings'
     assert page.locator('#appearanceForm select[name="layoutScheme"]').input_value()==layout
     assert page.locator('#appearanceForm select[name="stylePreset"]').input_value()==preset
     assert page.locator('#appearanceForm select[name="wallpaper"]').input_value()==wall
     assert page.evaluate('''()=>{const all=[...document.querySelectorAll('[id]')].map(x=>x.id);return new Set(all).size===all.length}'''),'duplicate ID'
     assert page.locator('nav [data-nav="tasks"]').count()>=1,'nav missing'
     page.locator('nav [data-nav="tasks"]').first.dispatch_event('click')
     assert page.locator('main').count()==1
     assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'),'overflow tasks'
     page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
     assert page.locator('select[name="layoutScheme"]').input_value()==layout,'layout not restored'
     assert page.locator('select[name="stylePreset"]').input_value()==preset,'preset not restored'
     assert page.locator('select[name="wallpaper"]').input_value()==wall,'wallpaper not restored'
     assert not errors, 'JS pageerror '+repr(errors)
     outcomes.append({'round':roundnum,'width':width,'layout':layout,'preset':preset,'wallpaper':wall,'eye':eye,'pass':True})
    except Exception as ex:
     failures.append({'round':roundnum,'width':width,'layout':layout,'preset':preset,'wallpaper':wall,'error':str(ex)})
     outcomes.append({'round':roundnum,'width':width,'layout':layout,'preset':preset,'wallpaper':wall,'pass':False,'error':str(ex)})
     # Restore settings to keep independent conditions valid where possible
    if roundnum%12==0: print('PROGRESS',roundnum,'PASSED',len(outcomes)-len(failures),'FAILED',len(failures),flush=True)
 browser.close()
report={'name':'ScholarFlow 2026.11.4: 60 scenario loops','scenarios':len(outcomes),'passed':len(outcomes)-len(failures),'failed':len(failures),'javascript_errors':errors,'failures':failures,'results':outcomes}
(ROOT/'VERTICAL-60-ROUNDS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',len(outcomes),'PASS',len(outcomes)-len(failures),'FAIL',len(failures),'JS_ERRORS',len(errors),flush=True)
if failures:print('FAILURE_DETAILS',failures[:5]);sys.exit(1)
