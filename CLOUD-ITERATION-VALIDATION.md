# ScholarFlow Cloud 2026.11.1 — 12 轮迭代与回归验收

**验证范围：** 基于 2026.11 完整工程；云端前端使用隔离 Chromium + 模拟 Supabase 网络响应（不是生产账户）；旧科研模块使用原测试数据。项目保留科研 JSON 的历史存储键 `scholarflow_v1_data`，修改集中于 `site/cloud-sync.js`、`cloud/schema.sql`、PWA、安全样式、测试和文档。任何测试均未访问、删除或上传真实科研记录。

## 12 组云同步专项迭代

| 轮次 | 验证主题 | 结果 |
|---|---|---|
| 1 | 登录不会未经同意上传；首次上传建立云端修订版本 | 通过 |
| 2 | 自动同步必须手动开启；离线更改只留在本机 | 通过 |
| 3 | 网络恢复先核对云端修订版本，再续传本机更改 | 通过 |
| 4 | 离线编辑后刷新网页，版本匹配时恢复待同步队列 | 通过 |
| 5 | 离线期间其他设备更新云端，恢复时禁止覆盖并显示冲突 | 通过 |
| 6 | 云端 CAS 版本不匹配时，本机保留原始修改 | 通过 |
| 7 | 过期 token 刷新；JSONB 字段重排不产生假冲突；离线启动不清除 session | 通过 |
| 8 | 私有 PDF 上传到登录账户路径；不会随 PDF 操作偷偷上传 JSON | 通过 |
| 9 | 下载缺失的 PDF，仅写入本机附件存储，不改科研记录 JSON | 通过（模拟 IndexedDB 事务） |
| 10 | 拒绝异常 PDF 签名，避免把非 PDF 当作文献附件 | 通过 |
| 11 | API 临时出错，保留本机数据，并使用受控退避自动重试 | 通过 |
| 12 | 320px 手机下云端面板无横向溢出，仍可操作 | 通过 |

**专项结果：24/24 项断言通过**（`python tests/test-cloud-reliability.py`），其中 IndexedDB 使用测试替身，HTTP 远端使用模拟端点，真实文件存储行为须在用户拥有的 Supabase 项目里再次验证。

## 已实际运行的其他测试

| 测试文件 | 实际结果 |
|---|---|
| `test-cloud-sync.py` | 17 项通过（模拟网络） |
| `test-cloud-workspace.py` | 112 项通过 |
| `test-research-suite.py` | 111 项通过 |
| `test-research-suite-themes.py` | 165 项通过 |
| `test-research-pwa.js` | 6 项通过 |
| `test-cloud-static-guards.py` | 19 条静态防护检查通过 |
| `test-v110-pdf.js` | 11 项通过 |
| `test-v110-browser.py` | 324 项通过 |
| `test-v110-ui.py` | 552 项通过 |
| `test-v110-paper-ui.py` | 572 项通过 |
| `test-v110-board-alignment.py` | 3607 项通过 |
| `test-v110-privacy.py` | 通过 |
| `test-v110-http.py` | 13 项通过 |
| `test-mobile-navigation.py` | 64 项通过 |
| `test-v110-eye-hero-contrast.py` | 1556 项，通过（0 失败） |
| `test-v110-theme-readability.py` | 5484 项，通过（0 失败） |
| `test-v110-unified-panels.py` | 3552 项，通过（0 失败） |
| `test-v110-delight.py` | 67 项通过 |
| `test-v110-companion.py` | 83 项通过 |

**测试限制：** `test-v110-name.py`、`test-mobile-navigation-themes.py` 在本次运行环境中出现执行超时，不能把它们计作通过。其他未列出的历史测试没有在这一轮重新执行。并未在真实 Supabase 上执行 RLS 权限渗透、SMTP 注册确认、真实 PDF Storage 上传下载、Safari/iOS 断网和长期压力测试。

## 安全自查与真实上线前门槛

- 生产 `site/cloud-config.js` 刻意保持空白；不包含服务端 secret。未配置时只有本地存储功能，不可谎称已接通云端。
- 新 `cloud/schema.sql` 提供独立按用户 `auth.uid()` 隔离的 JSONB 快照 RLS，和**非公开** `scholarflow-pdfs` 存储桶及按账户路径的对象策略；无直接 DELETE / UPDATE PDF 存储权限。
- 云端写入数据库是 `PATCH ... revision=eq.<known>`，不匹配则拒绝。不跨设备隐式合并，也不会自动上传 PDF。
- 仅白名单静态页面/资源允许进入 Service Worker 缓存；不截获未授权路径或跨域认证数据。
- 用户必须手动确认数据上传及 PDF 上传。PDF 恢复不覆盖已有本机原件；数据库恢复仍需两次确认。
- Supabase 成功连通不等于 RLS 和跨设备一致性已经验收。需在上线后至少用两个真实测试账号和两个设备验证禁止越权读写、断线重连、冲突、数据备份。
- 科研 JSON 与 PDF 不具有端到端加密；管理员有技术访问能力，请仅同步已授权的科研资料。

**总结：** 本轮进行了至少 12 组独立功能迭代检查和多项回归，对离线、版本冲突、PDF 私有备份和 UI 做了实际修改；适合作为生产部署候选版，**尚不是经过真实云端联调批准的正式生产版本**。
