"""1.1.0 first-run generic profile, no prefilled graduation date, no personal identity."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    pg=b.new_page(viewport={'width':1280,'height':800})
    pg.set_content('<div id="app"></div>')
    pg.add_style_tag(path=str(root/'styles.css'))
    pg.add_script_tag(path=str(root/'pdf-intelligence.js'))
    pg.add_script_tag(path=str(root/'app.js'))
    assert pg.locator('.brand-text').inner_text()=='科研工作台'
    assert '版本 1.1.0' in pg.locator('.sidebar-foot').inner_text()
    assert pg.locator('.sf14-grad-meta small').inner_text()=='目标：未设置'
    assert pg.locator('#sf14-days').inner_text()=='—'
    assert pg.locator('.dash-profile-info').inner_text().count('未填写')>=4
    pg.locator('nav [data-nav="settings"]').first.click()
    assert pg.locator('#profile_graduationDate').input_value()==''
    assert pg.locator('#profile_researchDirection').input_value()==''
    assert pg.locator('#setting_workspaceName').input_value()=='科研工作台'
    pg.close();b.close()
print('PASS generic-first-run privacy & version smoke')
