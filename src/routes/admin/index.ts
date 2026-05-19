import { Hono } from 'hono';
import type { Env } from '../../lib/db';
import { getPostCount, getPublishedPostCount, getPendingGuestbookCount } from '../../lib/db';
import { generateToken, setAuthCookie, clearAuthCookie, authMiddleware } from '../../lib/auth';
import { renderPage } from '../../lib/template';

const admin = new Hono<{ Bindings: Env }>();

// Login page
admin.get('/login', (c) => {
  const error = c.req.query('error');
  const alertHtml = error ? '<div class="alert alert-error">密码错误</div>' : '';

  const content = `
<div class="login-container">
  <h1>管理后台</h1>
  ${alertHtml}
  <form method="POST" action="/admin/login">
    <div class="form-group">
      <label for="password">密码</label>
      <input type="password" id="password" name="password" required autofocus>
    </div>
    <button type="submit" class="btn">登录</button>
  </form>
</div>`;

  return c.html(renderPage({
    title: '登录',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin',
  }));
});

admin.post('/login', async (c) => {
  const formData = await c.req.formData();
  const password = formData.get('password') as string;

  if (password !== c.env.ADMIN_PASSWORD) {
    return c.redirect('/admin/login?error=1');
  }

  const token = await generateToken(password, c.env.ADMIN_PASSWORD);
  setAuthCookie(c, token);
  return c.redirect('/admin');
});

// Logout
admin.get('/logout', (c) => {
  clearAuthCookie(c);
  return c.redirect('/admin/login');
});

// Protected routes
admin.use('/admin/*', async (c, next) => {
  // Skip login/logout pages
  const path = new URL(c.req.url).pathname;
  if (path === '/admin/login' || path === '/admin/logout') {
    await next();
    return;
  }
  return authMiddleware(c, next);
});

// Dashboard
admin.get('/', async (c) => {
  const [totalPosts, publishedPosts, pendingGuestbook] = await Promise.all([
    getPostCount(c.env.DB),
    getPublishedPostCount(c.env.DB),
    getPendingGuestbookCount(c.env.DB),
  ]);

  const content = `
<h1>管理后台</h1>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1.5rem 0">
  <div style="background:var(--bg-secondary);padding:1.25rem;border-radius:var(--radius)">
    <div style="font-size:2rem;font-weight:700;color:var(--accent)">${totalPosts}</div>
    <div style="color:var(--text-secondary);font-size:0.9rem">总文章数</div>
  </div>
  <div style="background:var(--bg-secondary);padding:1.25rem;border-radius:var(--radius)">
    <div style="font-size:2rem;font-weight:700;color:var(--accent)">${publishedPosts}</div>
    <div style="color:var(--text-secondary);font-size:0.9rem">已发布</div>
  </div>
  <div style="background:var(--bg-secondary);padding:1.25rem;border-radius:var(--radius)">
    <div style="font-size:2rem;font-weight:700;color:var(--accent)">${pendingGuestbook}</div>
    <div style="color:var(--text-secondary);font-size:0.9rem">待审核留言</div>
  </div>
</div>

<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1rem">
  <a href="/admin/posts" class="btn">管理文章</a>
  <a href="/admin/posts/new" class="btn">新建文章</a>
  <a href="/admin/pages" class="btn">管理页面</a>
  <a href="/admin/guestbook" class="btn">审核留言${pendingGuestbook > 0 ? ` (${pendingGuestbook})` : ''}</a>
  <a href="/admin/logout" class="btn btn-danger" style="margin-left:auto">退出登录</a>
</div>`;

  return c.html(renderPage({
    title: '管理后台',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin',
  }));
});

export default admin;
