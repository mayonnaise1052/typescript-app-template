import { err, ok, type FieldErrors, type Result } from '@typequest/shared';
import type { z } from 'zod';
import { ApiError } from './api';

/**
 * フォームの各項目に対応するエラーメッセージの型（Mapped Type の例）。
 *
 * T が `{ email: string; password: string }` なら、
 * `{ email?: string; password?: string; _form?: string }` になります。
 * `_form` は、特定の項目に属さないエラー（「ログインに失敗しました」など）用です。
 */
export type FormErrors<T> = { [K in keyof T]?: string } & { _form?: string };

function fromFieldErrors<T>(fields: FieldErrors): FormErrors<T> {
  // 項目ごとに最初のメッセージだけを採用します。
  const entries = Object.entries(fields).map(([key, messages]) => [key, messages[0]] as const);
  // Object.fromEntries の戻り値は { [k: string]: ... } に広がるため、ここで型を合わせています。
  return Object.fromEntries(entries) as FormErrors<T>;
}

/**
 * 入力値をスキーマで検証します。API と同じスキーマを使うので、
 * 「画面では通ったのにサーバーで弾かれる」という食い違いが起きません。
 */
export function validateForm<Schema extends z.ZodType>(
  schema: Schema,
  values: unknown,
): Result<z.infer<Schema>, FormErrors<z.input<Schema>>> {
  const parsed = schema.safeParse(values);
  if (parsed.success) return ok(parsed.data);

  const fields: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    (fields[key] ??= []).push(issue.message);
  }
  return err(fromFieldErrors(fields));
}

/** API から返ったエラーを、フォームのエラー表示用に変換します。 */
export function toFormErrors<T>(error: unknown): FormErrors<T> {
  if (error instanceof ApiError) {
    if (error.details) return { ...fromFieldErrors<T>(error.details), _form: error.message };
    return { _form: error.message };
  }
  return { _form: '予期しないエラーが発生しました' };
}
