# ScholarFlow 2026.11.12 — WorkBuddy 账号管理与验证

## 升级内容

- 云端同步面板新增当前账号卡片，显示由 SDK 真实会话返回的邮箱、登录状态及云端版本。
- 新增「切换账号」和「退出登录」入口，均调用同一个 WorkBuddy SDK 实例的 `cloud.auth.signOut()`；切换后通过既有登录表单重新验证身份。不保存额外密码，也不伪造多账号会话。
- 退出前明确提醒本机资料与云端的差异；用户可以取消。没有清除 `scholarflow_v1_data` 或 IndexedDB PDF。
- 加入跨账号自动同步保护标记 `sf_cloud_account_review_v1`（只含非秘密布尔状态），及最近账号 ID `sf_cloud_last_account_v1`（非认证令牌）。这两者只用于防误上传，不能用于登录。
- 换账号后自动同步暂停。只有用户主动手动上传、二次确认后从云端恢复，或核对两端完全一致并点击确认，才能解除保护；解除后仍保持手动同步，需另行选择开启自动同步。
- 保留本机快照权威、4 MiB 验证、SQL revision CAS、断网重试、PDF 仅手动备份、私有账户路径及同步冲突处理。
- 补上外部 SDK SIGNED_OUT 事件触发时的账号保护，避免其他标签页登出后发生静默跨账号同步。
- 账号卡片适配常规/护眼/夜间和移动端，触控按钮 >=40px。
- PWA 缓存版本更新以确保新的账号面板 CSS/JS 生效。

## 账号切换的安全边界

当前 ScholarFlow 沿用原始 `localStorage['scholarflow_v1_data']` 为浏览器本机工作区，**本机记录不会因为换账号而自动隔离或替换**。因此「切换账号」会注销当前云端会话、保留本机数据，并强制停止自动同步；不会从旧账号自动上传到新账号。用户需要明确比较两份内容，并主动决定上传或恢复。这与「多个账号无需重新登录且本机数据彼此独立」不同，后者需要超出本次范围的账号分区数据模型与正式 SDK 多会话支持。

## 测试结果（隔离 Chromium + 模拟 WorkBuddy SDK；非真实云项目联调）

- 新增账号切换/确认/手动解除保护：84 项断言 / 四档宽度，全部通过。
- 新增账号卡片尺寸/主题/键盘 Esc：78 项断言 / 六档宽度 x 三种主题，全部通过。
- 原有 WorkBuddy 模拟 SDK 测试：登录、OTP、注册与密码重置边界、401 错误、PDF 手动存储、CAS、退出，7 个脚本均通过。
- 原有浏览器流程 324 项、UI 552 项、手机导航 64 项、PDF 11 项、HTTP/API 13 项通过。
- 原有隐私、科研交互旅程 73 项、科研熊 67 项、主题预览 105 项通过。
- 部分高耗时的旧版色调矩阵测试在批处理时触发超时，未计入本版已通过项目。
- 未测试真实 WorkBuddy 两账号 / 两设备登录、服务端权限隔离或真正公网发布。上线后应使用两组真实测试账号验证。

## 复测指令

```bash
python tests/test-workbuddy-account-management.py
python tests/test-workbuddy-account-layout.py
python tests/test-workbuddy-transport.py
python tests/test-workbuddy-auth-ux.py
python tests/test-v110-browser.py
node tests/test-v110-pdf.js
```

## 上线提醒

先导出本机科研 JSON 并备份 PDF。将 `site/` 中网站文件部署到原网站同域名；PWA 可能需要重新打开页面以激活新缓存。SDK 公共连接参数未修改。本次不代表已取得 WorkBuddy 公网发布权限。
