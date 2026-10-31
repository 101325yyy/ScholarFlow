# ScholarFlow 2026.11.7 真实 SDK 适配与 UI 验收

- 实际源码文件：110；SHA256 覆盖：109。
- 修改：cloud-config.js、cloud-sync.js、site/index.html、app.js（设置 UI 文案及 DOM 分组）、styles.css、site/online.css、sw.js、README 及测试。
- 保障：原本地数据键 scholarflow_v1_data、app.js 数据读写/保存事件、CAS 与 lastAck/fingerprint/alignAuto、手动 PDF、二次确认未删。
- Chrome 隔离测试：8 档宽度下 56 项设置页几何/溢出检查通过；原业务 324 项、原 UI 552 项、移动导航 64 项、PDF 核心 11 项通过。另已执行 401 权限拒绝分支（无误重试、本机保留）。
- WorkBuddy 模拟 SDK：密码登录、OTP 直认证、首次 revision=1、第二次 revision=2、CAS 冲突保护、登出本地不变、PDF 私有上传/跳过/恢复、离线不上传通过。
- **未验证**：真实 WorkBuddy 邮箱验证码送达、服务器 RLS、数据库双设备 CAS、实际 Storage 下载/上传、真机输入法。沙箱 Chromium 对正常 origin 的 IndexedDB 访问被策略阻拦，PDF 传输仅通过存储桩测试。
- 旧 Supabase fetch 合约测试须视为历史合同而非现行接口验收。
