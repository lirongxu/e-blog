import type { Context, Next } from 'hono';
import type { Env } from './db';

const AUTH_COOKIE = 'e_blog_token';
const TOKEN_TTL = 86400; // 24h

function base64Encode(data: string): string {
  return btoa(data);
}

function base64Decode(data: string): string {
  return atob(data);
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function generateToken(password: string, secret: string): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL * 1000 });
  const encoded = base64Encode(payload);
  const signature = await hmacSign(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encoded, signature] = parts;
  const expectedSig = await hmacSign(encoded, secret);

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(base64Decode(encoded));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getTokenFromCookie(c: Context): string | null {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export function setAuthCookie(c: Context, token: string) {
  c.header('Set-Cookie', `${AUTH_COOKIE}=${token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${TOKEN_TTL}`);
}

export function clearAuthCookie(c: Context) {
  c.header('Set-Cookie', `${AUTH_COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0`);
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const token = getTokenFromCookie(c);
  if (!token) {
    return c.redirect('/admin/login');
  }

  const valid = await verifyToken(token, c.env.ADMIN_PASSWORD);
  if (!valid) {
    return c.redirect('/admin/login');
  }

  await next();
}
