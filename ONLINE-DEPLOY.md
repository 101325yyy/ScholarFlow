# ScholarFlow 在线浏览器版 · 部署说明

## 在线版范围

本版本提供可通过 HTTPS 访问的**静态浏览器版**。11 个模块的业务前端保留，保存使用浏览器 `localStorage`，PDF 附件使用当前浏览器的 IndexedDB；云端数据库是**可选功能**：配置 Supabase 项目并登录后，可以选择将科研 JSON 同步到云端；未配置时保持原有本地模式。

**重要**：新网址是新 origin；不会自动读取旧版 `http://127.0.0.1:8765` 或 `file://`、其它域名保存的数据。请先从原版设置导出科研 JSON，在新网址导入。PDF 及实验文件请单独备份；不要将用户 JSON/PDF 添加至 `site/` 或公开 GitHub 仓库。

## 部署方法 A · GitHub Pages（使用现有 GitHub 仓库）

1. 将本压缩包的**完整工程文件**提交到 `https://github.com/101325yyy/ScholarFlow` 的 `main` 分支，包含 `.github/workflows/deploy-pages.yml`、`site/` 文件夹、`cloud/schema.sql` 与 `CLOUD-SETUP.md`。请先在分支或副本中检查，避免覆盖其他未提交改动。
2. 打开仓库 Settings → Pages → Build and deployment → Source，选择 **GitHub Actions**。
3. 打开仓库 Actions，查看 `Deploy ScholarFlow online site` 的执行结果；首次也可手动运行。
4. 工作流成功后，一般访问 `https://101325yyy.github.io/ScholarFlow/`；以 Pages 面板给出的实际地址为准。推送内容不等于已经发布成功。

GitHub Actions **只发布 `site/`**，不会公开源码目录下的测试、Python/Go/Electron 文件或 SHA 清单。原仓库若保持 public，仓库中的源码本身仍然公开；不要提交私人科研数据。

## 部署方法 B · Cloudflare Pages 拖拽发布

将单独提供的 `ScholarFlow-Online-Site-Only.zip` 整包拖入 Cloudflare Workers & Pages → Create application → Pages → Drag and drop。Cloudflare 完成发布后提供 `*.pages.dev` 链接。云端直接上传项目的后续更新通常需再次上传新 ZIP。此方式不需要运行 Python 或 Node。

## 本地预览

在本工程根目录运行：

```bash
python3 -m http.server 8080 --directory site
```

打开 `http://127.0.0.1:8080/`。此预览与本地 8765 源不同，**数据存储相互隔离**。

## 功能边界

| 功能 | 在线静态版 |
| --- | --- |
| 11 个科研模块、任务/看板、笔记、项目、实验、论文等 | 保留 |
| 浏览器本地 JSON 存储、导入导出 | 保留；不跨设备同步 |
| PDF 添加、预览、浏览器 IndexedDB 存储 | 保留（视浏览器支持）；解析/OCR 可能依赖外部 CDN |
| DOI/期刊元信息联网补全 | 视第三方 API 可用性和 CORS 限制 |
| 设备浏览器内建 Translator API | 支持该 API 且具备语言包时可用 |
| Python/Argos 离线翻译服务 | **不提供**；需单独可信后端或本地版 |
| 系统本地文件管理器定位绝对路径 | **不提供**，可以复制路径 |
| 账号、跨设备自动同步、协作、云端 PDF | **可选：** 云端 JSON 账号同步已提供源码与 RLS SQL；完整 PDF 云端存储及多人实时协作未提供 |

原 Electron、Python 与 Go 程序仍保留在**完整源码 ZIP**，不上传到公开站点。

## 安全与隐私

- 网站代码公开可访问；用户科研记录默认仍保存在自己的浏览器，而不是我们的服务器。
- 使用个人浏览器；公共电脑、清除网站数据、隐私模式、切换域名可能造成记录不可见或丢失，请定期导出 JSON、PDF。
- CDN 与外部元数据服务若启用可能产生网络请求，请检查数据隐私和浏览器开发者工具；本项目不增加新的分析追踪器。
- 需要云端账号与数据库时，请按根目录 `CLOUD-SETUP.md` 部署 Supabase 项目、执行 SQL 并配置 publishable key；在账号和真实数据库尚未配置前，不应将静态版称为已同步的云版。

## 云端数据库

完整配置步骤、安全与迁移边界见 [`CLOUD-SETUP.md`](CLOUD-SETUP.md)。只需配置 `site/cloud-config.js` 中的公开项目 URL 与 publishable key；切勿放入 secret key。

## 验证

部署前检查 `site/index.html` 相对路径、`app.js` 语法、18 个历史测试，以及根目录 `SHA256SUMS.txt`。部署后，在实际 HTTPS 域名人工验证录入/导出/重新登录浏览器、PDF 与主题，确认浏览器环境限制。
