"""Authentication UI regression. Mock WorkBuddy SDK; does not send email or contact the cloud."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
N=0
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in [320,390,768,1280,1440]:
  p=b.new_page(viewport={'width':w,'height':870},reduced_motion='reduce')
  errors=[];p.on('pageerror',lambda err:errors.append(str(err)))
  p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>')
  p.add_style_tag(path=str(R/'site/cloud.css'))
  p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
  p.evaluate('window.__setData({tasks:[],literature:[],settings:{workspaceName:"测试"}})')
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.locator('.sf-cloud-trigger').click()
  assert p.locator('[data-cloud=tab-login]').count()==1;N+=1
  assert p.locator('[data-cloud=tab-signup]').count()==1;N+=1
  assert p.locator('[data-cloud=method-password]').get_attribute('aria-pressed')=='true';N+=1
  assert p.locator('[data-cloud=forgot]').count()==1;N+=1
  p.locator('input[name=email]').fill('existing@example.com')
  p.locator('[data-cloud=method-code]').click()
  assert p.locator('input[name=email]').input_value()=='existing@example.com';N+=1
  assert p.locator('input[name=password]').count()==0;N+=1
  p.locator('[data-cloud=send-login-code]').click()
  p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('验证码已发送')")
  assert p.evaluate('__db.otp')==1;N+=1
  p.locator('input[name=code]').fill('123456')
  p.locator('[data-mode=login-code]').click()
  p.wait_for_function('ScholarCloudStatus().signedIn')
  assert p.evaluate('__db.verify')==1;N+=1
  assert p.evaluate('__db.writes')==0;N+=1
  p.locator('[data-cloud=logout]').click()
  p.wait_for_function('!ScholarCloudStatus().signedIn')
  assert p.evaluate('__getData().settings.workspaceName')=='测试';N+=1
  # Password error tells user how to recover, without pretending a reset succeeded.
  p.evaluate('__db.loginFailPassword=true')
  p.locator('[data-cloud=method-password]').click()
  p.locator('input[name=email]').fill('existing@example.com')
  p.locator('input[name=password]').fill('password123')
  p.locator('[data-mode=login]').click()
  p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('尚未设置密码')")
  assert p.locator('[data-cloud=forgot]').count()==1;N+=1
  p.locator('[data-cloud=forgot]').click()
  assert p.locator('[data-mode=reset]').count()==1;N+=1
  assert p.locator('[data-mode=signup]').count()==0;N+=1
  p.locator('input[name=email]').fill('existing@example.com')
  p.locator('[data-cloud=send-reset-code]').click()
  p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('已发送密码重置验证码')")
  assert p.evaluate('__db.reset')==1;N+=1
  p.locator('input[name=code]').fill('123456')
  p.locator('input[name=newPassword]').fill('newpassword123')
  p.locator('input[name=confirmPassword]').fill('DIFFERENT')
  p.locator('[data-mode=reset]').click()
  p.wait_for_function("document.querySelector('.sf-cloud-message')?.textContent.includes('不一致')")
  assert not p.evaluate('ScholarCloudStatus().signedIn');N+=1
  p.locator('input[name=confirmPassword]').fill('newpassword123')
  p.locator('[data-mode=reset]').click()
  p.wait_for_function('ScholarCloudStatus().signedIn')
  assert p.evaluate('__db.reset')==1;N+=1
  assert p.evaluate('__getData().settings.workspaceName')=='测试';N+=1
  # Geometry - dock panel is inside viewport (when open).
  box=p.locator('.sf-cloud-panel').bounding_box()
  assert box and box['x']>=-1 and box['x']+box['width']<=w+1,(w,box)
  N+=1
  assert not errors,errors;N+=1
  p.close()
 b.close()
print(f'PASS WorkBuddy account UI regression {N} assertions')
