"""Fifty-one independent audit rounds: 36 layout/route checks + 15 cloud failure-mode scenarios.
All cloud I/O is mocked. This is NOT a live Supabase acceptance test.
Run: python tests/test-cloud-2026-11-2-50-rounds.py
"""
from pathlib import Path
import importlib.util
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reliability',ROOT/'tests/test-cloud-reliability.py')
rel=importlib.util.module_from_spec(spec);spec.loader.exec_module(rel)
BASE={'version':9,'tasks':[],'literature':[],'settings':{}}
ROUNDS=[]

def check(ok,name):
 if not ok:raise AssertionError(f'Round {len(ROUNDS)+1}: {name}')
 ROUNDS.append(name)

def cloud_page(b,remote=None,local=None,revision=1):
 p=b.new_page(viewport={'width':390,'height':850})
 p.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
 p.evaluate(rel.MOCK,{'remote':remote,'local':local or BASE,'revision':revision,'session':{},'storage':{}})
 p.add_style_tag(path=str(ROOT/'site/cloud.css'))
 p.add_script_tag(path=str(ROOT/'site/cloud-sync.js'))
 p.locator('.sf-cloud-trigger').click()
 p.locator('[name=email]').fill('cloud@example.org')
 p.locator('[name=password]').fill('passphrase987')
 p.locator('[data-mode=login]').click()
 p.wait_for_function('ScholarCloudStatus().signedIn')
 return p

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 # 36 distinct layout/route iterations: isolated browser document on six widths, six modules each.
 for width in (320,360,390,430,768,1440):
  p=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
  errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  p.evaluate('''() => {window.__store=new Map([['scholarflow_v1_data',JSON.stringify({version:9,tasks:[{id:'t1',title:'科研任务'}],literature:[{id:'l1',title:'研究文献'}],settings:{}})]]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});window.confirm=()=>true}''')
  for css in ('styles.css','research-suite.css'):p.add_style_tag(path=str(ROOT/'site'/css))
  for js in ('pdf-intelligence.js','research-suite.js','app.js'):p.add_script_tag(path=str(ROOT/'site'/js))
  for module,selector in [('home','.dash-hero'),('tasks','.workspace-title'),('literature','.workspace-title'),('advisor','.workspace-title'),('planner','#suite-plan-form'),('papers','.workspace-title')]:
   if module=='planner':p.locator('[data-suite-route="planner"]').first.dispatch_event('click')
   elif module!='home':p.locator(f'[data-nav="{module}"]').first.dispatch_event('click')
   status=p.evaluate('''()=>({over:document.documentElement.scrollWidth-innerWidth,duplicate:[...document.querySelectorAll('[id]')].map(x=>x.id).filter((x,i,a)=>a.indexOf(x)<i),visible:!!document.querySelector('#sf-main-content')})''')
   check(p.locator(selector).count()>0 and status['over']<=2 and not status['duplicate'] and not errors and status['visible'],f'{width}px / {module} renders without overflow, duplicate DOM ID or JS exception')
  p.close()
 # Five stale cloud revisions are blocked *before* touching any local storage.
 for revision in (1,2,4,7,15):
  local={'version':9,'tasks':[{'id':'local-'+str(revision)}],'literature':[],'settings':{}}
  remote={'version':9,'tasks':[{'id':'old'}],'literature':[],'settings':{}}
  p=cloud_page(b,remote=remote,local=local,revision=revision)
  p.evaluate('''() => {__db.revision+=1;__db.payload={version:9,tasks:[{id:'new-server'}],literature:[],settings:{}}}''')
  p.locator('[data-cloud="download"]').click()
  p.wait_for_function('ScholarCloudStatus().conflict')
  check(p.evaluate("JSON.parse(__store.get('scholarflow_v1_data')).tasks[0].id")=='local-'+str(revision) and p.evaluate('__db.writes')==0,f'stale remote restore rejected at revision {revision}')
  p.close()
 # Two successful restores require fresh GET and explicit confirmations; store audit marker in window.name.
 for revision in (3,9):
  local={'version':9,'tasks':[{'id':'local'}],'literature':[],'settings':{}}
  remote={'version':9,'tasks':[{'id':'fresh-'+str(revision)}],'literature':[],'settings':{}}
  p=cloud_page(b,remote=remote,local=local,revision=revision)
  p.evaluate('''() => {const old=window.localStorage;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>old.getItem(k),setItem:(k,v)=>{if(k==='scholarflow_v1_data')window.name=v;old.setItem(k,v)},removeItem:k=>old.removeItem(k)}})}''')
  p.locator('[data-cloud="download"]').click()
  p.wait_for_function('window.name.includes("fresh-")',timeout=5000)
  check(p.evaluate('window.name.includes("fresh-'+str(revision)+'")'),f'fresh verified restore at revision {revision}')
  p.close()
 # Two temporary server errors should retry automatically, two permanent errors must not.
 for status_code in (503,503,400,400):
  p=cloud_page(b);p.locator('[data-cloud=upload]').click();p.wait_for_function('__db.revision===1');p.locator('#sf-cloud-auto').check()
  p.evaluate('''status=>{let original=window.fetch;window.__failedRequests=0;window.fetch=async(...args)=>{const url=new URL(args[0]);const method=args[1]?.method||'GET';if(method==='PATCH'&&url.pathname.includes('scholarflow_snapshots')){window.__failedRequests++;if(window.__failedRequests===1)return new Response(JSON.stringify({message:'simulated error'}),{status,headers:{'Content-Type':'application/json'}})}return original(...args)}}''',status_code)
  p.evaluate('''()=>{let x=JSON.parse(__store.get('scholarflow_v1_data'));x.tasks.push({id:'a',title:'A'});localStorage.setItem('scholarflow_v1_data',JSON.stringify(x));dispatchEvent(new Event('scholarflow:saved'))}''')
  p.wait_for_function('window.__failedRequests>=1',timeout=6000)
  if status_code==503:
   p.wait_for_function('__db.revision===2',timeout=11000)
   good=p.evaluate('__failedRequests===2')
  else:
   p.wait_for_timeout(4100)
   good=p.evaluate('__failedRequests===1&&__db.revision===1')
  check(good,f'HTTP {status_code} retry policy (transient only)')
  p.close()
 # Two cloud CAS conflicts must block and preserve local content.
 for n in (20,32):
  p=cloud_page(b);p.locator('[data-cloud=upload]').click();p.wait_for_function('__db.revision===1');p.locator('#sf-cloud-auto').check()
  p.evaluate('''n=>{__db.revision=n;let x=JSON.parse(__store.get('scholarflow_v1_data'));x.tasks.push({id:'local-task'});localStorage.setItem('scholarflow_v1_data',JSON.stringify(x));dispatchEvent(new Event('scholarflow:saved'))}''',n)
  p.wait_for_function('ScholarCloudStatus().conflict',timeout=7000)
  check(p.evaluate("JSON.parse(__store.get('scholarflow_v1_data')).tasks.some(t=>t.id==='local-task')") and p.evaluate('ScholarCloudStatus().autoSync===false'),f'revision CAS conflict {n} blocks auto overwrite')
  p.close()
 # One explicit-first-upload consent check.
 p=cloud_page(b)
 check(p.evaluate('__db.writes===0&&ScholarCloudStatus().autoSync===false'),'login never initiates upload or opts in to auto-sync')
 p.close()
 # One additional independent race: remote changes while confirmation dialog is open.
 p=cloud_page(b,remote={'version':9,'tasks':[{'id':'old-server'}],'literature':[],'settings':{}},local={'version':9,'tasks':[{'id':'local'}],'literature':[],'settings':{}},revision=11)
 p.evaluate("""() => {let confirmations=0;window.confirm=()=>{confirmations++;if(confirmations===2){__db.revision=12;__db.payload={version:9,tasks:[{id:'new-server'}],literature:[],settings:{}}}return true}}""")
 p.locator('[data-cloud="download"]').click()
 p.wait_for_function('ScholarCloudStatus().conflict',timeout=7000)
 check(p.evaluate("JSON.parse(__store.get('scholarflow_v1_data')).tasks[0].id==='local'"),'remote update during confirmation rejected without overwriting local data')
 p.close()
 b.close()
print(f'PASS {len(ROUNDS)}/{len(ROUNDS)} independent audit rounds (36 UI + 15 cloud)')
for i,label in enumerate(ROUNDS,1):print(f'{i:02d}. {label}')
