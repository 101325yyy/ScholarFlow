from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page()
 err=[];p.on('pageerror',lambda e:err.append(str(e)))
 p.set_content('<html><body><div id="app"></div></body></html>')
 p.evaluate('''() => { const memory = new Map(); window.__pdfMemory=memory; Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{const req={result:null,error:null};const db={objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},transaction:()=>{const tx={error:null,oncomplete:null,onabort:null};tx.objectStore=()=>({get:(key)=>make('get',key,null,tx),put:(value,key)=>make('put',key,value,tx),delete:(key)=>make('delete',key,null,tx)});return tx}};function make(action,key,value,tx){const q={result:null,onsuccess:null};setTimeout(()=>{if(action==='get')q.result=memory.get(key);else if(action==='put')memory.set(key,value);else memory.delete(key);q.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return q};setTimeout(()=>{req.result=db;req.onsuccess?.()},0);return req}}}); }''')
 p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
 p.evaluate("__setData({tasks:[],literature:[{id:'paper-1',pdfName:'source.pdf',title:'Source'}],settings:{workspaceName:'研究'}})")
 p.add_script_tag(path=str(R/'site/cloud-sync.js'))
 p.locator('.sf-cloud-trigger').click();p.locator('[name=email]').fill('person@example.com');p.locator('[name=password]').fill('pass123456')
 p.locator('[data-mode=login]').click();p.wait_for_function('ScholarCloudStatus().signedIn')
 assert p.evaluate('__db.clientCount')==1
 assert p.evaluate('__cloudOptions.endpoint')=='https://example.com'
 assert p.evaluate('__cloudOptions.oauthRelayBaseUrl')=='https://www.workbuddy.cn/v2/as/genie-baas/oauth'
 assert p.evaluate("Object.keys(__cloudOptions).sort().join(',')")=='endpoint,oauthRelayBaseUrl,publishableKey'
 p.evaluate("__pdfMemory.set('paper-1',new Blob(['%PDF-1.5 sample document contents'],{type:'application/pdf'}))")
 p.locator('[data-cloud=pdf-upload]').click();p.wait_for_timeout(500);assert p.evaluate('__db.storage.size')==1
 assert p.evaluate("Array.from(__db.storage.keys())[0]")=='user-test/pdfs/paper-1.pdf'
 p.locator('[data-cloud=pdf-upload]').click()
 p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('跳过 1')")
 assert p.evaluate('__db.storage.size')==1
 p.evaluate("__pdfMemory.delete('paper-1')")
 p.locator('[data-cloud=pdf-download]').click();p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('成功 1')")
 assert p.evaluate("__pdfMemory.get('paper-1')?.size>8")
 # Simulate lost network; guarantee no uploads, local intact
 p.evaluate('window.dispatchEvent(new Event("offline"));__setData({tasks:[{id:"t",title:"离线修改"}],literature:[{id:"paper-1",pdfName:"source.pdf"}],settings:{}})')
 p.locator('[data-cloud=upload]').click()
 assert p.evaluate('__db.writes')==0
 assert p.evaluate('__getData().tasks[0].title')=='离线修改'
 assert not err,err
 print('PASS SDK PDF private upload/skip/restore; singleton factory; offline no remote write; no JS errors')
 b.close()
