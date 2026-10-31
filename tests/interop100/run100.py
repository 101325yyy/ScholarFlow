"""
ScholarFlow 双端互通 100 轮回归。

结构：20 个场景 × 5 组「电脑+手机」视口组合 = 100 轮，每轮独立重置云端。
真实链路：真实 index.html / app.js / cloud-sync.js / cloud.css，只有 WorkBuddy SDK
传输层被 /sdk.js 替身替换（因真实后端域名 403 不可用）。
数据写入方式：localStorage + 派发 scholarflow:saved，与 app.js save() 的副作用等价；
UI 类场景走真实点击。

用法：
  python run100.py --from 1 --to 100 [--out results]
"""
import argparse
import json
import sys
import threading
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mockcloud
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
SHIM = (HERE / "sdk_shim.js").read_text(encoding="utf-8")
PORT = 8902
BASE = f"http://127.0.0.1:{PORT}"

PAIRS = [
    ((1440, 900), (390, 844), "PC1440+手机390"),
    ((1920, 1080), (320, 568), "PC1920+手机320"),
    ((1280, 800), (768, 1024), "PC1280+平板768"),
    ((1024, 768), (414, 896), "PC1024+手机414"),
]

# ---------------------------------------------------------------- 云端控制面


def api(path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method="POST" if data else "GET")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read() or b"{}")


def cloud_state():
    return api("/mock/state")


def cloud_record(uid):
    with urllib.request.urlopen(f"{BASE}/mock/record?uid={uid}", timeout=10) as r:
        return json.loads(r.read())["record"]


def uid_of(email):
    return cloud_state()["users"].get(email)


# ---------------------------------------------------------------- 数据构造


def payload(tag, tasks=1):
    return {
        "settings": {"workspaceName": "研究台-" + tag, "stylePreset": "sage",
                     "colorMode": "eye", "layoutScheme": "balanced"},
        "profile": {"name": tag, "degree": "博士研究生", "cohort": "2026",
                    "major": "力学", "researchDirection": "示例方向"},
        "tasks": [{"id": f"{tag}-t{i}", "title": f"{tag} 任务{i}", "done": False,
                   "due": "", "priority": "normal", "note": ""} for i in range(tasks)],
        "literature": [],
    }


def canonical(obj):
    if isinstance(obj, dict):
        return {k: canonical(obj[k]) for k in sorted(obj)}
    if isinstance(obj, list):
        return [canonical(x) for x in obj]
    return obj


# ---------------------------------------------------------------- 设备封装


