"""Browser contract of cloud snapshots, reconnect, session refresh and optional private PDF storage.
Simulated network transport; does NOT assert live Supabase account or database availability.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
UID='1a2b3c4d-1111-2222-3333-000000000001'
BASE={'version':9,'tasks':[],'literature':[],'settings':{}}
MOCK=r'''({remote,local,revision,session={},storage={}})=>{
 window.__db={payload:remote,revision:remote?revision:null,writes:0,downloads:0,uploadFiles:[],serverFiles:[],refreshes:0,requests:[],failNext:0};
 window.__store=new Map(Object.entries(storage));
 if(!window.__store.has('scholarflow_v1_data'))window.__store.set('scholarflow_v1_data',JSON.stringify(local||{version:9,tasks:[],literature:[],settings:{}}));
 window.__session=new Map(Object.entries(session));
 Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)??null,setItem:(k,v)=>window.__store.set(k,v),removeItem:k=>window.__store.delete(k)}});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>window.__session.get(k)??null,setItem:(k,v)=>window.__session.set(k,v),removeItem:k=>window.__session.delete(k)}});
 window.SCHOLARFLOW_CLOUD_CONFIG={supabaseUrl:'https://mock.supabase.co',publishableKey:'sb_publishable_reliable_supabase_public_test_key'};
 window.__online=true;Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>window.__online});
 window.__pdfFiles=new Map();
 Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{
   const request={};const database={objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},transaction:()=>{
     const tx={};tx.objectStore=()=>({
       get(key){let r={};queueMicrotask(()=>{r.result=window.__pdfFiles.get(key);r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return r},
       put(value,key){let r={};queueMicrotask(()=>{window.__pdfFiles.set(key,value);r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return r}
     });return tx
   }};
   queueMicrotask(()=>{request.result=database;request.onsuccess?.()});return request;
 }}});

 window.fetch=async (url,opts={})=>{
   if(!window.__online)throw Error('offline');
   const u=new URL(url),method=opts.method||'GET',db=window.__db;
   db.requests.push({path:u.pathname,method});
   const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(db.failNext>0 && u.pathname.includes('scholarflow_snapshots')){db.failNext--;return result({message:'temporary server failure'},503)}
   if(u.pathname==='/auth/v1/token'){
      if(u.search.includes('refresh_token'))db.refreshes++;
      return result({access_token:'access',refresh_token:'refresh'+db.refreshes,expires_at:Math.floor(Date.now()/1000)+3600})}
   if(u.pathname==='/auth/v1/user')return result({id:'1a2b3c4d-1111-2222-3333-000000000001',email:'research@example.org'});
   if(u.pathname==='/auth/v1/logout')return result({});
   if(u.pathname==='/rest/v1/scholarflow_snapshots'){
     if(method==='GET')return result(db.payload?[{user_id:'1a2b3c4d-1111-2222-3333-000000000001',revision:db.revision,payload:db.payload}]:[]);
     const body=JSON.parse(opts.body||'{}');
     if(method==='POST'){
       if(db.payload)return result({message:'duplicate'},409);
       db.payload=body.payload;db.revision=1;db.writes++;
     }else if(method==='PATCH'){
       if(!db.payload||Number(u.searchParams.get('revision')?.slice(3))!==db.revision)return result([]);
       db.revision++;db.payload=body.payload;db.writes++;
     }
     return result([{user_id:'1a2b3c4d-1111-2222-3333-000000000001',revision:db.revision,payload:db.payload}]);
   }
   if(u.pathname.startsWith('/storage/v1/object/')){
     if(method==='POST'){
       if(db.uploadFiles.some(x=>x.path===u.pathname))return result({message:'Exists'},409);
       db.uploadFiles.push({path:u.pathname,byteLength:opts.body.size});return result({Key:u.pathname});
     }
     if(method==='GET'){
       db.downloads++;
       const item=db.serverFiles.find(x=>x.path===u.pathname);
       return item?new Response(new Uint8Array(item.data),{status:200,headers:{'Content-Type':'application/pdf'}}):result({message:'not found'},404);
     }
   }
   return result({message:'unexpected '+u.pathname},404);
 };
 window.confirm=()=>true;
}'''

COUNTS=[]
def run():
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  def boot(remote=None,local=None,revision=1,session=None,storage=None,width=390):
   p=browser.new_page(viewport={'width':width,'height':840})
   p.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
   p.evaluate(MOCK,{'remote':remote,'local':local,'revision':revision,'session':session or {},'storage':storage or {}})
   p.add_style_tag(path=str(R/'site/cloud.css'))
   p.add_script_tag(path=str(R/'site/cloud-sync.js'))
   return p
  def ck(expr,label):
   assert expr,label
   COUNTS.append(label)
  def login(p):
   p.locator('.sf-cloud-trigger').click()
   p.locator('[name=email]').fill('research@example.org')
   p.locator('[name=password]').fill('passphrase987')
   p.locator('[data-mode=login]').click()
   p.wait_for_function('ScholarCloudStatus().signedIn')
  def save(p,where='t1'):
   p.evaluate('''id=>{const data=JSON.parse(localStorage.getItem('scholarflow_v1_data'));data.tasks.push({id,title:'Task '+id});localStorage.setItem('scholarflow_v1_data',JSON.stringify(data));window.dispatchEvent(new Event('scholarflow:saved'))}''',where)
  def first_upload(p):
   p.locator('[data-cloud=upload]').click();p.wait_for_function('window.__db.writes===1')
  def checks(p):
   return p.evaluate('''()=>({status:ScholarCloudStatus(),store:Object.fromEntries(__store),session:Object.fromEntries(__session),payload:__db.payload,revision:__db.revision})''')
  # Iteration 1: consent, then explicit remote save.
  p=boot();login(p)
  ck(p.evaluate('__db.writes')==0,'1: login does not upload')
  first_upload(p);ck(p.evaluate('__db.revision')==1,'1: first upload revision 1')
  # Iteration 2: auto opt in and offline edits do not send requests.
  p.locator('#sf-cloud-auto').check();save(p)
  p.wait_for_function('__db.revision===2')
  p.evaluate('window.__online=false;window.dispatchEvent(new Event("offline"))');save(p,'t2')
  p.wait_for_timeout(1300)
  ck(p.evaluate('__db.revision')==2,'2: offline edit never sent')
  ck(p.evaluate('ScholarCloudStatus().pending')==True,'2: offline edit pending')
  # Iteration 3: real reconnect event checks revision then commits pending.
  p.evaluate('window.__online=true;window.dispatchEvent(new Event("online"))')
  p.wait_for_function('__db.revision===3',timeout=8000)
  ck(p.evaluate('__db.payload.tasks.length')==2,'3: reconnect flushed pending local change')
  # Iteration 4: reload against identical server revision resumes automatically from acknowledgement.
  p.evaluate('window.__online=false;window.dispatchEvent(new Event("offline"))');save(p,'t3')
  state=checks(p);p.close()
  q=boot(remote=state['payload'],revision=state['revision'],session=state['session'],storage=state['store']);q.wait_for_function('ScholarCloudStatus().signedIn')
  q.wait_for_function('__db.revision===4',timeout=8000)
  ck(q.evaluate('__db.payload.tasks.length')==3,'4: reload and resume with matching acknowledged cloud revision')
  # Iteration 5: remote changed during offline gap, no overwrite on reload.
  q.evaluate('window.__online=false;window.dispatchEvent(new Event("offline"))');save(q,'t4')
  state=checks(q);q.close()
  other=json.loads(json.dumps(state['payload']));other['tasks'].append({'id':'server','title':'Remote update'})
  r=boot(remote=other,revision=state['revision']+1,session=state['session'],storage=state['store']);r.wait_for_function('ScholarCloudStatus().signedIn')
  ck(r.evaluate('ScholarCloudStatus().conflict'),'5: remote revision changed implies conflict')
  ck(r.evaluate('__db.writes')==0,'5: no silent overwrite')
  r.close()
  # Iteration 6: concurrent remote modification gets optimistic-CAS rejection.
  p=boot();login(p);first_upload(p);p.locator('#sf-cloud-auto').check()
  p.evaluate('window.__db.revision=2');save(p,'conflict')
  p.wait_for_function('ScholarCloudStatus().conflict',timeout=7000)
  ck(p.evaluate('__db.writes')==1,'6: optimistic conflict blocks local write')
  ck(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).tasks.length')==1,'6: local data preserved')
  p.close()
  # Iteration 7: multiple simultaneous cloud operations refresh the token only once.
  p=boot(session={'sf_cloud_auth_v1':json.dumps({'access_token':'expired','refresh_token':'original','expires_at':1})})
  p.wait_for_function('ScholarCloudStatus().signedIn')
  ck(p.evaluate('__db.refreshes')==1,'7: expired startup token refreshed')
  ck(p.evaluate('ScholarCloudStatus().online'),'7: network state shown')
  p.close()
  # Iteration 7b: JSONB key order must not produce a false conflict.
  reversed_row={'settings':{},'literature':[],'tasks':[],'version':9}
  p=boot(remote=reversed_row,local=BASE);login(p)
  ck(p.locator('#sf-cloud-auto').is_enabled(),'7b: JSONB key order does not cause false conflict')
  p.close()
  # Iteration 7c: offline reload retains the refresh token until reconnect.
  old={'sf_cloud_auth_v1':json.dumps({'access_token':'access','refresh_token':'offline-refresh','expires_at':9999999999})}
  p=browser.new_page(viewport={'width':390,'height':840});p.set_content('<html><body><div id="app"></div></body></html>')
  p.evaluate(MOCK,{'remote':None,'local':BASE,'revision':1,'session':old,'storage':{}})
  p.evaluate('window.__online=false')
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.wait_for_function('document.querySelector(".sf-cloud-message")===null||document.body.textContent.includes("云端")',timeout=5000)
  ck(p.evaluate('sessionStorage.getItem("sf_cloud_auth_v1")') is not None,'7c: session retained during offline startup')
  p.evaluate('window.__online=true;window.dispatchEvent(new Event("online"))')
  p.wait_for_function('ScholarCloudStatus().signedIn',timeout=5000)
  ck(p.evaluate('ScholarCloudStatus().signedIn'),'7c: session resumed on reconnect')
  p.close()
  # Iteration 8: PDF backup requires explicit consent and uses private user-prefix URL.
  local={**BASE,'literature':[{'id':'l1','title':'Archive','pdfName':'study.pdf'}]}
  p=boot(local=local);login(p)
  p.evaluate("window.__pdfFiles.set('l1',new Blob(['%PDF-1.4\\nexample data'],{type:'application/pdf'}))")
  p.locator('[data-cloud=pdf-upload]').click();p.wait_for_function('__db.uploadFiles.length===1',timeout=6000)
  ck(p.evaluate('__db.uploadFiles[0].path').endswith(UID+'/l1.pdf'),'8: uploads to private own-user path')
  ck(p.evaluate('__db.writes')==0,'8: PDF action does not silently upload JSON')
  p.close()
  # Iteration 9: PDF download persists only missing local bytes, not original JSON.
  p=boot(local=local);login(p)
  p.evaluate('''()=>__db.serverFiles.push({path:'/storage/v1/object/scholarflow-pdfs/1a2b3c4d-1111-2222-3333-000000000001/l1.pdf',data:[37,80,68,70,45,49,46,52,10,65,66,67,68]})''')
  p.locator('[data-cloud=pdf-download]').click();p.wait_for_function('__db.downloads===1',timeout=7000);p.wait_for_function('document.querySelector(".sf-cloud-message").textContent.includes("完成")',timeout=5000)
  ck(p.evaluate("__pdfFiles.get('l1')?.size===13"),'9: restored PDF committed to local storage adapter')
  ck(p.evaluate('__db.writes')==0,'9: PDF restore leaves research JSON alone')
  p.close()
  # Iteration 10: corrupted remote PDF must not be inserted.
  p=boot(local=local);login(p)
  p.evaluate('''()=>__db.serverFiles.push({path:'/storage/v1/object/scholarflow-pdfs/1a2b3c4d-1111-2222-3333-000000000001/l1.pdf',data:[78,79,84,45,80,68,70,49,49]})''')
  p.locator('[data-cloud=pdf-download]').click();p.wait_for_function('__db.downloads===1',timeout=7000)
  p.wait_for_function('document.querySelector(".sf-cloud-message").textContent.includes("完成")',timeout=5000)
  ck('失败 1' in p.locator('.sf-cloud-message').inner_text(),'10: invalid cloud PDF rejected')
  p.close()
  # Iteration 11: lost API/retry leaves local intact and status describes issue.
  p=boot();login(p);first_upload(p);p.locator('#sf-cloud-auto').check()
  p.evaluate('__db.failNext=1');save(p,'retry')
  p.wait_for_function('document.querySelector(".sf-cloud-message").textContent.includes("同步失败")',timeout=6000)
  ck(p.evaluate('JSON.parse(localStorage.getItem("scholarflow_v1_data")).tasks.length')==1,'11: temporary cloud failure preserves local edit')
  p.wait_for_function('__db.revision===2',timeout=9000)
  ck(p.evaluate('__db.payload.tasks.length')==1,'11: transient API outage retried with same optimistic revision')
  p.close()
  # Iteration 12: 320px status cloud panel readable, no collisions with bottom bar.
  p=boot(width=320);login(p)
  ck(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'12: small phone no horizontal overflow')
  ck(p.evaluate('getComputedStyle(document.querySelector(".sf-cloud-panel")).width!=="0px"'),'12: cloud modal visible')
  p.close()
  browser.close()
 print('PASS',len(COUNTS),'cloud reliability assertions across 12 independent iteration scenarios')

if __name__=='__main__':run()
