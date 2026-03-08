# 二次元头像展览库（MySQL + 上传 + 外部采集）

该项目提供一个标准化头像图库系统，支持：

- 多页面：`图库`、`上传`、`外部采集`
- 大量头像展示：分页、过滤、标签
- 数据入库：本地上传、URL 批量导入
- 实时采集：`chrome` / `telegram` / `tiktok`（Playwright）
- MySQL 存储：图片元信息、来源、点击计数、去重哈希

## 1) 环境准备

1. 安装 Node.js 18+（需包含 npm/npx）
2. 安装 MySQL 8+
3. 复制环境变量：

```powershell
Copy-Item .env.example .env
```

按需修改 `.env` 的 MySQL 连接配置。

## 2) 安装依赖

```bash
npm install
npx playwright install chromium
```

## 3) 初始化数据库

```bash
npm run db:init
```

## 4) 启动服务

```bash
npm run dev
# 或
npm start
```

启动后访问：

- [http://localhost:3000/gallery.html](http://localhost:3000/gallery.html)
- [http://localhost:3000/upload.html](http://localhost:3000/upload.html)
- [http://localhost:3000/import.html](http://localhost:3000/import.html)

## 5) API 概览

- `GET /api/avatars?page=1&limit=24&source=tiktok&tag=anime&keyword=...`
- `POST /api/avatars/upload`（`multipart/form-data`，字段 `images` 可多文件）
- `POST /api/avatars/import/urls`（JSON: `{ "urls": ["https://..."], "tags": "anime,cute" }`）
- `POST /api/avatars/import/scrape`（JSON: `{ "platform":"tiktok", "pageUrl":"https://...", "limit":30 }`）
- `POST /api/avatars/:id/click`
- `DELETE /api/avatars/:id`（删除图片记录，若无其他引用会同时删除本地文件）

## 6) 采集说明

- `tiktok` / `telegram` 仅适合公开页面或已授权登录会话。
- 如需带登录态抓取，可设置：

```bash
PLAYWRIGHT_STORAGE_STATE=/absolute/path/storage-state.json
```

## 7) 合规提醒

抓取第三方平台内容前，请确保遵守对应平台的服务条款、地区法律与版权规则。

## 8) 数据库结构

详见 [sql/schema.sql](sql/schema.sql)

## 9) GitHub 分享站（Pages）

项目已内置静态导出与 Pages 工作流：

1. 本地导出分享站数据和图片到 `docs/`：

```bash
npm run export:share
```

2. 推送到 GitHub 仓库的 `main` 分支（工作流：`.github/workflows/pages.yml`）。
3. 在仓库 `Settings -> Pages` 中启用 `GitHub Actions` 作为部署来源。
4. 部署完成后可通过：

`https://<你的GitHub用户名>.github.io/<仓库名>/`

访问分享站。
