"""Current release: true-to-label color swatches & non-intrusive companion tests.
    Uses an isolated browser document and in-memory localStorage mock; no user data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
R=Path(__file__).resolve().parents[1]
PALETTES={'ocean':'#1767bc','sage':'#487a65','paper':'#936b4e','graphite':'#52677c','glacier':'#257e98','lavender':'#7668ad'}
checks=0

def check(ok,what):
    global checks
    assert ok,what
    checks+=1

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':900},reduced_motion='reduce')
    errs=[]
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.evaluate('''() => {window.__store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});window.__store.set('scholarflow_v1_data',JSON.stringify({settings:{stylePreset:'ocean',theme:'auto',colorMode:'standard'},tasks:[{id:'t1',title:'校验材料疲劳参数',status:'待开始'}]}));window.confirm=()=>true;}''')
    page.add_style_tag(path=str(R/'styles.css'))
    page.add_script_tag(path=str(R/'pdf-intelligence.js'))
    page.add_script_tag(path=str(R/'app.js'))
    page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
    check(page.locator('.style-preset-card').count()==6,'six distinct choices rendered')
    for preset in PALETTES:
        check(page.locator(f'.preset-{preset} .preset-sample i').count()==3,f'{preset}: three actual palette swatches')
    # All sample colors stay true even when another global theme is active.
    for active in PALETTES:
        page.evaluate('(active)=>document.documentElement.dataset.sfPreset=active',active)
        for eye in ('standard','eye'):
            page.evaluate('(eye)=>document.documentElement.dataset.sfMode=eye',eye)
            actual=page.evaluate('''() => Object.fromEntries([...document.querySelectorAll('.style-preset-card')].map(e=>[e.querySelector('input').value,getComputedStyle(e.querySelector('.preset-sample i:first-child')).backgroundColor]))''')
            for k,h in PALETTES.items():
                rgb=tuple(int(h[i:i+2],16) for i in (1,3,5))
                check(actual[k] == f'rgb({rgb[0]}, {rgb[1]}, {rgb[2]})',f'{active}/{eye}: {k} matches own label {actual[k]}')
    page.evaluate("() => {document.documentElement.dataset.sfPreset='ocean';document.documentElement.dataset.sfMode='standard'}")
    old=page.evaluate('window.__store.get("scholarflow_v1_data")')
    page.locator('.preset-lavender input').check(force=True)
    check('实验室紫' in page.locator('#stylePresetFeedback').inner_text(),'live, truthful selection message')
    check(page.locator('#setting_theme').input_value()=='auto','palette selection switches accent control to auto')
    check(page.evaluate('window.__store.get("scholarflow_v1_data")')==old,'selection is not saved before submitting')
    page.locator('#appearanceForm button[type=submit]').click()
    check(json.loads(page.evaluate('window.__store.get("scholarflow_v1_data")'))['settings']['stylePreset']=='lavender','saved theme persists')
    check(page.evaluate('document.documentElement.dataset.sfPreset')=='lavender','saved theme applied')
    page.locator('nav [data-nav="home"]').first.dispatch_event('click')
    page.locator('[data-action="sf-joy-journey"]').first.dispatch_event('click')
    check(page.locator('.sf-journey-card[role=dialog]').count()==1,'journey dialog visible')
    start=page.locator('#sf-companion-message').inner_text()
    page.locator('[data-action="sf-companion-next"]').click()
    alternate=page.locator('#sf-companion-message').inner_text()
    check(start!=alternate,'focus mode actually changes advice on next request')
    check('材料疲劳参数' in alternate,'focus advice comes from saved task')
    page.locator('[data-joy-mood="rest"]').click()
    check(page.locator('[data-joy-mood="rest"]').get_attribute('aria-pressed')=='true','mood button accessible')
    check('材料疲劳参数' not in page.locator('#sf-companion-message').inner_text(),'rest does not insist on a task')
    page.keyboard.press('Escape')
    check(page.locator('.sf-journey-overlay').count()==0,'dialog can close with Escape')
    for width in (390,800,1200,1600):
        page.set_viewport_size({'width':width,'height':850})
        page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width} settings no page overflow')
        check(page.locator('.preset-lavender .preset-sample').is_visible(),f'{width} all palette cards functional')
        page.locator('nav [data-nav="home"]').first.dispatch_event('click')
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width} dashboard no overflow')
    check(not errs,f'page errors: {errs}')
    # XSS negative case: a literal HTML-looking task title remains inert text.
    attack=browser.new_page(viewport={'width':1000,'height':850},reduced_motion='reduce')
    attack.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    attack.evaluate('''() => {window.__store=new Map();const value={tasks:[{id:'x',title:'<img src=x onerror=alert(1)>',status:'待开始'}]};window.__store.set('scholarflow_v1_data',JSON.stringify(value));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});window.confirm=()=>true;}''')
    attack.add_style_tag(path=str(R/'styles.css'))
    attack.add_script_tag(path=str(R/'pdf-intelligence.js'))
    attack.add_script_tag(path=str(R/'app.js'))
    attack.locator('[data-action="sf-joy-journey"]').first.dispatch_event('click')
    check(attack.locator('.sf-companion-response img').count()==0,'unsafe task markup not interpreted as HTML')
    check('<img' in attack.locator('#sf-companion-message').inner_text(),'task markup shown as literal text')
    attack.close()
    browser.close()
print(f'PASS {checks} theme preview and companion assertions')
