# ScholarFlow Cloud 2026.11.2 — 51 轮迭代与质量审计

## 测试范围和真实性边界

本报告记录基于 2026.11.1 完整源码的源码级检查、补丁与隔离 Chromium 回归。**51 轮是 51 个独立 QA 场景/检查循环，而非 51 次正式生产环境发布或真实多端联网循环**。其中 36 轮为 6 个屏宽 × 6 个常用页面路由，另外 15 轮为云端故障、恢复和冲突场景。云端模拟使用本地替身 `fetch`，没有真实 Supabase 账号或服务器凭证；**尚未完成公网部署、两个真实用户跨账号 RLS、真实 PDF Storage、跨设备和真实断网 PWA 联调**。独立 QA 脚本位于 `tests/test-cloud-2026-11-2-51-rounds.py`。

## 修复的问题

1. **P1：云端恢复使用过期快照**。旧版点击下载即可把上次登录时抓取的远端 JSON 写入本机。现恢复前重新请求远端版本；双重确认后再请求一次；若云端内容/修订版本或本机内容发生变化则拒绝覆盖。
2. **P2：不可恢复错误仍指数重试**。旧版将 HTTP 400 等永久性错误也纳入续传重试，可能造成反复失败。现仅对网络异常、408/425/429 或 5xx 自动重试，CAS 版本冲突继续停止。
3. **P2：PDF Storage 对象路径约束较宽**。现限制路径仅一层用户 ID 文件夹、文件名安全字符且长度 1–120、扩展名 `.pdf`。仍需真实 Supabase 应用迁移与两账号越权测试。
4. **P2：安装版静态资源可能长期缓存旧版本**。更新 Service Worker 缓存版本，让部署更新可主动换壳；缓存白名单和不缓存私有 API 规则保持不变。

## 51 轮场景明细

- 01. 320px / home renders without overflow, duplicate DOM ID or JS exception
- 02. 320px / tasks renders without overflow, duplicate DOM ID or JS exception
- 03. 320px / literature renders without overflow, duplicate DOM ID or JS exception
- 04. 320px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 05. 320px / planner renders without overflow, duplicate DOM ID or JS exception
- 06. 320px / search-all renders without overflow, duplicate DOM ID or JS exception
- 07. 360px / home renders without overflow, duplicate DOM ID or JS exception
- 08. 360px / tasks renders without overflow, duplicate DOM ID or JS exception
- 09. 360px / literature renders without overflow, duplicate DOM ID or JS exception
- 10. 360px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 11. 360px / planner renders without overflow, duplicate DOM ID or JS exception
- 12. 360px / search-all renders without overflow, duplicate DOM ID or JS exception
- 13. 390px / home renders without overflow, duplicate DOM ID or JS exception
- 14. 390px / tasks renders without overflow, duplicate DOM ID or JS exception
- 15. 390px / literature renders without overflow, duplicate DOM ID or JS exception
- 16. 390px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 17. 390px / planner renders without overflow, duplicate DOM ID or JS exception
- 18. 390px / search-all renders without overflow, duplicate DOM ID or JS exception
- 19. 430px / home renders without overflow, duplicate DOM ID or JS exception
- 20. 430px / tasks renders without overflow, duplicate DOM ID or JS exception
- 21. 430px / literature renders without overflow, duplicate DOM ID or JS exception
- 22. 430px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 23. 430px / planner renders without overflow, duplicate DOM ID or JS exception
- 24. 430px / search-all renders without overflow, duplicate DOM ID or JS exception
- 25. 768px / home renders without overflow, duplicate DOM ID or JS exception
- 26. 768px / tasks renders without overflow, duplicate DOM ID or JS exception
- 27. 768px / literature renders without overflow, duplicate DOM ID or JS exception
- 28. 768px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 29. 768px / planner renders without overflow, duplicate DOM ID or JS exception
- 30. 768px / search-all renders without overflow, duplicate DOM ID or JS exception
- 31. 1440px / home renders without overflow, duplicate DOM ID or JS exception
- 32. 1440px / tasks renders without overflow, duplicate DOM ID or JS exception
- 33. 1440px / literature renders without overflow, duplicate DOM ID or JS exception
- 34. 1440px / knowledge renders without overflow, duplicate DOM ID or JS exception
- 35. 1440px / planner renders without overflow, duplicate DOM ID or JS exception
- 36. 1440px / search-all renders without overflow, duplicate DOM ID or JS exception
- 37. stale remote restore rejected at revision 1
- 38. stale remote restore rejected at revision 2
- 39. stale remote restore rejected at revision 4
- 40. stale remote restore rejected at revision 7
- 41. stale remote restore rejected at revision 15
- 42. fresh verified restore at revision 3
- 43. fresh verified restore at revision 9
- 44. HTTP 503 retry policy (transient only)
- 45. HTTP 503 retry policy (transient only)
- 46. HTTP 400 retry policy (transient only)
- 47. HTTP 400 retry policy (transient only)
- 48. revision CAS conflict 20 blocks auto overwrite
- 49. revision CAS conflict 32 blocks auto overwrite
- 50. login never initiates upload or opts in to auto-sync
- 51. remote update during confirmation rejected without overwriting local data

