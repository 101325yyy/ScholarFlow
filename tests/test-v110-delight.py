"""Delight layer acceptance. Isolated fake storage: never touches real scientific records.
Run: python tests/test-v110-delight.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(value, description):
    assert value, description
    checks.append(description)

def load(page):
    page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.evaluate('''() => {
      window.__store=new Map();window.__fail=false;
      const raw=JSON.stringify({tasks:[{id:'demo-1',title:'确认实验记录',status:'待开始',origin:'自己'}],settings:{workspaceName:'科研工作台'}});
      window.__store.set('scholarflow_v1_data',raw);
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>window.__store.get(k)??null,
        setItem:(k,v)=>{if(window.__fail){window.__fail=false;throw new Error('test quota')}window.__store.set(k,v)},
        removeItem:k=>window.__store.delete(k)}});
      window.__science=()=>window.__store.get('scholarflow_v1_data');
      window.confirm=()=>true;
    }''')
    page.add_style_tag(path=str(ROOT/'styles.css'))
    page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
    page.add_script_tag(path=str(ROOT/'app.js'))

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,768,1280):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        load(page)
        check(page.locator('.sf-joy-ribbon').count()==1,f'{width}: homepage note visible')
        check(page.locator('.sf-bear-button').count()==1,f'{width}: one accessible bear control')
        check(page.locator('.sf-joy-ribbon').get_attribute('aria-label')=='科研小纸条',f'{width}: note labelled')
        before=page.evaluate('window.__science()')
        note1=page.locator('#sf-joy-note').inner_text()
        page.locator('[data-action="sf-joy-next"]').click()
        note2=page.locator('#sf-joy-note').inner_text()
        check(note1!=note2,f'{width}: manual note rotation')
        if width <= 900: page.locator('.mobile-menu').click()
        page.locator('.sf-bear-button').click()
        check(page.locator('.sf-joy-toast').count()==1,f'{width}: bear click gives feedback')
        check(page.locator('.sf-joy-toast').get_attribute('role')=='status',f'{width}: feedback announced')
        check(page.evaluate('window.__science()')==before,f'{width}: fun actions do not mutate science')
        page.locator('[data-action="sf-joy-toggle"]').click()
        check(page.locator('.sf-joy-ribbon').count()==0,f'{width}: opt out removes ribbon')
        check(page.evaluate('window.__store.get("scholarflow_v3_joy_enabled")')=='off',f'{width}: opt out saved separately')
        page.locator('.sf-bear-button').click()
        check(page.locator('.sf-joy-toast').count()==0,f'{width}: opt out suppresses joy feedback')
        page.locator('[data-action="sf-joy-toggle"]').click()
        check(page.locator('.sf-joy-ribbon').count()==1,f'{width}: opt in restores ribbon')
        check(page.evaluate('window.__science()')==before,f'{width}: opt-in does not change research data')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width}: no horizontal overflow')
        if width <= 900: page.locator('.mobile-menu').dispatch_event('click')
        # Task completion acknowledgement only after persistence succeeds.
        page.locator('.home-task-item input[data-check="demo-1"]').evaluate("e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}")
        check(page.evaluate('JSON.parse(window.__science()).tasks[0].status')=='已完成',f'{width}: original task workflow preserved')
        check(page.locator('.sf-joy-toast').count()==1,f'{width}: successful completion congratulations')
        # Contextual notes while navigating do not edit any module data.
        page.locator('nav [data-nav="literature"]').dispatch_event('click')
        if width <= 900: page.locator('.mobile-menu').click()
        saved=page.evaluate('window.__science()')
        page.locator('.sf-bear-button').click()
        check('文献' in page.locator('.sf-joy-toast').inner_text(),f'{width}: literature-aware bear note')
        check(page.evaluate('window.__science()')==saved,f'{width}: contextual note cannot edit literature')
        check(not errors,f'{width}: no JS exceptions: {errors}')
        page.close()
    # Reject failed writes without positive feedback or data changes.
    page=browser.new_page(viewport={'width':1280,'height':900})
    load(page)
    before=page.evaluate('window.__science()')
    page.evaluate('window.__fail=true')
    page.locator('.home-task-item input[data-check="demo-1"]').evaluate("e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}")
    check(page.evaluate('window.__science()')==before,'quota failure preserves saved record')
    check(page.locator('.sf-joy-toast').count()==0,'quota failure shows no congratulations')
    check(page.locator('.toast').count()==1,'quota failure still shows original error alert')
    # No motion when user enables reduced-motion at operating system level.
    ctx=browser.new_context(viewport={'width':390,'height':800},reduced_motion='reduce')
    p2=ctx.new_page();load(p2)
    p2.locator('.mobile-menu').click()
    p2.locator('.sf-bear-button').click()
    check(p2.locator('.sf-joy-toast').evaluate('(e)=>getComputedStyle(e).animationName')=='none','reduced motion disables toast animation')
    p2.locator('.sf-bear-button').hover()
    check(p2.locator('.sf-bear-button').evaluate('(e)=>getComputedStyle(e).transform')=='none','reduced motion disables bear movement')
    ctx.close();page.close()
    # Four visual presets and mobile wide text safety.
    for layout in ('balanced','dense','reading','night'):
        page=browser.new_page(viewport={'width':390,'height':850})
        load(page)
        page.evaluate('(scheme)=>document.documentElement.setAttribute("data-sf-layout",scheme)',layout)
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{layout}: small viewport layout safe')
        check(page.locator('.sf-joy-next').is_visible(),f'{layout}: note button readable / visible')
        page.close()
    browser.close()
print('PASS',len(checks),'joy-layer assertions')
