"""ScholarFlow 1.1.0: targeted eye-comfort hero regression.
Checks *computed* foreground vs real element/background palette, not merely
CSS selector existence. Real app rendering uses isolated in-memory records.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re

ROOT=Path(__file__).resolve().parents[1]
PALETTES=('ocean','sage','paper','graphite','glacier','lavender')
LAYOUTS=('balanced','dense','reading','night')
WIDTHS=(390,800,1200,1600)
COUNT=0
FAIL=[]

def ck(ok, message):
    global COUNT
    COUNT+=1
    if not ok: FAIL.append(message)

def lum(x):
    c=[int(v) for v in re.findall(r'\d+',x)[:3]] if x.startswith('rgb') else [int(x[i:i+2],16) for i in (1,3,5)]
    return sum(w*(v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4) for w,v in zip((.2126,.7152,.0722),c))

def ratio(a,b):
    x,y=sorted((lum(a),lum(b)))
    return (y+.05)/(x+.05)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in WIDTHS:
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
        page.evaluate('''()=>{window.__mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)||null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',colorMode:'eye',layoutScheme:'balanced'},profile:{name:'示例用户',degree:'博士研究生',major:'力学',cohort:'2025级',researchDirection:'测试方向',graduationDate:'2026-12-30'},tasks:[],papers:[]}))}''')
        page.add_style_tag(path=str(ROOT/'styles.css'))
        page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
        page.add_script_tag(path=str(ROOT/'app.js'))
        for palette in PALETTES:
            for layout in LAYOUTS:
                d=page.evaluate('''({palette,layout})=>{
                    const root=document.documentElement;
                    root.dataset.sfPreset=palette;root.dataset.sfLayout=layout;root.dataset.sfMode='eye';
                    const sels=['.sf13-profile-link','.sf13-outcome-hint','.sf13-outcomes button','.sf14-grad-edit','.sf36-profile-row small'];
                    return {elements:sels.map(s=>{const e=document.querySelector(s);const st=e?getComputedStyle(e):null;return e?{selector:s,color:st.color,bg:st.backgroundColor,opacity:st.opacity,width:e.getBoundingClientRect().width}:null}),overflow:document.documentElement.scrollWidth>window.innerWidth+2};
                }''',{'palette':palette,'layout':layout})
                ck(not d['overflow'],f'{width}/{palette}/{layout} page horizontal overflow')
                for elem in d['elements']:
                    ck(elem is not None,f'{width}/{palette}/{layout} missing element')
                    if elem is None: continue
                    s=elem['selector']
                    # Transparent controls live on the lightest/worst-case eye gradient.
                    background=elem['bg'] if elem['bg'].startswith('rgb(') else '#dce9d6'
                    ck(ratio(elem['color'],background)>=4.5,f'{width}/{palette}/{layout} {s}: {ratio(elem["color"],background):.2f}:1')
                    ck(float(elem['opacity'])>=.95,f'{width}/{palette}/{layout} {s} faded opacity')
        # Normal appearance must preserve navy-hero design, not inherit eye overrides.
        page.evaluate("document.documentElement.dataset.sfMode='standard';document.documentElement.dataset.sfLayout='balanced';document.documentElement.dataset.sfPreset='ocean'")
        ck(page.locator('.sf13-profile-link').evaluate("e=>getComputedStyle(e).color")=='rgb(245, 249, 255)',f'{width} standard hero text unchanged')
        # Existing actions still navigate; no record writes on theme-only actions.
        raw=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
        page.locator('.sf13-profile-link').dispatch_event('click')
        ck(page.locator('.settings-intro').count()>0,f'{width} profile link navigates to settings')
        ck(page.evaluate("localStorage.getItem('scholarflow_v1_data')")==raw,f'{width} navigating leaves records unchanged')
        page.locator('[data-nav="home"]').first.dispatch_event('click')
        page.locator('.sf13-outcomes button').dispatch_event('click')
        ck(page.locator('[data-nav="statistics"].active').count()>0,f'{width} outcome link still navigates')
        ck(not errors,f'{width} JavaScript errors: {errors}')
        page.close()
    browser.close()

print(f'Computed-style tests: {COUNT}; failed: {len(FAIL)}')
for issue in FAIL[:20]:print('FAIL:',issue)
if FAIL:raise SystemExit(1)