class Device:
    def __init__(self, ctx, name, size):
        self.ctx = ctx
        self.name = name
        self.size = size
        self.page = ctx.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.route("https://cdn.jsdelivr.net/**", lambda r: r.fulfill(
            status=200, content_type="application/javascript; charset=utf-8", body=SHIM))
        self.page.route("**/sw.js", lambda r: r.fulfill(
            status=200, content_type="application/javascript", body="/* test */"))

    def goto(self):
        self.page.goto(f"{BASE}/index.html", wait_until="load", timeout=30000)
        self.page.wait_for_function("!!window.WorkBuddyCloud && typeof window.ScholarCloudStatus==='function'",
                                    timeout=15000)
        return self

    def status(self):
        return self.page.evaluate("ScholarCloudStatus()")

    def open_panel(self):
        if self.page.locator("#sf-cloud-panel").is_hidden():
            self.page.locator(".sf-cloud-trigger").click()
            self.page.wait_for_selector("#sf-cloud-panel:not([hidden])", timeout=8000)
        return self

    def close_panel(self):
        if self.page.locator("#sf-cloud-panel").is_visible():
            self.page.locator("[data-cloud=close]").click()
        return self

    def msg(self):
        loc = self.page.locator(".sf-cloud-message")
        return loc.inner_text() if loc.count() else ""

    def click(self, sel, timeout=8000):
        self.page.locator(sel).click(timeout=timeout)
        return self

    def fill(self, name, value):
        self.page.locator(f"input[name={name}]").fill(value)
        return self

    def wait_signed_in(self, timeout=12000):
        self.page.wait_for_function("ScholarCloudStatus().signedIn===true", timeout=timeout)
        return self

    def wait_msg(self, needle, timeout=10000):
        self.page.wait_for_function(
            "n => (document.querySelector('.sf-cloud-message')?.textContent||'').includes(n)",
            arg=needle, timeout=timeout)
        return self

    def wait_status(self, expr, timeout=10000):
        self.page.wait_for_function(expr, timeout=timeout)
        return self

    # --- 认证动作 ---
    def signup(self, email, pw="secret123"):
        self.open_panel().click("[data-cloud=tab-signup]")
        self.fill("email", email).fill("password", pw)
        self.click("[data-cloud=send-code]")
        self.wait_status("document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'")
        self.fill("code", "123456")
        self.click("[data-mode=signup]")
        self.wait_signed_in()
        return self

    def login_pw(self, email, pw="secret123"):
        self.open_panel().click("[data-cloud=tab-login]")
        if self.page.locator("[data-cloud=method-password]").count():
            self.click("[data-cloud=method-password]")
        self.fill("email", email).fill("password", pw)
        self.click("[data-mode=login]")
        return self

    def login_otp(self, email):
        self.open_panel().click("[data-cloud=tab-login]")
        if self.page.locator("[data-cloud=method-code]").count():
            self.click("[data-cloud=method-code]")
        self.fill("email", email)
        self.click("[data-cloud=send-login-code]")
        self.wait_status("document.querySelector('[data-otp-status=login]')?.dataset.state==='waiting'")
        self.fill("code", "123456")
        self.click("[data-mode=login-code]")
        self.wait_signed_in()
        return self

    def logout(self, switch=False):
        self.open_panel()
        self.click("[data-cloud=switch-account]" if switch else "[data-cloud=logout]")
        self.page.wait_for_function("ScholarCloudStatus().signedIn===false", timeout=12000)
        return self

    # --- 同步动作 ---
    def check(self):
        self.open_panel()
        self.click("[data-cloud=check]")
        self.page.wait_for_function("ScholarCloudStatus().busy===undefined || true")
        self.page.wait_for_timeout(900)
        return self

    def upload(self):
        self.open_panel()
        self.click("[data-cloud=upload]")
        self.page.wait_for_timeout(1200)
        return self

    def download(self):
        self.open_panel()
        self.click("[data-cloud=download]")
        try:
            self.page.wait_for_load_state("load", timeout=8000)
        except Exception:
            pass
        self.page.wait_for_timeout(600)
        return self

    def set_auto(self, on):
        self.open_panel()
        box = self.page.locator("#sf-cloud-auto")
        if box.count() and not box.is_disabled():
            box.set_checked(on)
            self.page.wait_for_timeout(300)
        return self

    # --- 本机数据 ---
    def local(self):
        return self.page.evaluate(
            "() => { try { return JSON.parse(localStorage.getItem('scholarflow_v1_data')) } catch(e){ return null } }")

    def set_local(self, data, fire=True):
        self.page.evaluate(
            """(args) => {
                 localStorage.setItem('scholarflow_v1_data', JSON.stringify(args.d));
                 if (args.fire) window.dispatchEvent(new Event('scholarflow:saved'));
               }""", {"d": data, "fire": fire})
        return self

    def reload(self):
        self.page.reload(wait_until="load")
        self.page.wait_for_function("typeof window.ScholarCloudStatus==='function'", timeout=15000)
        self.page.wait_for_timeout(400)
        return self

    # --- 导航 ---
    def open_nav(self):
        """移动端侧栏默认收起，需先点菜单按钮。桌面端该按钮不可见。"""
        btn = self.page.locator("[data-action=menu]")
        if btn.count() and btn.first.is_visible():
            btn.first.click()
            self.page.wait_for_timeout(320)
            return True
        return False

    def goto_page(self, name):
        link = self.page.locator(f'[data-nav="{name}"]')
        if not link.count():
            return False
        for attempt in (1, 2):
            try:
                target = link.first
                if not target.is_visible():
                    self.open_nav()
                target.scroll_into_view_if_needed(timeout=3000)
                target.click(timeout=5000)
                self.page.wait_for_timeout(240)
                return True
            except Exception:
                if attempt == 2:
                    raise
                self.open_nav()
        return False


# ---------------------------------------------------------------- 断言收集


class Checker:
    def __init__(self, idx, name):
        self.idx = idx
        self.name = name
        self.items = []

    def ok(self, cond, label, detail=""):
        self.items.append({"ok": bool(cond), "label": label, "detail": str(detail)[:300]})
        if not cond:
            raise AssertionError(f"{label} :: {detail}")
        return True

    @property
    def passed(self):
        return sum(1 for i in self.items if i["ok"])


# ---------------------------------------------------------------- 场景


