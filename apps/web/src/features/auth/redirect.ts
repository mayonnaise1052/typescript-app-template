import { z } from 'zod';

/**
 * ログイン後の戻り先（`/login?redirect=...`）の検証。
 *
 * 戻り先は URL から来る「外部の入力」なので、スキーマで検証してから使います。
 * 外部サイトへ飛ばされないよう（オープンリダイレクト対策）、アプリ内のパス
 * （`/` で始まり、`//` で始まらない）だけを受け付け、それ以外は捨てます。
 */
export const SafeRedirectSchema = z
  .string()
  .refine((path) => path.startsWith('/') && !path.startsWith('//'), '外部の戻り先は使えません');

/**
 * ログイン画面・新規登録画面の検索条件。
 * `.catch(undefined)` により、不正な値は「戻り先なし」として扱い、画面はエラーにしません。
 */
export const GuestSearchSchema = z.object({
  redirect: SafeRedirectSchema.optional().catch(undefined),
});
