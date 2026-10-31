# 会话持久化 / 「账户记不住」回归夹具

这套夹具回答一个问题：**登录状态为什么活不过一次刷新。**

## 为什么需要它

`tests/` 下原有 46 个用例里的互通部分，把 WorkBuddy SDK **整个替换成了替身**
（`tests/mock-workbuddy-sdk.js`），所以 SDK 自己的会话持久化逻辑从未被覆盖。
而「每次都要重新注册」恰恰出在那一段：

- SDK 把会话写在 `localStorage['workbuddy-cloud.session.<publishableKey>']`；
- access token 剩余有效期 **< 90 秒**时会自动调 `/v1/token` 刷新；
- 刷新一旦被判为凭据失效（`invalid_grant` / `unauthenticated`），SDK 会
  **直接删掉本地会话**（`SessionManager.abandon()`）。

于是"刷新请求被页面卸载打断、而服务端已经轮换过 token"这种很普通的情况，
就会让用户被踢下线——而且看上去像是"账户丢了、只能重新注册"。

这套夹具**加载真实 SDK**（从 jsDelivr 取，不入库），只在网络层用一个按真实
接口契约实现的后端替身（`mockcloud_api.py`）。后端契约是从 SDK 源码里读出来的：

```
POST /.cloud/auth/v1/verification          {email, usage}            -> {verification_id, is_user}
POST /.cloud/auth/v1/verification/verify   {verification_id, code}   -> {verification_token}
POST /.cloud/auth/v1/signup                {email, password, verification_token} -> session
POST /.cloud/auth/v1/signin                {username, verification_token}         -> session
POST /.cloud/auth/v1/token                 {grant_type, refresh_token}            -> session
GET  /.cloud/database/rest/scholarflow_snapshots
session = {access_token, refresh_token, expires_in, sub, email}
```

## 文件

| 文件 | 作用 |
|---|---|
| `mockcloud_api.py` | 契约级后端替身；`rotate=True` 模拟一次性 refresh token |
| `sdkfetch.py` | 缺 `sdk.js` 时自动从 jsDelivr 下载真实 SDK |
| `t_persist.py` | 基础持久化：注册→刷新→过期→刷新→被拒，13 项 |
| `t_rotation.py` | 复现三种失去登录的成因（R1/R2/R3/R4） |
| `t_fixes.py` | 修复验证 X1–X8，22 项 |
| `mutation2.py` | 把 7 个修复逐一回退，验证用例能不能抓住（7/7） |

## 跑法

```bash
cd tests/session-persist
python sdkfetch.py          # 首次：取回真实 SDK
python t_fixes.py           # 主回归，应输出 22 项全通过
python t_rotation.py        # 成因复现
python t_persist.py         # 基础持久化
python mutation2.py         # 变异测试，应输出 7/7 检出
```

环境：Playwright + 本机 Edge（`channel="msedge"`）。约 1 分钟/套。

## 边界

- 后端是**契约替身**，不是 WorkBuddy 真实云。真实 RLS、真实邮件 OTP、
  真实令牌 TTL 只能由真实后端验证。
- 夹具覆盖的是**客户端**在各类令牌状态下的行为，这正是本次缺陷所在层。
