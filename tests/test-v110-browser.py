"""1.1.0 current-release browser acceptance (isolated in-memory localStorage).
Run: python tests/test-v110-browser.py
This deliberately does not touch any existing browser profile or scientific data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(cond,desc):
    assert cond,desc
    checks.append(desc)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (390,768,950,1000,1280,1920):
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
        page.evaluate('''() => {
            window.__store=new Map();window.__failNext=false;
            Object.defineProperty(window,'localStorage',{configurable:true,value:{
                getItem:k=>window.__store.get(k)??null,
                setItem:(k,v)=>{if(window.__failNext){window.__failNext=false;throw Error('quota')}window.__store.set(k,v)},
                removeItem:k=>window.__store.delete(k)
            }});
            window.__store.set('scholarflow_v1_data',JSON.stringify({
                tasks:[{id:'t1',title:'研究任务 甲',status:'待开始',origin:'自己'}],
                notes:[{id:'n1',title:'研究想法记录',category:'创新点'}],
                papers:[{id:'p1',title:'材料论文',category:'投稿记录',status:'已投稿',submissionHistory:[{id:'h1',date:'2026-09-01',status:'Submitted',note:'首次投稿'}]}],
                literature:[{id:'l1',title:'中文材料论文',authors:'李明,王红',journal:'材料科学学报'}],
                settings:{stylePreset:'ocean',layoutScheme:'balanced',workspaceName:'用户以前的自定义名称'}
            }));
            window.confirm=()=>true;
            window.__saved=()=>JSON.parse(window.__store.get('scholarflow_v1_data'));
            window.__fire=(data,kind='click')=>{
                const el=document.createElement(kind==='change'?'select':'button');
                for(const [k,v] of Object.entries(data))el.dataset[k]=v;
                if(kind==='change'){const opt=document.createElement('option');opt.value=data._value;opt.textContent=data._value;el.append(opt);el.value=data._value;}
                document.body.append(el);el.dispatchEvent(new Event(kind,{bubbles:true}));el.remove();
            }
        }''')
        page.add_style_tag(path=str(ROOT/'styles.css'))
        page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
        page.add_script_tag(path=str(ROOT/'app.js'))
        # All routes share a single, editable brand title and no duplicate subtitle.
        check(page.locator('.sidebar .brand-text').inner_text()=='用户以前的自定义名称',f'{width}: restored custom sidebar brand name')
        check(page.locator('.sidebar .brand-text small').count()==0,f'{width}: duplicate brand subtitle removed')
        check(page.locator('.sidebar .brand-text').evaluate('(e)=>e.scrollWidth <= e.clientWidth+1'),f'{width}: brand text not clipped')
        names=page.locator('.sf-module-heading').all_text_contents()
        check(names==['科研总览','科研日常','科研过程','科研登记','工作台设置'],f'{width}: navigation headings')
        links=page.locator('nav [data-nav]').evaluate_all('(els)=>els.map(e=>e.dataset.nav)')
        check(links==['home','tasks','advisor','literature','notes','simulations','experiments','papers','statistics','files','settings'],f'{width}: 11 routes')
        check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width}: homepage no horizontal overflow')
        for mod in links:
            page.locator(f'nav [data-nav="{mod}"]').first.dispatch_event('click')
            check(page.locator('#sf-main-content').count()==1,f'{width}: {mod} main landmark')
            check(page.locator('.sidebar .brand-text').inner_text()=='用户以前的自定义名称',f'{width}: {mod} shared sidebar branding')
            check(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'),f'{width}: {mod} no horizontal overflow')
            check(not errors,f'{width}: {mod} no JavaScript error {errors}')
        page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
        check(page.locator('#translationForm').count()==1 and page.locator('#appearanceForm').count()==1,f'{width}: independent settings forms')
        if width==1280:
            page.locator('nav [data-nav="notes"]').first.dispatch_event('click')
            page.evaluate('window.__fire({viewSwitch:"notes:unknown"})')
            check(page.evaluate('window.__saved().settings.viewModes?.notes') is None,'invalid board view blocked')
            page.evaluate('window.__fire({viewSwitch:"notes:list"})')
            check(page.evaluate('window.__saved().settings.viewModes.notes')=='list','valid list view persisted')
            page.evaluate('window.__failNext=true;window.__fire({viewSwitch:"notes:board"})')
            check(page.evaluate('window.__saved().settings.viewModes.notes')=='list','failed board save leaves stored choice unchanged')
            check(page.locator('[data-view-switch="notes:list"]').get_attribute('aria-pressed')=='true','failed board save restores UI')
            page.locator('nav [data-nav="tasks"]').first.dispatch_event('click')
            page.evaluate('window.__fire({taskView:"invalid"})')
            check(page.evaluate('window.__saved().settings.viewModes?.tasks') is None,'invalid task view blocked')
            page.evaluate('window.__fire({quickStatus:"t1",_value:"恶意状态"},"change")')
            check(page.evaluate('window.__saved().tasks[0].status')=='待开始','unapproved task status blocked')
            page.evaluate('window.__fire({quickStatus:"t1",_value:"已完成"},"change")')
            check(page.evaluate('window.__saved().tasks[0].status')=='已完成','valid task status persisted')
            page.evaluate('window.__failNext=true;window.__fire({quickStatus:"t1",_value:"进行中"},"change")')
            check(page.evaluate('window.__saved().tasks[0].status')=='已完成','failed task write retains stored state')
            page.locator('nav [data-nav="papers"]').first.dispatch_event('click')
            page.evaluate('window.__failNext=true;window.__fire({historyDelete:"p1",historyId:"h1"})')
            check(page.evaluate('window.__saved().papers[0].submissionHistory.length')==1,'failed submission node deletion retains stored event')
            page.evaluate('window.__fire({historyDelete:"p1",historyId:"h1"})')
            check(page.evaluate('window.__saved().papers[0].submissionHistory.length')==0,'successful submission node deletion persists')
            page.locator('nav [data-nav="settings"]').first.dispatch_event('click')
            page.locator('#translationForm #setting_autoTranslateAbstract').uncheck()
            page.locator('#translationForm button[type="submit"]').click()
            check(page.evaluate('window.__saved().settings.autoTranslateAbstract')==False,'translation option persists')
            check(page.locator('.toast').count()==1,'save confirmation accessible')
        check(not errors,f'{width}: no uncaught errors')
        page.close()
    browser.close()
print(f'PASS {len(checks)} current-release assertions')
