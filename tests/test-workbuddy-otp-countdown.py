"""OTP resend UI and status against mock SDK. No real email or cloud calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
checks=0
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,768,1280):
  for mode in ('signup','login','reset'):
   p=b.new_page(viewport={'width':width,'height':850},reduced_motion='reduce')
   errors=[]
   p.on('pageerror',lambda e:errors.append(str(e)))
   p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>')
   p.add_style_tag(path=str(R/'site/cloud.css'))
   p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
   p.evaluate('window.__setData({tasks:[],literature:[],settings:{}})')
   p.add_script_tag(path=str(R/'site/cloud-sync.js'))
   p.locator('.sf-cloud-trigger').click()
   if mode=='signup':
    p.locator('[data-cloud=tab-signup]').click();action='send-code';email='new@example.com'
   elif mode=='login':
    p.locator('[data-cloud=method-code]').click();action='send-login-code';email='existing@example.com'
   else:
    p.locator('[data-cloud=forgot]').click();action='send-reset-code';email='existing@example.com'
   status=p.locator('[data-otp-status='+mode+']')
   assert status.count()==1 and status.get_attribute('data-state')=='idle';checks+=1
   assert '60 秒' in status.inner_text();checks+=1
   p.locator('input[name=email]').fill(email)
   p.locator('[data-cloud='+action+']').click()
   p.wait_for_function(f"document.querySelector('[data-otp-status={mode}]')?.dataset.state === 'waiting'")
   assert status.get_attribute('data-state')=='waiting';checks+=1
   assert '验证码已发送' in status.inner_text();checks+=1
   assert '60 秒' in status.inner_text();checks+=1
   assert not p.locator('[data-cloud='+action+']').is_enabled();checks+=1
   assert '重新发送' in p.locator('[data-cloud='+action+']').inner_text();checks+=1
   assert p.locator('[data-cloud='+action+']').get_attribute('aria-describedby')=='sf-otp-status-'+mode;checks+=1
   p.locator('input[name=code]').fill('123456')
   p.locator('[data-cloud=close]').click();p.locator('.sf-cloud-trigger').click()
   assert '验证码已发送' in p.locator('[data-otp-status='+mode+']').inner_text();checks+=1
   assert p.locator('input[name=code]').input_value()=='123456';checks+=1
   # Foreground visibility recovery and actual elapsed wall time are independent of the timer tick count.
   p.evaluate("""() => { const now=Date.now; Date.now=()=>now()+61000; document.dispatchEvent(new Event('visibilitychange')); }""")
   p.wait_for_function(f"document.querySelector('[data-otp-status={mode}]')?.dataset.state === 'ready'")
   assert p.locator('[data-cloud='+action+']').is_enabled();checks+=1
   assert '可以重新发送' in p.locator('[data-otp-status='+mode+']').inner_text();checks+=1
   assert not errors,errors;checks+=1
   bb=status.bounding_box();assert bb and bb['x']>=0 and bb['x']+bb['width']<=width+1, (width,bb);checks+=1
   p.close()
  # Network failure must never imply that a code was sent or start an artificial countdown.
  p=b.new_page(viewport={'width':width,'height':800})
  p.set_content('<html><body></body></html>')
  p.add_style_tag(path=str(R/'site/cloud.css'))
  p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
  p.evaluate("""() => { const old=WorkBuddyCloud.createWorkBuddyCloud; WorkBuddyCloud.createWorkBuddyCloud=x=>{const c=old(x);c.auth.signInWithOtp=async()=>{throw new TypeError('Failed to fetch')};return c;} }""")
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.locator('.sf-cloud-trigger').click();p.locator('[data-cloud=tab-signup]').click()
  p.locator('input[name=email]').fill('new@example.com');p.locator('[data-cloud=send-code]').click()
  p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('发送验证码失败')")
  assert p.locator('[data-otp-status=signup]').get_attribute('data-state')=='unconfirmed';checks+=1
  assert p.locator('[data-cloud=send-code]').is_enabled();checks+=1
  assert '未建立可验证的会话' in p.locator('[data-otp-status=signup]').inner_text();checks+=1
  assert p.locator('input[name=email]').input_value()=='new@example.com';checks+=1
  p.close()
 b.close()
print('PASS OTP countdown UI',checks,'checks: mock SDK only')
