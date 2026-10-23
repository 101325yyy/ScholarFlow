"""Short, synthetic, non-production UI responsiveness sample; not a long-soak test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from statistics import median
from time import perf_counter
import json
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':900})
 page.set_content('<!doctype html><html lang="zh-CN"><body><div id="app"></div></body></html>')
 page.evaluate('''()=>{const literature=Array.from({length:750},(_,i)=>({id:'l'+i,title:'人工合成文献 '+i,authors:'研究者甲，研究者乙',journal:'虚构测试期刊',year:2020+i%5}));const tasks=Array.from({length:400},(_,i)=>({id:'t'+i,title:'测试任务 '+i,status:i%3===0?'已完成':'待开始'}));const value=JSON.stringify({literature,tasks});window.__store=new Map([['scholarflow_v1_data',value]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}})}''')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_style_tag(path=str(P/'styles.css'));page.add_script_tag(path=str(P/'pdf-intelligence.js'));page.add_script_tag(path=str(P/'app.js'))
 durations=[]
 for route in ['literature','tasks','papers','literature','tasks','home','settings','literature','settings']:
  t=perf_counter();page.locator(f'[data-nav="{route}"]').first.dispatch_event('click');durations.append(round((perf_counter()-t)*1000,1))
 assert not errors,errors
 metrics={'scenario':'750 synthetic literature + 400 synthetic tasks; 9 module transitions; Linux Chromium; includes test command overhead','samples_ms':durations,'median_ms':median(durations),'maximum_ms':max(durations),'js_errors':errors,'limitation':'Single-browser, short run; not 72h, not cross-platform, not 100 concurrent users'}
 (P/'V110-PERF.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
 print('PERFORMANCE',json.dumps(metrics,ensure_ascii=False))
 browser.close()
