import { RATE_LIMITS, type RateLimitName } from '../config/config';
import type { RateLimitRepository } from '../repositories/rate-limit-repository';

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Deps = { rateLimits: RateLimitRepository; now: () => Date };

/**
 * 固定ウィンドウ方式のレート制限。
 * 時間を windowSeconds ごとの区間に区切り、区間内のリクエスト数が上限を超えたら拒否します。
 */
export function createRateLimitService({ rateLimits, now }: Deps) {
  return {
    async check(name: RateLimitName, clientKey: string): Promise<RateLimitDecision> {
      const { limit, windowSeconds } = RATE_LIMITS[name];
      const nowSeconds = Math.floor(now().getTime() / 1000);
      const windowStart = nowSeconds - (nowSeconds % windowSeconds);

      const count = await rateLimits.increment(`${name}:${clientKey}`, windowStart);
      if (count <= limit) return { allowed: true };
      return { allowed: false, retryAfterSeconds: windowStart + windowSeconds - nowSeconds };
    },
  };
}

export type RateLimitService = ReturnType<typeof createRateLimitService>;
