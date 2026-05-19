import { Hono } from 'hono';
import type { Env } from '../../lib/db';
import { getAllPages, updatePage } from '../../lib/db';
import { invalidatePageCache } from '../../lib/cache';
import { renderPage } from '../../lib/template';
import { escapeHtml } from '../helpers';

const adminPages = new Hono<{ Bindings: Env }>();

// List pages
adminPages.get('/', async (c) => {
  const pages = await getAllPages(c.env.DB);

  const rows = pages.map(p => `<tr>
  <td>${escapeHtml(p.title)}</td>
  <td>${escapeHtml(p.slug)}</td>
  <td>${p.sort_order}</td>
  <td class="actions">
    <a href="/admin/pages/${p.id}/edit" class="btn btn-sm">编辑</a>
  </td>
</tr>`).join('\n');

  const content = `
<h1>页面管理</h1>
<table class="admin-table">
  <thead><tr><th>标题</th><th>Slug</th><th>排序</th><th>操作</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

  return c.html(renderPage({
    title: '页面管理',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/pages',
  }));
});

// Edit page form
adminPages.get('/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'));
  const pages = await getAllPages(c.env.DB);
  const page = pages.find(p => p.id === id);
  if (!page) return c.notFound();

  const content = `
<h1>编辑页面: ${escapeHtml(page.title)}</h1>
<form method="POST" action="/admin/pages/${page.id}">
  <div class="form-group">
    <label for="title">标题</label>
    <input type="text" id="title" name="title" value="${escapeHtml(page.title)}" required>
  </div>
  <div class="form-group">
    <label for="sort_order">排序</label>
    <input type="number" id="sort_order" name="sort_order" value="${page.sort_order}">
  </div>
  <div class="form-group">
    <label for="content">内容 (Markdown)</label>
    <textarea id="content" name="content" style="min-height:400px" required>${escapeHtml(page.content)}</textarea>
  </div>
  <button type="submit" class="btn">保存</button>
</form>`;

  return c.html(renderPage({
    title: '编辑页面',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/pages',
  }));
});

// Update page
adminPages.post('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const formData = await c.req.formData();
  const title = (formData.get('title') as string).trim();
  const sortOrder = parseInt(formData.get('sort_order') as string) || 0;
  const contentStr = (formData.get('content') as string).trim();

  const pages = await getAllPages(c.env.DB);
  const page = pages.find(p => p.id === id);
  if (!page) return c.notFound();

  await updatePage(c.env.DB, id, { title, content: contentStr, sort_order: sortOrder });
  await invalidatePageCache(c.env.KV, page.slug);

  return c.redirect('/admin/pages');
});

export default adminPages;
