"""变异测试：把每个修复逐一回退，确认 t_fixes.py 能抓住。

做法：只替换 cloud-sync.js 一个文件（通过 Playwright 路由注入），
不复制整个站点目录，避免批量删除触发沙箱保护。

判定：对应用例必须出现 FAIL；否则说明该用例是"恒真"的假绿。
"""
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent.parent / "site" / "cloud-sync.js"
PY = sys.executable
MUT_DIR = HERE / "_mut"

MUTANTS = [
    ("M1", "回退「会话镜像自动恢复」",
     [("if(await tryRestoreMirror())return;", "/* mutant: no restore */")],
     ["X4 刷新后自动恢复登录"]),
    ("M2", "回退「掉线后预填邮箱」",
     [("if(email)authDraft.email=email;", "/* mutant: no prefill */")],
     ["X1 邮箱已预填"]),
    ("M3", "回退「掉线原因说明块」",
     [("const notice=state.sessionLost", "const notice=false&&state.sessionLost")],
     ["X1 掉线说明块存在"]),
    ("M4", "回退「退出时清除镜像」",
     [('      // An explicit logout must leave no token copy behind, otherwise "退出登录" would not\n'
       '      // actually remove the credentials from this browser.\n'
       '      clearMirror();\n', "")],
     ["X6 退出后镜像被清除"]),
    ("M5", "回退「存储可用性探测」（永远认为可用）",
     [("  const storageReady=(()=>{", "  const storageReady=(()=>{return true;")],
     ["X3 检测到存储不可用"]),
    ("M6", "回退「邮箱解析兜底」（账号栏恢复为空）",
     [("const resolvedEmail=String(user.email||user.raw?.email||user.raw?.user_metadata?.email||lastEmail()||'');",
       "const resolvedEmail=String(user.email||'');"),
      ("if(resolvedEmail)rememberEmail(resolvedEmail);", "")],
     ["X7 账号栏显示邮箱"]),
    ("M7", "回退「首次到访不谎称会话失效」",
     [("if(lastEmail()||readMirror())markSessionLost(storageReady?'expired':'storage');\n"
       "      else state.sessionLost=null;",
       "markSessionLost(storageReady?'expired':'storage');")],
     ["X8 新访客不显示失效说明块"]),
]


def run_suite(cloud_sync: Path | None):
    env = dict(os.environ)
    if cloud_sync:
        env["SF_CLOUD_SYNC"] = str(cloud_sync)
    r = subprocess.run([PY, str(HERE / "t_fixes.py")], capture_output=True, text=True,
                       env=env, encoding="utf-8", errors="replace")
    out = r.stdout or ""
    fails = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("FAIL ")]
    return out, fails


def main():
    MUT_DIR.mkdir(exist_ok=True)
    base = SRC.read_text(encoding="utf-8")

    print("=== 基线：未变异的真实源码 ===")
    out, fails = run_suite(None)
    m = re.search(r"合计 (\d+) 项，通过 (\d+)，失败 (\d+)", out)
    print("  " + (m.group(0) if m else "未取到合计行"))
    if fails:
        print("  基线有失败，先修好再谈变异：", fails)
        return 1

    detected = 0
    for mid, desc, patches, expect in MUTANTS:
        text = base
        ok_anchor = True
        for old, new in patches:
            if old not in text:
                print(f"[{mid}] 锚点未命中，跳过：{old[:56]!r}")
                ok_anchor = False
                break
            text = text.replace(old, new, 1)
        if not ok_anchor:
            continue
        target = MUT_DIR / "cloud-sync.js"
        target.write_text(text, encoding="utf-8")
        # 变异体必须是合法 JS，否则"用例没抓到"只是脚本没跑起来
        node = os.environ.get("SF_NODE", "node")
        try:
            chk = subprocess.run([node, "--check", str(target)], capture_output=True, text=True)
            if chk.returncode != 0:
                print(f"[{mid}] 变异体语法错误，不计入结果：{chk.stderr.strip().splitlines()[:1]}")
                continue
        except FileNotFoundError:
            pass
        out, fails = run_suite(target)
        hit = [e for e in (expect or []) if any(e in ln for ln in fails)]
        ok = bool(expect) and len(hit) == len(expect)
        crashed = "合计" not in out
        if crashed and not ok:
            print(f"[{mid}] 用例进程异常退出且未命中，不计入结果：{out.strip()[-160:]}")
            continue
        detected += 1 if ok else 0
        print(f"[{mid}] {desc}\n      检出 {'是' if ok else '否'}  期望 {expect}"
              + ("  （用例后续阶段崩溃，但对应断言已失败）" if crashed and ok else ""))
        if not ok:
            print("      实际失败：" + (" | ".join(x[:70] for x in fails) or "(无失败，用例恒真)"))
    print(f"\n变异测试：{len([m for m in MUTANTS if m[3]])} 个变异体，检出 {detected}，"
          f"未检出 {len([m for m in MUTANTS if m[3]])-detected}")
    return 0 if detected == len([m for m in MUTANTS if m[3]]) else 1


if __name__ == "__main__":
    sys.exit(main())
