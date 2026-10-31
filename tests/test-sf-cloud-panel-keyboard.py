"""Cloud dialog focus containment, outside click, Escape, and focus restoration."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (320,390,768,1440):
  p=b.new_page(viewport={'width':width,'height':850})
  p.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"><button id="outside">background</button></div></body></html>')
  p.add_style_tag(path=str(R/'site/cloud.css'))
  p.add_script_tag(path=str(R/'site/cloud-sync.js'))
  p.locator('.sf-cloud-trigger').click()
  assert p.locator('.sf-cloud-panel').is_visible(),width
  assert p.locator('.sf-cloud-panel').get_attribute('aria-modal')=='true',width
  assert p.locator('.sf-cloud-backdrop').is_visible(),width
  p.locator('.sf-cloud-panel button').last.focus()
  p.keyboard.press('Tab')
  assert p.evaluate('document.querySelector(".sf-cloud-panel").contains(document.activeElement)'),width
  p.locator('.sf-cloud-panel button').first.focus()
  p.keyboard.press('Shift+Tab')
  assert p.evaluate('document.querySelector(".sf-cloud-panel").contains(document.activeElement)'),width
  p.keyboard.press('Escape')
  assert p.locator('.sf-cloud-panel').is_hidden(),width
  assert p.evaluate('document.activeElement.classList.contains("sf-cloud-trigger")'),width
  p.locator('.sf-cloud-trigger').click()
  p.locator('.sf-cloud-backdrop').click(position={'x':20,'y':20})
  assert p.locator('.sf-cloud-panel').is_hidden(),width
  p.close()
 b.close()
print('PASS cloud dialog focus/backdrop/escape for 4 viewport widths')
