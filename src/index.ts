import { Hono } from 'hono';
import type { Env } from './lib/db';
import home from './routes/home';
import blog from './routes/blog';
import about from './routes/about';
import now from './routes/now';
import wall from './routes/wall';
import rss from './routes/rss';
import admin from './routes/admin/index';
import adminPosts from './routes/admin/posts';
import adminPages from './routes/admin/pages';
import adminGuestbook from './routes/admin/guestbook';
import mainCss from './styles/main.css';

const app = new Hono<{ Bindings: Env }>();

// Static CSS
app.get('/styles/main.css', (c) => {
  c.header('Content-Type', 'text/css; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(mainCss);
});

// Page routes
app.route('/', home);
app.route('/', blog);
app.route('/', about);
app.route('/', now);
app.route('/', wall);
app.route('/', rss);

// Admin routes
app.route('/admin', admin);
app.route('/admin/posts', adminPosts);
app.route('/admin/pages', adminPages);
app.route('/admin/guestbook', adminGuestbook);

// 404
app.notFound((c) => {
  const content = `
<h1>404</h1>
<p>页面不存在。</p>
<p><a href="/">返回首页</a></p>`;

  // Import renderPage inline to avoid circular dependency
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 | ${c.env.SITE_TITLE}</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="/" class="nav-brand">${c.env.SITE_TITLE}</a>
    </div>
  </nav>
  <main class="container">${content}</main>
</body>
</html>`, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.text('Internal Server Error', 500);
});

export default app;
