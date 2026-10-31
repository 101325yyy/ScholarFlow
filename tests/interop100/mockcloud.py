"""
ScholarFlow 双端互通测试用的「共享云」服务端。

为什么需要它：项目的 mock-workbuddy-sdk.js 把云端状态挂在单个 window 上，
只能模拟"一个浏览器里的一个标签页"。要验证手机与电脑之间的账号/数据互通，
必须让两个独立的浏览器上下文（各自独立的 localStorage）共享同一个服务端状态。

本服务同时：
  1. 静态托管 site/ 目录（真实 index.html / app.js / cloud-sync.js）
  2. 在 /mock/* 下实现与 WorkBuddy SDK 同构的接口
  3. 提供 /mock/state、/mock/reset、/mock/seed 供测试做断言与预置

CAS 语义严格对齐真实云端：update 以 expected revision 为前置条件，
不匹配时返回 {data:[], success:true, status:200}（而不是抛错），
cloud-sync.js 据此判断"云端已被另一设备更新"。
"""
import json
import os
import re
import secrets
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "..", "source",
                        "ScholarFlow-2026.11.15-OTP-Session-Fix-Full-Source", "site")
SITE_DIR = os.path.abspath(SITE_DIR)
SDK_SHIM = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sdk_shim.js")

LOCK = threading.RLock()
OTP_CODE = "123456"


def _blank_state():
    return {
        "users": {},      # email -> {id, password}
        "records": {},    # uid -> {revision, payload}
        "sessions": {},   # token -> uid
        "otp": {},        # vid -> {email, kind, existing}
        "storage": {},    # f"{uid}/{path}" -> {"b64":..., "size":...}
        "writes": 0,
        "inserts": 0,
        "cas_fail": 0,
        "auth_calls": 0,
        "force401": False,
    }


STATE = _blank_state()