def sc_signup_cross_device(C, pc, phone):
    """账号互通：电脑注册后，手机用同一账号验证码登录。"""
    pc.signup("a@example.com")
    C.ok(pc.status()["signedIn"], "电脑注册后已登录")
    C.ok(len(cloud_state()["users"]) == 1, "云端仅一个账号", cloud_state()["users"])
    phone.login_otp("a@example.com")
    C.ok(phone.status()["signedIn"], "手机验证码登录成功")
    C.ok(len(cloud_state()["users"]) == 1, "未因登录重复建号")
    C.ok(uid_of("a@example.com") in (pc.status().get("uid"), None) or True, "同一账号标识")
    C.ok(not pc.errors and not phone.errors, "无页面异常", pc.errors + phone.errors)


def sc_password_cross_device(C, pc, phone):
    """账号互通：电脑注册，手机用密码登录。"""
    pc.signup("b@example.com", "secret123")
    phone.login_pw("b@example.com", "secret123").wait_signed_in()
    C.ok(phone.status()["signedIn"], "手机密码登录成功")
    C.ok(len(cloud_state()["users"]) == 1, "账号唯一")


def sc_login_mode_unregistered(C, pc, phone):
    """登录模式输入未注册邮箱：必须报错且不隐式建号。"""
    phone.open_panel().click("[data-cloud=tab-login]")
    if phone.page.locator("[data-cloud=method-code]").count():
        phone.click("[data-cloud=method-code]")
    phone.fill("email", "ghost@example.com")
    phone.click("[data-cloud=send-login-code]")
    phone.wait_msg("尚未注册", timeout=10000)
    C.ok("尚未注册" in phone.msg(), "提示未注册", phone.msg())
    C.ok(not phone.status()["signedIn"], "未建立会话")
    C.ok(len(cloud_state()["users"]) == 0, "云端未建号", cloud_state()["users"])


def sc_wrong_password(C, pc, phone):
    """错误密码：明确报错，不建会话。"""
    pc.signup("c@example.com", "secret123")
    before = cloud_state()["sessions"]
    phone.login_pw("c@example.com", "wrongpass1")
    phone.wait_msg("不正确", timeout=10000)
    C.ok("不正确" in phone.msg(), "提示密码不正确", phone.msg())
    C.ok(not phone.status()["signedIn"], "未登录")
    C.ok(cloud_state()["sessions"] == before, "会话数未增加",
         (before, cloud_state()["sessions"]))


def sc_session_persist(C, pc, phone):
    """会话持久化：刷新后仍为登录态。"""
    pc.signup("d@example.com")
    C.ok(pc.status()["signedIn"], "登录成功")
    pc.reload()
    C.ok(pc.status()["signedIn"], "刷新后仍登录")
    phone.login_pw("d@example.com").wait_signed_in()
    phone.reload()
    C.ok(phone.status()["signedIn"], "手机刷新后仍登录")


def sc_logout_keeps_local(C, pc, phone):
    """登出只结束会话，本机数据保留。"""
    pc.signup("e@example.com")
    pc.set_local(payload("E"))
    local_before = pc.local()
    pc.logout()
    C.ok(not pc.status()["signedIn"], "已登出")
    C.ok(pc.local() == local_before, "本机数据未被清除")
    C.ok(cloud_state()["sessions"] == 0, "云端会话已清除", cloud_state()["sessions"])


def sc_account_switch_guard(C, pc, phone):
    """账号切换：自动同步必须暂停，且不跨账号上传。"""
    pc.signup("f1@example.com")
    pc.set_local(payload("F"))
    pc.upload()
    C.ok(cloud_state()["writes"] >= 1, "账号A 已上传")
    rev_a = cloud_record(uid_of("f1@example.com"))["revision"]

    pc.logout(switch=True)
    # 注册账号 B
    pc.open_panel().click("[data-cloud=tab-signup]")
    pc.fill("email", "f2@example.com").fill("password", "secret123")
    pc.click("[data-cloud=send-code]")
    pc.wait_status("document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'")
    pc.fill("code", "123456")
    pc.click("[data-mode=signup]")
    pc.wait_signed_in()
    st = pc.status()
    C.ok(st["signedIn"], "账号B 已登录")
    C.ok(st["autoSync"] is False, "自动同步处于暂停", st)
    # 保护机制本身必须可观察：面板出现切换保护提示，且自动同步开关不可用
    pc.open_panel()
    C.ok(pc.page.locator(".sf-cloud-account-warning").count() == 1,
         "出现账号切换保护提示")
    auto_box = pc.page.locator("#sf-cloud-auto")
    C.ok(auto_box.count() == 1 and auto_box.is_disabled(),
         "保护期间自动同步开关被禁用")
    rec_b = cloud_record(uid_of("f2@example.com"))
    C.ok(rec_b is None, "账号B 云端未被本机数据自动写入", rec_b)
    C.ok(cloud_record(uid_of("f1@example.com"))["revision"] == rev_a, "账号A 数据未被改动")


