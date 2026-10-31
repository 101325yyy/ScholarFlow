"""Account-switch isolation guard, signout confirmation, accessibility & responsive smoke.
Browser test uses a deterministic fake SDK, not a real WorkBuddy server.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
checks=0

def check(value,msg):
 global checks
 checks+=1
 assert value, msg

with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,768,1440):
  p=b.new_page(viewport={'width':width,'height':850})
  errors=[];p.on('pageerror',lambda e: errors.append(str(e)))
  p.set_content('<!doctype html><html><head><style>body{margin:0}</style></head><body><div id="app"></div></body></html>')
  p.add_style_tag(path=str(R/'site/cloud.css'))
  p.add_script_tag(path=str(R/'tests/mock-workbuddy-sdk.js'))
  p.evaluate('window.__setData({tasks:[],literature:[],settings:{workspaceName:"研究"}});window.__db.nextUserId="first"')
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.locator('.sf-cloud-trigger').click()
  p.locator('[name=email]').fill('first@example.org')
  p.locator('[name=password]').fill('myStrongPass123')
  p.locator('[data-mode=login]').click()
  p.wait_for_function("ScholarCloudStatus().signedIn && !!document.querySelector('[data-cloud=switch-account]:not([disabled])')")
  check(p.locator('.sf-cloud-identity-text strong').inner_text()=='first@example.org', 'current identity label')
  check(p.locator('[data-cloud=switch-account]').count()==1,'switch action exists')
  check(p.locator('[data-cloud=logout]').count()==1,'logout action exists')
  check(p.locator('.sf-cloud-trigger').count()==1,'only one cloud control')
  before=p.evaluate('localStorage.getItem("scholarflow_v1_data")')
  p.locator('[data-cloud=upload]').click()
  p.wait_for_function('ScholarCloudStatus().revision===1')
  p.evaluate('window.__setData({tasks:[{id:"a",title:"unsynced"}],literature:[],settings:{workspaceName:"研究"}})')
  before=p.evaluate('localStorage.getItem("scholarflow_v1_data")')
  p.locator('[data-cloud=switch-account]').click()
  p.wait_for_function('!ScholarCloudStatus().signedIn')
  check(p.evaluate('localStorage.getItem("scholarflow_v1_data")')==before,'switch preserves local data')
  check(p.evaluate('localStorage.getItem("sf_cloud_account_review_v1")')=='review','switch guard persists')
  check(p.locator('.sf-cloud-account-warning').count()==1,'login guard warning')
  check(p.locator('[data-cloud=logout]').count()==0,'logout not shown while signed out')
  p.evaluate('window.__db.nextUserId="second"')
  p.locator('[name=email]').fill('second@example.org');p.locator('[name=password]').fill('myStrongPass123')
  p.locator('[data-mode=login]').click()
  p.wait_for_function('ScholarCloudStatus().signedIn')
  check(p.locator('.sf-cloud-identity-text strong').inner_text()=='second@example.org','second identity')
  check(not p.evaluate('ScholarCloudStatus().autoSync'),'switch cannot auto enable sync')
  check(p.evaluate('window.__db.writes')==1,'switch does not upload to other account')
  check(p.locator('[data-cloud=review-local]').count()==1,'review action visible')
  check(p.evaluate('localStorage.getItem("scholarflow_v1_data")')==before,'new login does not overwrite local data')
  check(p.locator('#sf-cloud-auto').is_disabled(),'auto sync disabled during review')
  # Declining a sign-out must leave the active session intact.
  p.evaluate('window.confirm=()=>false')
  p.locator('[data-cloud=logout]').click()
  check(p.evaluate('ScholarCloudStatus().signedIn'),'cancel signout maintains session')
  p.evaluate('window.confirm=()=>true')
  # Explicit manual transfer is permitted and clears guard without silently enabling auto.
  p.locator('[data-cloud=upload]').click()
  p.wait_for_function('ScholarCloudStatus().revision===2')
  check(p.evaluate('localStorage.getItem("sf_cloud_account_review_v1")') is None,'manual upload clears review guard')
  check(not p.evaluate('ScholarCloudStatus().autoSync'),'manual upload leaves auto preference off')
  check(p.evaluate('localStorage.getItem("scholarflow_v1_data")')==before,'manual upload does not mutate local data')
  p.locator('[data-cloud=logout]').click()
  p.wait_for_function('!ScholarCloudStatus().signedIn')
  check(p.evaluate('localStorage.getItem("scholarflow_v1_data")')==before,'logout preserves research data')
  check(not errors,f'no JS exceptions: {errors}')
  check(p.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'),'no horizontal viewport overflow')
  p.close()
 print('PASS account-switch & logout: ',checks,'assertions across 4 viewport widths')
 b.close()
