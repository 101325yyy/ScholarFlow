"""UI-only board acceptance: centered move footer, 1px lines, theme consistency,
keyboard accessibility, responsive layout, and saved-category action.
Uses isolated in-memory storage; never opens a real user profile.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
PRESETS=('ocean','sage','paper','graphite','glacier','lavender')
LAYOUTS=('balanced','dense','reading','night')
WIDTHS=(390,800,1200,1600)
FAIL=[];N=0

def ck(ok,why):
 global N
 N+=1
 if not ok: FAIL.append(why)

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in WIDTHS:
  pg=browser.new_page(viewport={'width':width,'height':940},reduced_motion='reduce')
  js_err=[];pg.on('pageerror',lambda e:js_err.append(str(e)))
  pg.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  pg.evaluate('''() => {window.__mem=new Map();window.__mem.set('scholarflow_v1_data',JSON.stringify({settings:{stylePreset:'sage',layoutScheme:'balanced',categoryOptions:{notes:['科研灵感','阅读笔记','研究知识笔记'],simulations:['ABAQUS','ANSYA','CFX'],experiments:['冲蚀磨损','滑轮性能']}},notes:[{id:'n1',title:'实验方案记录',category:'科研灵感',content:'用于核验分类移动和结果对齐'},{id:'n2',title:'文献阅读笔记',category:'阅读笔记',content:'核验中英文 Mixed-Title 文本处理'},{id:'n3',title:'研究要点',category:'研究知识笔记'}],simulations:[{id:'s1',title:'材料模拟',category:'ABAQUS',status:'进行中'},{id:'s2',title:'流固耦合',category:'ANSYA',status:'计划中'},{id:'s3',title:'流场模拟',category:'CFX'}],experiments:[{id:'e1',title:'冲蚀试验',category:'冲蚀磨损',status:'进行中'},{id:'e2',title:'滑轮试验',category:'滑轮性能',status:'计划中'}]}));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__mem.get(k)??null,setItem:(k,v)=>window.__mem.set(k,v),removeItem:k=>window.__mem.delete(k)}});window.confirm=()=>true;}''')
  pg.add_style_tag(path=str(R/'styles.css'))
  pg.add_style_tag(content='*,*::before,*::after{transition:none!important;animation:none!important}')
  pg.add_script_tag(path=str(R/'pdf-intelligence.js'))
  pg.add_script_tag(path=str(R/'app.js'))
  before=pg.evaluate("localStorage.getItem('scholarflow_v1_data')")
  for mod in ('notes','simulations','experiments'):
   pg.locator(f'nav [data-nav="{mod}"]').first.dispatch_event('click')
   ck(pg.locator('.research-kanban-move').count()>=2,f'{width}/{mod}: move controls present')
   rows=pg.evaluate('''({presets,layouts})=>{
      const root=document.documentElement, res=[];
      for(const preset of presets)for(const layout of layouts)for(const mode of ['standard','eye']){
       root.dataset.sfPreset=preset;root.dataset.sfLayout=layout;root.dataset.sfMode=mode;
       const card=document.querySelector('.research-kanban-card:has(.research-kanban-move)');
       if(!card){res.push({preset,layout,mode,missing:true});continue}
       const bar=card.querySelector('.research-kanban-move'),middle=bar.querySelector('span'),buttons=bar.querySelectorAll('button');
       const b=bar.getBoundingClientRect(),m=middle.getBoundingClientRect(),a=buttons[0].getBoundingClientRect(),c=buttons[1].getBoundingClientRect(),s=getComputedStyle(bar),cs=getComputedStyle(middle);
       const footbg=getComputedStyle(bar).backgroundColor;
       const lum=c=>{const isColor=c.startsWith('color(');let rgb=c.match(/[\\d.]+/g).slice(0,3).map(Number);return rgb.map(v=>{const x=isColor?v:v/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)};
       const l1=lum(cs.color),l2=lum(getComputedStyle(card).backgroundColor),contrast=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
       const r={preset,layout,mode,contrast,border:parseFloat(s.borderTopWidth),center:(m.left+m.right)/2-(b.left+b.right)/2,text:cs.fontSize,color:cs.color,move:buttons.length,left:a.width,right:c.width,height:parseFloat(getComputedStyle(buttons[0]).height),footbg,cardBorder:parseFloat(getComputedStyle(card).borderTopWidth),columnBorder:parseFloat(getComputedStyle(card.parentElement.parentElement).borderTopWidth)};
       res.push(r);
      }
      return res;
   }''',{'presets':PRESETS if width>=1200 else ('ocean','sage','lavender'),'layouts':LAYOUTS if width>=800 else ('balanced','night')})
   for row in rows:
    tag=f'{width}/{mod}/{row["preset"]}/{row["layout"]}/{row["mode"]}'
    ck(not row.get('missing'),tag+' no card')
    if row.get('missing'):continue
    ck(abs(row['border']-1)<.1,tag+' footer separator must be 1px')
    ck(abs(row['cardBorder']-1)<.1,tag+' card frame must be 1px')
    ck(abs(row['columnBorder']-1)<.1,tag+' column frame must be 1px')
    ck(abs(row['center'])<=1,tag+f' footer text not horizontally centered {row["center"]:.2f}px')
    ck(abs(row['left']-row['right'])<=1,tag+' unequal arrow tracks')
    ck(float(row['text'].replace('px',''))>=11,tag+' tiny instructional label')
    ck(row['height']>=32,tag+' arrow control too small')
    ck(row['contrast']>=4.5,tag+f' instructional label contrast {row["contrast"]:.2f}:1')
   ck(pg.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width}/{mod}: no horizontal viewport overflow')
   ck(not js_err,f'{width}/{mod}: JS errors {js_err}')
  ck(pg.evaluate("localStorage.getItem('scholarflow_v1_data')")==before,f'{width}: styles did not modify persisted records')
  if width==1200:
   pg.evaluate("() => {document.documentElement.dataset.sfPreset='sage';document.documentElement.dataset.sfMode='eye';document.documentElement.dataset.sfLayout='balanced'}")
   pg.locator('[data-nav="notes"]').first.dispatch_event('click')
   btn=pg.locator('[data-board-move="notes"][data-id="n1"]:not([disabled])').first
   ck(btn.count()==1,'enabled notes move control remains available')
   if btn.count():
    before_cat=pg.evaluate('''() => JSON.parse(localStorage.getItem('scholarflow_v1_data')).notes.find(x=>x.id==='n1').category''')
    btn.click()
    after_cat=pg.evaluate('''() => JSON.parse(localStorage.getItem('scholarflow_v1_data')).notes.find(x=>x.id==='n1').category''')
    ck(before_cat != after_cat,'arrow move persists updated category')
   pg.locator('[data-nav="experiments"]').first.dispatch_event('click')
   active=pg.locator('.research-kanban-move button:not([disabled])').first
   active.focus()
   pg.keyboard.press('Shift+Tab')
   pg.keyboard.press('Tab')
   focus=active.evaluate('''e=>({outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth})''')
   ck(focus['outline']!='none' and float(focus['width'].replace('px',''))>=2,'keyboard focus remains legible')
  pg.close()
 browser.close()
print(f'board UI audit: {N-len(FAIL)}/{N} PASS')
for f in FAIL[:25]:print('FAIL',f)
if FAIL:raise SystemExit(1)
