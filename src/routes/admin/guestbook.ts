import { Hono } from 'hono';
import type { Env } from '../../lib/db';
import { getAllGuestbook, approveGuestbookEntry, deleteGuestbookEntry } from '../../lib/db';
import { renderPage } from '../../lib/template';
import { escapeHtml, formatDate } from '../helpers';

const adminGuestbook = new Hono<{ Bindings: Env }>();

// List guestbook entries
adminGuestbook.get('/', async (c) => {
  const entries = await getAllGuestbook(c.env.DB);

  const rows = entries.map(e => `<tr>
  <td>${escapeHtml(e.name)}</td>
  <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(e.message)}</td>
  <td>${e.email ? escapeHtml(e.email) : '-'}</td>
  <td><span class="badge badge-${e.is_approved ? 'approved' : 'pending'}">${e.is_approved ? '已批准' : '待审核'}</span></td>
  <td>${formatDate(e.created_at)}</td>
  <td class="actions">
    ${!e.is_approved ? `<form method="POST" action="/admin/guestbook/${e.id}/approve" style="display:inline"><button type="submit" class="btn btn-sm" style="background:#28a745">批准</button></form>` : ''}
    <form method="POST" action="/admin/guestbook/${e.id}/delete" style="display:inline" onsubmit="return confirm('确定删除？')">
      <button type="submit" class="btn btn-sm btn-danger">删除</button>
    </form>
  </td>
</tr>`).join('\n');

  const content = `
<h1>留言审核</h1>
<table class="admin-table">
  <thead><tr><th>名字</th><th>内容</th><th>邮箱</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
  <tbody>
    ${rows.length > 0 ? rows : '<tr><td colspan="6">暂无留言</td></tr>'}
  </tbody>
</table>`;

  return c.html(renderPage({
    title: '留言审核',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/guestbook',
  }));
});

// Approve entry
adminGuestbook.post('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'));
  await approveGuestbookEntry(c.env.DB, id);
  return c.redirect('/admin/guestbook');
});

// Delete entry
adminGuestbook.post('/:id/delete', async (c) => {
  const id = parseInt(c.req.param('id'));
  await deleteGuestbookEntry(c.env.DB, id);
  return c.redirect('/admin/guestbook');
});

export default adminGuestbook;