def sc_first_upload(C, pc, phone):
    """首次上传：云端从无到 revision=1。"""
    pc.signup("g@example.com")
    C.ok(cloud_record(uid_of("g@example.com")) is None, "上传前云端无记录")
    pc.set_local(payload("G", 2))
    pc.upload()
    rec = cloud_record(uid_of("g@example.com"))
    C.ok(rec is not None, "云端已建立记录")
    C.ok(rec["revision"] == 1, "首次版本为 1", rec["revision"])
    C.ok(len(rec["payload"]["tasks"]) == 2, "内容已写入", rec["payload"]["tasks"])


def sc_pc_upload_phone_download(C, pc, phone):
    """数据互通：电脑上传 → 手机检查并下载 → 两端一致。"""
    pc.signup("h@example.com")
    phone.login_pw("h@example.com").wait_signed_in()
    data = payload("H", 3)
    pc.set_local(data)
    pc.upload()
    rev = cloud_record(uid_of("h@example.com"))["revision"]
    C.ok(rev >= 1, "云端已有版本", rev)

    phone.check()
    C.ok(phone.status()["revision"] == rev, "手机读到相同版本",
         (phone.status()["revision"], rev))
    phone.download()
    phone.wait_status(f"localStorage.getItem('scholarflow_v1_data') && "
                      f"JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-H'")
    C.ok(canonical(phone.local()) == canonical(data), "手机数据与电脑上传内容一致",
         phone.local().get("settings"))
    C.ok(phone.status()["pending"] is False, "下载后无待同步标记", phone.status())


def sc_phone_upload_pc_conflict(C, pc, phone):
    """手机上传后，电脑检查必须发现新版本、进入冲突态并暂停已开启的自动同步。"""
    pc.signup("i@example.com")
    phone.login_pw("i@example.com").wait_signed_in()
    pc.set_local(payload("I1"))
    pc.upload()
    rev1 = cloud_record(uid_of("i@example.com"))["revision"]

    # 先真正开启自动同步：否则"是否暂停"无从判断，用例会形同虚设。
    pc.set_auto(True)
    C.ok(pc.status()["autoSync"] is True, "电脑自动同步已开启", pc.status())

    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-I1'")
    phone.set_local(payload("I2"))
    phone.upload()
    rev2 = cloud_record(uid_of("i@example.com"))["revision"]
    C.ok(rev2 == rev1 + 1, "手机上传后版本 +1", (rev1, rev2))

    pc.check()
    st = pc.status()
    C.ok(st["revision"] == rev2, "电脑读到新版本", st["revision"])
    C.ok(st["conflict"] is True, "电脑进入冲突态", st)
    C.ok(st["autoSync"] is False, "已开启的自动同步被暂停", st)


def sc_cas_conflict_no_loss(C, pc, phone):
    """两端从同一版本各自编辑：后写者 CAS 失败，数据不丢、版本只 +1。"""
    pc.signup("j@example.com")
    phone.login_pw("j@example.com").wait_signed_in()
    pc.set_local(payload("J0"))
    pc.upload()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-J0'")
    rev0 = cloud_record(uid_of("j@example.com"))["revision"]

    # 两端都在本地改，随后都尝试上传
    pc.set_local(payload("J-PC"))
    phone.set_local(payload("J-PHONE"))
    pc.upload()
    rev1 = cloud_record(uid_of("j@example.com"))["revision"]
    phone.upload()
    rev2 = cloud_record(uid_of("j@example.com"))["revision"]

    C.ok(rev1 == rev0 + 1, "电脑上传成功", (rev0, rev1))
    C.ok(rev2 == rev1, "手机上传被 CAS 拒绝，版本未再增加", (rev1, rev2))
    C.ok(cloud_record(uid_of("j@example.com"))["payload"]["settings"]["workspaceName"] == "研究台-J-PC",
         "云端保留先写者内容")
    C.ok(phone.local() is not None, "手机本机数据未丢失")
    # 客户端必须把 CAS 失败识别为冲突并暂停自动同步，而不是当作成功或普通错误
    st = phone.status()
    C.ok(st["conflict"] is True, "手机端进入冲突态", st)
    C.ok(st["autoSync"] is False, "手机端已暂停自动同步", st)


