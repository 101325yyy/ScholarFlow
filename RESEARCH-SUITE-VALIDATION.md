# ScholarFlow 2026.11 验证记录

测试环境：Linux Chromium `/usr/bin/chromium`，Playwright，Node.js 22，Python 3；隔离浏览器 localStorage 合成记录，不连接真实云账户。

## 迭代 1 · 新功能
- `tests/test-research-suite.py`：**111/111 PASS**。7 种宽度（320/360/390/430/768/1024/1440px），4 个新入口，知识关联增删、PDF 页码摘录增删、周计划新增完成删除、全局搜索及筛选、快捷键、XSS 文本处理。
- 实测 390px 移动端首页英雄区高度由约 775px 降至约 320px，详细资料可从原模块访问。

## 迭代 2 · UI / PWA
- `tests/test-research-suite-themes.py`：**165/165 PASS**，5 种宽度 × 多组主题 × 4 个新页面。
- `tests/test-research-pwa.js`：**6/6 PASS**，验证预缓存名单、缓存命中、跨域/API/POST 不进入缓存处理。
- 本地 Python HTTP：新 CSS/JS、manifest、Service Worker、图标 **200**；测试脚本和内部文档 **404**。
- `node --check`：`app.js`、`research-suite.js`、`pwa.js`、`sw.js` 均无 JavaScript 解析错误。

## 迭代 3 · 旧模块回归
- `test-v110-browser.py` **324 PASS**；`test-v110-ui.py` **552 PASS**；`test-v110-board-alignment.py` **3607 PASS**。
- `test-v110-http.py` **13 PASS**；`test-cloud-sync.py` **17 PASS**（模拟 Supabase）；`test-cloud-workspace.py` **112 PASS**。
- `test-v110-pdf.js` **11 PASS**；`test-v110-paper-ui.py` **572 PASS**；`test-v110-privacy.py` PASS；`test-mobile-navigation.py` **64 PASS**。
- `test-v110-name.py` **70 PASS**；`test-v110-delight.py` **67 PASS**；`test-v110-eye-hero-contrast.py` **1556 个 computed-style 检查、0 失败**；`test-v110-thin-eye-surfaces.py` **664 PASS**。
- `test-v110-companion.py` **83 PASS**；`test-v110-journey.py` **73 PASS**；`test-v110-quality.py` **168 PASS**。

## 未完成/未声明通过
- 旧测试 `test-v110-theme-preview-companion.py` 等耗时测试受执行环境整体超时影响，没有本轮完整通过记录；不将它们计入通过。
- 真正的 HTTPS PWA 安装、后台离线重新打开、移动端 Safari/WebView 真机、Electron 安装、真实 Supabase 登录与跨设备数据库同步，需要部署后复测。
- Chromium 尝试访问本机 HTTP 时返回 `ERR_BLOCKED_BY_ADMINISTRATOR`，故不能声称做了真实浏览器 HTTP 离线 E2E。
