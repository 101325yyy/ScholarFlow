# ScholarFlow 2026.11.5 · WorkBuddy SDK 迁移与验收状态

## 可确认事项

- 修改的同步文件：`site/cloud-sync.js`、`site/cloud-config.js`、`site/index.html`（项目根目录还包含独立完整副本）。
- 未修改业务 `app.js`、`pdf-intelligence.js`、`research-suite.js` 和数据主键 `scholarflow_v1_data`。
- 原同步 IIFE：`lastAck()`、`fingerprint()`、`alignAuto()`、`validateLocal()`、revision CAS、手动 PDF、二次确认恢复、自动同步开关与状态函数保留。
- 不再直接 fetch Supabase REST、不保留自管 access_token / refresh_token / sessionStorage；SDK 负责会话。
- 无匿名账户、假登录、硬编码私有密钥；云 SDK 未加载时**只可本机离线使用**。

## 需要真实 WorkBuddy 环境确认（阻塞上线）

用户提供的 SDK CDN、初始化与云配置三个代码片段为空。公开 npm 资料可确认包 `@tencent-ai/workbuddy-cloud-sdk` 存在，但无法从当前运行环境取得浏览器 bundle 或类型声明；因此 `site/index.html` 采用版本固定的 ESM CDN **候选加载路径** `https://esm.sh/@tencent-ai/workbuddy-cloud-sdk@0.1.3`，并尝试导出 `createWorkBuddyCloud` / `WorkBuddyCloud` / `default`。**尚未验证此浏览器入口是否兼容、可调用或可用。**

`cloud-config.js` 的第三字段暂按 `projectId` 实现（原消息代码块空缺，需 WorkBuddy 平台提供正式字段名）。工作台在 SDK 不可用、配置为空或接口不匹配时只使用本机数据，不会提示已同步。

还需要 WorkBuddy 云管理员确认：

1. 官方网页端 SDK CDN、确切导出对象、构造函数签名和三项公开配置字段。
2. `auth.signInWithOtp` challenge 的 `verify` 签名、注册后 session 返回结构。
3. `database.from(...).maybeSingle()`、`.insert(...).select()`、`.update(...).eq(...).select()` 的受影响行语义；真正的 **revision CAS 必须由服务器原子保证**，仅客户端条件不能防竞争。
4. 用户身份在服务器端进行行级访问控制；浏览器禁止传 `owner_id`。PDF 私有路径 `userPath` 的授权检查必须由服务端保证。
5. 真实两个账户/两设备分别验证登录、CAS 冲突、登出、本机内容未损失、PDF 跨设备手动恢复。

## 本机可复现检查

```bash
python tests/test-workbuddy-transport.py
python tests/test-workbuddy-otp.py
node tests/test-v110-pdf.js
python tests/test-v110-browser.py
python tests/test-vertical-settings-60-rounds.py
```

旧 `tests/test-cloud-sync.py` 等 Supabase 直连桩测试不再适配新的传输层，保留作迁移历史，**不可据其报错断言工作台业务已损坏，也不可声称其通过**。

## UI

1440px 等桌面宽屏下使用双栏信息架构：左为纵向的主题/壁纸设置；右为摘要翻译与数据备份。小屏保持单列纵排，原生下拉项、字段、保存按钮及数据结构未更改。PWA 缓存标识更新，避免部署后沿用旧样式。

## 部署和数据保护

不要在公开 `cloud-config.js` 内加入任何 `service_role`、`sb_secret_` 或私钥。切换云提供商前，建议先从旧系统导出本机 JSON 备份及 PDF 原件；不同网站 Origin 的浏览器本地数据不会自动迁移。仅配置公开 endpoint/键并不等于已经拥有真正可用的后端。
