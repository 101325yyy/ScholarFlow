"""UI acceptance for 2026.11.3; synthetic data and isolated browser state only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=0

def check(value,label):
 global checks
 checks+=1
 assert value,label

def boot(b,width):
 p=b.new_page(viewport={'width':width,'height':910},reduced_motion='reduce');p.set_default_timeout(4000)
 errors=[];p.on('pageerror',lambda err:errors.append(str(err)))
 p.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
 p.evaluate('''() => {const initial={version:9,settings:{stylePreset:'ocean',layoutScheme:'balanced'},tasks:[{id:'t1',title:'材料力学测试',status:'待开始',deadline:'2026-11-04'}],literature:[{id:'l1',title:'先进材料中的热解过程',authors:'王志强'}],knowledgeLinks:[{id:'old1',fromType:'tasks',fromId:'t1',toType:'literature',toId:'l1',relation:'相关'}]}; window.__savedData=new Map([['scholarflow_v1_data',JSON.stringify(initial)]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__savedData.get(k)||null,setItem:(k,v)=>window.__savedData.set(k,v),removeItem:k=>window.__savedData.delete(k)}});window.confirm=()=>true}''')
 for f in ('styles.css','research-suite.css'):p.add_style_tag(path=str(ROOT/f))
 for f in ('pdf-intelligence.js','research-suite.js','app.js'):p.add_script_tag(path=str(ROOT/f))
 return p,errors

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,360,390,430,650,768,900,1024,1440):
  p,errors=boot(b,width)
  check(p.locator('.suite-nav').count()==1,f'{width} exactly one planner entry')
  check(p.locator('.nav-label').all_text_contents().count('科研日常')==1,f'{width} daily group preserved')
  order=p.locator('.sidebar nav > *').evaluate_all("els=>els.map(e=>e.getAttribute('data-nav')||e.getAttribute('data-suite-route')||e.textContent.trim())")
  check(order.index('advisor') < order.index('planner') < order.index('科研过程'),f'{width} planner under daily')
  check(not p.locator('[data-suite-route="knowledge"], [data-suite-route="reading"], [data-suite-route="search-all"]').count(),f'{width} removed modules have no links')
  check('研究效率' not in p.locator('.sidebar').inner_text(),f'{width} obsolete heading gone')
  check(p.locator('.suite-week-overview').count()==1 and p.locator('.suite-home-strip').count()==0,f'{width} compact redesigned weekly card')
  check(p.locator('.dashboard-v16').count()==1 and p.locator('.dashboard-v16 .suite-week-overview').count()==1,f'{width} weekly summary inside dashboard after hero')
  check(not p.locator('.suite-search-trigger').count(),f'{width} no duplicate search button')
  check(p.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),f'{width} no home overflow')
  p.locator('[data-suite-route="planner"]').first.dispatch_event('click')
  check(p.locator('#suite-plan-form').count()==1 and p.locator('.suite-week-grid').count()==1,f'{width} planner opens')
  check(p.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),f'{width} no planner overflow')
  # legacy unknown URL cannot reopen removed page
  p.evaluate("location.hash='knowledge'")
  p.wait_for_timeout(90)
  check(p.locator('#suite-link-form').count()==0 and p.locator('.dash-hero').count()==1,f'{width} stale knowledge route safely falls back')
  check(not errors,f'{width} JS errors: {errors}')
  p.close()
 p,errors=boot(b,390)
 print('BEGIN INTERACTION',flush=True)
 # Native input method: composition must not rebuild search input or convert pinyin ahead of commit.
 for target in ('globalSearch','moduleSearch'):
  print('IME',target,flush=True)
  if target=='moduleSearch':p.locator('[data-nav="tasks"]').first.dispatch_event('click')
  inp=p.locator('#'+target)
  inp.focus()
  inp.evaluate('''el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));el.value='ceshi';el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'ceshi',isComposing:true}));}''')
  p.wait_for_timeout(330)
  check(inp.evaluate('(el)=>el.isConnected&&el.value==="ceshi"'),target+' remains mounted during IME')
  inp.evaluate('''el=>{el.value='测试';el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'测试'}));el.dispatchEvent(new InputEvent('input',{bubbles:true,data:'测试',inputType:'insertText'}));}''')
  p.wait_for_timeout(380)
  check(p.locator('#'+target).input_value()=='测试',target+' Chinese selected text preserved')
  check(p.locator('#'+target).evaluate('(el)=>document.activeElement===el'),target+' focus restored after commit')
 # an actual Chinese query should filter module records
 p.locator('#moduleSearch').fill('材料')
 p.wait_for_timeout(380)
 check('材料' in p.locator('#moduleSearch').input_value(),'module filter can accept Chinese')
 print('PLANNER',flush=True)
 p.locator('[data-suite-route="planner"]').first.dispatch_event('click')
 p.locator('#suite-plan-form [name=title]').fill('完成多物理场仿真')
 print('BUTTON RECT',p.locator('#suite-plan-form button[type=submit]').evaluate('(e)=>({r:e.getBoundingClientRect().toJSON(),p:e.parentElement.getBoundingClientRect().toJSON(),html:e.outerHTML.slice(0,130),scroll:document.documentElement.scrollTop})'),flush=True)
 p.locator('#suite-plan-form button[type=submit]').dispatch_event('click')
 check(p.evaluate('JSON.parse(window.__savedData.get("scholarflow_v1_data")).weeklyPlans.length')==1,'planner can save')
 check(p.evaluate('JSON.parse(window.__savedData.get("scholarflow_v1_data")).knowledgeLinks.length')==1,'legacy knowledge data preserved untouched')
 p.locator('[data-suite-plan-check]').first.check()
 check(p.evaluate('JSON.parse(window.__savedData.get("scholarflow_v1_data")).weeklyPlans[0].done'),'planner checkbox works')
 p.locator('[data-suite-plan-delete]').first.click()
 check(p.evaluate('JSON.parse(window.__savedData.get("scholarflow_v1_data")).weeklyPlans.length')==0,'planner removal works')
 # PDF sidecar stays integrated in literature and stores existing notes.
 print('PDF',flush=True)
 p.locator('[data-nav="literature"]').first.dispatch_event('click')
 check(p.evaluate('typeof window.SFResearchSuite.pdfSidecarHtml')=='function','annotations remain in PDF reader')
 p.evaluate('''() => {let d=document.createElement('div');d.id='testpdf';d.innerHTML=window.SFResearchSuite.pdfSidecarHtml('l1');document.body.append(d)}''')
 p.locator('#testpdf [name=quote]').fill('论文第六页的研究结论')
 p.locator('#testpdf [name=page]').fill('6')
 p.locator('#testpdf #suite-pdf-annotation-form button[type=submit]').dispatch_event('click')
 check(p.evaluate('JSON.parse(window.__savedData.get("scholarflow_v1_data")).annotations[0].page')==6,'reader annotation persisted')
 check(not errors,'interaction JS exceptions: '+repr(errors))
 p.close()
 b.close()
print('PASS',checks,'UI / IME / planner / PDF tests')