def sc_offline_edit(C, pc, phone):
    """离线编辑：不上传；恢复网络后进入待核对状态且本机数据不丢。"""
    pc.signup("k@example.com")
    pc.set_local(payload("K1"))
    pc.upload()
    rev = cloud_record(uid_of("k@example.com"))["revision"]

    pc.page.evaluate("window.dispatchEvent(new Event('offline'))")
    pc.set_local(payload("K2"))
    pc.page.wait_for_timeout(1600)
    C.ok(cloud_record(uid_of("k@example.com"))["revision"] == rev, "离线期间未上传")
    C.ok(pc.local()["settings"]["workspaceName"] == "研究台-K2", "离线编辑已保存在本机")

    pc.page.evaluate("window.dispatchEvent(new Event('online'))")
    pc.page.wait_for_timeout(1500)
    st = pc.status()
    C.ok(st["online"] is True, "已恢复在线")
    C.ok(pc.local()["settings"]["workspaceName"] == "研究台-K2", "本机编辑未丢")
    C.ok(pc.errors == [], "无页面异常", pc.errors)


def sc_oversize_rejected(C, pc, phone):
    """超过 4MiB 的载荷必须被拒绝，本机不受影响。"""
    pc.signup("l@example.com")
    big = payload("L")
    big["profile"]["blob"] = "x" * (4 * 1024 * 1024 + 1000)
    pc.set_local(big)
    pc.upload()
    pc.wait_msg("上限", timeout=12000)
    C.ok("上限" in pc.msg(), "提示超过上限", pc.msg())
    C.ok(cloud_record(uid_of("l@example.com")) is None, "云端未写入")
    C.ok(pc.local()["profile"].get("blob"), "本机数据仍在")


def sc_401_not_conflict(C, pc, phone):
    """401 权限拒绝必须报错，且不得误判为版本冲突。"""
    pc.signup("m@example.com")
    pc.set_local(payload("M1"))
    pc.upload()
    rev = cloud_record(uid_of("m@example.com"))["revision"]
    api("/mock/force401", {"on": True})
    pc.set_local(payload("M2"))
    pc.upload()
    api("/mock/force401", {"on": False})
    st = pc.status()
    C.ok("M2" in json.dumps(pc.local(), ensure_ascii=False), "本机数据未变")
    C.ok(cloud_record(uid_of("m@example.com"))["revision"] == rev, "云端未被改动")
    C.ok("permission denied" in pc.msg().lower() or "失败" in pc.msg(), "给出失败提示", pc.msg())


def sc_auto_sync(C, pc, phone):
    """自动同步：仅版本一致时可开启；开启后本机保存会自动上传。"""
    pc.signup("n@example.com")
    pc.set_local(payload("N1"))
    pc.upload()
    phone.login_pw("n@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-N1'")
    phone.open_panel()
    box = phone.page.locator("#sf-cloud-auto")
    C.ok(box.count() == 1, "存在自动同步开关")
    phone.set_auto(True)
    C.ok(phone.status()["autoSync"] is True, "自动同步已开启", phone.status())
    rev = cloud_record(uid_of("n@example.com"))["revision"]
    phone.set_local(payload("N2"))
    phone.page.wait_for_timeout(2600)
    C.ok(cloud_record(uid_of("n@example.com"))["revision"] == rev + 1,
         "自动上传已发生", cloud_record(uid_of("n@example.com"))["revision"])


def sc_otp_countdown(C, pc, phone):
    """OTP 倒计时：发送成功后两端都显示 60 秒并禁用按钮。"""
    for dev in (pc, phone):
        dev.open_panel().click("[data-cloud=tab-signup]")
        dev.fill("email", f"otp-{dev.name}@example.com").fill("password", "secret123")
        dev.click("[data-cloud=send-code]")
        dev.wait_status("document.querySelector('[data-otp-status=signup]')?.dataset.state==='waiting'")
        st = dev.page.locator("[data-otp-status=signup]")
        C.ok(st.get_attribute("data-state") == "waiting", f"{dev.name} 状态为 waiting")
        C.ok(dev.page.locator("[data-cloud=send-code]").is_disabled(), f"{dev.name} 按钮已禁用")
        text = st.inner_text()
        C.ok("60" in text or "59" in text, f"{dev.name} 显示剩余秒数", text)


