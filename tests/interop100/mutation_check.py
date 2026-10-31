"""
变异测试：证明 100 轮用例真的能发现缺陷，而不是"永远通过"。

做法：把 site/ 复制成 site-mut/，注入 3 个真实可致的缺陷，各自跑对应场景，
预期全部 FAIL。若某个变异体仍然 PASS，说明该用例形同虚设。

M1 CAS 校验被削弱：update 结果不再检查"恰好 1 行" → 并发覆盖（对应 S11）
M2 冲突态不再暂停自动同步：state.active=false 被去掉（对应 S10）
M3 账号切换保护失效：requireAccountReview 不再置 guard（对应 S07）
"""
import json
import shutil
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mockcloud
import run100
from run100 import Device, Checker, api

SRC = Path(mockcloud.SITE_DIR)
MUT_PORT = 8904
run100.PORT = MUT_PORT
run100.BASE = f"http://127.0.0.1:{MUT_PORT}"

MUTATIONS = [
    ("M1", "CAS 校验削弱（允许 0 行也当成功）",
     "if(!Array.isArray(result)||result.length!==1){\n          state.conflict=true;state.active=false;setPreferred(false);\n          throw Error('云端已被另一设备更新，本次上传已取消；本机数据未丢失。请检查云端版本。');\n        }",
     "if(!Array.isArray(result)){\n          throw Error('上传未返回结果');\n        }",
     "sc_cas_conflict_no_loss", "S11 CAS 冲突不丢数据"),
    ("M2", "冲突后不再暂停自动同步",
     "state.active=false;state.conflict=true;setPreferred(false);\n        setMessage('发现其他设备写入的新版本",
     "state.conflict=true;\n        setMessage('发现其他设备写入的新版本",
     "sc_phone_upload_pc_conflict", "S10 手机上传电脑冲突"),
    ("M3", "账号切换保护失效",
     "state.accountGuard=true;state.active=false;clearTimeout(state.timer);",
     "state.active=false;clearTimeout(state.timer);",
     "sc_account_switch_guard", "S07 账号切换保护"),
]


def build_mutant(m):
    dst = Path(__file__).parent / f"site-mut-{m[0]}"
    if dst.exists():
        for p in sorted(dst.rglob("*"), reverse=True):
            if p.is_file():
                p.unlink()
            elif p.is_dir():
                try:
                    p.rmdir()
                except OSError:
                    pass
    dst.mkdir(parents=True, exist_ok=True)
    for f in SRC.iterdir():
        if f.is_file():
            shutil.copy2(f, dst / f.name)
    target = dst / "cloud-sync.js"
    text = target.read_text(encoding="utf-8")
    if m[2] not in text:
        return None
    target.write_text(text.replace(m[2], m[3], 1), encoding="utf-8")
    return dst


def run_case(fn, name, size_pc=(1440, 900), size_ph=(390, 844)):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, channel="msedge")
        c1 = b.new_context(viewport={"width": size_pc[0], "height": size_pc[1]}, reduced_motion="reduce")
        c2 = b.new_context(viewport={"width": size_ph[0], "height": size_ph[1]}, reduced_motion="reduce")
        for c in (c1, c2):
            c.add_init_script("window.__confirmAnswer=true;window.confirm=()=>window.__confirmAnswer;")
        pc = Device(c1, "PC", size_pc).goto()
        phone = Device(c2, "PHONE", size_ph).goto()
        C = Checker(0, name)
        status, err = "PASS", ""
        try:
            fn(C, pc, phone)
        except AssertionError as e:
            status, err = "FAIL", str(e)
        except Exception as e:
            status, err = "ERROR", f"{type(e).__name__}: {e}"
        b.close()
        return status, err


def main():
    results = []
    for m in MUTATIONS:
        dst = build_mutant(m)
        if dst is None:
            print(f"{m[0]} 变异锚点未命中，跳过（源码已变化）")
            results.append({"mutant": m[0], "status": "ANCHOR_MISS", "detail": m[1]})
            continue
        mockcloud.SITE_DIR = str(dst)
        srv = mockcloud.serve(MUT_PORT)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        time.sleep(0.4)
        api("/mock/reset", {})
        fn = dict((n, f) for n, f in [
            ("sc_cas_conflict_no_loss", run100.sc_cas_conflict_no_loss),
            ("sc_phone_upload_pc_conflict", run100.sc_phone_upload_pc_conflict),
            ("sc_account_switch_guard", run100.sc_account_switch_guard),
        ])[m[4]]
        status, err = run_case(fn, m[5])
        srv.shutdown()
        time.sleep(0.2)
        detected = status != "PASS"
        print(f"{m[0]} {m[1]:<28s} 场景 {m[5]:<18s} 结果={status:<5s} "
              f"{'已检出（符合预期）' if detected else '未检出（用例失效！）'}", flush=True)
        if err:
            print("     原因:", err[:160])
        results.append({"mutant": m[0], "desc": m[1], "scenario": m[5],
                        "status": status, "detected": detected, "error": err[:300]})
        mockcloud.SITE_DIR = str(SRC)
    out = Path(__file__).parent / "results"
    out.mkdir(exist_ok=True)
    (out / "mutation.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [r for r in results if r.get("detected") is False]
    print(f"\n变异测试：{len(results)} 个变异体，检出 {len(results)-len(bad)}，未检出 {len(bad)}")


if __name__ == "__main__":
    main()
