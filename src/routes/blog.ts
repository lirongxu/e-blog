import { Hono } from 'hono';
import type { Env } from '../lib/db';
import {
  getPublishedPosts, getPostBySlug, getAdjacentPosts,
  getPostTags, getTagsByPostIds, getAllTags, getPostsByTag,
} from '../lib/db';
import { getCached, setCache, postCacheKey, postListCacheKey, CACHE_TTL } from '../lib/cache';
import { renderMarkdown } from '../lib/markdown';
import { renderPage } from '../lib/template';
import { escapeHtml, formatDate } from './helpers';

const blog = new Hono<{ Bindings: Env }>();

// Blog list
blog.get('/blog', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const tag = c.req.query('tag') ?? undefined;

  const cacheKey = postListCacheKey(page, tag);
  const cached = await getCached(c.env.KV, cacheKey);
  if (cached) return c.html(cached);

  const result = tag
    ? await getPostsByTag(c.env.DB, tag, page)
    : await getPublishedPosts(c.env.DB, page);

  const postIds = result.posts.map(p => p.id!);
  const tagsMap = await getTagsByPostIds(c.env.DB, postIds);
  const allTags = await getAllTags(c.env.DB);

  const tagsFilterHtml = allTags.length > 0
    ? `<div class="tags" style="margin-bottom:1.5rem">
  ${allTags.map(t =>
    tag === t.name
      ? `<span class="tag" style="background:var(--accent);color:#fff">${escapeHtml(t.name)}</span>`
      : `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="tag">${escapeHtml(t.name)}</a>`
  ).join(' ')}
  ${tag ? '<a href="/blog" class="tag" style="background:var(--border)">清除筛选</a>' : ''}
</div>`
    : '';

  const postsHtml = result.posts.length > 0
    ? `<ul class="post-list">
  ${result.posts.map(p => {
    const tags = tagsMap.get(p.id!) ?? [];
    const tagsHtml = tags.length > 0
      ? `<div class="tags">${tags.map(t => `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="tag">${escapeHtml(t.name)}</a>`).join(' ')}</div>`
      : '';
    return `<li class="post-item">
    <h2><a href="/blog/${escapeHtml(p.slug!)}">${escapeHtml(p.title!)}</a></h2>
    <div class="post-meta">${formatDate(p.published_at!)}</div>
    ${tagsHtml}
    ${p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : ''}
  </li>`;
  }).join('\n  ')}
</ul>`
    : '<p>暂无文章。</p>';

  // Pagination
  let paginationHtml = '';
  if (result.totalPages > 1) {
    const pages: string[] = [];
    const base = tag ? `/blog?tag=${encodeURIComponent(tag)}&` : '/blog?';
    for (let i = 1; i <= result.totalPages; i++) {
      if (i === page) {
        pages.push(`<span class="current">${i}</span>`);
      } else {
        pages.push(`<a href="${base}page=${i}">${i}</a>`);
      }
    }
    paginationHtml = `<div class="pagination">${pages.join('\n')}</div>`;
  }

  const content = `
<h1>博客</h1>
${tagsFilterHtml}
${postsHtml}
${paginationHtml}`;

  const html = renderPage({
    title: '博客',
    description: '所有文章',
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/blog',
  });

  await setCache(c.env.KV, cacheKey, html, CACHE_TTL.postList);
  return c.html(html);
});

// Blog detail
blog.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug');

  const cached = await getCached(c.env.KV, postCacheKey(slug));
  if (cached) return c.html(cached);

  const post = await getPostBySlug(c.env.DB, slug);
  if (!post || post.status !== 'published') {
    return c.notFound();
  }

  const tags = await getPostTags(c.env.DB, post.id);
  const { prev, next } = await getAdjacentPosts(c.env.DB, post.published_at!);
  const htmlContent = renderMarkdown(post.content);

  const tagsHtml = tags.length > 0
    ? `<div class="tags">${tags.map(t => `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="tag">${escapeHtml(t.name)}</a>`).join(' ')}</div>`
    : '';

  let adjacentHtml = '';
  if (prev || next) {
    adjacentHtml = `<div class="adjacent-posts">
  ${prev ? `<a href="/blog/${escapeHtml(prev.slug)}"><span class="label">← 上一篇</span>${escapeHtml(prev.title)}</a>` : '<span></span>'}
  ${next ? `<a href="/blog/${escapeHtml(next.slug)}" style="text-align:right"><span class="label">下一篇 →</span>${escapeHtml(next.title)}</a>` : '<span></span>'}
</div>`;
  }

  const content = `
<article>
  <div class="post-header">
    <h1>${escapeHtml(post.title)}</h1>
    <div class="post-meta">${formatDate(post.published_at!)}</div>
    ${tagsHtml}
  </div>
  <div class="post-content">${htmlContent}</div>
  ${adjacentHtml}
</article>`;

  const html = renderPage({
    title: post.title,
    description: post.summary ?? undefined,
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/blog',
  });

  await setCache(c.env.KV, postCacheKey(slug), html, CACHE_TTL.post);
  return c.html(html);
});

export default blog;
