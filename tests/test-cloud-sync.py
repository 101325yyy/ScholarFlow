"""Offline contract tests for ScholarFlow optional Supabase Auth + RLS REST client.
No external network or real accounts are accessed. Run: python tests/test-cloud-sync.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
JS=str(ROOT/'site/cloud-sync.js')
BASE={"version":9,"tasks":[],"literature":[],"settings":{}}
MOCK=r'''({remote,revision=1,local})=>{
 window.__db={revision:remote?revision:null,payload:remote||null,requests:[],writes:0};
 const v=local==null?{version:9,tasks:[],literature:[],settings:{}}:local;
 window.__store=new Map([['scholarflow_v1_data',JSON.stringify(v)]]);
 Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__store.get(k)||null,setItem:(k,val)=>window.__store.set(k,val),removeItem:k=>window.__store.delete(k)}});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>window.__session?.get(k)||null,setItem:(k,val)=>(window.__session||(window.__session=new Map())).set(k,val),removeItem:k=>window.__session?.delete(k)}});
 window.SCHOLARFLOW_CLOUD_CONFIG={supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_public_key_for_cloud_tests'};
 window.fetch=async (url,req={})=>{
   const reqURL=new URL(url),method=req.method||'GET',body=req.body?JSON.parse(req.body):null, db=window.__db;
   db.requests.push({path:reqURL.pathname,method});
   const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
   if(reqURL.pathname==='/auth/v1/token')return out({access_token:'at-test',refresh_token:'rt-test',expires_at:Math.floor(Date.now()/1000)+3600});
   if(reqURL.pathname==='/auth/v1/user')return out({id:'1a2b3c4d-1111-2222-3333-000000000001',email:'tester@example.org'});
   if(reqURL.pathname==='/auth/v1/logout')return out({});
   if(reqURL.pathname==='/rest/v1/scholarflow_snapshots'){
     if(method==='GET')return out(db.payload?[{user_id:'1a2b3c4d-1111-2222-3333-000000000001',revision:db.revision,payload:db.payload,updated_at:'2026-10-24'}]:[]);
     if(method==='POST'){
       if(db.payload)return out({code:'23505',message:'duplicate'},409);
       db.payload=body.payload;db.revision=1;db.writes++;
     }
     if(method==='PATCH'){
       if(!db.payload||Number(reqURL.searchParams.get('revision').slice(3))!==db.revision)return out([]);
       db.revision++;db.payload=body.payload;db.writes++;
     }
     return out([{user_id:'1a2b3c4d-1111-2222-3333-000000000001',revision:db.revision,payload:db.payload,updated_at:'2026-10-24'}]);
   }
   return out({message:'Unexpected route '+reqURL.pathname},404);
 };
 window.confirm=()=>true;
}'''

def cloud_page(browser,remote=None,local=None,revision=1):
    p=browser.new_page(viewport={'width':390,'height':820})
    p.set_content('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
    p.evaluate(MOCK,dict(remote=remote,revision=revision,local=local))
    p.add_style_tag(path=str(ROOT/'site/cloud.css'))
    p.add_script_tag(path=JS)
    return p

def login(p):
    p.locator('.sf-cloud-trigger').click()
    p.locator('input[name="email"]').fill('tester@example.org')
    p.locator('input[name="password"]').fill('testing12345')
    p.locator('[data-mode="login"]').click()
    p.wait_for_function('window.ScholarCloudStatus().signedIn')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    count=0
    def check(cond,message):
        global count
        assert cond,message
        count+=1
    # Never upload a local snapshot on login without explicit user action.
    p=cloud_page(browser)
    login(p)
    check(p.evaluate('window.__db.writes')==0,'login must not upload')
    check(not p.evaluate('window.ScholarCloudStatus().autoSync'),'sync off by default')
    p.locator('[data-cloud="upload"]').click()
    p.wait_for_function('window.__db.writes===1',timeout=3000)
    check(p.evaluate('window.__db.revision')==1,'initial revision')
    check(p.evaluate('window.__db.payload.tasks.length')==0,'snapshot stored correctly')
    p.wait_for_function('!document.querySelector("#sf-cloud-auto")?.disabled',timeout=6000)
    check(p.locator('#sf-cloud-auto').is_enabled(),'matching snapshots permit auto sync')
    p.locator('#sf-cloud-auto').check()
    check(p.evaluate('window.ScholarCloudStatus().autoSync'),'auto sync manually opted in')
    p.evaluate('''() => {let a=JSON.parse(localStorage.getItem('scholarflow_v1_data'));a.tasks.push({id:'t1',title:'云端同步测试'});localStorage.setItem('scholarflow_v1_data',JSON.stringify(a));window.dispatchEvent(new Event('scholarflow:saved'))}''')
    p.wait_for_function('window.__db.revision===2',timeout=6000)
    check(p.evaluate("window.__db.payload.tasks[0].title")=='云端同步测试','autowrite persisted')
    check(p.evaluate('window.ScholarCloudStatus().autoSync'),'auto sync stayed enabled')
    # Simulate a second device having changed remote revision -> no last-write-wins.
    p.evaluate('''() => {window.__db.revision=3;window.__db.payload.tasks.push({id:'new-other-device',title:'另一个设备'});let a=JSON.parse(localStorage.getItem('scholarflow_v1_data'));a.tasks.push({id:'new-local',title:'本地冲突'});localStorage.setItem('scholarflow_v1_data',JSON.stringify(a));window.dispatchEvent(new Event('scholarflow:saved'))}''')
    p.wait_for_function('window.ScholarCloudStatus().conflict',timeout=6000)
    check(p.evaluate('window.__db.revision')==3,'conflict did not overwrite remote')
    check(p.evaluate("window.__db.payload.tasks.some(t=>t.id==='new-local')") is False,'conflict protects cloud')
    check(p.evaluate('window.ScholarCloudStatus().autoSync') is False,'conflict suspends autosync')
    check(p.evaluate("JSON.parse(localStorage.getItem('scholarflow_v1_data')).tasks.some(t=>t.id==='new-local')"),'conflict preserves local')
    check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'cloud overlay mobile no overflow')
    p.close()
    # Nonempty remote must NEVER replace local without explicit confirmation.
    cloud_data={"version":9,"tasks":[{"id":"remote-task","title":"云端任务"}],"literature":[],"settings":{}}
    local_data={"version":9,"tasks":[{"id":"local-task","title":"本地任务"}],"literature":[],"settings":{}}
    p=cloud_page(browser,remote=cloud_data,local=local_data,revision=7)
    login(p)
    check(p.evaluate('window.__db.writes')==0,'login with divergent data does not overwrite cloud')
    check(p.evaluate("JSON.parse(localStorage.getItem('scholarflow_v1_data')).tasks[0].id")=='local-task','login does not overwrite local')
    check(p.evaluate('document.querySelector("#sf-cloud-auto").disabled'),'automatic sync unavailable when divergent')
    check(p.evaluate('window.ScholarCloudStatus().revision')==7,'reads remote version')
    p.close()
    browser.close()
print(f'PASS {count} cloud synchronization contract assertions (mocked Supabase, real Chromium)')
