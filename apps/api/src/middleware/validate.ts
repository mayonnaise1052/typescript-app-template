import { zValidator } from '@hono/zod-validator';
import type { FieldErrors } from '@typequest/shared';
import type { ValidationTargets } from 'hono';
import type { z } from 'zod';
import { HttpError } from '../lib/http-error';

/** Zod のエラーを「フィールド名 → メッセージの配列」に整形します。 */
export function toFieldErrors(error: z.core.$ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/**
 * リクエストの検証ミドルウェア。
 *
 * ジェネリクス `Target` と `Schema` を受け取り、検証後の値の型をルートハンドラへ伝えます。
 * ハンドラ側で `c.req.valid('json')` と書くと、スキーマから導かれた型が返ります。
 */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw HttpError.of(
        'VALIDATION_ERROR',
        '入力内容を確認してください',
        toFieldErrors(result.error),
      );
    }
  });
