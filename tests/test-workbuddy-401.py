"""Outer HTTP status, RLS denial, and local-record protection. Mock WorkBuddy SDK only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page()
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content('<html><body><div id="app"></div></body></html>')
 p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
 p.evaluate('__setData({tasks:[],literature:[],settings:{workspaceName:"科研"}})')
 p.add_script_tag(path=str(R/'site/cloud-sync.js'))
 p.locator('.sf-cloud-trigger').click()
 p.locator('[name=email]').fill('tester@example.com')
 p.locator('[name=password]').fill('pass123456')
 p.locator('[data-mode=login]').click();p.wait_for_function('ScholarCloudStatus().signedIn')
 p.locator('[data-cloud=upload]').click();p.wait_for_function('ScholarCloudStatus().revision===1')
 p.evaluate('__db.errorStatus=401;__setData({tasks:[{id:"t",title:"离线本机记录"}],literature:[],settings:{workspaceName:"科研"}})')
 p.locator('[data-cloud=upload]').click()
 p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('permission denied')")
 assert p.evaluate('__db.writes')==1, '401 must not upload'
 assert p.evaluate('__getData().tasks[0].title')=='离线本机记录', '401 must never wipe local'
 assert not p.evaluate('ScholarCloudStatus().conflict'), '401 is permission failure, not CAS conflict'
 assert not errors, errors
 print('PASS WorkBuddy 401 HTTP envelope not falsely retried or treated as CAS conflict')
 b.close()
