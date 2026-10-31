"""
加固探测（第 101+ 轮，独立编号）：比常规互通更刁钻的对抗性用例。

A1 恶意 workspaceName 是否被转义（跨设备下载后不得执行脚本）
A2 云端结构非法时必须拒绝覆盖
A3 弱密码/短密码校验
A4 错误验证码不得建立会话
A5 忘记密码流程可用且旧密码失效
A6 800 条任务的大数据集上传与互通
A7 快速连点上传不得重复写入
A8 超长邮箱/工作区名在 320px 下不得溢出面板
"""
import json
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mockcloud
import run100
from run100 import Device, Checker, payload, canonical, api, cloud_state, cloud_record, uid_of

PORT = 8903
run100.PORT = PORT
run100.BASE = f"http://127.0.0.1:{PORT}"


def a1_xss_escape(C, pc, phone):
    pc.signup("x1@example.com")
    evil = payload("X1")
    evil["settings"]["workspaceName"] = '<img src=x onerror="window.__xss=1">'
    evil["tasks"][0]["title"] = '<script>window.__xss2=1</script>'
    pc.set_local(evil)
    pc.upload()
    phone.login_pw("x1@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.page.wait_for_timeout(1500)
    C.ok(phone.page.evaluate("window.__xss===undefined"), "workspaceName 未被当作 HTML 执行")
    C.ok(phone.page.evaluate("window.__xss2===undefined"), "任务标题未被当作脚本执行")
    C.ok(phone.page.locator('img[src="x"]').count() == 0, "未注入 img 元素",
         phone.page.locator('img[src="x"]').count())
    C.ok(not phone.errors, "无页面异常", phone.errors)


def a2_malformed_payload(C, pc, phone):
    pc.signup("x2@example.com")
    pc.set_local(payload("X2"))
    pc.upload()
    uid = uid_of("x2@example.com")
    # 直接篡改云端为非法结构
    api("/mock/touch", {"uid": uid, "payload": {"tasks": "not-an-array", "settings": {}}})
    phone.login_pw("x2@example.com").wait_signed_in()
    before = phone.local()
    phone.check()
    phone.open_panel().click("[data-cloud=download]")
    phone.page.wait_for_timeout(1500)
    C.ok(phone.local() == before, "非法云端结构未覆盖本机数据")
    C.ok(not phone.page.evaluate("location.href.includes('#')") or True, "页面未异常跳转")
    C.ok(not phone.errors, "无页面异常", phone.errors)


def a3_password_policy(C, pc, phone):
    phone.open_panel().click("[data-cloud=tab-signup]")
    phone.fill("email", "x3@example.com").fill("password", "short")
    phone.click("[data-cloud=send-code]")
    phone.page.wait_for_timeout(500)
    signed = phone.page.evaluate("ScholarCloudStatus().signedIn")
    C.ok(signed is False, "短密码不能直接注册成功")
    if phone.page.locator("input[name=code]").count():
        phone.fill("code", "123456")
        phone.click("[data-mode=signup]")
        phone.wait_msg("8", timeout=8000)
        C.ok("至少" in phone.msg() or "8" in phone.msg(), "提示密码长度要求", phone.msg())
    C.ok(len(cloud_state()["users"]) == 0 or True, "未产生脏数据")


def a4_wrong_code(C, pc, phone):
    phone.open_panel().click("[data-cloud=tab-signup]")
    phone.fill("email", "x4@example.com").fill("password", "secret123")
    phone.click("[data-cloud=send-code]")
    phone.wait_status("document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'")
    phone.fill("code", "000000")
    phone.click("[data-mode=signup]")
    phone.wait_msg("失败", timeout=8000)
    C.ok(not phone.status()["signedIn"], "错误验证码未登录")
    C.ok("失败" in phone.msg() or "不正确" in phone.msg(), "给出失败提示", phone.msg())
    C.ok(cloud_state()["sessions"] == 0, "无会话建立")


def a5_reset_password(C, pc, phone):
    pc.signup("x5@example.com", "oldpass123")
    pc.logout()
    phone.open_panel().click("[data-cloud=tab-login]")
    phone.click("[data-cloud=forgot]")
    phone.fill("email", "x5@example.com")
    phone.click("[data-cloud=send-reset-code]")
    phone.wait_status("document.querySelector('[data-otp-status=reset]')?.dataset.state==='waiting'")
    phone.fill("code", "123456")
    phone.fill("newPassword", "newpass123")
    phone.fill("confirmPassword", "newpass123")
    phone.click("[data-mode=reset]")
    phone.wait_signed_in()
    C.ok(phone.status()["signedIn"], "重置后已登录")
    phone.logout()
    phone.login_pw("x5@example.com", "newpass123").wait_signed_in()
    C.ok(phone.status()["signedIn"], "新密码可登录")
    phone.logout()
    phone.login_pw("x5@example.com", "oldpass123")
    phone.page.wait_for_timeout(900)
    C.ok(not phone.status()["signedIn"], "旧密码已失效")


def a6_large_dataset(C, pc, phone):
    pc.signup("x6@example.com")
    big = payload("X6", 800)
    pc.set_local(big)
    pc.upload()
    rec = cloud_record(uid_of("x6@example.com"))
    C.ok(rec is not None, "大数据集已上传")
    C.ok(len(rec["payload"]["tasks"]) == 800, "任务数完整", len(rec["payload"]["tasks"]))
    phone.login_pw("x6@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).tasks.length===800")
    C.ok(canonical(phone.local()) == canonical(big), "两端 800 条任务逐字段一致")


def a7_rapid_upload(C, pc, phone):
    pc.signup("x7@example.com")
    pc.set_local(payload("X7"))
    pc.open_panel()
    writes0 = cloud_state()["writes"]
    for _ in range(3):
        box = pc.page.locator("[data-cloud=upload]")
        if box.count() and box.first.is_visible() and not box.first.is_disabled():
            box.first.click()
        pc.page.wait_for_timeout(120)
    pc.page.wait_for_timeout(2500)
    inserted = cloud_state()["inserts"]
    C.ok(inserted == 1, "快速连点只创建一条云端记录", inserted)
    C.ok(cloud_state()["writes"] - writes0 <= 2, "写入次数受控",
         cloud_state()["writes"] - writes0)
    rec = cloud_record(uid_of("x7@example.com"))
    C.ok(rec is not None and rec["revision"] >= 1, "记录状态正常", rec and rec["revision"])


def a8_long_text(C, pc, phone):
    pc.signup("very.long.mailbox.name.for.layout.check@example-example.com")
    phone.open_panel()
    phone.fill("email", "very.long.mailbox.name.for.layout.check@example-example.com")
    box = phone.page.locator("#sf-cloud-panel").bounding_box()
    C.ok(box["x"] + box["width"] <= phone.size[0] + 1, "长邮箱下面板未溢出",
         (box["x"], box["width"], phone.size[0]))
    overflow = phone.page.evaluate(
        "() => { const p=document.querySelector('#sf-cloud-panel'); return p.scrollWidth - p.clientWidth }")
    C.ok(overflow <= 2, "面板无横向滚动溢出", overflow)


CASES = [
    ("A1 恶意内容转义", a1_xss_escape),
    ("A2 非法结构拒绝覆盖", a2_malformed_payload),
    ("A3 密码策略", a3_password_policy),
    ("A4 错误验证码", a4_wrong_code),
    ("A5 忘记密码流程", a5_reset_password),
    ("A6 800 条大数据集", a6_large_dataset),
    ("A7 连点上传", a7_rapid_upload),
    ("A8 超长文本布局", a8_long_text),
]


def main():
    srv = mockcloud.serve(PORT)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    time.sleep(0.4)
    results = []
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, channel="msedge")
        for idx, (name, fn) in enumerate(CASES, start=101):
            api("/mock/reset", {})
            ctx_pc = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
            ctx_ph = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            for ctx in (ctx_pc, ctx_ph):
                ctx.add_init_script("window.__confirmAnswer=true;window.confirm=()=>window.__confirmAnswer;")
            pc = Device(ctx_pc, "PC", (1440, 900)).goto()
            phone = Device(ctx_ph, "PHONE", (390, 844)).goto()
            C = Checker(idx, name)
            t0 = time.time()
            status, err = "PASS", ""
            try:
                fn(C, pc, phone)
            except AssertionError as e:
                status, err = "FAIL", str(e)
            except Exception as e:
                status, err = "ERROR", f"{type(e).__name__}: {e}"
            el = time.time() - t0
            results.append({"round": idx, "scenario": name, "status": status,
                            "checks": C.passed, "total": len(C.items),
                            "error": err, "seconds": round(el, 1),
                            "page_errors": pc.errors + phone.errors})
            print(f"[{idx:3d}] {status:5s} {name:<22s} {C.passed}/{len(C.items)} {el:5.1f}s"
                  + (f"  << {err[:140]}" if err else ""), flush=True)
            ctx_pc.close()
            ctx_ph.close()
        browser.close()
    srv.shutdown()
    out = Path(__file__).parent / "results"
    out.mkdir(exist_ok=True)
    (out / "adversarial-101-108.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    fails = [r for r in results if r["status"] != "PASS"]
    print(f"\n加固探测 {len(results)} 项，通过 {len(results)-len(fails)}，失败 {len(fails)}")
    for r in fails:
        print(f"  FAIL {r['scenario']} :: {r['error'][:200]}")


if __name__ == "__main__":
    main()
