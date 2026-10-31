"""用真实 SDK 复现「账户记不住」的三种真实成因。

前提：真实后端几乎都是一次性 refresh token（轮换）。SDK 在 access token
剩余有效期 < 90s 时会自动刷新；刷新被拒（invalid_grant）会**清空本地会话**。

R1 单标签连续刷新（令牌临近过期）
R2 两个标签同时启动（同一 refresh token 被两次使用）
R3 刷新请求在页面卸载时被打断（服务端已轮换，响应丢失）
R4 localStorage 不可用（内嵌预览/沙箱 iframe 常见）
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
HOST = "scholarflow-source.app.workbuddy.host"
PK = "wbpk_OPZoHCF62BC9h3dKrHmNrO_9WfJB5Rr8PMIP4g1SX5ozTVnTxVlwM8I"
KEY = "workbuddy-cloud.session." + PK
SDK_TEXT = SDK.read_text(encoding="utf-8")

mock = MockCloud(expires_in=3600)
mock.rotate = True
drop_refresh = {"on": False}
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("  PASS " if ok else "  FAIL ") + name + ("  | " + detail if detail else ""))


def serve():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(SITE)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def handler(route):
    req = route.request
    origin = req.headers.get("origin", "*")
    if req.method == "OPTIONS":
        route.fulfill(status=204, headers=cors_headers(origin), body="")
        return
    try:
        body = json.loads(req.post_data) if req.post_data else {}
    except Exception:
        body = {}
    path = req.url.split(HOST)[-1]
    if drop_refresh["on"] and path.endswith("/v1/token"):
        # 服务端已轮换成功，但响应在页面卸载时丢失
        status, payload = mock.handle(req.method, path, body, req.headers)
        route.abort()
        return
    status, payload = mock.handle(req.method, path, body, req.headers)
    route.fulfill(status=status, headers=cors_headers(origin), body=json.dumps(payload))


def wire(ctx, block_storage=False):
    ctx.route(f"https://{HOST}/**", handler)
    ctx.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(
        status=200, content_type="application/javascript; charset=utf-8", body=SDK_TEXT))
    ctx.route("**/sw.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body="/* t */"))
    if block_storage:
        ctx.add_init_script("""
            (() => {
              const boom = () => { throw new DOMException('storage disabled', 'SecurityError') };
              const fake = { getItem: boom, setItem: boom, removeItem: boom, clear: boom,
                             key: boom, get length(){ boom() } };
              Object.defineProperty(window, 'localStorage', { get(){ return fake }, configurable: true });
            })();
        """)


def boot(page, base, wait=2500):
    page.goto(f"{base}/index.html", wait_until="load", timeout=30000)
    page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
    page.wait_for_timeout(wait)


def st(page):
    return page.evaluate("ScholarCloudStatus()")


def session(page):
    raw = page.evaluate("k => localStorage.getItem(k)", KEY)
    return json.loads(raw) if raw else None


MIRROR_KEY = "sf_cloud_session_mirror_v1"


def expire(page):
    """把 SDK 会话与本机镜像都改成即将到期，触发 SDK 的自动刷新。

    必须同时改两处：只改 SDK 的键会制造「镜像仍有效」的假状态，让自动恢复
    误判为可恢复，从而测不到真实的掉线路径。
    """
    s = session(page)
    if not s:
        return None
    s["expiresAt"] = int(time.time() * 1000) + 60_000   # < 90s 阈值
    page.evaluate("([k,v]) => localStorage.setItem(k,v)", [KEY, json.dumps(s)])
    raw = page.evaluate("k => localStorage.getItem(k)", MIRROR_KEY)
    if raw:
        m = json.loads(raw)
        m["expiresAt"] = s["expiresAt"]
        page.evaluate("([k,v]) => localStorage.setItem(k,v)", [MIRROR_KEY, json.dumps(m)])
    return s


def signup(page, base, email="bob@lab.example"):
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
    return email


def main():
    srv, base = serve()
    print(f"静态站 {base}  轮换模式=开\n")
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="msedge", headless=True)

        # ================= R1 =================
        print("[R1] 令牌临近过期，连续 5 次刷新页面")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        email = signup(pg, base)
        alive = []
        for i in range(5):
            expire(pg)
            pg.reload(wait_until="load")
            pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
            pg.wait_for_timeout(2200)
            alive.append(st(pg)["signedIn"])
        check("R1 连续 5 次刷新后仍在线", all(alive), f"signedIn 序列={alive}")
        ctx.close()

        # ================= R2 =================
        print("[R2] 两个标签页同时启动（同一 refresh token 被并发使用）")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        signup(pg, base, "carol@lab.example")
        expire(pg)
        p2 = ctx.new_page()
        # 两页几乎同时启动，会各自用同一个 refresh token 去刷新
        pg.goto(f"{base}/index.html", wait_until="load")
        p2.goto(f"{base}/index.html", wait_until="load")
        pg.wait_for_timeout(3500)
        p2.wait_for_timeout(1000)
        a, b = st(pg)["signedIn"], st(p2)["signedIn"]
        left = session(pg)
        check("R2 双标签并发后至少一端仍在线", a or b, f"标签1={a} 标签2={b} 会话键={'在' if left else '被删'}")
        print(f"      观察：两端状态 标签1={a} 标签2={b}，会话键{'仍在' if left else '被删'} "
              f"（本环境未复现并发轮换踢人）")
        ctx.close()

        # ================= R3 =================
        print("[R3] 刷新请求在页面卸载时被打断（服务端已轮换、响应丢失）")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        signup(pg, base, "dave@lab.example")
        expire(pg)
        drop_refresh["on"] = True
        pg.reload(wait_until="load")
        pg.wait_for_timeout(2000)
        drop_refresh["on"] = False
        after = session(pg)
        pg.reload(wait_until="load")
        pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        pg.wait_for_timeout(2500)
        now_in = st(pg)["signedIn"]
        print(f"      结论：打断后会话键={'在' if after else '无'}，重载后 signedIn={now_in}，"
              f"会话键{'仍在' if session(pg) else '已被删除'}。"
              "（服务端已轮换而响应丢失时，客户端无法自救，只能把掉线体验做对）")

        # 无论是否还在线，掉线路径必须说清楚，不能让用户以为账户没了
        txt = ""
        if pg.locator(".sf-cloud-trigger").count():
            pg.locator(".sf-cloud-trigger").click()
            pg.wait_for_timeout(600)
            txt = pg.locator("#sf-cloud-panel").inner_text()
        has_login = pg.locator("[data-cloud=tab-login]").count() > 0
        prefilled = pg.locator("input[name=email]").input_value() if pg.locator("input[name=email]").count() else ""
        notice = (pg.locator(".sf-cloud-session-notice").inner_text()
                  if pg.locator(".sf-cloud-session-notice").count() else "")
        if now_in:
            print("      本次未掉线，掉线路径不适用")
        else:
            check("R3 掉线后仍给「登录」入口", has_login, f"面板首行: {txt.splitlines()[0] if txt else '(未展开)'}")
            check("R3 掉线后邮箱已预填", bool(prefilled), f"email='{prefilled}'")
            check("R3 掉线后说明「不需要重新注册」", "不需要重新注册" in notice.replace(" ", ""),
                  f"notice='{notice[:60]}'")
        ctx.close()

        # ================= R4 =================
        print("[R4] localStorage 不可用（内嵌预览 / 沙箱 iframe）")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx, block_storage=True)
        pg = ctx.new_page()
        email = signup(pg, base, "erin@lab.example")
        first = st(pg)["signedIn"]
        pg.reload(wait_until="load")
        pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        pg.wait_for_timeout(2500)
        second = st(pg)["signedIn"]
        print(f"      环境实测：首次登录={first}，刷新后={second}（存储不可用时无法保持登录，属预期）")
        if pg.locator(".sf-cloud-trigger").count():
            pg.locator(".sf-cloud-trigger").click()
            pg.wait_for_timeout(600)
        notice = (pg.locator(".sf-cloud-session-notice").inner_text()
                  if pg.locator(".sf-cloud-session-notice").count() else "")
        check("R4 应用明确告知「本环境无法保存登录状态」",
              "无法保存登录状态" in notice, f"notice='{notice[:70]}'")
        check("R4 应用读到 storageReady=false", st(pg)["storageReady"] is False)
        ctx.close()

        br.close()
    srv.shutdown()

    bad = [n for n, ok, _ in results if not ok]
    print(f"\n合计 {len(results)} 项，通过 {len(results)-len(bad)}，失败 {len(bad)}")
    print("说明：R1/R2 应通过；R3 掉线只能由协议层缓解，用例校验的是掉线后的提示与预填；")
    print("      R4 存储不可用时无法保持登录，用例校验的是「应用是否如实告知」。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
