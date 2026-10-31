# ScholarFlow 2026.11.10 · WorkBuddy 公网发布操作

此包是发布就绪的网站源文件，并不是已上线网址。

1. 在 WorkBuddy 打开你拥有的原有 ScholarFlow **网站应用**项目（不是只读轻量发布页面）。
2. 先导出原站点科研 JSON 和 PDF 原件备份，尤其不要删除原有工作台记录。
3. 将 `ScholarFlow-2026.11.10-Website.zip` 解压到项目网站根目录，确认根目录存在 `index.html`、`app.js`、`styles.css`、`cloud-sync.js`、`cloud-config.js`、`sw.js` 及 `assets/`。
4. 用 WorkBuddy 预览检查页面、真实 SDK 是否加载、WorkBuddy 邮箱登录和验证码、未登录无云数据访问、首次创建修订号 1、后续修订号 2、跨设备 CAS 冲突、登出后本机数据、PDF 私有备份/恢复。
5. 在 WorkBuddy 项目的预览工具栏点击“分享”，选择发布或“更新发布”，获取 **平台真实返回的 HTTPS URL**。不要猜测 `*.app.workbuddy.host` 地址。
6. 同一站点更新后，清除旧 Service Worker 缓存（或正常刷新并等待新 SW 激活），再次核对版本。保持原域名以保留原浏览器存储来源。
7. 使用手机和电脑分别登录相同账号，显式确认导出备份后再同步，验证内容相同且 PDF 恢复成功。

官方发布说明：https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App

发布权限与云应用所有权必须由已授权账户持有。本源码 ZIP 没有后台发布密钥，也不会自行发布或上传科研数据。
