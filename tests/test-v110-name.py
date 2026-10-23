"""1.1.0 editable branding: isolated-browser persistence across new app instances.
The controlled localStorage shim avoids any access to a real research profile.
This checks reload-equivalent rehydration, not an actual HTTP page reload.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(cond,desc):
    assert cond,desc
    checks.append(desc)

def new_app(browser, width, seed=None):
    page=browser.new_page(viewport={'width':width,'height':900})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.evaluate('''stored => {
        window.__store=new Map(); window.__fail=false;
        if(stored!==null) window.__store.set('scholarflow_v1_data',stored);
        Object.defineProperty(window,'localStorage',{configurable:true,value:{
            getItem:k=>window.__store.get(k)??null,
            setItem:(k,v)=>{if(window.__fail){window.__fail=false;throw Error('quota')}window.__store.set(k,String(v))},
            removeItem:k=>window.__store.delete(k)} });
    }''',seed)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
    page.add_script_tag(path=str(ROOT/'app.js'))
    return page,errs

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,768,1280):
        page,errors=new_app(browser,width)
        check(page.locator('.sidebar .brand-text').inner_text()=='科研工作台',f'{width}: default name')
        check('版本 1.1.0' in page.locator('.sidebar-foot').inner_text(),f'{width}: footer 1.1.0')
        page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
        name='我的科研笔记本'
        page.locator('#setting_workspaceName').fill(name)
        page.locator('#appearanceForm button[type="submit"]').click()
        check(page.locator('.sidebar .brand-text').inner_text()==name,f'{width}: settings update sidebar')
        check(name in page.locator('.topbar-location').inner_text(),f'{width}: settings update breadcrumb')
        check(page.evaluate('document.title').startswith(name),f'{width}: settings update title')
        saved=page.evaluate("window.__store.get('scholarflow_v1_data')")
        check(__import__('json').loads(saved)['settings']['workspaceName']==name,f'{width}: persisted stored value')
        page.locator('nav [data-nav="home"]').first.dispatch_event('click')
        check(name in page.locator('.sf13-identity-top').inner_text(),f'{width}: homepage header updates')
        for mod in ['home','tasks','advisor','literature','notes','simulations','experiments','papers','statistics','files','settings']:
            page.locator(f'nav [data-nav="{mod}"]').first.dispatch_event('click')
            check(page.locator('.sidebar .brand-text').inner_text()==name,f'{width}: {mod} brand')
        check(not errors,f'{width}: no runtime errors {errors}')
        page.close()
        # Equivalent to reopening an app instance with the same saved JSON.
        page,errors=new_app(browser,width,saved)
        check(page.locator('.sidebar .brand-text').inner_text()==name,f'{width}: name rehydrates from saved data')
        check('版本 1.1.0' in page.locator('.sidebar-foot').inner_text(),f'{width}: version on fresh load')
        if width==1280:
            special='我的研究室 <img src=x onerror=alert(1)>'
            page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
            page.locator('#setting_workspaceName').fill(special)
            page.locator('#appearanceForm button[type="submit"]').click()
            check(page.locator('.sidebar .brand-text').inner_text()==special,'special characters preserved')
            check(page.locator('.sidebar .brand-text img').count()==0,'custom name escaped, no injected markup')
            page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
            page.evaluate('window.__fail=true')
            page.locator('#setting_workspaceName').fill('应该被拒绝的名字')
            page.locator('#appearanceForm button[type="submit"]').click()
            check(page.locator('.sidebar .brand-text').inner_text()==special,'save failure preserves last successful name')
            check(__import__('json').loads(page.evaluate("window.__store.get('scholarflow_v1_data')"))['settings']['workspaceName']==special,'save failure retains stored name')
        check(not errors,f'{width}: no errors on rehydration {errors}')
        page.close()
    browser.close()
print('PASS',len(checks),'1.1.0 editable-name browser assertions')
