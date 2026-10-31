# ScholarFlow Cloud 2026.10.4 · 构建与测试报告

## 功能增量

- 增加 `cloud/schema.sql`：Supabase PostgreSQL，`user_id` 用户行隔离的 RLS、JSONB 工作台快照、乐观并发修订号。
- 增加 `site/cloud-config.js`：仅放 Supabase 项目 URL 和 **publishable key**，默认空白，不含真实账号或 secret key。
- 增加 `site/cloud-sync.js`、`site/cloud.css`：邮箱登录/注册、手动初始上传、下载恢复、手动开启自动同步、版本冲突阻断、本机 JSON 导出。
- 保留全部 11 模块业务结构、`scholarflow_v1_data` 存储键、PDF 模块、Electron、Python 本地服务和 Go 代码。
- 仅在 `app.js` 的持久化成功处发送 `scholarflow:saved` 事件；原有保存行为与数据结构不变。`site/app.js` 与根目录 `app.js` 一致。
- **不包括** PDF 二进制、实验文件和本地路径对应文件的云端同步；这些需另行上传/备份。

## 自动化执行（2026-10-24）

- 原有 18 项测试文件：**18/18 通过**。第一次并行执行曾因运行环境超时而提前结束，因此剩余项目已单独运行；没有把未完成的并行轮次计作成功。
- 新增 `tests/test-cloud-sync.py`：**17/17** 断言通过（模拟 Supabase 接口 + 真实隔离 Chromium）：未授权登录不上传、主动首次写入、自动同步、不同设备版本冲突不覆盖本地/云端。
- 新增 `tests/test-cloud-workspace.py`：**112/112** 断言通过（真实隔离 Chromium、4 个视口、11 个模块、未配置云端时本地工作台不受影响）。
- JavaScript `node --check` 检查通过；全套 ZIP 经过 CRC/目录/哈希校验。

## 重要验收边界

1. 目前没有实际 Supabase 项目连接信息和数据库管理员权限，因此**未**对真实服务执行账号注册、发邮件、RLS SQL 部署、数据库读写或云端网络断线联调。
2. Cloudflare/GitHub Pages 真正发布后，需要从不同设备/不同账号分别验证登录、RLS、修订冲突及数据恢复。现有测试使用**模拟 API**，不能声称真实后端已开通。
3. 不支持 PDF 原件跨设备同步、离线写入队列合并、逐条记录多用户协同编辑、端到端加密。
4. 不会主动把原浏览器本机数据上传或删除。首次上传和云端覆盖本机都由用户自行确认；必须自行维护独立科研 JSON/PDF 备份。
5. Supabase 数据库由项目拥有者管理；请勿把 `service_role`/`sb_secret_` 密钥放到前端。

安装与部署请见 [`CLOUD-SETUP.md`](CLOUD-SETUP.md)。
