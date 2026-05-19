# E-Blog 设计文档

## 1. 项目概述

一个部署在 Cloudflare 上的个人博客，使用 Cloudflare Workers 作为运行时、D1 SQL 作为持久化存储、KV 作为缓存和配置存储。参考 immarcus.com 的风格和功能。

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 运行时 | Cloudflare Workers (Hono) | 边缘计算，全球低延迟 |
| 前端 | SSR + 原生 HTML/CSS/JS | 无框架依赖，轻量快速 |
| 持久化 | Cloudflare D1 (SQLite) | 文章、页面、评论等结构化数据 |
| 缓存/配置 | Cloudflare KV | 站点配置、热门文章缓存、会话数据 |
| 静态资源 | Cloudflare R2 (可选) | 图片等静态文件托管 |
| 部署 | Wrangler CLI | 一键部署到 Cloudflare |

## 3. 数据模型

### 3.1 D1 表结构

```sql
-- 文章表
CREATE TABLE posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  summary     TEXT,                    -- 摘要
  content     TEXT NOT NULL,           -- Markdown 内容
  cover_url   TEXT,                    -- 封面图
  status      TEXT DEFAULT 'draft',    -- draft / published
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

-- 标签表
CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 文章-标签关联
CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id),
  tag_id  INTEGER REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

-- 页面表（About / Now / 自定义页面）
CREATE TABLE pages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,            -- Markdown 内容
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 签名墙 / 留言
CREATE TABLE guestbook (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT,
  website    TEXT,
  message    TEXT NOT NULL,
  is_approved INTEGER DEFAULT 0,       -- 需审核
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 3.2 KV 用途

| Key | 用途 | TTL |
|-----|------|-----|
| `config:site` | 站点全局配置 (JSON) | 无 |
| `cache:post:{slug}` | 单篇文章 HTML 缓存 | 1h |
| `cache:post:list:{page}` | 文章列表 HTML 缓存 | 30min |
| `cache:rss` | RSS feed 缓存 | 1h |
| `stats:views:{post_id}` | 文章浏览量 | 无 |

## 4. 页面设计

参考 immarcus.com，规划以下页面：

### 4.1 首页 (`/`)
- 简洁欢迎语，自我介绍一段话
- 最近 N 篇文章预览（标题 + 摘要 + 日期）
- RSS 订阅链接

### 4.2 关于 (`/about`)
- 头像 + 个人简介
- 可选：MBTI 属性条 / 个性化信息卡片
- Q&A 区域

### 4.3 博客列表 (`/blog`)
- 按时间倒序展示文章
- 每项：标题、摘要、日期、标签
- 分页（每页 10 篇）
- 标签筛选

### 4.4 博客详情 (`/blog/:slug`)
- 标题、日期、标签
- Markdown 渲染正文（支持代码高亮、数学公式 KaTeX）
- 上一篇 / 下一篇导航
- 浏览量统计

### 4.5 近况 (`/now`)
- 当前在做的事、在读的书、在听的音乐
- 简单的时间线格式

### 4.6 签名墙 (`/wall`)
- 留言表单（名字、邮箱、网站、内容）
- 留言列表（需审核后展示）

### 4.7 RSS Feed (`/rss.xml`)
- 标准 RSS 2.0 格式

### 4.8 管理后台 (`/admin`)
- 简单密码认证（基于 KV 存储的 token）
- 文章 CRUD（创建/编辑/删除/发布）
- 页面内容编辑
- 留言审核

## 5. UI / 视觉设计

### 5.1 风格
- 简洁、留白充足、内容优先
- 中文排版优化（行高 1.8、段间距合理）
- 固定顶部导航栏

### 5.2 配色
- 亮色模式：白色背景 `#fff`，主文字 `#333`，强调色 `#4a90d9`
- 暗色模式：深色背景 `#1a1a2e`，主文字 `#e0e0e0`，强调色 `#6db3f2`
- 跟随系统偏好，可手动切换

