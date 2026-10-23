"""1.1.0 UI-only acceptance: writing times, paper alignment, theme/mobile, saved task review.
Browser state is isolated and never touches user data.
"""
from pathlib import Path
from datetime import date,timedelta
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
N=0

def ok(value, msg):
 global N
 assert value,msg
 N+=1

def main():
 today=date.today(); start=(today-timedelta(days=11)).isoformat();last=(today-timedelta(days=4)).isoformat()
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (390,800,1200,1600):
   p=b.new_page(viewport={'width':width,'height':950},reduced_motion='reduce' if width==800 else 'no-preference')
   err=[];p.on('pageerror',lambda e:err.append(str(e)))
   p.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
   p.evaluate('''({start,last,today})=>{
    window.__m=new Map();
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__m.get(k)??null,setItem:(k,v)=>window.__m.set(k,v),removeItem:k=>window.__m.delete(k)}});
    window.__m.set('scholarflow_v1_data',JSON.stringify({
     tasks:[{id:'t1',title:'<img src=x onerror=alert(1)>',status:'已完成',completedAt:today+'T12:00:00.000Z'}, {id:'t2',title:'待处理',status:'待开始'}],
     papers:[{id:'p1',title:'Draft 论文写作示例',category:'在写论文',status:'写作中',writingHistory:[{id:'w1',date:start,stage:'Draft',progressStatus:'已完成'},{id:'w2',date:last,stage:'Revision',progressStatus:'进行中'}]},
      {id:'p2',title:'投稿论文',category:'投稿记录',status:'审稿中',submissionHistory:[{id:'s1',date:start,status:'Submitted'},{id:'s2',date:last,status:'With Editor'}]}],
     literature:[{id:'l1',title:'已有文献',authors:'张三',journal:'材料学报'}],
     settings:{stylePreset:'ocean',layoutScheme:'balanced',workspaceName:'科研工作台'}
    }));window.confirm=()=>true;
   }''',{'start':start,'last':last,'today':today.isoformat()})
   p.add_style_tag(path=str(ROOT/'styles.css'));p.add_script_tag(path=str(ROOT/'pdf-intelligence.js'));p.add_script_tag(path=str(ROOT/'app.js'))
   for theme in ('ocean','sage','paper','graphite','glacier','lavender'):
    for layout in ('balanced','dense','reading','night'):
     p.evaluate('''({theme,layout})=>{document.documentElement.dataset.sfPreset=theme;document.documentElement.dataset.sfLayout=layout}''',{'theme':theme,'layout':layout})
     p.locator('[data-nav="papers"]').first.dispatch_event('click')
     ok(p.locator('.sf-paper-stats .stat-mini').count()==3,f'{width}/{theme}/{layout} stats count')
     ok(p.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width}/{theme}/{layout} no horizontal overflow')
     ok(p.locator('.research-kanban-column[data-board-drop="papers"] .research-kanban-card .v131-stage').count()==2,f'{width}/{theme}/{layout} both stages')
     ok('已持续' in p.locator('.research-kanban-column[data-group="在写论文"] .stage-hint').inner_text(),f'{width}/{theme}/{layout} writing duration')
     if width>=1200:
      widths=p.locator('.sf-paper-stats .stat-mini').evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().width)')
      ok(max(widths)-min(widths)<3,f'{width}/{theme}/{layout} 3 cards equal width')
     ok(not err,f'{width}/{theme}/{layout} no page JS error: {err}')
   p.evaluate("document.documentElement.dataset.sfPreset='sage';document.documentElement.dataset.sfLayout='reading';document.documentElement.dataset.sfMode='eye'")
   p.locator('[data-nav="papers"]').first.dispatch_event('click')
   ok(p.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'{width} eye-mode paper UI no overflow')
   p.evaluate("document.documentElement.dataset.sfMode='standard'")
   p.evaluate("document.documentElement.dataset.sfPreset='ocean';document.documentElement.dataset.sfLayout='balanced'")
   p.locator('.research-kanban-column[data-group="在写论文"] .board-card-visit').first.dispatch_event('click')
   ok('历时' in p.locator('.writing-history .research-timeline').inner_text(),f'{width} writing timeline displays days')
   p.locator('[data-nav="literature"]').first.dispatch_event('click')
   p.locator('[data-action="add:literature"]').first.dispatch_event('click')
   ok(p.locator('#sf-article-type-hint').count()==1,f'{width} category disclosure')
   ok('并非数据库收录认证' in p.locator('#sf-article-type-hint').inner_text(),f'{width} no false indexing promise')
   ok(p.locator('#field_articleType').get_attribute('aria-describedby')=='sf-article-type-hint',f'{width} hint ARIA')
   p.locator('#field_articleType').select_option('中文')
   p.locator('#field_title').fill('An English title after manual choice')
   ok(p.locator('#field_articleType').input_value()=='中文',f'{width} manual article type choice is preserved')
   # Saved snapshot is the sole source for feedback, never a temporary in-memory change.
   p.locator('[data-nav="home"]').first.dispatch_event('click')
   p.locator('[data-action="sf-joy-journey"]').first.dispatch_event('click')
   ok(p.locator('.sf-research-review').count()==1,f'{width} voluntary research recap')
   ok('最近七天完成' in p.locator('.sf-research-review').inner_text(),f'{width} recap is labelled')
   ok(p.locator('.sf-research-review').locator('strong').count()>=2,f'{width} recap derived counts')
   ok(p.locator('.sf-review-data').evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'),f'{width} review fits screen')
   p.keyboard.press('Escape')
   ok(p.locator('.sf-journey-overlay').count()==0,f'{width} Escape closes overlay')
   p.close()
  b.close()
 print(f'PASS {N} 1.1.0 UI acceptance assertions')
if __name__=='__main__':main()
