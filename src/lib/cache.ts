import type { Env } from './db';

const CACHE_PREFIX = {
  post: 'cache:post:',
  postList: 'cache:post:list:',
  page: 'cache:page:',
  rss: 'cache:rss',
} as const;

const CACHE_TTL = {
  post: 3600,       // 1h
  postList: 1800,   // 30min
  page: 3600,       // 1h
  rss: 3600,        // 1h
} as const;

export async function getCached(kv: KVNamespace, key: string): Promise<string | null> {
  return kv.get(key);
}

export async function setCache(kv: KVNamespace, key: string, value: string, ttlSeconds?: number): Promise<void> {
  await kv.put(key, value, { expirationTtl: ttlSeconds });
}

export async function deleteCache(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key);
}

export async function deleteCacheByPrefix(kv: KVNamespace, prefix: string): Promise<void> {
  const list = await kv.list({ prefix });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}

export function postCacheKey(slug: string) {
  return `${CACHE_PREFIX.post}${slug}`;
}

export function postListCacheKey(page: number, tag?: string) {
  return tag ? `${CACHE_PREFIX.postList}${page}:tag:${tag}` : `${CACHE_PREFIX.postList}${page}`;
}

export function pageCacheKey(slug: string) {
  return `${CACHE_PREFIX.page}${slug}`;
}

export const rssCacheKey = CACHE_PREFIX.rss;

export async function invalidatePostCache(kv: KVNamespace, slug?: string) {
  if (slug) {
    await deleteCache(kv, postCacheKey(slug));
  }
  await deleteCacheByPrefix(kv, CACHE_PREFIX.postList);
  await deleteCache(kv, rssCacheKey);
}

export async function invalidatePageCache(kv: KVNamespace, slug: string) {
  await deleteCache(kv, pageCacheKey(slug));
}

export { CACHE_TTL };