### 5.3 布局
- 导航栏：Logo + 站点名 | 页面链接 | 暗色模式切换
- 主内容区：最大宽度 800px 居中
- 页脚：RSS 链接 + 版权信息

### 5.4 响应式
- 移动端导航折叠为汉堡菜单
- 内容区自适应宽度

## 6. 技术细节

### 6.1 Markdown 渲染
- 使用 `marked` 或 `markdown-it` 在 Worker 端解析
- 代码高亮：`highlight.js`
- 数学公式：`KaTeX`
- 渲染后 HTML 缓存到 KV

### 6.2 缓存策略
- 首次请求：D1 查询 → 渲染 HTML → 写入 KV 缓存 → 返回
- 后续请求：KV 缓存命中 → 直接返回
- 文章更新时：主动清除相关 KV 缓存
- 页面设置 `Cache-Control` header 配合 Cloudflare CDN

### 6.3 管理认证
- 管理员密码存储在环境变量中
- 登录后签发 JWT token，存入 cookie
- `/admin/*` 路由统一鉴权中间件

### 6.4 RSS 生成
- 从 D1 查询最近 20 篇已发布文章
- 生成 RSS 2.0 XML，缓存到 KV

## 7. 路由设计

```
GET  /                    → 首页
GET  /about               → 关于页
GET  /blog                → 博客列表
GET  /blog/:slug          → 博客详情
GET  /now                 → 近况页
GET  /wall                → 签名墙
GET  /rss.xml             → RSS Feed
GET  /admin               → 管理后台首页
GET  /admin/posts         → 文章管理
GET  /admin/posts/new     → 新建文章
GET  /admin/posts/:id/edit → 编辑文章
POST /admin/posts         → 创建文章 API
PUT  /admin/posts/:id     → 更新文章 API
DELETE /admin/posts/:id   → 删除文章 API
GET  /admin/pages         → 页面管理
POST /admin/pages/:id     → 更新页面 API
GET  /admin/guestbook     → 留言审核
POST /admin/guestbook/:id/approve → 批准留言
POST /guestbook           → 提交留言
```

## 8. 项目目录结构

```
e-blog/
├── docs/
│   └── speck.md
├── src/
│   ├── index.ts            # Worker 入口，Hono app
│   ├── routes/
│   │   ├── home.ts         # 首页
│   │   ├── blog.ts         # 博客列表 + 详情
│   │   ├── about.ts        # 关于页
│   │   ├── now.ts          # 近况页
│   │   ├── wall.ts         # 签名墙
│   │   ├── rss.ts          # RSS Feed
│   │   └── admin/
│   │       ├── index.ts    # 管理首页
│   │       ├── posts.ts    # 文章管理
│   │       ├── pages.ts    # 页面管理
│   │       └── guestbook.ts# 留言审核
│   ├── lib/
│   │   ├── db.ts           # D1 数据库操作
│   │   ├── cache.ts        # KV 缓存层
│   │   ├── auth.ts         # 认证中间件
│   │   ├── markdown.ts     # Markdown 渲染
│   │   └── template.ts     # HTML 模板引擎
│   └── styles/
│       └── main.css        # 全局样式
├── schema.sql              # D1 建表 SQL
├── wrangler.toml           # Cloudflare 配置
├── package.json
└── tsconfig.json
```

## 9. 开发计划

| 阶段 | 内容 | 预计 |
|------|------|------|
| P1 | 项目初始化 + D1/KV 配置 + 首页 | - |
| P2 | 博客列表 + 详情 + Markdown 渲染 | - |
| P3 | 关于页 + 近况页 | - |
| P4 | 签名墙 + RSS | - |
| P5 | 管理后台 (CRUD + 认证) | - |
| P6 | 暗色模式 + 响应式优化 | - |
| P7 | 缓存优化 + 性能调优 | - |
