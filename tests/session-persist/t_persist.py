"""用真实 WorkBuddy SDK + 契约替身后端，实测「账户能否记住」。

为什么必须这样测：上一轮 100 轮互通测试把 SDK 整个换成了替身，
所以 SDK 自己的会话持久化（localStorage 键 workbuddy-cloud.session.<pk>、
90 秒过期阈值、刷新失败即清空）从未被覆盖。

用法： python t_persist.py
"""
import json
import os
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from mockcloud_api import MockCloud, cors_headers

HERE = Path(__file__).parent
REPO = HERE.parent.parent
SITE = Path(os.environ.get("SF_SITE", REPO / "site"))
from sdkfetch import ensure_sdk  # noqa: E402
SDK = HERE / "sdk.js"
ensure_sdk(SDK)
ENDPOINT_HOST = "scholarflow-source.app.workbuddy.host"
PUBLISHABLE = "wbpk_OPZoHCF62BC9h3dKrHmNrO_9WfJB5Rr8PMIP4g1SX5ozTVnTxVlwM8I"
SESSION_KEY = "workbuddy-cloud.session." + PUBLISHABLE

mock = MockCloud(expires_in=3600)
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("  PASS " if ok else "  FAIL ") + name + ("  | " + detail if detail else ""))
    return ok


def serve():
    handler = partial(SimpleHTTPRequestHandler, directory=str(SITE))
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def route_handler(route):
    req = route.request
    url = req.url
    origin = req.headers.get("origin", "*")
    if req.method == "OPTIONS":
        route.fulfill(status=204, headers=cors_headers(origin), body="")
        return
    try:
        body = json.loads(req.post_data) if req.post_data else {}
    except Exception:
        body = {}
    status, payload = mock.handle(req.method, url.split(ENDPOINT_HOST)[-1], body, req.headers)
    route.fulfill(status=status, headers=cors_headers(origin), body=json.dumps(payload))


def boot(page, base):
    page.goto(f"{base}/index.html", wait_until="load", timeout=30000)
    page.wait_for_function(
        "!!window.WorkBuddyCloud && typeof window.ScholarCloudStatus==='function'", timeout=15000)
    page.wait_for_timeout(600)


def status(page):
    return page.evaluate("ScholarCloudStatus()")


def stored(page):
    raw = page.evaluate("k => localStorage.getItem(k)", SESSION_KEY)
    return json.loads(raw) if raw else None


