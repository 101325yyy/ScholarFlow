"""WorkBuddy no-credential persistence and missing reset-capability safeguards (mock only)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':390,'height':840})
 errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content('<html><body><div id="app"></div></body></html>')
 p.add_style_tag(path=str(R/'site/cloud.css'))
 p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
 p.evaluate('''() => {window.__setData({tasks:[],literature:[],settings:{}});const factory=WorkBuddyCloud.createWorkBuddyCloud;WorkBuddyCloud.createWorkBuddyCloud=options=>{const sdk=factory(options);delete sdk.auth.resetPasswordForEmail;return sdk}}''')
 p.add_script_tag(path=str(R/'site/cloud-sync.js'))
 p.locator('.sf-cloud-trigger').click()
 p.locator('[data-cloud=forgot]').click()
 p.locator('input[name=email]').fill('existing@example.com')
 p.locator('[data-cloud=send-reset-code]').click()
 p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('未开放邮箱密码重置接口')")
 assert not p.evaluate('ScholarCloudStatus().signedIn')
 assert p.evaluate('__db.reset')==0
 assert p.evaluate('__db.writes')==0
 assert p.evaluate('__getData().tasks.length')==0
 assert not any(x.startswith('sf_cloud_token') for x in p.evaluate('Object.keys(localStorage)'))
 p.locator('[data-cloud=tab-login]').click()
 p.locator('[data-cloud=method-code]').click()
 p.locator('input[name=email]').fill('new@example.com')
 p.locator('[data-cloud=send-login-code]').click()
 p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('尚未注册')")
 assert not p.evaluate('ScholarCloudStatus().signedIn')
 assert not errors,errors
 print('PASS Auth boundaries: reset capability absent, no fake success, no unknown-user implicit signup, local unchanged')
 b.close()
