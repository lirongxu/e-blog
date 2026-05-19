import { Hono } from 'hono';
import type { Env } from './lib/db';
import { renderPage } from './lib/template';
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

const app = new Hono<{ Bindings: Env }>();

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
  const html = renderPage({
    title: '404',
    content: '<h1>404</h1><p>页面不存在。</p><p><a href="/">返回首页</a></p>',
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '',
  });
  return c.html(html, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.text('Internal Server Error', 500);
});

export default app;
