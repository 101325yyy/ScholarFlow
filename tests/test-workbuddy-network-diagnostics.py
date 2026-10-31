"""WorkBuddy auth transport failures: isolated Chromium + fake SDK; no real email or credentials."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
count=0
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in [320,390,768,1280]:
        page=browser.new_page(viewport={'width':width,'height':850},reduced_motion='reduce')
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>')
        page.add_style_tag(path=str(R/'site/cloud.css'))
        page.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
        page.evaluate("""() => {
          const old=WorkBuddyCloud.createWorkBuddyCloud;
          WorkBuddyCloud.createWorkBuddyCloud=(options)=>{
            const client=old(options);
            client.auth.signInWithOtp=async()=>{throw new TypeError('request failed before a response was received: Failed to fetch')};
            return client;
          };
          __setData({tasks:[],literature:[],settings:{}});
        }""")
        page.add_script_tag(path=str(R/'site/cloud-sync.js'))
        page.locator('.sf-cloud-trigger').click()
        page.locator('[data-cloud=method-code]').click()
        page.locator('input[name=email]').fill('test@example.com')
        page.locator('[data-cloud=send-login-code]').click()
        page.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('云端请求没有收到有效响应')")
        assert page.locator('input[name=email]').input_value()=='test@example.com';count+=1
        assert page.locator('[data-cloud=send-login-code]').is_enabled();count+=1
        assert page.locator('.sf-cloud-diagnostics').count()==1;count+=1
        assert not page.evaluate('ScholarCloudStatus().signedIn');count+=1
        assert not page.evaluate('__db.writes');count+=1
        assert 'wbpk_' not in page.locator('.sf-cloud-diagnostics').inner_text();count+=1
        assert 'test@example.com' not in page.locator('.sf-cloud-diagnostics').inner_text();count+=1
        page.locator('.sf-cloud-diagnostics summary').click()
        assert page.locator('.sf-cloud-diagnostics').get_attribute('open') is not None;count+=1
        assert page.locator('.sf-cloud-diagnostics').bounding_box()['width']<=width;count+=1
        page.locator('[data-cloud=probe]').click()
        page.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('不能证明验证码接口畅通')")
        assert page.locator('.sf-cloud-message').count()==1;count+=1
        assert not errors,errors;count+=1
        page.close()
    # This must be a real HTTP 401 error, not an invented connectivity failure.
    p=browser.new_page()
    p.set_content('<html><body></body></html>')
    p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
    p.evaluate("""() => { const f=WorkBuddyCloud.createWorkBuddyCloud;WorkBuddyCloud.createWorkBuddyCloud=x=>{const c=f(x);c.auth.signInWithOtp=async()=>({error:{message:'Forbidden',code:'DATABASE_42501'},status:401,success:false});return c} }""")
    p.add_script_tag(path=str(R/'site/cloud-sync.js'))
    p.locator('.sf-cloud-trigger').click();p.locator('[data-cloud=method-code]').click()
    p.locator('input[name=email]').fill('test@example.com');p.locator('[data-cloud=send-login-code]').click()
    p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('Forbidden')")
    assert p.locator('.sf-cloud-diagnostics').count()==0;count+=1
    assert not p.evaluate('ScholarCloudStatus().signedIn');count+=1
    browser.close()
print('PASS WorkBuddy transport error diagnostics:',count,'assertions')
