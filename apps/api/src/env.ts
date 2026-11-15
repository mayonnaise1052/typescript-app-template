import type { D1Database, RateLimit } from '@cloudflare/workers-types';
import type { User } from '@typequest/shared';
import type { AppConfig } from './config/config';
import type { Services } from './services';

/**
 * Worker に渡される「バインディング」（wrangler.jsonc で宣言した DB や設定値）の型。
 * `c.env.DB` のように参照します。
 */
export type Bindings = {
  DB: D1Database;
  /** レート制限の第 1 段（wrangler.jsonc の ratelimits）。 */
  AUTH_RATE_LIMITER: RateLimit;
  PACKAGE_SEARCH_RATE_LIMITER: RateLimit;
  ALLOWED_ORIGINS?: string;
};

/**
 * ミドルウェアがリクエストごとに `c.set()` で積む値の型。`c.var.user` のように参照します。
 */
export type Variables = {
  config: AppConfig;
  services: Services;
  user: User;
};

/**
 * Hono のジェネリクスに渡す環境の型。
 * `new Hono<AppEnv>()` と書くだけで、全ルートの `c.env` と `c.var` に型が付きます。
 *
 * 関連レッスン: generics
 */
export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
