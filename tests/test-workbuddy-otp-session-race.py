"""Regression: delayed unauthenticated SDK callback must not clear an OTP challenge.
Mock SDK only; no real emails or third-party account requests.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
count=0
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,768,1440):
  for scenario in ('late_session','signed_out','reopen','orphan_email'):
   p=browser.new_page(viewport={'width':width,'height':860},reduced_motion='reduce')
   errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.set_content('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
   p.add_style_tag(path=str(R/'site/cloud.css'))
   p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
   p.evaluate('window.__setData({tasks:[],literature:[],settings:{}})')
   p.evaluate('''(scenario) => {
     const old = WorkBuddyCloud.createWorkBuddyCloud;
     WorkBuddyCloud.createWorkBuddyCloud= opts=>{
       const c=old(opts);
       if(scenario==='late_session'){
         const get=c.auth.getSession;
         c.auth.getSession=()=>new Promise(resolve=>setTimeout(()=>resolve({data:null}),850));
       }
       if(scenario==='signed_out'){
         const send=c.auth.signInWithOtp;
         c.auth.signInWithOtp=async (...a)=>{const response=await send(...a);setTimeout(()=>__db.callbacks.forEach(cb=>cb('SIGNED_OUT',null)),25);return response};
       }
       if(scenario==='orphan_email'){
         c.auth.signInWithOtp=async ()=>{__db.emailSent=true;throw new TypeError('Failed to fetch')};
       }
       return c;
     };
   }''',scenario)
   p.add_script_tag(path=str(R/'site/cloud-sync.js'))
   p.locator('.sf-cloud-trigger').click();p.locator('[data-cloud=tab-signup]').click()
   p.locator('input[name=email]').fill('new@example.com')
   p.locator('input[name=password]').fill('secret123')
   p.locator('[data-cloud=send-code]').click()
   if scenario=='orphan_email':
    p.wait_for_function("document.querySelector('[data-otp-status=signup]')?.dataset.state === 'unconfirmed'")
    assert p.evaluate('__db.emailSent') is True;count+=1
    assert p.locator('[data-otp-status=signup]').get_attribute('data-state')=='unconfirmed';count+=1
    assert '未建立可验证的会话' in p.locator('[data-otp-status=signup]').inner_text();count+=1
    assert p.locator('[data-cloud=send-code]').is_enabled();count+=1
    p.locator('input[name=code]').fill('123456');p.locator('[data-mode=signup]').click()
    p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('验证会话')")
    assert not p.evaluate('ScholarCloudStatus().signedIn');count+=1
   else:
    p.wait_for_function("document.querySelector('[data-otp-status=signup]')?.dataset.state === 'waiting'")
    if scenario=='late_session':
     p.wait_for_timeout(950)
    if scenario=='signed_out':
     p.wait_for_timeout(180)
    if scenario=='reopen':
     p.locator('[data-cloud=close]').click();p.locator('.sf-cloud-trigger').click()
    assert p.locator('[data-otp-status=signup]').get_attribute('data-state')=='waiting';count+=1
    assert p.locator('[data-cloud=send-code]').is_disabled();count+=1
    p.locator('input[name=code]').fill('123456')
    p.locator('[data-mode=signup]').click()
    p.wait_for_function('ScholarCloudStatus().signedIn',timeout=5000)
    assert p.evaluate('__db.verify')==1;count+=1
    assert p.evaluate('__db.signup')==0;count+=1
    assert p.evaluate('__db.clientCount')==1;count+=1
   assert not errors,errors;count+=1
   p.close()
 browser.close()
print('PASS OTP challenge survival',count,'assertions / 16 independent scenarios')
