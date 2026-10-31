# 账户记不住 · 根因定位与修复

> 版本：2026.11.15 → **2026.11.15-1**　日期：2026-10-31
> 问题：「每次都需要重新注册，账户不能记住」

## 一、结论先说

复现出 **2 条真实成因** 和 **1 个连带显示缺陷**，改了 **5 处**代码（4 处行为 + 1 处诊断）。

| 现象 | 根因 | 状态 |
|---|---|---|
| 刷新/隔夜回来要重新登录 | SDK 在刷新令牌被拒时**删除本地会话**，而"刷新被页面卸载打断、服务端已轮换"正属于此 | 已修（镜像恢复） |
| 换环境后每次都要登录 | 浏览器**不允许存储**时，SDK 静默降级为内存，刷新即丢，且**没有任何提示** | 已修（探测+告警） |
| 登录后账号栏邮箱是空的 | SDK 解析会话时只映射 `id/name/avatarUrl`，**不映射 email** | 已修（兜底解析） |

**没有改 SDK**（它是 CDN 上的第三方包）。改的是应用层：能不能在 SDK 丢会话之后把它接住，
以及丢不掉的时候，至少让人看得懂发生了什么。

## 二、根因：SDK 的会话生命周期

从 jsDelivr 取回 `@tencent-ai/workbuddy-cloud-sdk@dev` 的打包产物，读到的关键逻辑：

```js
ensure(){ const e = store.read();
          return e ? (isExpiring(e) ? (e.refreshToken ? refreshOnce(e) : abandon()) : e) : null }
isExpiring(e){ return typeof e.expiresAt!=='number' || e.expiresAt - now() < 90_000 }
onRefreshFailed(e,t){ return isCredentialsRejected(t) ? this.abandon() : (lastFailure={...}, null) }
abandon(){ store.clear(); emit('SIGNED_OUT', null) }        // ← 直接删掉
rejectedCredentials(r){ return r.kind==='unauthenticated' || r.code==='invalid_grant' }
```

两个后果：

1. **90 秒阈值**：只要 access token 剩余有效期不足 90 秒，每次启动都会触发一次刷新。隔夜回来
   基本必然刷新。
2. **刷新被拒即销毁**：`invalid_grant` / `unauthenticated` 会让 SDK 直接 `store.clear()`。
   而服务端刷新令牌通常是**一次性**的——如果刷新请求在页面卸载/切网时被打断，服务端已经作废了
   旧令牌，浏览器却没收到新令牌，下一次启动必然 `invalid_grant`，会话被清，用户被迫重新登录。

会话存在 `localStorage['workbuddy-cloud.session.<publishableKey>']`。这个键被删掉，页面就
"忘记"了登录。

### 实测复现（真实 SDK + 契约级后端替身）

| 场景 | 修复前 | 修复后 |
|---|---|---|
| R3 刷新请求被页面卸载打断（服务端已轮换） | 会话被删除，`signedIn=false`，无任何解释 | 仍掉线（协议层无法自救），但邮箱已预填、明确写"不需要重新注册" |
| R4 `localStorage` 不可用（内嵌预览/隐私窗口） | 每次刷新都掉线，**零提示** | 掉线，但面板明写「本环境无法保存登录状态，请用浏览器直接打开」 |
| X4 SDK 删键但令牌仍有效 | 会话丢失，需重新登录 | **自动恢复，用户无感** |

R4 这条值得单独说：因为 SDK 的存储解析是

```js
function resolveStorage(r){ if(r) return r;
  try { localStorage.setItem('__workbuddy_probe__','1'); ...; return localStorage }
  catch { return createMemoryStorage() } }      // ← 静默降级为内存
```

只要 `localStorage` 抛异常（沙箱 iframe、隐私模式、禁用网站数据），**SDK 不报错、不降级提示，
直接换成内存 Map**。于是登录"成功"了，但刷新页面就没了。用户看到的就是"又要注册一遍"。

## 三、改了什么

全部在 `site/cloud-sync.js`（根目录 `cloud-sync.js` 同步保持一致）。

### 1. 会话镜像 + 一次性恢复

SDK 丢会话时，应用自己还留了一份仍有效的副本：

- 每次成功登录/刷新后记下 `{accessToken, refreshToken, expiresAt, user}`（`sf_cloud_session_mirror_v1`）；
- 启动时若 SDK 报"无会话"，且镜像**剩余有效期 > 90 秒**（不会触发刷新，也就不会踩轮换），
  把镜像写回 SDK 的键并重试一次；
- 恢复失败（令牌确实被吊销）→ 清掉镜像，走登录路径；
- **同一份镜像只尝试一次**（`sf_cloud_session_restored_v1` 记录代次），不会死循环；
- **显式退出登录时清除镜像**，否则"退出"等于没退。

### 2. 记住邮箱，掉线后停在登录页

- 登录成功记下邮箱（`sf_cloud_last_email_v1`，非机密）；
- 会话失效时自动落到「登录」页并预填该邮箱；
- 面板明写：**"你的账号仍然存在，不需要重新注册"**。

