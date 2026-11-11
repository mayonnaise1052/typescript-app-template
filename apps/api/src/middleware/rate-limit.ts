import { createMiddleware } from 'hono/factory';
import type { RateLimitName } from '../config/config';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

/**
 * レート制限ミドルウェア。総当たり攻撃（パスワードの試行など）を遅らせます。
 * Cloudflare が付与する CF-Connecting-IP ヘッダーで接続元を識別します。
 */
export const rateLimit = (name: RateLimitName) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const clientKey = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const decision = await c.var.services.rateLimit.check(name, clientKey);
    if (!decision.allowed) {
      c.header('Retry-After', String(decision.retryAfterSeconds));
      throw HttpError.of(
        'RATE_LIMITED',
        'リクエストが多すぎます。しばらく待ってからもう一度お試しください',
      );
    }
    await next();
  });
