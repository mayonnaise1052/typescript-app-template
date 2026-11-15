import { z } from 'zod';
import type { RateLimit } from '@cloudflare/workers-types';
import type { Bindings } from '../env';

/**
 * 環境変数は「外部からの入力」なので、起動時にスキーマで検証します。
 * 不正な設定のまま動き続けるより、すぐに失敗するほうが安全です。
 */
const ConfigSchema = z.object({
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.url())),
});

export type AppConfig = {
  readonly allowedOrigins: readonly string[];
};

export function parseConfig(env: { ALLOWED_ORIGINS?: string | undefined }): AppConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`環境変数の設定が不正です: ${z.prettifyError(parsed.error)}`);
  }
  return { allowedOrigins: parsed.data.ALLOWED_ORIGINS };
}

/** アプリ全体で使う定数。マジックナンバーを散らばらせないために 1 か所へ集めます。 */
export const SESSION_COOKIE_NAME = 'tq_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_BOOKMARKS_PER_USER = 100;
export const MAX_NOTES_PER_USER = 1000;
export const PACKAGE_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * レート制限の設定。`satisfies` で形を検査しつつ、キー名はリテラル型のまま保ちます。
 *
 * - limit / windowSeconds: 第 2 段（D1 のカウンター）の上限と、数える期間の秒数
 * - edgeBinding: 第 1 段で使う Rate Limiting バインディングの名前。上限は wrangler.jsonc に書きます
 *
 * `edgeBinding` の型を `RateLimitBindingName` にしているので、存在しないバインディング名を
 * 書くと型エラーになります。
 */
export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 60, edgeBinding: 'AUTH_RATE_LIMITER' },
  packageSearch: { limit: 30, windowSeconds: 60, edgeBinding: 'PACKAGE_SEARCH_RATE_LIMITER' },
} as const satisfies Record<
  string,
  { limit: number; windowSeconds: number; edgeBinding: RateLimitBindingName }
>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Bindings のうち、Rate Limiting バインディングの名前だけを取り出した型。
 * 「値の型が RateLimit であるキー」を、マップ型と条件型で絞り込んでいます。
 *
 * 関連レッスン: mapped-types, conditional-types
 */
export type RateLimitBindingName = {
  [K in keyof Bindings]: Bindings[K] extends RateLimit ? K : never;
}[keyof Bindings];