之前掉线后虽然默认也是登录页，但邮箱是空的、也没有任何解释，于是被理解成"账户没了，得重来"。

### 3. 区分两种失效原因

`sessionLost` 分 `expired`（云端会话过期/被回收）与 `storage`（本环境存不住）。
两种文案不同：前者指向"重新登录"，后者指向"换个浏览器窗口打开"。

首次到访**不会**显示这个提示（只有本机曾登录过才提示），避免新用户被吓到。

### 4. 存储可用性探测

启动时写读一个探针键。不可用就直接在面板顶部说明，而不是让用户反复登录却永远记不住。

### 5. 邮箱解析兜底 + 诊断信息

- 账号栏邮箱：`user.email → user.raw.email → user.raw.user_metadata.email → 上次邮箱`；
- 「检查 SDK 会话」按钮现在会附带：`存储可用/不可用 · 本机会话已保存（约剩 N 分钟）/未保存 · 记住的邮箱有/无`。
  **不显示令牌本身。**

## 四、验证

| 项目 | 结果 |
|---|---|
| `tests/session-persist/t_persist.py` | 13/13 |
| `tests/session-persist/t_rotation.py` | 7/7 |
| `tests/session-persist/t_fixes.py` | 22/22 |
| 变异测试 `mutation2.py` | **7/7 全部检出** |
| 原有云端/账号模块（8 个） | 8/8 PASS，无回归 |

### 变异测试（为什么"全绿"可信）

把 7 个修复逐一回退成缺陷，看用例能不能抓住。全部 7 个都被抓到，说明断言确实有区分力：

| 变异体 | 回退了什么 | 被哪条用例抓住 |
|---|---|---|
| M1 | 会话镜像自动恢复 | X4 刷新后自动恢复登录 |
| M2 | 掉线后预填邮箱 | X1 邮箱已预填 |
| M3 | 掉线原因说明块 | X1 掉线说明块存在 |
| M4 | 退出时清除镜像 | X6 退出后镜像被清除 |
| M5 | 存储可用性探测 | X3 检测到存储不可用 |
| M6 | 邮箱解析兜底 | X7 账号栏显示邮箱 |
| M7 | 首次到访不谎称失效 | X8 新访客不显示失效说明块 |

过程里也踩了坑并如实记录：第一版 M7 注入后是个**语法错误**（`else` 悬空），脚本根本没加载，
用例自然"没抓到"——这不是用例弱，是变异体坏了。加了 `node --check` 前置校验后才算数。

### 回归：12 个相关模块

8 个通过，4 个失败，逐个查过：

| 模块 | 结果 | 说明 |
|---|---|---|
| test-cloud-static-guards / test-cloud-workspace / test-sf-cloud-panel-keyboard | PASS | — |
| test-workbuddy-network-diagnostics | PASS | 46 断言（探针文案已做兼容） |
| test-workbuddy-account-layout / pdf-offline / interop-idempotent-upload | PASS | — |
| test-v110-privacy | PASS | — |
| test-cloud-sync / test-cloud-reliability / test-cloud-2026-11-2-51-rounds | FAIL | **历史遗留**：依赖已不存在的 `supabaseUrl` 配置，用例在**未修改的基线包上同样失败**（同为 `waiting for locator("input[name=email]")`） |
| test-v110-http | FAIL | 用了 `os.killpg`，只能在 Linux 跑 |

后 4 个与本次改动无关，没有为了让数字好看去改它们。

## 五、边界（必须说清）

1. **我无法看到你的浏览环境**，所以无法确定你那边是 R3 还是 R4。点一下面板里的
   「检查 SDK 会话」，把返回的那行字发我，就能定位。
2. **真实后端仍未验证**：`scholarflow-source.app.workbuddy.host` 全路径 403（应用未发布）。
   真实的令牌 TTL、刷新策略、`invalid_grant` 触发条件只能等发布后确认。
   本文所有结论来自「真实 SDK + 按 SDK 源码契约实现的后端替身」。
3. **镜像会多存一份令牌**，与 SDK 自己的存储同源、同等级（都在该站点的 `localStorage`），
   不是新增暴露面；退出登录会立即清除。若你要求"不留副本"，删掉 `saveMirror`/`tryRestoreMirror`
   即可，行为退回"掉线即需重新登录，但提示与预填仍在"。
4. 若诊断显示**存储不可用**，那么"记住账户"在这个环境里做不到——不是代码问题，是浏览器
   不给存储。换普通窗口打开即可。

## 六、复现

```bash
cd tests/session-persist
python sdkfetch.py        # 首次：取回真实 SDK
python t_fixes.py         # 22 项
python t_rotation.py      # 7 项（含 R3/R4 成因复现）
python t_persist.py       # 13 项
python mutation2.py       # 变异测试，应 7/7
```

环境：Playwright + 本机 Edge（`channel="msedge"`）。
