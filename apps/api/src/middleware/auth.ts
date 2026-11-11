import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { SESSION_COOKIE_NAME } from '../config/config';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

/**
 * セッション Cookie の属性。
 *   httpOnly … JavaScript から読めない（XSS でトークンを盗まれない）
 *   secure   … HTTPS でのみ送信する（http://localhost での開発時だけ無効）
 *   sameSite … 他サイトからのリクエストには付与しない（CSRF 対策の一層目）
 */
function cookieOptions(c: Context<AppEnv>) {
  return {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
  } as const;
}

export function setSessionCookie(c: Context<AppEnv>, token: string, expiresAt: Date): void {
  setCookie(c, SESSION_COOKIE_NAME, token, { ...cookieOptions(c), expires: expiresAt });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, cookieOptions(c));
}

export function getSessionToken(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}

/**
 * ログイン必須のルートに付けるミドルウェア。
 * 通過後は `c.var.user` にログイン中のユーザーが入っています。
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getSessionToken(c);
  const user = token ? await c.var.services.auth.authenticate(token) : null;
  if (!user) {
    if (token) clearSessionCookie(c);
    throw HttpError.of('UNAUTHENTICATED', 'ログインが必要です');
  }
  c.set('user', user);
  await next();
});
