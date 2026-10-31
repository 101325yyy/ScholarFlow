"""回归：重复上传相同内容必须是幂等的。

背景（2026.10.31 互通测试发现）：连点"上传"或自动同步抖动会反复抬高 revision，
其他设备收到新版本后被迫重新确认一次，而两端内容其实完全相同——属于可避免的
跨设备误报。修复后：云端内容与本机一致时不再写入。

本测试用单窗口 mock SDK 覆盖该路径，可脱离 100 轮夹具独立运行。
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

R = Path(__file__).resolve().parents[1]
count = 0


def ok(cond, label):
    global count
    assert cond, label
    count += 1


PAYLOAD = {
    "settings": {"workspaceName": "幂等测试台", "stylePreset": "sage",
                 "colorMode": "eye", "layoutScheme": "balanced"},
    "profile": {"name": "测试者"},
    "tasks": [{"id": "t1", "title": "任务一", "done": False}],
    "literature": [],
}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, channel="msedge")
    page = browser.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_content('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
                     '<meta name="viewport" content="width=device-width,initial-scale=1">'
                     '</head><body><div id="app"></div></body></html>')
    page.add_style_tag(path=str(R / "site/cloud.css"))
    page.add_script_tag(path=str(R / "tests/mock-workbuddy-sdk.js"))
    page.evaluate("window.confirm=()=>true")
    page.evaluate("d => localStorage.setItem('scholarflow_v1_data', JSON.stringify(d))", PAYLOAD)
    page.add_script_tag(path=str(R / "site/cloud-sync.js"))

    # 注册并登录
    page.locator(".sf-cloud-trigger").click()
    page.locator("[data-cloud=tab-signup]").click()
    page.locator("input[name=email]").fill("idem@example.com")
    page.locator("input[name=password]").fill("secret123")
    page.locator("[data-cloud=send-code]").click()
    page.wait_for_function(
        "document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'", timeout=8000)
    page.locator("input[name=code]").fill("123456")
    page.locator("[data-mode=signup]").click()
    page.wait_for_function("ScholarCloudStatus().signedIn===true", timeout=8000)
    ok(True, "注册并登录成功")

    # 首次上传
    page.locator("[data-cloud=upload]").click()
    page.wait_for_timeout(900)
    writes_after_first = page.evaluate("__db.writes")
    ok(writes_after_first == 1, f"首次上传写入一次，实际 {writes_after_first}")
    ok(page.evaluate("__db.revision") == 1, "首次上传版本为 1")

    # 重复上传相同内容：必须幂等
    page.locator("[data-cloud=upload]").click()
    page.wait_for_timeout(900)
    page.locator("[data-cloud=upload]").click()
    page.wait_for_timeout(900)
    writes_after_repeat = page.evaluate("__db.writes")
    ok(writes_after_repeat == writes_after_first,
       f"重复上传未产生新写入，实际 {writes_after_repeat}")
    ok(page.evaluate("__db.revision") == 1, "重复上传未抬高版本号")
    msg = page.locator(".sf-cloud-message").inner_text()
    ok("无需重复上传" in msg, f"给出幂等提示，实际：{msg[:60]}")

    # 内容变化后仍可正常上传
    page.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('scholarflow_v1_data'));
        d.tasks.push({id:'t2', title:'任务二', done:false});
        localStorage.setItem('scholarflow_v1_data', JSON.stringify(d));
    }""")
    page.locator("[data-cloud=upload]").click()
    page.wait_for_timeout(900)
    ok(page.evaluate("__db.writes") == writes_after_repeat + 1, "内容变化后上传成功")
    ok(page.evaluate("__db.revision") == 2, "版本升为 2")
    ok(not errors, f"无页面异常：{errors}")

    browser.close()

print("PASS 幂等上传回归", count, "项断言")
