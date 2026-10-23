"""ScholarFlow 1.1.0 release: thin panel frames & eye surfaces.
Runs entirely in isolated in-memory localStorage; no real user data is touched.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
WIDTHS=(390,1200)
PALETTES=('ocean','sage','paper','graphite','glacier','lavender')
LAYOUTS=('balanced','dense','reading','night')
issues=[];total=0

def check(value,msg):
 global total
 total+=1
 if not value: issues.append(msg)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in WIDTHS:
  page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  page.evaluate('''() => {window.__mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)??null,setItem:(k,v)=>window.__mem.set(k,String(v)),removeItem:k=>window.__mem.delete(k)}});window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{workspaceName:'科研工作台',stylePreset:'ocean',colorMode:'standard',layoutScheme:'balanced'},profile:{name:'测试研究者',graduationDate:'2026-12-30'},tasks:[{id:'a',title:'样本任务甲',status:'待开始'},{id:'b',title:'样本任务乙',status:'进行中'},{id:'c',title:'样本任务丙',status:'已完成'}],files:[{id:'f1',title:'样本核心文件',category:'论文稿件',path:'研究资料/论文'}]}))}''')
  page.add_style_tag(path=str(ROOT/'styles.css'))
  page.add_style_tag(content='*,*::before,*::after{transition:none!important;animation:none!important}')
  page.add_script_tag(path=str(ROOT/'pdf-intelligence.js'))
  page.add_script_tag(path=str(ROOT/'app.js'))
  original=page.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for module,selectors in (
   ('home',['.sf14-graduation','.sf13-outcomes']),
   ('tasks',['.board-task','.board-column','.sf-unified-tools']),
   ('files',['.file-item','.file-manager-card']),
  ):
   page.locator(f'[data-nav="{module}"]').first.dispatch_event('click')
   # Sample all theme combinations in one browser call to avoid IPC overhead.
   samples=page.evaluate('''({selectors,palettes,layouts})=>{
     const root=document.documentElement,ret=[];
     for(const pal of palettes){for(const layout of layouts){for(const mode of ['eye','standard']){
       root.dataset.sfPreset=pal;root.dataset.sfLayout=layout;root.dataset.sfMode=mode;
       const results=selectors.map(selector=>{const node=document.querySelector(selector);if(!node)return null;const st=getComputedStyle(node);return {background:st.backgroundColor,width:parseFloat(st.borderTopWidth),line:st.borderTopColor,foreground:st.color}});
       ret.push({pal,layout,mode,results});
     }}}
     return ret;
   }''',dict(selectors=selectors,palettes=PALETTES if width==1200 else PALETTES[:2],layouts=LAYOUTS if width==1200 else ("balanced","night")))
   for sample in samples:
      tag=f'{width}/{module}/{sample["pal"]}/{sample["layout"]}/{sample["mode"]}'
      # Layout overflow is verified once after style iterations by the established browser suite.
      for selector,item in zip(selectors,sample['results']):
       check(item is not None,tag+' missing '+selector)
       if item is None:continue
       if module=='home':
        check(.9 <= item['width'] <=1.1,tag+' panel outline not 1px '+selector+str(item))
       if sample['mode']=='eye':
        if selector in ('.board-task','.file-item'):
         check(item['background']=='rgb(248, 250, 243)',tag+' item not eye tinted '+selector+str(item))
        if selector in ('.board-column','.sf-unified-tools','.file-manager-card'):
         check(item['background']=='rgb(244, 247, 238)',tag+' outer surface wrong '+selector+str(item))
       if sample['mode']=='standard' and sample['layout']=='night' and module!='home' and selector in ('.board-task','.file-item'):
        check(item['background']!='rgb(248, 250, 243)',tag+' dark mode accidentally eye tinted')
  check(page.evaluate("localStorage.getItem('scholarflow_v1_data')")==original,f'{width} read-only appearance testing must not write records')
  check(not errors,f'{width} JS error: {errors}')
  page.close()
 browser.close()
print(f'PASS {total-len(issues)}/{total} assertions; failures={len(issues)}')
for issue in issues[:30]:print('FAIL',issue)
if issues:raise SystemExit(1)
