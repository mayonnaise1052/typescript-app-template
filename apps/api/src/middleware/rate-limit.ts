import { createMiddleware } from 'hono/factory';
import { RATE_LIMITS, type RateLimitName } from '../config/config';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

const rateLimited = () =>
  HttpError.of('RATE_LIMITED', 'リクエストが多すぎます。しばらく待ってからもう一度お試しください');

/**
 * レート制限ミドルウェア。総当たり攻撃（パスワードの試行など）や大量のリクエストを止めます。
 * Cloudflare が付与する CF-Connecting-IP ヘッダーで接続元を識別します。
 *
 * 二段構えで判定します（docs/specs/0004-edge-rate-limiting.md）。
 * 1. Cloudflare の Rate Limiting バインディング: 拠点の中で数えるので速く、D1 を使わない。
 *    数はおおよそなので、上限を緩めにして大量の攻撃だけを止める
 * 2. D1 のカウンター: 拠点をまたいで正確に数える。第 1 段を通ったリクエストだけを数えるので、
 *    攻撃を受けても D1 の書き込みが増えすぎない
 *
 * どちらで止めても同じ応答を返し、どの段で止めたかを外から分からないようにします。
 */
export const rateLimit = (name: RateLimitName) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const clientKey = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const { windowSeconds, edgeBinding } = RATE_LIMITS[name];

    // 第 1 段。バインディングは対象ごとに別なので、鍵は接続元だけで足ります。
    const edge = await c.env[edgeBinding].limit({ key: clientKey });
    if (!edge.success) {
      // 第 1 段の数え直しの時刻は分からないので、数える期間をまるごと待ってもらいます。
      c.header('Retry-After', String(windowSeconds));
      throw rateLimited();
    }

    // 第 2 段。
    const decision = await c.var.services.rateLimit.check(name, clientKey);
    if (!decision.allowed) {
      c.header('Retry-After', String(decision.retryAfterSeconds));
      throw rateLimited();
    }
    await next();
  });
