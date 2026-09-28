# 成都燃气 AI 智能稽查 — GitHub Pages 静态演示版

## 演示账号
- admin / gas-ai-2026
- inspector / gas-ai-2026

> 注意：这是纯前端演示版。账号密码写在前端代码中，不具备真实安全性，请勿用于生产系统。

## GitHub Pages 发布
1. 在 GitHub 新建一个仓库，例如 `gas-ai-demo`。
2. 将本目录中的所有文件上传到仓库根目录（不要只上传外层文件夹）。
3. 打开仓库 `Settings` → `Pages`。
4. `Build and deployment` 的 Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/(root)`，点击 Save。
6. 等待 GitHub 完成部署，即可获得 `https://你的用户名.github.io/gas-ai-demo/` 一类的网址。

## 静态版变化
- 原 `/api/data` 改为读取 `data.json`。
- 登录改为浏览器本地演示登录。
- 稽查线索改为浏览器直接导出 CSV。
- Excel 模板仍可下载。
- “导入 Excel → Python 神经网络重新训练”无法在 GitHub Pages 上执行，因此静态版不会重新训练模型。

## 文件
- `index.html` 页面
- `styles.css` 样式
- `app.js` 前端逻辑
- `data.json` 预计算演示数据
- `sample_gas_data.xlsx` Excel 示例模板
