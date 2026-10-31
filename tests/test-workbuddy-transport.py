"""Mock SDK transport tests only; never contacts WorkBuddy.
Run with python tests/test-workbuddy-transport.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':390,'height':850})
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
 p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
 p.evaluate('window.__setData({tasks:[],literature:[],settings:{workspaceName:"研究"}})')
 p.add_script_tag(path=str(R/'site/cloud-sync.js'))
 assert p.evaluate('ScholarCloudStatus().configured')
 p.locator('.sf-cloud-trigger').click()
 p.locator('[name=email]').fill('test@example.com');p.locator('[name=password]').fill('password123')
 p.locator('[data-mode=login]').click();p.wait_for_function('ScholarCloudStatus().signedIn')
 assert p.evaluate('__db.writes')==0  # login never silently uploads
 p.locator('[data-cloud=upload]').click();p.wait_for_function('ScholarCloudStatus().revision===1')
 assert p.evaluate('__db.writes')==1
 p.evaluate('window.__setData({tasks:[{id:"a",title:"单次上传"}],literature:[],settings:{workspaceName:"研究"}})')
 p.locator('[data-cloud=upload]').click();p.wait_for_function('ScholarCloudStatus().revision===2')
 assert p.evaluate('__db.writes')==2
 p.evaluate('window.__db.versionConflict=true;window.__setData({tasks:[{id:"a",title:"本地安全"}],literature:[],settings:{workspaceName:"研究"}})')
 p.locator('[data-cloud=upload]').click();p.wait_for_function('ScholarCloudStatus().conflict')
 assert p.evaluate('__getData().tasks[0].title')=='本地安全'
 p.locator('[data-cloud=logout]').click();p.wait_for_function('!ScholarCloudStatus().signedIn')
 assert p.evaluate('__getData().tasks[0].title')=='本地安全'
 assert not errors,errors
 print('PASS WorkBuddy mock SDK: offline data, login, rev 1/2, conflict, logout, JS errors')
 b.close()
