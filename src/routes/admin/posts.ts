import { Hono } from 'hono';
import type { Env } from '../../lib/db';
import {
  getAllPosts, getPostById, createPost, updatePost, deletePost,
  getPostTags, setPostTags,
} from '../../lib/db';
import { invalidatePostCache } from '../../lib/cache';
import { renderPage } from '../../lib/template';
import { escapeHtml, formatDate } from '../helpers';

const adminPosts = new Hono<{ Bindings: Env }>();

// List posts
adminPosts.get('/', async (c) => {
  const posts = await getAllPosts(c.env.DB);

  const rows = posts.map(p => `<tr>
  <td><a href="/blog/${escapeHtml(p.slug!)}">${escapeHtml(p.title!)}</a></td>
  <td><span class="badge badge-${p.status}">${p.status === 'published' ? '已发布' : '草稿'}</span></td>
  <td>${p.published_at ? formatDate(p.published_at) : '-'}</td>
  <td class="actions">
    <a href="/admin/posts/${p.id}/edit" class="btn btn-sm">编辑</a>
    <form method="POST" action="/admin/posts/${p.id}/delete" style="display:inline" onsubmit="return confirm('确定删除？')">
      <button type="submit" class="btn btn-sm btn-danger">删除</button>
    </form>
  </td>
</tr>`).join('\n');

  const content = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
  <h1>文章管理</h1>
  <a href="/admin/posts/new" class="btn">新建文章</a>
</div>
<table class="admin-table">
  <thead><tr><th>标题</th><th>状态</th><th>发布时间</th><th>操作</th></tr></thead>
  <tbody>
    ${rows.length > 0 ? rows : '<tr><td colspan="4">暂无文章</td></tr>'}
  </tbody>
</table>`;

  return c.html(renderPage({
    title: '文章管理',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/posts',
  }));
});

// New post form
adminPosts.get('/new', (c) => {
  const content = `
<h1>新建文章</h1>
<form method="POST" action="/admin/posts">
  <div class="form-group">
    <label for="title">标题 *</label>
    <input type="text" id="title" name="title" required>
  </div>
  <div class="form-group">
    <label for="slug">Slug *</label>
    <input type="text" id="slug" name="slug" required placeholder="url-friendly-slug">
  </div>
  <div class="form-group">
    <label for="summary">摘要</label>
    <input type="text" id="summary" name="summary">
  </div>
  <div class="form-group">
    <label for="tags">标签（逗号分隔）</label>
    <input type="text" id="tags" name="tags" placeholder="技术, 生活, 思考">
  </div>
  <div class="form-group">
    <label for="content">正文 (Markdown) *</label>
    <textarea id="content" name="content" style="min-height:400px" required></textarea>
  </div>
  <div style="display:flex;gap:0.5rem">
    <button type="submit" name="status" value="draft" class="btn">保存草稿</button>
    <button type="submit" name="status" value="published" class="btn" style="background:#28a745">发布</button>
  </div>
</form>`;

  return c.html(renderPage({
    title: '新建文章',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/posts',
  }));
});

// Create post
adminPosts.post('/', async (c) => {
  const formData = await c.req.formData();
  const title = (formData.get('title') as string).trim();
  const slug = (formData.get('slug') as string).trim();
  const summary = (formData.get('summary') as string)?.trim() || null;
  const tagsStr = (formData.get('tags') as string)?.trim() || '';
  const content = (formData.get('content') as string).trim();
  const status = (formData.get('status') as string) as 'draft' | 'published';

  const publishedAt = status === 'published' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

  const id = await createPost(c.env.DB, {
    slug, title, summary, content, cover_url: null, status, published_at: publishedAt,
  });

  if (tagsStr) {
    const tagNames = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    await setPostTags(c.env.DB, id as number, tagNames);
  }

  await invalidatePostCache(c.env.KV);
  return c.redirect('/admin/posts');
});

// Edit post form
adminPosts.get('/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'));
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.notFound();

  const tags = await getPostTags(c.env.DB, post.id);
  const tagsStr = tags.map(t => t.name).join(', ');

  const content = `
<h1>编辑文章</h1>
<form method="POST" action="/admin/posts/${post.id}">
  <div class="form-group">
    <label for="title">标题 *</label>
    <input type="text" id="title" name="title" value="${escapeHtml(post.title)}" required>
  </div>
  <div class="form-group">
    <label for="slug">Slug *</label>
    <input type="text" id="slug" name="slug" value="${escapeHtml(post.slug)}" required>
  </div>
  <div class="form-group">
    <label for="summary">摘要</label>
    <input type="text" id="summary" name="summary" value="${escapeHtml(post.summary ?? '')}">
  </div>
  <div class="form-group">
    <label for="tags">标签（逗号分隔）</label>
    <input type="text" id="tags" name="tags" value="${escapeHtml(tagsStr)}">
  </div>
  <div class="form-group">
    <label for="content">正文 (Markdown) *</label>
    <textarea id="content" name="content" style="min-height:400px" required>${escapeHtml(post.content)}</textarea>
  </div>
  <div style="display:flex;gap:0.5rem">
    <button type="submit" name="status" value="draft" class="btn">保存草稿</button>
    <button type="submit" name="status" value="published" class="btn" style="background:#28a745">发布</button>
  </div>
</form>`;

  return c.html(renderPage({
    title: '编辑文章',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/admin/posts',
  }));
});

// Update post
adminPosts.post('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const formData = await c.req.formData();
  const title = (formData.get('title') as string).trim();
  const slug = (formData.get('slug') as string).trim();
  const summary = (formData.get('summary') as string)?.trim() || null;
  const tagsStr = (formData.get('tags') as string)?.trim() || '';
  const content = (formData.get('content') as string).trim();
  const status = (formData.get('status') as string) as 'draft' | 'published';

  const existing = await getPostById(c.env.DB, id);
  if (!existing) return c.notFound();

  const publishedAt = status === 'published' && !existing.published_at
    ? new Date().toISOString().replace('T', ' ').slice(0, 19)
    : existing.published_at;

  await updatePost(c.env.DB, id, {
    slug, title, summary, content, status, published_at: publishedAt,
  });

  const tagNames = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  await setPostTags(c.env.DB, id, tagNames);

  await invalidatePostCache(c.env.KV, existing.slug);
  if (existing.slug !== slug) await invalidatePostCache(c.env.KV, slug);
  return c.redirect('/admin/posts');
});

// Delete post
adminPosts.post('/:id/delete', async (c) => {
  const id = parseInt(c.req.param('id'));
  const existing = await getPostById(c.env.DB, id);
  if (existing) {
    await deletePost(c.env.DB, id);
    await invalidatePostCache(c.env.KV, existing.slug);
  }
  return c.redirect('/admin/posts');
});

export default adminPosts;