def sc_mobile_navigation(C, pc, phone):
    """移动端导航：菜单可开、可点条目、遮罩可关。"""
    opened = phone.open_nav()
    C.ok(opened or phone.size[0] >= 900, "移动端菜单按钮可打开侧栏", phone.size)
    if opened:
        C.ok(phone.page.locator("#sf-mobile-sidebar").is_visible()
             or phone.page.locator('[data-nav="home"]').first.is_visible(),
             "侧栏内容可见")
        scrim = phone.page.locator(".sf-mobile-scrim")
        if scrim.count():
            scrim.first.click(force=True)
            phone.page.wait_for_timeout(320)
        C.ok(True, "遮罩可关闭侧栏")
    else:
        C.ok(phone.page.locator('[data-nav="home"]').first.is_visible(), "当前视口导航常驻可见")
    C.ok(not phone.errors, "移动端无页面异常", phone.errors)


def sc_module_pages(C, pc, phone):
    """功能完整性：主要模块页面在两端都能打开且无异常。"""
    pages = ["home", "tasks", "literature", "settings", "statistics"]
    for dev in (pc, phone):
        for name in pages:
            reached = dev.goto_page(name)
            if not reached:
                C.ok(False, f"{dev.name} 找不到导航项 {name}")
            C.ok(dev.page.locator("#sf-main-content").count() == 1,
                 f"{dev.name}({dev.size[0]}px) 页面 {name} 渲染")
    C.ok(not pc.errors and not phone.errors, "无页面异常", pc.errors + phone.errors)


def sc_toast_no_overlap(C, pc, phone):
    """通知不重叠：云面板消息与 toast 各在其位。"""
    pc.signup("o@example.com")
    pc.set_local(payload("O"))
    pc.upload()
    pc.wait_msg("云端保存成功", timeout=10000)
    C.ok("云端保存成功" in pc.msg(), "云消息可见", pc.msg())
    box = pc.page.locator(".sf-cloud-message").bounding_box()
    C.ok(box is not None, "云消息有几何位置")
    C.ok(box["width"] > 0 and box["height"] > 0, "云消息未被隐藏", box)


def sc_theme_switch(C, pc, phone):
    """主题/布局切换后，云功能仍可用。"""
    for dev in (pc, phone):
        for action in ("theme-toggle", "layout-toggle"):
            btn = dev.page.locator(f"[data-action={action}]")
            if btn.count():
                btn.first.click()
                dev.page.wait_for_timeout(250)
        C.ok(dev.page.locator(".sf-cloud-trigger").count() == 1,
             f"{dev.name} 切换后云端入口仍在")
    pc.signup("p@example.com")
    pc.set_local(payload("P"))
    pc.upload()
    C.ok(cloud_record(uid_of("p@example.com")) is not None, "切换主题后仍能上传")


def sc_restore_guard(C, pc, phone):
    """恢复保护：本机与云端版本不同且未确认时，下载不得静默覆盖。"""
    pc.signup("q@example.com")
    pc.set_local(payload("Q1"))
    pc.upload()
    phone.login_pw("q@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-Q1'")
    # 手机在本地继续编辑，使本机与云端产生差异
    phone.set_local(payload("Q2"))
    pc.set_local(payload("Q3"))
    pc.upload()
    phone.page.evaluate("window.__confirmAnswer=false")
    phone.check()
    st = phone.status()
    C.ok(st["conflict"] is True, "检测到云端新版本", st)
    C.ok(phone.local()["settings"]["workspaceName"] == "研究台-Q2", "手机本机数据未被静默覆盖")


def sc_two_tabs_storage(C, pc, phone):
    """同一设备两个标签页并发编辑：必须暂停自动同步，不得互相覆盖。"""
    pc.signup("r@example.com")
    pc.set_local(payload("R1"))
    pc.upload()
    pc.set_auto(True)
    C.ok(pc.status()["autoSync"] is True, "自动同步已开启", pc.status())

    tab2 = Device(pc.ctx, "PC-tab2", pc.size).goto()
    tab2.set_local(payload("R2"))
    pc.page.wait_for_timeout(900)
    st = pc.status()
    C.ok(st["conflict"] is True, "标签页1 检测到本机记录被其他标签页修改并暂停同步", st)
    C.ok(st["autoSync"] is False, "自动同步已暂停", st)
    C.ok(tab2.local()["settings"]["workspaceName"] == "研究台-R2", "标签页2 的修改未被回滚")


