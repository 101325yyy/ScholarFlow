"""验证「账户被记住」相关修复。真实 SDK + 契约替身后端。

X1 掉线后邮箱预填
X2 掉线提示明确「账号仍在，不需要重新注册」
X3 存储不可用环境给出明确告警
X4 SDK 丢弃但令牌仍有效时自动恢复（账户被记住的核心）
X5 令牌临近过期时不硬撑假登录
X6 显式退出后不残留凭据副本
X7 登录后账号栏能显示邮箱
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
REPO = HERE.parent.parent                      # tests/session-persist -> tests -> repo root
SITE = Path(os.environ.get("SF_SITE", REPO / "site"))
from sdkfetch import ensure_sdk                # noqa: E402  (缺 sdk.js 时自动下载)
SDK_TEXT = ensure_sdk()
HOST = "scholarflow-source.app.workbuddy.host"
PK = "wbpk_OPZoHCF62BC9h3dKrHmNrO_9WfJB5Rr8PMIP4g1SX5ozTVnTxVlwM8I"
SDK_KEY = "workbuddy-cloud.session." + PK
MIRROR_KEY = "sf_cloud_session_mirror_v1"
EMAIL_KEY = "sf_cloud_last_email_v1"

mock = MockCloud(expires_in=3600)
results = []


def check(name, ok, detail=""):
    results.append((name, str(ok)))
    print(("  PASS " if ok else "  FAIL ") + name + ("  | " + detail if detail else ""))
    return ok


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
    status, payload = mock.handle(req.method, req.url.split(HOST)[-1], body, req.headers)
    route.fulfill(status=status, headers=cors_headers(origin), body=json.dumps(payload))


def wire(ctx, block_storage=False):
    ctx.route(f"https://{HOST}/**", handler)
    ctx.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(
        status=200, content_type="application/javascript; charset=utf-8", body=SDK_TEXT))
    ctx.route("**/sw.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body="/* t */"))
    # 变异测试用：只替换 cloud-sync.js，其余文件仍取真实站点
    override = os.environ.get("SF_CLOUD_SYNC")
    if override:
        body = Path(override).read_text(encoding="utf-8")
        ctx.route("**/cloud-sync.js", lambda r: r.fulfill(
            status=200, content_type="application/javascript; charset=utf-8", body=body))
    if block_storage:
        ctx.add_init_script("""
            (() => { const boom = () => { throw new DOMException('storage disabled','SecurityError') };
              const fake = { getItem: boom, setItem: boom, removeItem: boom, clear: boom,
                             key: boom, get length(){ boom() } };
              Object.defineProperty(window,'localStorage',{ get(){ return fake }, configurable:true });
            })();""")


def boot(page, base, wait=2000):
    page.goto(f"{base}/index.html", wait_until="load", timeout=30000)
    page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
    page.wait_for_timeout(wait)


def st(page):
    return page.evaluate("ScholarCloudStatus()")


def get_ls(page, key):
    return page.evaluate("k => localStorage.getItem(k)", key)


def panel_text(page):
    if page.locator("#sf-cloud-panel").is_hidden():
        page.locator(".sf-cloud-trigger").click()
        page.wait_for_selector("#sf-cloud-panel:not([hidden])", timeout=8000)
    return page.locator("#sf-cloud-panel").inner_text()


def signup(page, base, email):
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
    page.wait_for_timeout(500)


def main():
    srv, base = serve()
    print(f"静态站 {base}\n")
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="msedge", headless=True)

        # ---------- X8 首次到访不谎称会话失效 ----------
        print("[X8] 全新环境（从未登录）不应提示「登录状态已失效」")
        ctx0 = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx0)
        pg0 = ctx0.new_page()
        boot(pg0, base)
        t0 = panel_text(pg0)
        n0 = (pg0.locator(".sf-cloud-session-notice").inner_text()
              if pg0.locator(".sf-cloud-session-notice").count() else "")
        check("X8 新访客不显示失效说明块", n0.strip() == "", f"notice='{n0[:60]}'")
        check("X8 新访客不再被要求重新登录", "登录状态已失效" not in t0, "")
        ctx0.close()

        # ---------- X7 账号栏邮箱 ----------
        print("[X7] 登录后账号栏显示邮箱")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        signup(pg, base, "fay@lab.example")
        txt = panel_text(pg)
        check("X7 账号栏显示邮箱", "fay@lab.example" in txt, f"片段={txt.splitlines()[:3]}")
        check("X7 邮箱已记住（lastEmail）", get_ls(pg, EMAIL_KEY) == "fay@lab.example",
              f"值={get_ls(pg, EMAIL_KEY)}")

        # ---------- X4 SDK 丢弃但仍有效 → 自动恢复 ----------
        print("[X4] SDK 删掉会话键、但令牌仍有效 → 应自动恢复")
        mirror = json.loads(get_ls(pg, MIRROR_KEY) or "{}")
        pg.evaluate("k => localStorage.removeItem(k)", SDK_KEY)
        check("X4 前置：镜像已存在", bool(mirror.get("accessToken")),
              f"expiresAt 距今 {int(mirror.get('expiresAt',0)/1000-time.time())}s")
        pg.reload(wait_until="load")
        pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        pg.wait_for_timeout(2500)
        s = st(pg)
        check("X4 刷新后自动恢复登录", s["signedIn"] is True, f"status={s}")
        check("X4 恢复后不是「掉线」状态", s["sessionLost"] is None, f"sessionLost={s['sessionLost']}")

        # ---------- X6 显式退出清理镜像 ----------
        print("[X6] 显式退出登录后不残留凭据副本")
        if st(pg)["signedIn"] is not True:
            # 前面的用例已失守时不要崩溃，如实记为失败即可
            check("X6 前置：应处于登录状态", False, f"status={st(pg)}")
            check("X6 退出后镜像被清除", False, "因未登录，无法执行退出")
            ctx.close()
        else:
            pg.on("dialog", lambda d: d.accept())
            panel_text(pg)
            pg.locator("[data-cloud=logout]").click()
            pg.wait_for_function("ScholarCloudStatus().signedIn===false", timeout=12000)
            pg.wait_for_timeout(800)
            check("X6 退出后镜像被清除", get_ls(pg, MIRROR_KEY) is None, f"mirror={get_ls(pg, MIRROR_KEY)}")
            check("X6 退出后 SDK 会话键也不存在", get_ls(pg, SDK_KEY) is None)
            pg.reload(wait_until="load")
            pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
            pg.wait_for_timeout(2000)
            check("X6 刷新后仍未登录（不会偷偷恢复）", st(pg)["signedIn"] is False)
            panel_text(pg)   # 展开面板后再读输入框
            filled = pg.locator("input[name=email]").input_value() if pg.locator("input[name=email]").count() else ""
            check("X6 退出后邮箱预填，便于一键回登", filled == "fay@lab.example", f"email='{filled}'")
            ctx.close()

        # ---------- X1/X2 掉线后的提示与预填 ----------
        print("[X1/X2] 令牌彻底失效后：说明原因 + 预填邮箱")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        signup(pg, base, "gus@lab.example")
        # 让令牌真正失效：把 refresh_mode 设成 invalid_grant，并把会话与镜像都设为过期
        mock.refresh_mode = "invalid_grant"
        for k in (SDK_KEY, MIRROR_KEY):
            raw = get_ls(pg, k)
            if raw:
                v = json.loads(raw)
                v["expiresAt"] = int(time.time() * 1000) - 5000
                pg.evaluate("([k, v]) => localStorage.setItem(k, v)", [k, json.dumps(v)])
        pg.reload(wait_until="load")
        pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        pg.wait_for_timeout(3000)
        s = st(pg)
        check("X1 令牌失效后确实离线", s["signedIn"] is False, f"status={s}")
        check("X1 会话失效状态被记录", s["sessionLost"] in ("expired", "storage"), f"sessionLost={s['sessionLost']}")
        t = panel_text(pg)
        notice = (pg.locator(".sf-cloud-session-notice").inner_text()
                  if pg.locator(".sf-cloud-session-notice").count() else "")
        filled = pg.locator("input[name=email]").input_value() if pg.locator("input[name=email]").count() else ""
        check("X1 邮箱已预填", filled == "gus@lab.example", f"email='{filled}'")
        check("X1 掉线说明块存在", bool(notice.strip()), f"notice='{notice[:60]}'")
        check("X2 说明块写明「不需要重新注册」", "不需要重新注册" in notice.replace(" ", ""), f"notice='{notice[:90]}'")
        check("X2 说明块指明账号仍然存在", "账号仍然存在" in notice.replace(" ", ""), f"notice='{notice[:90]}'")
        mock.refresh_mode = "ok"
        ctx.close()

        # ---------- X5 临近过期不硬撑 ----------
        print("[X5] 镜像临近过期（<90s）时不硬撑假登录")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx)
        pg = ctx.new_page()
        signup(pg, base, "hal@lab.example")
        raw = get_ls(pg, MIRROR_KEY)
        if raw:
            v = json.loads(raw)
            v["expiresAt"] = int(time.time() * 1000) + 30_000   # 30 秒后过期
            pg.evaluate("([k, x]) => localStorage.setItem(k, x)", [MIRROR_KEY, json.dumps(v)])
        pg.evaluate("k => localStorage.removeItem(k)", SDK_KEY)
        mock.refresh_mode = "invalid_grant"
        pg.reload(wait_until="load")
        pg.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        pg.wait_for_timeout(3000)
        check("X5 不假装在线", st(pg)["signedIn"] is False, f"status={st(pg)}")
        mock.refresh_mode = "ok"
        ctx.close()

        # ---------- X3 存储不可用 ----------
        print("[X3] 存储不可用环境给出告警")
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        wire(ctx, block_storage=True)
        pg = ctx.new_page()
        boot(pg, base)
        s = st(pg)
        check("X3 检测到存储不可用", s["storageReady"] is False, f"storageReady={s['storageReady']}")
        t = panel_text(pg)
        notice = (pg.locator(".sf-cloud-session-notice").inner_text()
                  if pg.locator(".sf-cloud-session-notice").count() else "")
        check("X3 存储不可用环境渲染出说明块", bool(notice.strip()), f"notice='{notice[:60]}'")
        check("X3 说明块写明「无法保存登录状态」", "无法保存登录状态" in notice, f"notice='{notice[:80]}'")
        check("X3 说明块给出可操作建议（预览/隐私窗口）",
              ("预览" in notice) and ("隐私" in notice), f"notice='{notice[:80]}'")
        ctx.close()

        br.close()
    srv.shutdown()
    bad = [n for n, ok in results if ok != "True"]
    print(f"\n合计 {len(results)} 项，通过 {len(results)-len(bad)}，失败 {len(bad)}")
    if bad:
        print("失败项：" + "; ".join(bad))
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
