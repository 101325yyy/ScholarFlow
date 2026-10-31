"""按 WorkBuddy 云 SDK 真实契约实现的最小后端。

契约来源：从 jsDelivr 取回的真实 SDK（@tencent-ai/workbuddy-cloud-sdk@dev）
  base = endpoint + "/.cloud/auth"
  POST /v1/verification              {email, usage}          -> {verification_id, is_user}
  POST /v1/verification/verify       {verification_id, code} -> {verification_token}
  POST /v1/signup                    {email, password, verification_token} -> session
  POST /v1/signin                    {username, verification_token}         -> session
  POST /v1/token                     {grant_type, refresh_token}            -> session
  session = {access_token, refresh_token, expires_in, sub, email}
数据库：base = endpoint + "/.cloud/database/rest"
"""
import json
import threading
import time
import uuid


class MockCloud:
    def __init__(self, expires_in=3600):
        self.expires_in = expires_in
        self.accounts = {}     # email -> {"id", "password"}
        self.verif = {}        # vid -> {"email", "code"}
        self.access = {}       # at -> uid
        self.refresh = {}      # rt -> uid
        self.rows = {}         # uid -> {"revision", "payload", "updated_at"}
        self.log = []
        self.refresh_mode = "ok"   # ok | invalid_grant | 401 | 500
        self.rotate = False        # True: refresh token 一次性使用（真实后端常见语义）
        self.lock = threading.Lock()

    # ---------- 内部 ----------
    def _session(self, email, uid):
        at = "at_" + uuid.uuid4().hex[:16]
        rt = "rt_" + uuid.uuid4().hex[:16]
        with self.lock:
            self.access[at] = uid
            self.refresh[rt] = uid
        return {
            "access_token": at,
            "refresh_token": rt,
            "expires_in": self.expires_in,
            "token_type": "bearer",
            "sub": uid,
            "email": email,
            "name": email.split("@")[0],
        }

    def _uid(self, headers):
        auth = ""
        for k, v in headers.items():
            if k.lower() == "authorization":
                auth = v
        if auth.startswith("Bearer "):
            return self.access.get(auth[7:])
        return None

    # ---------- 路由 ----------
    def handle(self, method, path, body, headers):
        """返回 (status, dict)"""
        p = path.split("?")[0]
        body = body or {}
        self.log.append((method, p, body))

        if p.endswith("/v1/verification"):
            vid = "v_" + uuid.uuid4().hex[:12]
            email = body.get("email", "")
            existed = email in self.accounts
            self.verif[vid] = {"email": email, "code": "123456"}
            return 200, {"verification_id": vid, "is_user": existed}

        if p.endswith("/v1/verification/verify"):
            v = self.verif.get(body.get("verification_id"))
            if not v or body.get("verification_code") != v["code"]:
                return 400, {"error": "invalid_code", "message": "验证码不正确"}
            return 200, {"verification_token": "vt_" + uuid.uuid4().hex[:12], "email": v["email"]}

        if p.endswith("/v1/signup"):
            email = body.get("email", "")
            if email in self.accounts:
                return 409, {"error": "user_exists", "message": "该邮箱已注册"}
            uid = "u_" + uuid.uuid4().hex[:10]
            self.accounts[email] = {"id": uid, "password": body.get("password") or ""}
            return 200, self._session(email, uid)

        if p.endswith("/v1/signin"):
            email = body.get("username") or body.get("email") or ""
            acc = self.accounts.get(email)
            if not acc:
                return 401, {"error": "invalid_grant", "message": "账号或密码不正确"}
            if body.get("password") and body.get("password") != acc["password"]:
                return 401, {"error": "invalid_grant", "message": "账号或密码不正确"}
            return 200, self._session(email, acc["id"])

        if p.endswith("/v1/token"):
            if body.get("grant_type") != "refresh_token":
                return 400, {"error": "unsupported_grant_type"}
            if self.refresh_mode == "invalid_grant":
                return 400, {"error": "invalid_grant", "message": "refresh token 已失效"}
            if self.refresh_mode == "401":
                return 401, {"error": "unauthenticated", "message": "登录状态已失效"}
            if self.refresh_mode == "500":
                return 500, {"error": "server_error", "message": "服务端错误"}
            uid = self.refresh.get(body.get("refresh_token", ""))
            if not uid:
                return 400, {"error": "invalid_grant", "message": "refresh token 不存在"}
            if self.rotate:
                # 一次性使用：旧 refresh token 立即作废。同一令牌被第二次使用时，
                # 真实后端返回 invalid_grant —— SDK 会因此清空本地会话。
                with self.lock:
                    self.refresh.pop(body.get("refresh_token", ""), None)
            email = next((e for e, a in self.accounts.items() if a["id"] == uid), "")
            return 200, self._session(email, uid)

        if p.endswith("/v1/user/me"):
            uid = self._uid(headers)
            if not uid:
                return 401, {"error": "unauthenticated"}
            email = next((e for e, a in self.accounts.items() if a["id"] == uid), "")
            return 200, {"sub": uid, "email": email}

        if p.endswith("/v1/user/signout"):
            return 200, {"ok": True}

        # ---- 数据库（PostgREST 风格）----
        if "/database/rest/" in p:
            uid = self._uid(headers)
            if not uid:
                return 401, {"error": "unauthenticated", "message": "未登录"}
            if method == "GET":
                row = self.rows.get(uid)
                return 200, ([row] if row else [])
            if method in ("PATCH", "POST"):
                payload = body if isinstance(body, dict) else {}
                cur = self.rows.get(uid)
                if method == "POST":
                    row = {"revision": payload.get("revision", 1),
                           "payload": payload.get("payload"),
                           "updated_at": int(time.time())}
                    self.rows[uid] = row
                    return 201, [row]
                # PATCH：模拟 .eq('revision', R) 的行级条件更新（CAS）
                if cur and cur["revision"] == payload.get("revision", -1) - 1:
                    cur = {"revision": payload["revision"],
                           "payload": payload.get("payload", cur["payload"]),
                           "updated_at": int(time.time())}
                    self.rows[uid] = cur
                    return 200, [cur]
                return 200, []

        return 404, {"error": "not_found", "path": p}


def cors_headers(origin):
    return {
        "access-control-allow-origin": origin or "*",
        "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "*",
        "access-control-max-age": "600",
        "content-type": "application/json; charset=utf-8",
    }
