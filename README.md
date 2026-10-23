# ScholarFlow 1.1.0 · UI 2026 视觉精修版（完整可运行源码）

在 ScholarFlow 1.1.0 科研工作台基础上加入一层 UI 视觉系统：统一色板 token、卡片与控件圆角、阴影层级、排版字号与触控尺寸，覆盖六套配色、护眼与夜间模式、四档响应式断点。

**业务零改动**：`app.js`、`pdf-intelligence.js`、Electron 主进程与预加载脚本、Python 本地服务、Go portable 版本、`localStorage` 数据结构均与 1.1.0 原版一致。

## 本地启动

```
python local_server.py
```

或在 Windows 双击 `start-web.bat`，也可直接打开 `index.html`（纯前端模式，PDF 解析仍可用）。

桌面端：`npm install` 后 `npm run desktop`。

## 验证

```
node tests/test-v110-pdf.js
python tests/test-v110-http.py
```

其余 16 个测试套件需要 `playwright`，未安装时不执行。本轮的视觉与交互实测记录见 `UI-2026-VISUAL-REPORT.md`。

## 目录

| 文件 | 说明 |
| --- | --- |
| `styles.css` | 原始样式 + 末尾 UI 2026 视觉层（可整段删除回滚） |
| `UI-2026-VISUAL-REPORT.md` | 本轮改动、实测数据、验收边界与回滚方式 |
| `V110-UI-ALIGNMENT-REPORT.md` | 上一轮看板对齐验收记录（历史存档） |
| `SHA256SUMS.txt` | 全量文件校验清单 |

**重要**：本次未清除既有科研记录。升级前请导出科研 JSON，并另行备份 PDF 与实验原始文件。
