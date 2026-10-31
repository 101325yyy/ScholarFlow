# ScholarFlow 2026.11.7 · WorkBuddy 实云接口适配与设置页对齐

## 修改
- `cloud-config.js`：配置已提供的公开 endpoint、oauthRelayBaseUrl、publishableKey。禁止任何管理员密钥。
- `cloud-sync.js`：只通过 WorkBuddyCloud.createWorkBuddyCloud 创建单一 SDK 客户端；验证码注册改为 `challenge.verify({token,password})`；数据库信封 `success/error/status` 规范化；保留 CAS、冲突保护、自动同步、离线本机副本和 PDF 手动备份。
- `index.html`：使用指定版本 `@dev/lib/index.global.js`，以 defer 顺序加载 SDK → config → sync。
- `app.js`, `styles.css`：修正设置页四张卡片两列对齐；保留原有表单；精简误导性本地/云端状态文案。
- `site/index.html`：删除冗余底部在线浮层；保留可操作的 WorkBuddy 云状态按钮。

## 状态和限制
本次 SDK 调用按用户提供、已核对的签名实现。联网真实云服务需由已登录 WorkBuddy 应用环境进行验收；浏览器端模拟不能证明账号服务器或 RLS 已实际运行。

同步对象为 JSON 快照；PDF 仅用户手动备份/恢复。上传前请独立备份 JSON 与 PDF；本机 localStorage 仍为权威副本。
