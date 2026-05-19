import { Hono } from 'hono';
import type { Env } from '../lib/db';
import { getPublishedPosts } from '../lib/db';
import { getCached, setCache, rssCacheKey, CACHE_TTL } from '../lib/cache';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const rss = new Hono<{ Bindings: Env }>();

rss.get('/rss.xml', async (c) => {
  const cached = await getCached(c.env.KV, rssCacheKey);
  if (cached) {
    c.header('Content-Type', 'application/rss+xml; charset=utf-8');
    return c.body(cached);
  }

  const { posts } = await getPublishedPosts(c.env.DB, 1, 20);
  const siteUrl = new URL(c.req.url).origin;

  const items = posts.map(p => `    <item>
      <title>${escapeXml(p.title!)}</title>
      <link>${siteUrl}/blog/${escapeXml(p.slug!)}</link>
      <guid>${siteUrl}/blog/${escapeXml(p.slug!)}</guid>
      <pubDate>${new Date(p.published_at! + 'Z').toUTCString()}</pubDate>
      ${p.summary ? `<description>${escapeXml(p.summary)}</description>` : ''}
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(c.env.SITE_TITLE)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(c.env.SITE_DESCRIPTION)}</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  await setCache(c.env.KV, rssCacheKey, xml, CACHE_TTL.rss);
  c.header('Content-Type', 'application/rss+xml; charset=utf-8');
  return c.body(xml);
});

export default rss;
