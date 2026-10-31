# 仓库导航（先读这一页）

本仓库是 **ScholarFlow 科研工作台** 2026.11.15「OTP 会话修复」版源码的完整快照。
文件名、哈希均与交付包 `ScholarFlow-2026.11.15-OTP-Session-Fix-Full-Source.zip` 一致，
可用根目录 `SHA256SUMS.txt` 逐文件校验。

---

## 1. 改代码请认准 `site/`

仓库里存在两份同名文件，**权威版本是 `site/`**：

| 位置 | 是什么 | 能否直接部署 |
|---|---|---|
| `site/` | 线上部署版本。额外含 `online.css`、`cloud.css`、`cloud-config.js`、`cloud-sync.js` 与 WorkBuddy 云 SDK | ✅ 唯一可部署目录 |
| 根目录同名文件 | 旧的离线单文件版副本 | ❌ 不含云同步 |

两份的 `app.js`、`styles.css`、`cloud-sync.js`、`sw.js`、`pdf-intelligence.js`、`research-suite.js`、`research-suite.css` **逐字节相同**；
仅 `index.html`（根目录版不加载云脚本）与 `pwa.js`（离线提示文案）不同。

> 因此：**改 UI 或业务逻辑，请改 `site/app.js` + `site/styles.css`**，不要改根目录那份，否则线上不生效。

## 2. 目录职责

```
site/                  可部署的完整前端（14 个文件 + assets/ 内 3 个图标）
  index.html           唯一入口，脚本加载顺序不可调换
  app.js               工作台主程序，约 2,160 行超长单行压缩风格
  styles.css           全部样式，约 3,651 行，同一文件的 IDE 风格分区
  cloud-sync.js        WorkBuddy 云同步 + 账户/OAuth/OTP 状态机（本次修复重心）
  cloud-config.js      公开配置（publishableKey 是公开密钥，非管理密钥）
  research-suite.js    文献/实验/论文模块
  pdf-intelligence.js  PDF 解析
  pwa.js / sw.js / manifest.webmanifest   离线与安装
tests/                 回归套件（Python + Playwright）
cloud/                 云端数据表结构与部署校验 SQL
portable/ windows/     桌面端外壳
assets/                图标
*.md                   历次版本记录，按日期倒序
```

## 3. 修改纪律（重要）

`app.js`（301 KB）与 `styles.css`（335 KB）是**超长单行压缩风格**。整文件重写会静默破坏语法而不报错——浏览器仍能容错执行，缺陷却已引入。请只做**定位式小段替换**，并在替换后确保：

- 片段在文件中**恰好出现一次**（否则会改错位置）
- 括号配平（`styles.css` 当前 `{` 3,362 / `}` 3,362）
- JS 通过 `node --check`

## 4. 修复点（勿回退）

### 4.1 OTP 会话修复（2026.11.15，6 处）

全部位于 `site/cloud-sync.js`：

1. `authFlowVersion` 版本戳，令过期登录状态查询结果失效
2. `otpUnconfirmed` 状态机：SDK 未返回验证会话时提示重发，不显示虚假倒计时
3. `typeof result?.verify !== 'function'` 时抛错，不伪造成功
4. `resetRemote({preserveAuth: !state.user})` 区分「未登录」与「主动退出」
5. 邮箱或 challenge 变更时给出准确错误，不静默吞掉
6. 注册/验证码登录/忘记密码三处发送按钮共用同一倒计时状态源

### 4.2 上传幂等（2026.10.31，1 处）

`upload()` 中新增：云端内容与本机完全一致时**不再写入**。

原因：重复上传会把 `revision` 无意义地抬高，另一台设备的 `checkChanges()`
据此判定"有其他设备写入"，从而弹出冲突并要求人工确认——**两端内容其实完全相同**。
详见 `INTEROP-100-ROUNDS-2026.10.31.md` 第四节；回归测试见
`tests/test-interop-idempotent-upload.py`。

### 4.3 会话记忆（2026.11.15-1，5 处）

同样在 `site/cloud-sync.js`（根目录 `cloud-sync.js` 保持一致）。解决「每次都要重新注册」：

1. **会话镜像**：成功登录/刷新后记下会话（`sf_cloud_session_mirror_v1`）。SDK 因刷新被拒
   删除会话后，若镜像剩余有效期 > 90 秒（不触发刷新），回写并重试一次；同一代次只试一次
2. **退出即清除镜像**：否则「退出登录」等于没退
3. **记住邮箱**（`sf_cloud_last_email_v1`）+ 掉线后停在登录页预填，明写「账号仍在，不需要重新注册」
4. **存储可用性探测**：`localStorage` 不可用时明确告知（SDK 会静默降级为内存，刷新即丢）
5. **邮箱解析兜底**：SDK 只映射 `id/name/avatarUrl`，需从 `raw.email` 兜底，否则账号栏空白

**不要**去掉 `tryRestoreMirror()` 的 90 秒守卫与「只试一次」标记，否则令牌被吊销时会陷入恢复循环。
详见 `SESSION-MEMORY-FIX-2026.11.15-1.md`；回归见 `tests/session-persist/`。

## 5. 已验证 / 未验证

**已验证**（Windows + Playwright 1.64.1 + Edge Chromium 146，headless）：

- 项目自带 14 个测试模块、**1,714 条断言全部通过**，0 页面 JS 异常
- 双端互通 **100 轮全部通过，424 条断言**，0 页面异常；另有 8 项加固探测通过
- 会话记忆修复：`tests/session-persist/` **42 项断言全部通过**（13+7+22），
  变异测试 **7/7 检出**；原有云端/账号模块 8/8 无回归
- 变异测试 **3/3 检出**（注入缺陷均被用例抓住，见 `INTEROP-100-ROUNDS-2026.10.31.md` 第五节）
- `SHA256SUMS.txt` 逐条哈希匹配

**未验证（重要）**：

- 本仓库**从未部署到公网**。原域名 `scholarflow-source.app.workbuddy.host` 全路径返回平台级 403，应用未发布
- 因此**真实邮件 OTP 全链路未做过生产联调**，「登录在生产可用」目前没有依据，不要据此下结论
- 互通测试使用的是按真实协议建模的**自建共享云替身**，不等于 WorkBuddy 真实云服务
- 会话测试用的是**真实 SDK + 按 SDK 源码契约实现的后端替身**；真实令牌 TTL、刷新策略、
  `invalid_grant` 触发条件仍只能在真实后端上确认
- 未覆盖：PDF 二进制跨设备传输、桌面端外壳、服务端并发压力
- 已知遗留：`tests/test-cloud-sync.py`、`test-cloud-reliability.py`、`test-cloud-2026-11-2-51-rounds.py`
  依赖已移除的 `supabaseUrl` 配置，在未修改的基线包上同样失败，属历史遗留

## 6. 本地运行

```bash
python local_server.py        # 或
python -m http.server 8000 -d site
```

云功能需联网并加载 CDN 上的 WorkBuddy 云 SDK；离线时本机记录仍可编辑。
