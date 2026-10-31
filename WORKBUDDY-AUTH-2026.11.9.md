# ScholarFlow 2026.11.9 · WorkBuddy 邮箱认证体验改版

## 目的与范围

- 登录与注册改为独立标签页面；登录可以选「密码登录」或「验证码登录」。
- 新增「忘记密码」操作：使用 WorkBuddy SDK 的 `auth.resetPasswordForEmail(email)`（**仅当运行时 SDK 实际提供时**）发送验证码，使用返回的 `data.updateUser({nonce, password})` 完成重置与登录。
- 当具体 WorkBuddy SDK 未提供该密码重置接口时，页面会明确提示不可用并引导使用验证码登录，**不会报告虚假成功**。
- 密码错误（含 `user password not set`）转为可操作的中文提示；登录、注册、找回密码相互隔离。
- 手机上的邮箱/验证码/密码输入框及主按钮高度优化；深色与护眼主题适配。
- 网络状态和科研 JSON 机制未修改；不开启后台自动注册、自动上传或匿名身份。

## 变更文件

- `cloud-sync.js` / `site/cloud-sync.js`：认证界面及用户动作、SDK OTP 和能力检查。
- `site/cloud.css`：账户标签、登录方式切换、找回密码表单、主题与移动端样式。
- `site/sw.js` 与 `sw.js`：PWA 缓存版本更新，防止新旧脚本混用。
- `tests/mock-workbuddy-sdk.js`：本地 SDK 测试桩，支持密码错误、验证码登录和密码重置。
- `tests/test-workbuddy-otp.py`：验证码注册测试适配独立注册界面。
- `tests/test-workbuddy-auth-ux.py`：新增五档屏宽认证流程检查。
- `tests/test-workbuddy-auth-boundaries.py`：新增 SDK 缺失重置接口和未注册邮箱保护检查。
- `README.md`、`SHA256SUMS.txt`：文档和完整性索引。

## 自测命令

```bash
python tests/test-workbuddy-auth-ux.py
python tests/test-workbuddy-auth-boundaries.py
python tests/test-workbuddy-otp.py
python tests/test-workbuddy-transport.py
python tests/test-workbuddy-401.py
python tests/test-workbuddy-pdf-offline.py
python tests/test-v110-browser.py
python tests/test-mobile-navigation.py
node tests/test-v110-pdf.js
```

## 已完成的本地/模拟测试

- 认证 UI 五档宽度（320、390、768、1280、1440px），**95/95 断言通过**。
- 密码错误引导、验证码登录、独立注册表单、验证码注册后登录、找回密码二次输入校验、重置成功后登录、退出保留本机资料：通过模拟 SDK 测试。
- SDK 缺少重置方法时的明确失败提示、未注册邮箱登录不隐式开户：通过模拟 SDK 测试。
- 版本 1/2 上传、CAS 冲突保护、HTTP 401、PDF 私有备份模拟、原有浏览器业务 324 项、手机导航 64 项、PDF 解析 11 项：通过。
- UI 截图为隔离 Chromium 渲染截图，**不是线上 WorkBuddy 云联调截图**。

## 仍需真实环境验证

1. WorkBuddy 实际 `@dev` SDK 是否开放 `resetPasswordForEmail()` 与返回的 `updateUser()` 方法。公开 CloudBase 文档列出了相关调用，但并不证明 WorkBuddy 该构建具有完全相同的接口；代码采用能力检测而非假实现。
2. WorkBuddy 管理端的邮件验证码登录是否已启用；用真实邮箱验证邮件送达率、验证码过期与重发限制。
3. 在现有 HTTPS 站点用两台真实设备验证登录会话、CAS、断网恢复和 PDF 私有存储访问控制。
4. 当前 ZIP **并未发布到公网**；需要替换原站点的发布文件，并验证更新后的 URL。

账号密码、验证码和 token 不写入 `scholarflow_v1_data`；WorkBuddy SDK 负责会话存储。升级前导出本机 JSON 并备份 PDF 原件。
