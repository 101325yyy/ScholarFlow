# ScholarFlow Cloud 2026.10.4 · 云端数据库部署与迁移

这是**可部署的云端数据库功能源码**，不是已替你开通的数据库。没有 Supabase 项目凭证时，网站自动保持本地浏览器模式，**不会偷偷上传科研资料**。

> **2026.11.1 更新**：本版本增加了私有 PDF Storage Bucket、断网安全续传和刷新恢复。请同时参阅 `CLOUD-ONLINE-UPGRADE.md`，并执行最新版 `cloud/schema.sql`（而不只是旧版快照建表片段）。

## 1. 创建 Supabase 项目（一次性）

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建自己的项目。
2. 在 **SQL Editor** 粘贴运行本源码中的 `cloud/schema.sql`，创建 `public.scholarflow_snapshots`、用户隔离的 Row Level Security (RLS) 和修订版本触发器。
3. 打开 Supabase 的 **Connect** 或 **Project Settings → API Keys**，取得 **Project URL** 和 **Publishable key**（格式 `sb_publishable_...`）。绝对不要使用 `sb_secret_...` 或旧的 `service_role` key。
4. 修改 `site/cloud-config.js`：

```js
window.SCHOLARFLOW_CLOUD_CONFIG = Object.freeze({
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'sb_publishable_YOUR_PUBLIC_KEY'
});
```

5. 在 Supabase **Authentication → URL Configuration** 设置 **Site URL** 为真实 HTTPS 工作台地址，并将该网站的 HTTPS URL 加入允许的重定向地址；启用邮箱+密码登录。建议保持注册邮件确认。若发送验证邮件，注册后验证邮箱并重新登录。
6. 部署**整个 `site/` 目录**到 Cloudflare Pages 或 GitHub Pages（工作流 `.github/workflows/deploy-pages.yml` 默认已指定 `site/`）。本地预览可运行 `python -m http.server 8080 --directory site`。

请将 Supabase 管理平台的访问权限、邮件发送额度、数据库用量与备份策略单独配置；这里只实现最小的账号隔离版本化快照。

## 2. 真实同步方式

网站进入后默认运行本地模式；右下角出现“连接云端”。

1. 邮箱注册与验证 → 登录；初次登录**不会上传或覆盖任何记录**。
2. 先在旧版从「设置」导出科研 JSON。在云端工作台导入备份后，再点“上传本机数据”进行**明确的首次上传**。
3. 在第二台设备打开同一 HTTPS 工作台网站，登录**同一个账号**；点“从云端恢复到本机”前建议先“导出本机 JSON”。上传/下载都会要求明确确认。
4. 当本机与云端版本一致时，可手动勾选“自动同步后续更改”。该设置只在账号已校验且快照一致时生效。
5. 多设备同时编辑同一个快照时，服务器通过 `revision` 乐观并发检查防止悄悄覆盖另一设备的更新。出现冲突后，自动同步会暂停；请备份两个版本并手动选择保留哪一个（**不会自动合并记录**）。

云端数据在 Supabase `public.scholarflow_snapshots` 表中存储为每个账号一条 JSONB 快照，字段包括 `user_id`、`revision`、`payload`、`updated_at`。数据库有约 4 MB 的单条记录限制，客户端主动限制约 3.8 MB。

## 3. 重要边界

- **会跨设备同步：** 工作台保存到 `scholarflow_v1_data` 的科研 JSON：任务、笔记、实验元数据、文献元数据、论文、项目、研究设置等。
- **不会同步：** 未主动点击私有备份/恢复的 PDF 二进制、独立实验文件、照片原件、计算机本地文件夹；即使云端 JSON 恢复成功，另一设备上的 PDF 引用也可能缺少原件；可以在云端面板手动点击“恢复缺失的 PDF”，前提是此前用“备份本机 PDF”上传到私有桶。
- **不会合并：** 两端同时修改的同一条记录。当前版本为整个 JSON 的单份快照，若需要多人协作及逐条合并，应升级为分实体数据表与操作日志。
- 浏览器内的登录会话令牌存于**当前标签页的 `sessionStorage`**，可能在关闭标签页后要求重新登录。密码不会保存在本项目的存储中。
- 云端保存的是**未经端到端加密的科研 JSON**；数据可能包含个人资料、代码片段或本地文件路径。Supabase 项目管理员具有技术访问能力。不要上传未经授权的保密或涉密科研记录。
- 自动同步**不是异地备份**。建议同时保留离线 JSON 备份、PDF 原件和科研资料的独立备份。
- 实际 Supabase 注册邮件、RLS、网关、HTTPS 和发布域名端到端验证，需要你配置自己的真实 Supabase 项目后测试；仓库提供的自动化测试使用模拟 API，不代表已经接入真实数据库。

## 4. 关键安全要点

- 浏览器中只允许使用 Project URL + publishable key。RLS 的 `auth.uid() = user_id` 策略才是用户隔离依据，不能用隐藏网页按钮代替数据库权限。
- 数据表对 `anon` 角色撤销访问；`authenticated` 可 SELECT/INSERT/UPDATE 自己的记录；无 DELETE 策略。
- 服务端触发器检查每次更新修订号必须恰好 `+1`，客户端 PATCH 附带当前已知版本；版本不匹配不会覆盖云端快照。
- **不能**在网站仓库或 `cloud-config.js` 中添加 Supabase 管理密钥、邮箱密码、科研 JSON 或 PDF。

参考：
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase REST API](https://supabase.com/docs/guides/api)
