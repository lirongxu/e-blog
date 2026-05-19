export interface Post {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  cover_url: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
  sort_order: number;
  updated_at: string;
}

export interface GuestbookEntry {
  id: number;
  name: string;
  email: string | null;
  website: string | null;
  message: string;
  is_approved: number;
  created_at: string;
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  SITE_TITLE: string;
  SITE_DESCRIPTION: string;
  ADMIN_PASSWORD: string;
}

// --- Posts ---

export async function getPublishedPosts(db: D1Database, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const { results } = await db.prepare(
    'SELECT id, slug, title, summary, cover_url, status, created_at, updated_at, published_at FROM posts WHERE status = ? ORDER BY published_at DESC LIMIT ? OFFSET ?'
  ).bind('published', pageSize, offset).all<Partial<Post>>();

  const { total } = await db.prepare(
    'SELECT COUNT(*) as total FROM posts WHERE status = ?'
  ).bind('published').first<{ total: number }>() ?? { total: 0 };

  return { posts: results, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPostBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM posts WHERE slug = ?').bind(slug).first<Post>();
}

export async function getPostById(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<Post>();
}

export async function getAllPosts(db: D1Database) {
  const { results } = await db.prepare(
    'SELECT id, slug, title, summary, status, created_at, updated_at, published_at FROM posts ORDER BY created_at DESC'
  ).all<Partial<Post>>();
  return results;
}

export async function createPost(db: D1Database, post: Omit<Post, 'id' | 'created_at' | 'updated_at'>) {
  const result = await db.prepare(
    'INSERT INTO posts (slug, title, summary, content, cover_url, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(post.slug, post.title, post.summary, post.content, post.cover_url, post.status, post.published_at).run();
  return result.meta.last_row_id;
}

export async function updatePost(db: D1Database, id: number, post: Partial<Omit<Post, 'id' | 'created_at'>>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (post.title !== undefined) { fields.push('title = ?'); values.push(post.title); }
  if (post.slug !== undefined) { fields.push('slug = ?'); values.push(post.slug); }
  if (post.summary !== undefined) { fields.push('summary = ?'); values.push(post.summary); }
  if (post.content !== undefined) { fields.push('content = ?'); values.push(post.content); }
  if (post.cover_url !== undefined) { fields.push('cover_url = ?'); values.push(post.cover_url); }
  if (post.status !== undefined) { fields.push('status = ?'); values.push(post.status); }
  if (post.published_at !== undefined) { fields.push('published_at = ?'); values.push(post.published_at); }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deletePost(db: D1Database, id: number) {
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

export async function getAdjacentPosts(db: D1Database, publishedAt: string) {
  const prev = await db.prepare(
    "SELECT slug, title FROM posts WHERE status = 'published' AND published_at < ? ORDER BY published_at DESC LIMIT 1"
  ).bind(publishedAt).first<{ slug: string; title: string }>();

  const next = await db.prepare(
    "SELECT slug, title FROM posts WHERE status = 'published' AND published_at > ? ORDER BY published_at ASC LIMIT 1"
  ).bind(publishedAt).first<{ slug: string; title: string }>();

  return { prev, next };
}

// --- Tags ---

export async function getPostTags(db: D1Database, postId: number) {
  const { results } = await db.prepare(
    'SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?'
  ).bind(postId).all<Tag>();
  return results;
}

export async function getTagsByPostIds(db: D1Database, postIds: number[]) {
  if (postIds.length === 0) return new Map<number, Tag[]>();
  const placeholders = postIds.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT pt.post_id, t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id IN (${placeholders})`
  ).bind(...postIds).all<{ post_id: number } & Tag>();

  const map = new Map<number, Tag[]>();
  for (const r of results) {
    if (!map.has(r.post_id)) map.set(r.post_id, []);
    map.get(r.post_id)!.push({ id: r.id, name: r.name });
  }
  return map;
}

export async function getAllTags(db: D1Database) {
  const { results } = await db.prepare('SELECT id, name FROM tags ORDER BY name').all<Tag>();
  return results;
}

export async function getOrCreateTag(db: D1Database, name: string) {
  const existing = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(name).first<{ id: number }>();
  if (existing) return existing.id;
  const result = await db.prepare('INSERT INTO tags (name) VALUES (?)').bind(name).run();
  return result.meta.last_row_id as number;
}

export async function setPostTags(db: D1Database, postId: number, tagNames: string[]) {
  await db.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId).run();
  for (const name of tagNames) {
    const tagId = await getOrCreateTag(db, name);
    await db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').bind(postId, tagId).run();
  }
}

export async function getPostsByTag(db: D1Database, tagName: string, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const { results } = await db.prepare(
    `SELECT p.id, p.slug, p.title, p.summary, p.cover_url, p.status, p.created_at, p.updated_at, p.published_at
     FROM posts p JOIN post_tags pt ON p.id = pt.post_id JOIN tags t ON t.id = pt.tag_id
     WHERE p.status = 'published' AND t.name = ? ORDER BY p.published_at DESC LIMIT ? OFFSET ?`
  ).bind(tagName, pageSize, offset).all<Partial<Post>>();

  const { total } = await db.prepare(
    `SELECT COUNT(*) as total FROM posts p JOIN post_tags pt ON p.id = pt.post_id JOIN tags t ON t.id = pt.tag_id
     WHERE p.status = 'published' AND t.name = ?`
  ).bind(tagName).first<{ total: number }>() ?? { total: 0 };

  return { posts: results, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// --- Pages ---

export async function getPageBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first<Page>();
}

export async function getAllPages(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM pages ORDER BY sort_order').all<Page>();
  return results;
}

export async function updatePage(db: D1Database, id: number, data: Partial<Pick<Page, 'title' | 'content' | 'sort_order'>>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
}

// --- Guestbook ---

export async function getApprovedGuestbook(db: D1Database) {
  const { results } = await db.prepare(
    'SELECT * FROM guestbook WHERE is_approved = 1 ORDER BY created_at DESC'
  ).all<GuestbookEntry>();
  return results;
}

export async function getAllGuestbook(db: D1Database) {
  const { results } = await db.prepare(
    'SELECT * FROM guestbook ORDER BY created_at DESC'
  ).all<GuestbookEntry>();
  return results;
}

export async function createGuestbookEntry(db: D1Database, entry: Omit<GuestbookEntry, 'id' | 'is_approved' | 'created_at'>) {
  await db.prepare(
    'INSERT INTO guestbook (name, email, website, message) VALUES (?, ?, ?, ?)'
  ).bind(entry.name, entry.email, entry.website, entry.message).run();
}

export async function approveGuestbookEntry(db: D1Database, id: number) {
  await db.prepare('UPDATE guestbook SET is_approved = 1 WHERE id = ?').bind(id).run();
}

export async function deleteGuestbookEntry(db: D1Database, id: number) {
  await db.prepare('DELETE FROM guestbook WHERE id = ?').bind(id).run();
}

// --- Stats ---

export async function getPostCount(db: D1Database) {
  const { total } = await db.prepare('SELECT COUNT(*) as total FROM posts').first<{ total: number }>() ?? { total: 0 };
  return total;
}

export async function getPublishedPostCount(db: D1Database) {
  const { total } = await db.prepare("SELECT COUNT(*) as total FROM posts WHERE status = 'published'").first<{ total: number }>() ?? { total: 0 };
  return total;
}

export async function getPendingGuestbookCount(db: D1Database) {
  const { total } = await db.prepare('SELECT COUNT(*) as total FROM guestbook WHERE is_approved = 0').first<{ total: number }>() ?? { total: 0 };
  return total;
}
