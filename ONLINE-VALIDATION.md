# ScholarFlow 在线浏览器版 · 构建与验证报告

- 构建时间：2026-10-24
- 源码基线：ScholarFlow UI 2026.10.2
- 在线项目：`site/` 六个独立运行资源文件；使用相对资源 URL，适配 GitHub Pages 仓库子路径
- 完整项目：保留 Electron/Python/Go/18 个原有测试文件，并添加 GitHub Pages Action、在线说明及本报告
- 业务逻辑：`site/app.js` 与基线 `app.js` 字节一致；`pdf-intelligence.js` 亦一致

## 自动验证

- 源码 `app.js`、`pdf-intelligence.js`：`node --check` 通过
- 6 个网站静态资源：独立 Python HTTP 文件服务响应 HTTP 200
- 隔离 Chromium 渲染：390/768/1440px，11 个导航模块、在线提示展开、0 页面级横向溢出、0 JS 页面异常
- 原有 18 个测试文件：**18/18 PASS**，明细如下

- `test-v110-board-alignment.py`：PASS（10.41s）
- `test-v110-browser.py`：PASS（15.09s）
- `test-v110-companion.py`：PASS（12.53s）
- `test-v110-delight.py`：PASS（13.09s）
- `test-v110-eye-hero-contrast.py`：PASS（10.16s）
- `test-v110-http.py`：PASS（2.04s）
- `test-v110-journey.py`：PASS（12.38s）
- `test-v110-name.py`：PASS（14.54s）
- `test-v110-paper-ui.py`：PASS（16.28s）
- `test-v110-pdf.js`：PASS（0.1s）
- `test-v110-performance.py`：PASS（5.46s）
- `test-v110-privacy.py`：PASS（4.37s）
- `test-v110-quality.py`：PASS（31.02s）
- `test-v110-theme-preview-companion.py`：PASS（10.21s）
- `test-v110-theme-readability.py`：PASS（18.57s）
- `test-v110-thin-eye-surfaces.py`：PASS（7.06s）
- `test-v110-ui.py`：PASS（20.07s）
- `test-v110-unified-panels.py`：PASS（15.58s）

## 已知边界

- 测试环境禁止 Chromium 直接导航到本机 `file://` 与 `127.0.0.1`，因此在线界面使用隔离 `set_content` / 脚本注入方式验证；*尚未*完成正式 HTTPS 站点端到端验证。
- 本次未运行 GitHub Actions 真实发布工作流（未获用户仓库连接权限），静态文件已生成，但**尚未正式上线**。
- 离线 Python 翻译/定位本地文件需要本机环境；浏览器端 PDF OCR 可能依赖外部 CDN；在线静态版无账户、云端数据同步或共享数据库。
- GitHub Pages 和 Cloudflare Pages 具体托管设置由用户部署账户控制，真实线上 URL 以发布平台实际返回为准。
