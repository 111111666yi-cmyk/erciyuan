# 二次元头像展览库（MySQL + 上传 + 外部采集）

该项目提供标准化头像图库系统，支持：

- 多页面：`图库`、`上传`、`外部采集`
- 大量头像展示：分页、过滤、标签
- 数据入库：本地上传、URL 批量导入
- 实时采集：`chrome` / `telegram` / `tiktok`（Playwright）
- MySQL 存储：图片元信息、来源、点击计数、去重哈希
- 管理员能力：删除、云端隐藏/恢复公开、下载

## 1) 环境准备

1. 安装 Node.js 18+（需包含 npm/npx）
2. 安装 MySQL 8+
3. 复制环境变量：

```powershell
Copy-Item .env.example .env
```

按需修改 `.env` 的 MySQL 连接配置。

建议开启管理员保护：

```env
ADMIN_TOKEN=你的强密码令牌
```

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

- `GET /api/avatars?page=1&limit=24&scope=public|all|hidden&source=tiktok&tag=anime&keyword=...`
- `POST /api/avatars/upload`（管理员）
- `POST /api/avatars/import/urls`（管理员）
- `POST /api/avatars/import/scrape`（管理员）
- `POST /api/avatars/:id/click`
- `PATCH /api/avatars/:id/share-visibility`（管理员，body: `{ "isShareVisible": false }`）
- `DELETE /api/avatars/:id`（管理员）

管理员请求需传 Header：`x-admin-token: <ADMIN_TOKEN>`。

## 6) GitHub 分享站（Pages）

项目内置静态导出与 Pages 工作流：

1. 导出公开内容：

```bash
npm run export:share
```

2. 推送到 `main` 分支。
3. 在仓库 `Settings -> Pages` 启用 `GitHub Actions` 作为部署来源。

分享链接：

`https://<你的GitHub用户名>.github.io/<仓库名>/`

注意：GitHub Pages 是静态只读站点，不能实时上传/删除。请在本地管理页操作后再执行 `export + push`。
