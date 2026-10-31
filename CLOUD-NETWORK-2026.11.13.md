# ScholarFlow 2026.11.13 · WorkBuddy 验证码请求网络排障与安全提示

## 截图对应问题
点击“发送验证码”返回 `request failed before a response was received: Failed to fetch`。这属于请求没有收到可供浏览器读取的响应，**不是六位验证码校验失败**。可能原因包括云服务域名 DNS / TLS / 超时、云服务未上线、邮箱认证未启用、跨域 OPTIONS 预检失败或浏览器网络限制。单凭错误文本无法证明具体根因。

在本次执行环境中，`scholarflow-source.app.workbuddy.host` 发生 DNS 解析失败。这不等于已证明用户设备也 DNS 失败。无法访问真实 WorkBuddy 后端，故**没有发送任何真实验证码，没有证明远端故障已修好**。

## 实际修复
- 云端验证码请求失败时提示网络故障的合理排查方向，不混淆验证码、账号和密码错误。
- `Failed to fetch` 不显示“发送成功”、不启动 60 秒倒计时，不创建会话，也不修改本机 JSON。
- 保留邮箱输入，允许用户排查后再次发送。
- 增加按需展开的“网络排查信息”：当前网站来源、云服务主机、跨源情况、SDK 加载与配置状态；安全复制不包括邮箱、token 或 publishableKey。
- 原“检测云端连接”重命名为“检查 SDK 会话”，并明确其成功**不等于**邮箱发码 API 可用。
- 不更改 `cloud.auth.signInWithOtp` SDK 调用，不绕过 SDK，不把客户端 `no-cors` 当成修复；不更改 CAS、PDF、账号切换或本机科研数据结构。
- PWA 缓存版本升级，降低旧云端脚本滞留风险。

## 在真实网站上确认根因
1. 在 WorkBuddy 应用云服务后台确认应用已发布；“身份认证”页面已启用“邮箱验证码”登录方式及邮件发送服务。
2. 确认 `site/cloud-config.js` 中 endpoint 为当前有效的 WorkBuddy 应用云服务地址，项目 publishableKey 和 relay URL 与该项目匹配。不要将 private/secret/service_role 提供给浏览器。
3. 在同一手机/电脑、同一网站打开“科研数据云端同步”→“验证码登录”→发送，若失败展开“网络排查信息”核对网址。
4. 桌面浏览器按 F12 → Network，筛选 `.cloud/auth`；确认 OPTIONS 与 POST 的状态。若 CORS 报错，必须由云服务端允许当前网站的 HTTPS Origin，并允许 SDK 所需请求头；不能通过 `mode:no-cors` 解决认证 API。
5. 如果 Network 显示 DNS / TLS / 连接失败，应修复服务地址、证书或发布状态。若返回 401/403，应检查平台邮箱登录开关、应用权限和 key 配置。不要重复频繁发送验证码以免触发限流。
6. 发码后再在真实账号检查登录、revision 1→2、两设备 CAS 冲突、PDF 私有文件，不能用模拟 SDK 通过替代生产验收。

## 本轮可复现测试（隔离 Chromium 和假 SDK；未联系真实账号）
- 新增 `tests/test-workbuddy-network-diagnostics.py`：46 项断言通过；包含 320/390/768/1280px 下发码网络错误提示、邮箱保留、无倒计时、无云端写入、诊断隐私、会话检查非保证、401 权限错误独立处理。
- `test-workbuddy-otp.py`：通过。
- `test-workbuddy-auth-ux.py`：95 项通过。
- `test-workbuddy-account-management.py`：84 项通过。
- `test-workbuddy-account-layout.py`：78 项通过。
- `test-workbuddy-transport.py`、`test-workbuddy-401.py`、`test-workbuddy-auth-boundaries.py`、`test-workbuddy-pdf-offline.py`：通过。
- `test-v110-pdf.js`：11 项通过；`test-v110-browser.py`：324 项；`test-v110-ui.py`：552 项；`test-mobile-navigation.py`：64 项；`test-v110-http.py`：13 项；`test-research-suite.py`：74 项；`test-research-pwa.js`：6 项，均通过。

## 验收边界
不能从截图判断根因是否 DNS/CORS/邮件配置；本轮未取得 WorkBuddy 平台发布权限，也未完成真实 OTP 邮件、远端数据库、跨设备同步验收。此版本是**更准确的故障处理与诊断增强版**，不是已修好后端或已上线的站点。
