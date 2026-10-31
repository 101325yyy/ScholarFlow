"""Offline full-workspace UI smoke for optional cloud integration. No external network."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
checks=0
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (320,390,768,1440):
        page=browser.new_page(viewport={'width':width,'height':850})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
        page.evaluate('''() => {let memory=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}});window.SCHOLARFLOW_CLOUD_CONFIG={supabaseUrl:'',publishableKey:''};window.confirm=()=>true}''')
        for css in ('styles.css','online.css','cloud.css'):
            path=R/'site'/css;page.add_style_tag(path=str(path))
        for js in ('pdf-intelligence.js','app.js','cloud-sync.js'):
            page.add_script_tag(path=str(R/'site'/js))
        assert not errors,(width,errors)
        assert page.evaluate('window.ScholarCloudStatus().configured') is False
        assert page.locator('.sf-cloud-trigger').count()==1
        checks+=3
        nav=page.locator('nav [data-nav]').evaluate_all('(els)=>els.map(e=>e.dataset.nav)')
        assert len(nav)==11,(width,nav)
        checks+=1
        for name in nav:
            page.locator(f'nav [data-nav="{name}"]').first.dispatch_event('click')
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),(width,name,'overflow')
            assert not errors,(width,name,errors)
            checks+=2
        page.locator('.sf-cloud-trigger').click()
        assert 'SDK 或公共配置尚未就绪' in page.locator('.sf-cloud-panel').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2')
        checks+=2
        page.close()
    browser.close()
print('PASS',checks,'cloud-enabled workspace UI assertions (Chromium, 4 widths, 11 modules)')