## 原有回归（实际执行并通过）

| 测试 | 结果 |
| --- | --- |
| `test-cloud-sync.py` | 17 项通过（模拟 Supabase） |
| `test-cloud-reliability.py` | 24 项通过（模拟网络与 PDF） |
| `test-cloud-static-guards.py` | 19 项通过 |
| `test-cloud-workspace.py` | 112 项通过 |
| `test-research-suite.py` | 111 项通过 |
| `test-research-suite-themes.py` | 165 项通过 |
| `test-v110-browser.py` | 324 项通过 |
| `test-v110-ui.py` | 552 项通过 |
| `test-v110-paper-ui.py` | 572 项通过 |
| `test-v110-privacy.py` | 通过 |
| `test-v110-http.py` | 13 项通过 |
| `test-mobile-navigation.py` | 64 项通过 |
| `test-mobile-navigation-themes.py` | 110 项通过 |
| `test-v110-board-alignment.py` | 3607 项通过 |
| `test-v110-eye-hero-contrast.py` | 1556 项通过 |
| `test-v110-thin-eye-surfaces.py` | 664 项通过 |
| `test-v110-unified-panels.py` | 3552 项通过 |
| `test-v110-theme-readability.py` | 5484 项通过 |
| `test-v110-pdf.js` | 11 项通过 |
| `test-research-pwa.js` | 6 项通过 |

未列出的其他历史长测试未在这一轮重新完成，**不应推断全部原有测试均通过**。上述测试中涉及的联网流程为仿真接口；PWA Service Worker 的静态规则测试不等于实际 HTTPS 断网重开验收。

## 真正上线前的阻塞项

- `site/cloud-config.js` 仍保留空 `supabaseUrl` 和 `publishableKey`，没有真实项目连接。不要将 `service_role`、`sb_secret_` 或个人科研资料写入公开仓库。
- 在实际 Supabase 项目执行 `cloud/schema.sql`，通过 `cloud/verify-deployment.sql` 核对配置，并用**两个非管理员账号**完成越权拒绝测试。单独在 SQL 编辑器里看见 RLS policy 不代表用户数据必然隔离。
- 真实验证 A/B 设备多端首次上传、断网续传、版本冲突、令牌刷新、私有 PDF 上传/下载与权限限制，登录后主动验证邮件回调网址。
- 在已发布 HTTPS 网站测试 320–1920px、真实 Android/iOS Safari/Chrome、PWA 安装更新和断网重开。
- 升级前备份 JSON 与 PDF 文件。版本冲突不能自动合并用户记录，恢复云端是覆盖操作。

## 安全和平台说明

- PWA 不缓存用户 JSON、Auth/REST/Storage 私有接口。
- Supabase Storage 需要私有桶和 `storage.objects` RLS；数据库快照需要身份认证和 PostgreSQL RLS。
- 服务器管理员技术上可以访问普通 JSONB/Storage 内容，**本版本不具备端到端加密**。
- 同一浏览器 `localStorage` 未按账号自动分区；共享设备上不同用户需要隔离浏览器配置文件。