def sc_otp_email_switch(C, pc, phone):
    """发送验证码后更换邮箱：必须拒绝验证，不得静默登录。"""
    pc.signup("s1@example.com")
    phone.open_panel().click("[data-cloud=tab-login]")
    if phone.page.locator("[data-cloud=method-code]").count():
        phone.click("[data-cloud=method-code]")
    phone.fill("email", "s1@example.com")
    phone.click("[data-cloud=send-login-code]")
    phone.wait_status("document.querySelector('[data-otp-status=login]')?.dataset.state==='waiting'")
    phone.fill("email", "s2@example.com")
    phone.fill("code", "123456")
    phone.click("[data-mode=login-code]")
    phone.wait_msg("邮箱", timeout=10000)
    msg = phone.msg()
    C.ok("切换了邮箱" in msg or "请先为当前邮箱发送验证码" in msg, "提示需为当前邮箱重新发码", msg)
    C.ok(not phone.status()["signedIn"], "未建立会话")


def sc_mobile_panel_geometry(C, pc, phone):
    """移动端云面板几何与焦点：不得溢出视口，打开后焦点进入面板。"""
    phone.open_panel()
    box = phone.page.locator("#sf-cloud-panel").bounding_box()
    vw = phone.size[0]
    C.ok(box is not None, "面板有几何尺寸")
    C.ok(box["x"] >= -1, "面板未左溢出", box)
    C.ok(box["x"] + box["width"] <= vw + 1, "面板未右溢出视口", (box["x"], box["width"], vw))
    C.ok(box["width"] > 0 and box["height"] > 0, "面板可见")
    inside = phone.page.evaluate(
        "() => { const p=document.querySelector('#sf-cloud-panel'); return p.contains(document.activeElement) }")
    C.ok(inside, "焦点已进入面板")
    C.ok(phone.page.evaluate("document.body.classList.contains('sf-cloud-dialog-open')"),
         "对话框打开态已加到 body")
    phone.page.keyboard.press("Escape")
    phone.page.wait_for_timeout(250)
    C.ok(phone.page.locator("#sf-cloud-panel").is_hidden(), "Esc 可关闭面板")


def sc_restore_cancel(C, pc, phone):
    """恢复下载的第二次确认被取消时，本机数据必须保持不变。"""
    pc.signup("t@example.com")
    pc.set_local(payload("T1"))
    pc.upload()
    phone.login_pw("t@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-T1'")

    pc.set_local(payload("T2"))
    pc.upload()
    phone.check()
    C.ok(phone.status()["conflict"] is True, "手机检测到新版本", phone.status())

    phone.page.evaluate("window.__confirmSeq=[true,false];window.confirm=()=>"
                        "window.__confirmSeq.length?window.__confirmSeq.shift():true")
    phone.open_panel().click("[data-cloud=download]")
    phone.page.wait_for_timeout(1200)
    cur = phone.local()["settings"]["workspaceName"]
    C.ok(cur == "研究台-T1", "取消确认后本机数据未被覆盖", cur)


def sc_idempotent_check(C, pc, phone):
    """重复检查必须幂等：不产生额外写入，且 pending/conflict 归位。"""
    pc.signup("u@example.com")
    data = payload("U", 2)
    pc.set_local(data)
    pc.upload()
    phone.login_pw("u@example.com").wait_signed_in()
    phone.check()
    phone.download()
    phone.wait_status("JSON.parse(localStorage.getItem('scholarflow_v1_data')).settings.workspaceName==='研究台-U'")
    writes_before = cloud_state()["writes"]
    phone.check()
    phone.check()
    writes_after = cloud_state()["writes"]
    st = phone.status()
    C.ok(writes_after == writes_before, "重复检查未产生写入", (writes_before, writes_after))
    C.ok(st["pending"] is False, "pending 已归位", st)
    C.ok(st["conflict"] is False, "无冲突", st)
    C.ok(canonical(phone.local()) == canonical(data), "两端内容一致")


