> **历史版本文档，非当前功能清单。** 2026.11.3 已移除知识关联中心、独立文献精读和全局搜索入口。请以 `UI-2026.11.3-CHANGELOG.md` 为准。

# ScholarFlow Research Suite · 2026.11

这是在 ScholarFlow Mobile 2026.10.5 **完整源码**之上实现的功能版。原有 11 个科研模块、Electron、Go portable、本地 Python 服务、原有 Supabase 可选云端模块均保留。

## 已实现（非功能草稿）

1. **科研知识关联中心**：把真实的任务、文献、项目、实验、仿真、论文、笔记、核心文件等记录，按「支持/引用/归属/验证/派生/相关」建立具名关系；可以查看、过滤、删除。引用对象被删除时提供失效提示，避免静默丢失关系。
2. **文献精读与批注**：文献阅读器增加独立批注侧栏；保存页码、复制的原文、颜色标签、阅读笔记。文献精读页也可在没有本地 PDF 时记录摘录；可删除和导出 Markdown。**不在 PDF 原始文件中绘制高亮或写入批注**，浏览器原生 PDF 阅读器不能提供稳定的文本选择 API。
3. **截止提醒与周计划**：从现有任务、老师事务、论文和项目截止日期自动生成近期提醒；本周计划可新增、完成及删除。桌面通知需用户主动授权，并仅在工作台打开时检查，不承诺浏览器关闭后推送。
4. **真正的全局搜索**：跨多个科研模块查找标题、DOI、作者、摘要、正文、说明、研究问题等，支持类型过滤、Ctrl/Cmd+K 打开，结果可直接查看记录详情。不会将检索词发送给搜索服务器。
5. **PWA 与离线编辑**：`manifest.webmanifest`、192/512 PNG 图标、Service Worker 缓存静态资源；保持原有浏览器本地 JSON 编辑和 IndexedDB PDF 保存方式。离线显示网络状态；**云端快照无法在断网时完成同步**。缓存可能受浏览器存储配额/清理影响。需 HTTPS 或 localhost；`file://` 不能注册 Service Worker。
6. **移动端 UI**：四个新入口加入侧边栏；手机增加首页/待办/文献/计划/更多底部导航；全局搜索按钮；首页冗长的个人档案和成果重复视图不再占据手机首屏（仍可在设置/成果统计中查看），手机首屏横幅高度从约 775px 缩至约 320px（390px 宽 Chromium）。

## 数据与升级

- **原存储键保持为 `scholarflow_v1_data`**。新增 `knowledgeLinks`、`annotations`、`weeklyPlans` 三个顶层数组，旧数据在读取时自动填充空数组。
- 这些新记录与原科研 JSON 一起由设置页导出；可选 Supabase 云端快照仍需项目授权，配置为空时不会自动上传。
- 原版 PDF 文件依旧保存在本机 IndexedDB，不会自动随科研 JSON 或 cloud snapshot 同步到另一台设备。
- 只给出新的完整源码和独立站点部署包，不需要运行任何补丁脚本。
- **升级前务必先导出科研 JSON 并备份 PDF 原文件。保持相同域名与浏览器配置可以保留已有 localStorage；迁移域名需手动导入 JSON。**

## 使用/部署

- 本地：`python local_server.py`，然后打开输出的 localhost URL，或 Windows 使用 `start-web.bat`。
- 直接 HTML：`index.html` 可运行原科研功能，但 `file://` 不支持 PWA Service Worker。
- 静态上线：发布 `site/` 目录的内容（也提供网站专用 ZIP）。GitHub Pages 已提供 `.github/workflows/deploy-pages.yml`。
- Electron：`npm install` 后 `npm run desktop`；安装包与 Windows/macOS 真机本轮未构建验证。
- 如需云同步：按 `CLOUD-SETUP.md` 创建 Supabase 项目，执行 `cloud/schema.sql`，只在 `site/cloud-config.js` 填 **公开 publishable key**；严禁把 service_role / secret key 放到前端。

## 验收边界

- 新增功能在隔离 Chromium 与合成科研记录中验证，未写入真实研究数据。
- PWA Service Worker 缓存策略有 Node VM 单元测试、静态资源 HTTP 200/404 检查；当前 Chromium 受到环境安全策略限制，无法访问 `127.0.0.1`，因此**未完成真实 HTTP 页面安装后断网重载**。真实 HTTPS 发布仍需现场测试。
- 这不是跨设备自动合并的实时数据库；原有 Supabase 快照同步保持用户主动授权及冲突保护。
- PDF 批注是页面定位的摘录与笔记，不是 PDF 原件内的可视高亮，不能替代专业 PDF 标注编辑器。
- 不保证手机关闭浏览器后准时提醒；要实现后台定时 Push 需独立推送服务、授权与调度。

## 测试

详细输出见 `RESEARCH-SUITE-VALIDATION.md`。新增 `tests/test-research-suite.py`、`tests/test-research-suite-themes.py`、`tests/test-research-pwa.js`。
