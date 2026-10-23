"""1.1.0 companion: mood controls, privacy, XSS, stored progress, adaptive copy, responsive and focus."""
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
assertions=0

def check(condition, message):
    global assertions
    assert condition, message
    assertions+=1

def load(page, suspicious=False):
    title='<img src=x onerror=__XSS++> 外文阅读 & 实验' if suspicious else '进一步分析拉伸实验结果'
    raw={'tasks':[{'id':'task-1','title':title,'status':'待开始','deadline':'2026-10-30'},
                  {'id':'task-2','title':'整理数据','status':'已完成','completedAt':datetime.now().astimezone().isoformat()}],
         'notes':[{'id':'n1','title':'一个想法'}],
         'literature':[{'id':'l1','title':'某篇论文'}],
         'settings':{'workspaceName':'测试工作台'}}
    page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    page.evaluate('''raw=>{
      window.__XSS=0;window.__store=new Map([['scholarflow_v1_data',JSON.stringify(raw)]]);
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>window.__store.get(k)??null,
        setItem:(k,v)=>window.__store.set(k,v),
        removeItem:k=>window.__store.delete(k)
      }});window.__research=()=>window.__store.get('scholarflow_v1_data');
      window.__keys=()=>[...window.__store.keys()];window.confirm=()=>true;
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
        load(p,suspicious=True)
        saved=p.evaluate('window.__research()')
        check('版本 1.1.0' in p.locator('.sidebar-foot').inner_text(),f'{width}: version label')
        p.locator('[data-action="sf-joy-journey"]').click()
        check(p.locator('.sf-companion').is_visible(),f'{width}: companion visible')
        check(p.locator('.sf-companion-modes button').count()==4,f'{width}: four modes')
        check(p.locator('[data-joy-mood="focus"]').get_attribute('aria-pressed')=='true',f'{width}: focus selected')
        check('&' in p.locator('#sf-companion-message').inner_text(),f'{width}: escaped ampersand displayed')
        check(p.locator('#sf-companion-message img').count()==0,f'{width}: malicious HTML not parsed')
        check(p.evaluate('window.__XSS')==0,f'{width}: no script execution')
        for mode,phrase in [('stuck','卡点'),('rest','休息'),('smile','科研熊')]:
            p.locator(f'[data-joy-mood="{mode}"]').click()
            check(p.locator(f'[data-joy-mood="{mode}"]').get_attribute('aria-pressed')=='true',f'{width}: {mode} pressed')
            check(p.locator('#sf-companion-message').inner_text()!='',f'{width}: {mode} response')
        before=p.locator('#sf-companion-message').inner_text()
        p.locator('[data-action="sf-companion-next"]').click()
        check(p.locator('#sf-companion-message').inner_text()!=before,f'{width}: rotate playful text')
        p.locator('[data-joy-mood="focus"]').click()
        check('外文阅读' in p.locator('#sf-companion-message').inner_text(),f'{width}: real task drives focus')
        check(p.evaluate('window.__research()')==saved,f'{width}: no science-data writes')
        check(p.evaluate('window.__keys().length')==1,f'{width}: no hidden mood tracking')
        check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width}: no horizontal overflow')
        p.keyboard.press('Escape')
        check(p.locator('.sf-journey-overlay').count()==0,f'{width}: Escape closes')
        check(p.locator('[data-action="sf-joy-journey"]').evaluate('(e)=>document.activeElement===e'),f'{width}: focus returned')
        p.locator('[data-action="sf-joy-journey"]').click()
        p.locator('[data-joy-mood="stuck"]').click()
        p.locator('[data-action="sf-companion-go"]').click()
        check(p.locator('.sf-journey-overlay').count()==0,f'{width}: action closes')
        check('notes' in p.evaluate('location.hash'),f'{width}: goes to note module')
        check(p.evaluate('window.__research()')==saved,f'{width}: navigating does not mutate research data')
        check(not errors,f'{width}: no browser exception {errors}')
        p.close()
    for theme in ('balanced','night','reading','dense'):
        p=browser.new_page(viewport={'width':390,'height':780})
        load(p)
        p.evaluate('theme=>document.documentElement.setAttribute("data-sf-layout",theme)',theme)
        p.locator('[data-action="sf-joy-journey"]').click()
        p.locator('[data-joy-mood="rest"]').click()
        check(p.locator('.sf-companion-response').is_visible(),f'{theme}: response displayed')
        check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{theme}: no overflow')
        p.close()
    p=browser.new_page(viewport={'width':1280,'height':900})
    load(p)
    p.locator('[data-action="sf-joy-toggle"]').click()
    check(p.locator('[data-action="sf-joy-journey"]').count()==0,'opt out removes companion entrance')
    check(p.evaluate('window.__research()')!='','opt-out does not delete data')
    p.close()
    c=browser.new_context(reduced_motion='reduce')
    p=c.new_page()
    load(p)
    p.locator('[data-action="sf-joy-journey"]').click()
    check(p.locator('.sf-companion').evaluate('(e)=>getComputedStyle(e).animationName')=='none','reduced motion respected')
    c.close()
    browser.close()
print('PASS',assertions,'1.1.0 companion assertions')