def main():
    srv, base = serve()
    print(f"静态站: {base}")
    print(f"会话键: {SESSION_KEY}\n")
    email = "alice@lab.example"

    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="msedge", headless=True)
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        ctx.route(f"https://{ENDPOINT_HOST}/**", route_handler)
        ctx.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(
            status=200, content_type="application/javascript; charset=utf-8",
            body=SDK.read_text(encoding="utf-8")))
        ctx.route("**/sw.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body="/* t */"))

        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))

        # ---------- P1 注册并持久化 ----------
        print("[P1] 通过 UI 走 OTP 注册")
        boot(page, base)
        page.locator(".sf-cloud-trigger").click()
        page.wait_for_selector("#sf-cloud-panel:not([hidden])", timeout=8000)
        page.locator("[data-cloud=tab-signup]").click()
        page.locator("input[name=email]").fill(email)
        page.locator("input[name=password]").fill("secret123")
        page.locator("[data-cloud=send-code]").click()
        page.wait_for_function(
            "document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'", timeout=10000)
        page.locator("input[name=code]").fill("123456")
        page.locator("[data-mode=signup]").click()
        page.wait_for_function("ScholarCloudStatus().signedIn===true", timeout=15000)
        s = stored(page)
        check("P1 注册成功且 signedIn", status(page)["signedIn"] is True)
        check("P1 会话已写入 localStorage", s is not None,
              f"expiresAt 距今 {int((s['expiresAt']/1000)-time.time())}s" if s else "键不存在")

        # ---------- P2 立即刷新 ----------
        print("[P2] 刷新页面（令牌仍有效）")
        page.reload(wait_until="load")
        page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        page.wait_for_timeout(2500)
        st = status(page)
        check("P2 刷新后仍在线", st["signedIn"] is True, f"status={st}")

        # ---------- P3 再刷新一次 ----------
        print("[P3] 第二次刷新")
        page.reload(wait_until="load")
        page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        page.wait_for_timeout(2500)
        st = status(page)
        check("P3 二次刷新后仍在线", st["signedIn"] is True, f"status={st}")

        # ---------- P4 access token 过期 + refresh 正常 ----------
        print("[P4] access token 已过期，refresh 正常")
        s = stored(page)
        if s:
            s["expiresAt"] = int(time.time() * 1000) - 1000
            page.evaluate("([k,v]) => localStorage.setItem(k,v)", [SESSION_KEY, json.dumps(s)])
        page.reload(wait_until="load")
        page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        page.wait_for_timeout(3000)
        st = status(page)
        s2 = stored(page)
        check("P4 过期后自动刷新仍在线", st["signedIn"] is True, f"status={st}")
        check("P4 刷新后令牌已换新", bool(s2) and s2["accessToken"] != (s or {}).get("accessToken"))

        # ---------- P5 refresh 被判为凭据失效 ----------
        print("[P5] refresh 返回 invalid_grant（真实后端在 refresh token 失效/被轮换时如此）")
        s = stored(page) or {}
        s["expiresAt"] = int(time.time() * 1000) - 1000
        page.evaluate("([k,v]) => localStorage.setItem(k,v)", [SESSION_KEY, json.dumps(s)])
        mock.refresh_mode = "invalid_grant"
        page.reload(wait_until="load")
        page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        page.wait_for_timeout(3000)
        st = status(page)
        left = stored(page)
        # 2026.11.15-1 起：SDK 仍会因刷新被拒而删掉自己的会话键，但应用保留了一份
        # 仍有效的镜像，会把它恢复回来——用户不再被迫重新登录。
        check("P5a 刷新被拒后仍在线（应用层镜像恢复）", st["signedIn"] is True, f"status={st}")
        check("P5b 恢复后不处于掉线提示状态", st["sessionLost"] is None, f"sessionLost={st['sessionLost']}")
        notice = (page.locator(".sf-cloud-session-notice").inner_text()
                  if page.locator(".sf-cloud-session-notice").count() else "")
        check("P5c 未向用户展示「会话失效」提示", notice.strip() == "", f"notice='{notice[:50]}'")

        # ---------- P6 全新浏览器（无会话）----------
        print("[P6] 全新浏览器上下文（对照组）")
        mock.refresh_mode = "ok"
        ctx2 = br.new_context(viewport={"width": 390, "height": 844})
        ctx2.route(f"https://{ENDPOINT_HOST}/**", route_handler)
        ctx2.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(
            status=200, content_type="application/javascript; charset=utf-8",
            body=SDK.read_text(encoding="utf-8")))
        ctx2.route("**/sw.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body="/* t */"))
        p2 = ctx2.new_page()
        boot(p2, base)
        check("P6 新设备默认未登录（符合预期）", status(p2)["signedIn"] is False)

        # ---------- P7 同一邮箱重新登录应复用账号 ----------
        print("[P7] 用同一邮箱重新登录（密码方式）")
        p2.locator(".sf-cloud-trigger").click()
        p2.wait_for_selector("#sf-cloud-panel:not([hidden])", timeout=8000)
        p2.locator("[data-cloud=tab-login]").click()
        if p2.locator("[data-cloud=method-password]").count():
            p2.locator("[data-cloud=method-password]").click()
        p2.locator("input[name=email]").fill(email)
        p2.locator("input[name=password]").fill("secret123")
        p2.locator("[data-mode=login]").click()
        try:
            p2.wait_for_function("ScholarCloudStatus().signedIn===true", timeout=12000)
            ok = True
        except Exception:
            ok = False
        check("P7 同一邮箱登录成功（账号被记住，未新建）", ok, f"accounts={len(mock.accounts)}")
        check("P7 未产生重复账号", len(mock.accounts) == 1, f"账号数={len(mock.accounts)}")

        check("全程无页面 JS 异常", len(errs) == 0, str(errs[:2]))

        br.close()
    srv.shutdown()

    bad = [n for n, ok, _ in results if not ok]
    print(f"\n合计 {len(results)} 项，通过 {len(results)-len(bad)}，失败 {len(bad)}")
    if bad:
        print("失败项：" + "; ".join(bad))
    print("\n--- 后端请求日志（前 20 条）---")
    for m, p, b in mock.log[:20]:
        print(f"  {m:6} {p:42} {json.dumps(b, ensure_ascii=False)[:70]}")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
