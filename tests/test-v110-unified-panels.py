"""V1.1.0 shared component visual regression and action semantics.
Pure UI tests in isolated memory, never the user's stored research data.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
WIDTHS=(390,800,1200,1600)
PALETTES=('ocean','sage','paper','graphite','glacier','lavender')
LAYOUTS=('balanced','dense','reading','night')
MODES=('standard','eye')
COUNT=0;BAD=[]
def assert_ui(x,label):
 global COUNT
 COUNT+=1
 if not x:BAD.append(label)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in WIDTHS:
  page=browser.new_page(viewport={'width':w,'height':900},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.evaluate('''()=>{const m=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});m.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',colorMode:'standard',layoutScheme:'balanced'},profile:{name:'示例用户',degree:'博士研究生',major:'力学',cohort:'2025级',researchDirection:'材料实验',graduationDate:'2026-12-30'},tasks:[],papers:[],activities:[]}));}''')
  page.add_style_tag(path=str(ROOT/'styles.css'))
  page.add_style_tag(content='*,*::before,*::after{transition:none!important;animation:none!important}')
  page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
  page.add_script_tag(path=str(ROOT/'app.js'))
  raw=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
  items=page.evaluate('''()=>{const ret=[]; const els={profile:document.querySelector('.sf13-profile-link'),date:document.querySelector('.sf14-grad-edit'),outcomes:document.querySelector('.sf13-outcomes>button'),graduation:document.querySelector('.sf14-graduation'),stats:document.querySelector('.sf13-outcomes')};for(const [name,el] of Object.entries(els))ret.push([name,!!el]);return ret;}''')
  for name,exists in items:assert_ui(exists,f'{w} missing {name}')
  for preset in PALETTES:
   for mode in MODES:
    for layout in LAYOUTS:
     values=page.evaluate('''([preset,mode,layout])=>{
       let root=document.documentElement;root.dataset.sfPreset=preset;root.dataset.sfMode=mode;root.dataset.sfLayout=layout;
       const get=s=>{let el=document.querySelector(s);let cs=getComputedStyle(el);let r=el.getBoundingClientRect();return {color:cs.color,bg:cs.backgroundColor, border:cs.borderColor,borderWidth:parseFloat(cs.borderTopWidth),radius:parseFloat(cs.borderTopLeftRadius),height:r.height,width:r.width,opacity:parseFloat(cs.opacity),display:cs.display,margin:parseFloat(cs.marginTop),outline:cs.outlineColor}};
       return {graduation:get('.sf14-graduation'),outcomePanel:get('.sf13-outcomes'),controls:['.sf13-profile-link','.sf14-grad-edit','.sf13-outcomes>button'].map(get),overflow:document.documentElement.scrollWidth-innerWidth};
     }''',[preset,mode,layout])
     tag=f'{w}/{preset}/{mode}/{layout}'
     g=values['graduation'];assert_ui(.9<=g['borderWidth']<=1.1,tag+' countdown should use shared thin 1px frame')
     assert_ui(g['radius']>=13,tag+' countdown radius')
     assert_ui(values['outcomePanel']['borderWidth']>=1,tag+' outcomes border')
     assert_ui(values['overflow']<=2,tag+f' document overflow {values["overflow"]}')
     cs=values['controls']
     for i,c in enumerate(cs):
      assert_ui(c['height']>=29 and c['width']>=40,tag+f' action {i} usable')
      assert_ui(c['borderWidth']>=1,tag+f' action {i} border')
      assert_ui(c['radius']>=9,tag+f' action {i} radius')
      assert_ui(c['opacity']>=.95,tag+f' action {i} faded')
     assert_ui(max(c['height'] for c in cs)-min(c['height'] for c in cs)<4,tag+' three hero buttons unequal heights')
     if mode=='eye':
      assert_ui(g['border'].startswith('rgb(137, 166, 141)'),tag+' eye graduation needs legible sage border')
      assert_ui(all(c['color']=='rgb(41, 75, 54)' for c in cs),tag+' eye action text not uniform')
  # Navigate one of each existing module, verify common card structure and no overflow.
  page.evaluate("document.documentElement.dataset.sfPreset='ocean';document.documentElement.dataset.sfMode='standard';document.documentElement.dataset.sfLayout='balanced'")
  for module in ('home','tasks','teachers','literature','ideas','debug','experiments','papers','statistics','files','settings'):
   sel=f'[data-nav="{module}"]'
   if page.locator(sel).count()==0:continue
   page.locator(sel).first.dispatch_event('click')
   assert_ui(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{w}/{module} overflowing')
   assert_ui(not errors,f'{w}/{module} script errors')
  page.locator('[data-nav="home"]').first.dispatch_event('click')
  page.locator('.sf14-grad-edit').dispatch_event('click')
  assert_ui(page.locator('[data-nav="settings"].active').count()>0,f'{w} edit date navigation')
  page.locator('[data-nav="home"]').first.dispatch_event('click')
  page.locator('.sf13-outcomes>button').dispatch_event('click')
  assert_ui(page.locator('[data-nav="statistics"].active').count()>0,f'{w} outcomes navigation')
  assert_ui(page.evaluate("localStorage.getItem('scholarflow_v1_data')")==raw,f'{w} mere navigation changes stored records')
  page.close()
 browser.close()
print('UI assertions:',COUNT,'failures:',len(BAD))
for x in BAD[:30]:print('FAIL:',x)
if BAD:raise SystemExit(1)
