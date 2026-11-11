import { z } from 'zod';

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

/** レート制限の設定。`satisfies` で形を検査しつつ、キー名はリテラル型のまま保ちます。 */
export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 60 },
  packageSearch: { limit: 30, windowSeconds: 60 },
} as const satisfies Record<string, { limit: number; windowSeconds: number }>;

export type RateLimitName = keyof typeof RATE_LIMITS;
