import { LoginInputSchema, RegisterInputSchema } from '@typequest/shared';
import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { unwrap } from '../lib/unwrap';
import {
  clearSessionCookie,
  getSessionToken,
  requireAuth,
  setSessionCookie,
} from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';

/**
 * Route 層: HTTP の入出力だけを担当します。
 *   1. 入力を検証する（validate）
 *   2. サービスを呼ぶ
 *   3. 結果を JSON で返す
 * ビジネスロジックはここに書きません。
 *
 * メソッドチェーンでつなげて書くのは、Hono が全ルートの型を 1 つの型として
 * 積み上げられるようにするためです（フロントの型付きクライアントがこれを使います）。
 */
export const authRoutes = new Hono<AppEnv>()
  .post('/register', rateLimit('auth'), validate('json', RegisterInputSchema), async (c) => {
    const session = unwrap(await c.var.services.auth.register(c.req.valid('json')));
    setSessionCookie(c, session.token, session.expiresAt);
    return c.json({ user: session.user }, 201);
  })
  .post('/login', rateLimit('auth'), validate('json', LoginInputSchema), async (c) => {
    const session = unwrap(await c.var.services.auth.login(c.req.valid('json')));
    setSessionCookie(c, session.token, session.expiresAt);
    return c.json({ user: session.user }, 200);
  })
  .post('/logout', async (c) => {
    const token = getSessionToken(c);
    if (token) await c.var.services.auth.logout(token);
    clearSessionCookie(c);
    return c.json({ ok: true }, 200);
  })
  .get('/me', requireAuth, (c) => c.json({ user: c.var.user }, 200));
