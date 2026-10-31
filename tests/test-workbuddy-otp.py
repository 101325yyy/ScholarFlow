"""OTP flow against mock WorkBuddy SDK. No real email is sent."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page()
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content('<html><body><div id="app"></div></body></html>')
 p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
 p.evaluate('window.__setData({tasks:[],literature:[],settings:{}})')
 p.add_script_tag(path=str(R/'site/cloud-sync.js'))
 p.locator('.sf-cloud-trigger').click()
 p.locator('[data-cloud=tab-signup]').click()
 p.locator('input[name=email]').fill('new@example.com')
 p.locator('input[name=password]').fill('secret123')
 p.locator('[data-cloud=send-code]').click()
 p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('验证码已发送')")
 assert p.locator('input[name=email]').input_value()=='new@example.com'
 assert not p.locator('[data-cloud=send-code]').is_enabled()
 p.locator('input[name=code]').fill('123456')
 p.locator('[data-mode=signup]').click()
 p.wait_for_function('ScholarCloudStatus().signedIn')
 assert p.evaluate('__db.verify')==1
 assert p.evaluate('__db.signup')==0
 assert p.evaluate('__db.clientCount')==1
 assert p.evaluate('ScholarCloudStatus().signedIn')
 assert not errors,errors
 print('PASS WorkBuddy OTP mocked: challenge, countdown, verification, verified signup authenticates')
 b.close()
