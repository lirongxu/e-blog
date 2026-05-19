import { Hono } from 'hono';
import type { Env } from '../lib/db';
import { getPublishedPosts, getTagsByPostIds } from '../lib/db';
import { getCached, setCache, postListCacheKey, CACHE_TTL } from '../lib/cache';
import { renderPage } from '../lib/template';
import { escapeHtml, formatDate } from './helpers';

const home = new Hono<{ Bindings: Env }>();

home.get('/', async (c) => {
  const cached = await getCached(c.env.KV, postListCacheKey(1));
  if (cached) return c.html(cached);

  const { posts } = await getPublishedPosts(c.env.DB, 1, 5);
  const postIds = posts.map(p => p.id!);
  const tagsMap = await getTagsByPostIds(c.env.DB, postIds);

  const postsHtml = posts.length > 0
    ? `<ul class="post-list">
  ${posts.map(p => {
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
</ul>
<p><a href="/blog">查看全部文章 →</a></p>`
    : '<p>暂无文章。</p>';

  const content = `
<p>Hi, 欢迎来到我的博客。</p>
${postsHtml}`;

  const html = renderPage({
    title: c.env.SITE_TITLE,
    description: c.env.SITE_DESCRIPTION,
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/',
  });

  await setCache(c.env.KV, postListCacheKey(1), html, CACHE_TTL.postList);
  return c.html(html);
});

export default home;
