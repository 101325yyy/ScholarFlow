"""1.1.0 optional research companion tests: browser interactions + actual persisted counts (isolated store)."""
from pathlib import Path
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
n=0

def check(value, description):
    global n
    assert value, description
    n+=1

def load(page,rich=True):
    date=datetime.now().astimezone().isoformat()
    raw={"tasks":[{"id":"t1","title":"整理数据","status":"已完成","completedAt":date},{"id":"t2","title":"验证模型","status":"待开始"}],"literature":[{"id":"lit1","title":"材料力学"}],"experiments":[{"id":"e1","title":"应力试验"}],"notes":[{"id":"n1","title":"我的想法"}],"settings":{"workspaceName":"科研工作台"}}
    if not rich:raw={"tasks":[],"literature":[],"experiments":[],"notes":[],"settings":{"workspaceName":"科研工作台"}}
    page.set_content('<!doctype html><html lang="zh"><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="app"></div></body></html>')
    page.evaluate('''raw => {
       window.__store=new Map([['scholarflow_v1_data',JSON.stringify(raw)]]);
       Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});
       window.__science=()=>window.__store.get('scholarflow_v1_data');
       window.confirm=()=>true;
    }''',raw)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
    page.add_script_tag(path=str(ROOT/'app.js'))

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,768,1280):
        p=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        load(p)
        science=p.evaluate('window.__science()')
        check(p.locator('[data-action="sf-joy-journey"]').count()==1,f'{width}: entry present')
        p.locator('[data-action="sf-joy-journey"]').click()
        check(p.locator('[role="dialog"][aria-labelledby="sf-journey-title"]').count()==1,f'{width}: journey dialog')
        check(p.locator('.sf-journey-counters strong').all_inner_texts()==['1','1'],f'{width}: saved task counts')
        check(p.locator('.sf-journey-badge.is-earned').count()==4,f'{width}: real milestones')
        check(len(p.locator('.sf-journey-day').all_inner_texts())==7,f'{width}: seven days')
        check(p.locator('.sf-journey-day .has-work').count()==1,f'{width}: one activity day')
        check(p.locator('.sf-journey-badge').count()==4,f'{width}: badges count')
        check(p.locator('.sf-journey-close').evaluate('(e)=>document.activeElement===e'),f'{width}: focus moved')
        p.keyboard.press('Shift+Tab')
        check(p.locator('[data-action="sf-journey-go"]').evaluate('(e)=>document.activeElement===e'),f'{width}: focus loops backward')
        p.keyboard.press('Tab')
        check(p.locator('.sf-journey-close').evaluate('(e)=>document.activeElement===e'),f'{width}: focus loops forward')
        before=p.locator('#sf-journey-quest-text').inner_text()
        p.locator('[data-action="sf-journey-refresh"]').click()
        check(p.locator('#sf-journey-quest-text').inner_text()!=before,f'{width}: suggested step changes')
        check(p.evaluate('window.__science()')==science,f'{width}: no science data mutation')
        check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width}: no overflow')
        p.keyboard.press('Escape')
        check(p.locator('.sf-journey-overlay').count()==0,f'{width}: esc closes')
        check(p.locator('[data-action="sf-joy-journey"]').evaluate('(e)=>document.activeElement===e'),f'{width}: focus return')
        p.locator('[data-action="sf-joy-journey"]').click()
        p.locator('[data-action="sf-journey-go"]').click()
        check(p.locator('.sf-journey-overlay').count()==0,f'{width}: go closes')
        check(p.evaluate('window.__science()')==science,f'{width}: goto does not mutate')
        check(not errors,f'{width}: no JS errors: {errors}')
        p.close()
    for scheme in ('balanced','dense','reading','night'):
        p=browser.new_page(viewport={'width':390,'height':800})
        load(p)
        p.evaluate('scheme=>document.documentElement.setAttribute("data-sf-layout",scheme)',scheme)
        p.locator('[data-action="sf-joy-journey"]').click()
        check(p.locator('.sf-journey-card').is_visible(),f'{scheme}: dialog visible')
        check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{scheme}: no horizontal overflow')
        check(p.locator('.sf-journey-quest-actions button').count()==2,f'{scheme}: accessible controls')
        p.close()
    p=browser.new_page(viewport={'width':1280,'height':800})
    load(p,rich=False)
    p.locator('[data-action="sf-joy-journey"]').click()
    check(p.locator('.sf-journey-counters strong').all_inner_texts()==['0','0'],'empty stats are zero')
    check(p.locator('.sf-journey-badge.is-earned').count()==0,'no unearned milestones claimed')
    check(p.locator('.sf-journey-dot.has-work').count()==0,'empty week no fake activity')
    p.locator('.sf-journey-close').click()
    p.locator('[data-action="sf-joy-toggle"]').click()
    check(p.locator('[data-action="sf-joy-journey"]').count()==0,'opt-out removes entry')
    check(p.locator('.sf-journey-overlay').count()==0,'opt-out removes journey dialog')
    check(p.evaluate('JSON.parse(window.__science()).tasks.length')==0,'science untouched after optout')
    p.close()
    context=browser.new_context(viewport={'width':390,'height':800},reduced_motion='reduce')
    p=context.new_page()
    load(p)
    p.locator('[data-action="sf-joy-journey"]').click()
    check(p.locator('.sf-journey-card').evaluate('(e)=>getComputedStyle(e).animationName')=='none','reduced motion removes journey animation')
    context.close()
    browser.close()
print('PASS',n,'1.1.0 journey interaction assertions')