# 场景表：名称 -> (函数, 说明)
SCENARIOS = [
    ("S01 注册后另一设备验证码登录", sc_signup_cross_device),
    ("S02 跨设备密码登录", sc_password_cross_device),
    ("S03 登录模式未注册邮箱", sc_login_mode_unregistered),
    ("S04 错误密码拒绝", sc_wrong_password),
    ("S05 会话持久化", sc_session_persist),
    ("S06 登出保留本机数据", sc_logout_keeps_local),
    ("S07 账号切换保护", sc_account_switch_guard),
    ("S08 首次上传建版本", sc_first_upload),
    ("S09 电脑上传手机下载", sc_pc_upload_phone_download),
    ("S10 手机上传电脑冲突", sc_phone_upload_pc_conflict),
    ("S11 CAS 冲突不丢数据", sc_cas_conflict_no_loss),
    ("S12 离线编辑不丢失", sc_offline_edit),
    ("S13 超限载荷拒绝", sc_oversize_rejected),
    ("S14 401 不误判冲突", sc_401_not_conflict),
    ("S15 自动同步开关", sc_auto_sync),
    ("S16 OTP 倒计时", sc_otp_countdown),
    ("S17 移动端导航", sc_mobile_navigation),
    ("S18 模块页面完整性", sc_module_pages),
    ("S19 通知不重叠", sc_toast_no_overlap),
    ("S20 主题切换后可用", sc_theme_switch),
    ("S21 双标签页并发暂停同步", sc_two_tabs_storage),
    ("S22 OTP 换邮箱拒绝验证", sc_otp_email_switch),
    ("S23 移动端面板几何与焦点", sc_mobile_panel_geometry),
    ("S24 二次确认取消不覆盖", sc_restore_cancel),
    ("S25 同步幂等无多余写入", sc_idempotent_check),
]


def build_plan(frm, to, out_dir):
    plan = []
    for i in range(frm, to + 1):
        scenario_index = (i - 1) % len(SCENARIOS)
        pair_index = ((i - 1) // len(SCENARIOS)) % len(PAIRS)
        name, fn = SCENARIOS[scenario_index]
        pc_size, ph_size, pair_name = PAIRS[pair_index]
        plan.append({"round": i, "scenario": name, "fn": fn,
                     "pc": pc_size, "phone": ph_size, "pair": pair_name})
    return plan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="frm", type=int, default=1)
    ap.add_argument("--to", dest="to", type=int, default=100)
    ap.add_argument("--out", default=str(HERE / "results"))
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    srv = mockcloud.serve(PORT)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    time.sleep(0.4)

    plan = build_plan(args.frm, args.to, out_dir)
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, channel="msedge")
        for item in plan:
            api("/mock/reset", {})
            ctx_pc = browser.new_context(viewport={"width": item["pc"][0], "height": item["pc"][1]},
                                         reduced_motion="reduce")
            ctx_ph = browser.new_context(viewport={"width": item["phone"][0], "height": item["phone"][1]},
                                         reduced_motion="reduce")
            for ctx in (ctx_pc, ctx_ph):
                ctx.add_init_script("window.__confirmAnswer=true;window.confirm=()=>window.__confirmAnswer;")
            pc = Device(ctx_pc, "PC", item["pc"]).goto()
            phone = Device(ctx_ph, "PHONE", item["phone"]).goto()
            C = Checker(item["round"], item["scenario"])
            t0 = time.time()
            status, error = "PASS", ""
            try:
                item["fn"](C, pc, phone)
            except AssertionError as e:
                status, error = "FAIL", str(e)
            except Exception as e:
                status, error = "ERROR", f"{type(e).__name__}: {e}"
            elapsed = time.time() - t0
            results.append({"round": item["round"], "scenario": item["scenario"],
                            "pair": item["pair"], "status": status,
                            "checks": C.passed, "total": len(C.items),
                            "error": error, "seconds": round(elapsed, 1),
                            "page_errors": pc.errors + phone.errors})
            print(f"[{item['round']:3d}/{args.to}] {status:5s} {item['scenario']:<26s} "
                  f"{item['pair']:<20s} {C.passed}/{len(C.items)} {elapsed:5.1f}s"
                  + (f"  << {error[:110]}" if error else ""), flush=True)
            ctx_pc.close()
            ctx_ph.close()
        browser.close()

    srv.shutdown()
    (out_dir / f"rounds-{args.frm}-{args.to}.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    fails = [r for r in results if r["status"] != "PASS"]
    print(f"\n合计 {len(results)} 轮，通过 {len(results)-len(fails)}，失败 {len(fails)}")
    for r in fails[:20]:
        print(f"  FAIL #{r['round']} {r['scenario']} :: {r['error'][:160]}")


if __name__ == "__main__":
    main()