def _uid(email):
    return "u_" + secrets.token_hex(4)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass  # 静音，避免 100 轮日志淹没输出

    # ---------- helpers ----------
    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return {}

    def _uid_of(self, token):
        return STATE["sessions"].get(token or "")

    def _envelope_error(self, message, status=None, code=None):
        err = {"message": message}
        if status is not None:
            err["status"] = status
        if code is not None:
            err["code"] = code
        return {"data": None, "error": err, "status": status, "success": False}

    # ---------- routing ----------
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/sdk.js":
            with open(SDK_SHIM, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/mock/state":
            with LOCK:
                snap = {
                    "users": {e: v["id"] for e, v in STATE["users"].items()},
                    "records": {k: {"revision": v["revision"],
                                    "len": len(json.dumps(v["payload"], ensure_ascii=False))}
                                for k, v in STATE["records"].items()},
                    "writes": STATE["writes"], "inserts": STATE["inserts"],
                    "cas_fail": STATE["cas_fail"], "auth_calls": STATE["auth_calls"],
                    "sessions": len(STATE["sessions"]), "storage": len(STATE["storage"]),
                }
            self._json(200, snap)
            return
        if path == "/mock/record":
            q = parse_qs(urlparse(self.path).query)
            uid = q.get("uid", [""])[0]
            with LOCK:
                rec = STATE["records"].get(uid)
            self._json(200, {"record": rec})
            return
        if path.startswith("/mock/"):
            self._json(404, {"error": {"message": "unknown mock endpoint"}})
            return
        return self._static(path)

    def _static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        safe = os.path.normpath(path.lstrip("/"))
        full = os.path.join(SITE_DIR, safe)
        if not os.path.abspath(full).startswith(SITE_DIR) or not os.path.isfile(full):
            self.send_error(404, "not found")
            return
        ext = os.path.splitext(full)[1].lower()
        ctype = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
                 ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
                 ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
                 ".png": "image/png", ".ico": "image/x-icon"}.get(ext, "application/octet-stream")
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlparse(self.path).path
        d = self._body()
        with LOCK:
            return self._post_locked(path, d)

    def _post_locked(self, path, d):
        # ---- 测试控制面 ----
        if path == "/mock/reset":
            STATE.clear()
            STATE.update(_blank_state())
            self._json(200, {"ok": True})
            return
        if path == "/mock/seed":
            email = d.get("email")
            user = STATE["users"].setdefault(email, {"id": _uid(email), "password": d.get("password", "secret123")})
            user["password"] = d.get("password", user["password"])
            STATE["records"][user["id"]] = {"revision": int(d.get("revision", 1)),
                                            "payload": d.get("payload")}
            self._json(200, {"uid": user["id"]})
            return
        if path == "/mock/force401":
            STATE["force401"] = bool(d.get("on"))
            self._json(200, {"force401": STATE["force401"]})
            return
        if path == "/mock/touch":  # 模拟另一设备直接写入，用于制造真实 CAS 冲突
            uid = d.get("uid")
            rec = STATE["records"].get(uid)
            if not rec:
                self._json(404, {"error": {"message": "no record"}})
                return
            rec["revision"] = int(rec["revision"]) + 1
            rec["payload"] = d.get("payload", rec["payload"])
            STATE["writes"] += 1
            self._json(200, {"revision": rec["revision"]})
            return
        if path == "/mock/storage/list":
            uid = d.get("uid")
            self._json(200, {"keys": [k for k in STATE["storage"] if k.startswith(uid + "/")]})
            return

        STATE["auth_calls"] += 1

        # ---- 会话 ----
        if path == "/mock/session":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(200, {"user": None})
                return
            email = next((e for e, v in STATE["users"].items() if v["id"] == uid), "")
            self._json(200, {"user": {"id": uid, "email": email}})
            return

        # ---- 认证 ----
        if path == "/mock/auth/password":
            email, pw = d.get("email", ""), d.get("password", "")
            u = STATE["users"].get(email)
            if not u:
                self._json(200, self._envelope_error("invalid login credentials"))
                return
            if u.get("password") in (None, ""):
                self._json(200, self._envelope_error("user password not set"))
                return
            if u["password"] != pw:
                self._json(200, self._envelope_error("invalid login credentials"))
                return
            token = "t_" + secrets.token_hex(8)
            STATE["sessions"][token] = u["id"]
            self._json(200, {"data": {"user": {"id": u["id"], "email": email}, "access_token": token}})
            return

        if path == "/mock/auth/otp":
            email = d.get("email", "")
            existing = email in STATE["users"]
            vid = "v_" + secrets.token_hex(6)
            STATE["otp"][vid] = {"email": email, "kind": "signup" if not existing else "login",
                                 "existing": existing}
            self._json(200, {"data": {"verificationId": vid, "isExistingUser": existing}})
            return

        if path == "/mock/auth/otp_verify":
            vid, code, pw = d.get("verificationId"), str(d.get("token") or d.get("code") or ""), d.get("password")
            v = STATE["otp"].get(vid or "")
            if not v or code != OTP_CODE:
                self._json(200, self._envelope_error("bad code"))
                return
            email = v["email"]
            if v["existing"]:
                u = STATE["users"][email]
                if pw:  # 注册态但已存在时也允许设置密码
                    u["password"] = pw
            else:
                if not pw or len(pw) < 8:
                    self._json(200, self._envelope_error("password too short"))
                    return
                u = STATE["users"].setdefault(email, {"id": _uid(email), "password": pw})
                u["password"] = pw
            STATE["otp"].pop(vid, None)
            token = "t_" + secrets.token_hex(8)
            STATE["sessions"][token] = u["id"]
            self._json(200, {"data": {"user": {"id": u["id"], "email": email}, "access_token": token}})
            return

        if path == "/mock/auth/reset":
            email = d.get("email", "")
            vid = "r_" + secrets.token_hex(6)
            STATE["otp"][vid] = {"email": email, "kind": "reset", "existing": email in STATE["users"]}
            self._json(200, {"data": {"verificationId": vid}})
            return

        if path == "/mock/auth/reset_verify":
            vid, nonce, pw = d.get("verificationId"), str(d.get("nonce") or ""), d.get("password") or ""
            v = STATE["otp"].get(vid or "")
            if not v or nonce != OTP_CODE or len(pw) < 8:
                self._json(200, self._envelope_error("bad code or password"))
                return
            u = STATE["users"].setdefault(v["email"], {"id": _uid(v["email"]), "password": pw})
            u["password"] = pw
            STATE["otp"].pop(vid, None)
            token = "t_" + secrets.token_hex(8)
            STATE["sessions"][token] = u["id"]
            self._json(200, {"data": {"user": {"id": u["id"], "email": v["email"]}, "access_token": token}})
            return

        if path == "/mock/auth/signout":
            STATE["sessions"].pop(d.get("token") or "", None)
            self._json(200, {"data": True})
            return

        # ---- 数据（单行快照 + revision CAS）----
        if path == "/mock/db/get":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            rec = STATE["records"].get(uid)
            if rec is None:
                self._json(200, {"data": None})
                return
            self._json(200, {"data": {"revision": rec["revision"],
                                      "payload": json.loads(json.dumps(rec["payload"]))}})
            return

        if path == "/mock/db/insert":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            if STATE["force401"]:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            if STATE["records"].get(uid) is not None:
                self._json(409, {"data": None, "error": {"message": "already exists", "status": 409},
                                 "status": 409, "success": False})
                return
            STATE["records"][uid] = {"revision": int(d.get("revision", 1)), "payload": d.get("payload")}
            STATE["writes"] += 1
            STATE["inserts"] += 1
            rec = STATE["records"][uid]
            self._json(200, {"data": [{"revision": rec["revision"], "payload": rec["payload"]}]})
            return

        if path == "/mock/db/update":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            if STATE["force401"]:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            rec = STATE["records"].get(uid)
            if rec is None:
                # 与真实 RLS 一致：更新不存在的行 → 0 行受影响
                STATE["cas_fail"] += 1
                self._json(200, {"data": [], "status": 200, "success": True})
                return
            expected = d.get("expected")
            if expected is None or int(expected) != int(rec["revision"]):
                STATE["cas_fail"] += 1
                self._json(200, {"data": [], "status": 200, "success": True})
                return
            rec["revision"] = int(d.get("revision", rec["revision"] + 1))
            rec["payload"] = d.get("payload")
            STATE["writes"] += 1
            self._json(200, {"data": [{"revision": rec["revision"], "payload": rec["payload"]}]})
            return

        # ---- 存储 ----
        if path == "/mock/storage/upload":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            key = d.get("path") or ""
            if not key.startswith(uid + "/"):
                self._json(403, {"error": {"message": "forbidden path"}, "status": 403, "success": False})
                return
            if key in STATE["storage"] and not d.get("upsert"):
                self._json(409, {"error": {"code": "CONFLICT", "message": "already exists"}, "status": 409,
                                 "success": False})
                return
            STATE["storage"][key] = {"b64": d.get("b64") or "", "size": len(d.get("b64") or "")}
            self._json(200, {"data": {"path": key}, "success": True, "status": 200})
            return

        if path == "/mock/storage/download":
            uid = self._uid_of(d.get("token"))
            if not uid:
                self._json(401, self._envelope_error("permission denied", 401, "DATABASE_42501"))
                return
            key = d.get("path") or ""
            if key not in STATE["storage"]:
                self._json(404, {"error": {"message": "not found"}, "status": 404, "success": False})
                return
            self._json(200, {"data": {"b64": STATE["storage"][key]["b64"]}, "success": True, "status": 200})
            return

        self._json(404, {"error": {"message": "unknown mock endpoint"}})


def serve(port=8899):
    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    import sys
    p = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    print("mock cloud on", SITE_DIR, "port", p, flush=True)
    serve(p).serve_forever()
