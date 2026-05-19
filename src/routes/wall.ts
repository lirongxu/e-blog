import { Hono } from 'hono';
import type { Env } from '../lib/db';
import { getApprovedGuestbook, createGuestbookEntry } from '../lib/db';
import { renderPage } from '../lib/template';
import { escapeHtml, formatDate } from './helpers';

const wall = new Hono<{ Bindings: Env }>();

wall.get('/wall', async (c) => {
  const entries = await getApprovedGuestbook(c.env.DB);

  const entriesHtml = entries.length > 0
    ? entries.map(e => `<div class="guestbook-entry">
  <div class="entry-meta">
    <strong>${escapeHtml(e.name)}</strong>
    ${e.website ? ` · <a href="${escapeHtml(e.website)}" target="_blank" rel="noopener">网站</a>` : ''}
    · ${formatDate(e.created_at)}
  </div>
  <p class="entry-message">${escapeHtml(e.message)}</p>
</div>`).join('\n')
    : '<p>暂无留言，来做第一个留言的人吧！</p>';

  const success = c.req.query('success');
  const alertHtml = success ? '<div class="alert alert-success">留言已提交，等待审核后显示。</div>' : '';

  const content = `
<h1>签名墙</h1>
<p>欢迎在这里留下你的信息和联系方式～</p>

${alertHtml}

<form class="guestbook-form" method="POST" action="/wall">
  <div class="form-group">
    <label for="name">名字 *</label>
    <input type="text" id="name" name="name" required>
  </div>
  <div class="form-group">
    <label for="email">邮箱（不会公开）</label>
    <input type="email" id="email" name="email">
  </div>
  <div class="form-group">
    <label for="website">网站</label>
    <input type="url" id="website" name="website">
  </div>
  <div class="form-group">
    <label for="message">留言 *</label>
    <textarea id="message" name="message" required></textarea>
  </div>
  <button type="submit" class="btn">提交留言</button>
</form>

<h2>留言列表</h2>
${entriesHtml}`;

  const html = renderPage({
    title: '签名墙',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/wall',
  });

  return c.html(html);
});

wall.post('/wall', async (c) => {
  const formData = await c.req.formData();
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim() || null;
  const website = (formData.get('website') as string)?.trim() || null;
  const message = (formData.get('message') as string)?.trim();

  if (!name || !message) {
    return c.redirect('/wall');
  }

  await createGuestbookEntry(c.env.DB, { name, email, website, message });
  return c.redirect('/wall?success=1');
});

export default wall;
