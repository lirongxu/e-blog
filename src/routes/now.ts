import { Hono } from 'hono';
import type { Env } from '../lib/db';
import { getPageBySlug } from '../lib/db';
import { getCached, setCache, pageCacheKey, CACHE_TTL } from '../lib/cache';
import { renderMarkdown } from '../lib/markdown';
import { renderPage } from '../lib/template';

const now = new Hono<{ Bindings: Env }>();

now.get('/now', async (c) => {
  const cached = await getCached(c.env.KV, pageCacheKey('now'));
  if (cached) return c.html(cached);

  const page = await getPageBySlug(c.env.DB, 'now');
  if (!page) return c.notFound();

  const content = renderMarkdown(page.content);

  const html = renderPage({
    title: page.title,
    content,
    siteTitle: c.env.SITE_TITLE,
    siteDescription: c.env.SITE_DESCRIPTION,
    currentPath: '/now',
  });

  await setCache(c.env.KV, pageCacheKey('now'), html, CACHE_TTL.page);
  return c.html(html);
});

export default now;
