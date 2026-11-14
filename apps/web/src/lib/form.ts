import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/**
 * フォームの各項目に対応するエラーメッセージの型（Mapped Type の例）。
 *
 * T が `{ email: string; password: string }` なら、
 * `{ email?: string; password?: string; _form?: string }` になります。
 * `_form` は、特定の項目に属さないエラー（「ログインに失敗しました」など）用です。
 */
export type FormErrors<T> = { [K in keyof T]?: string } & { _form?: string };

/** API から返ったエラーを、項目ごとのエラーメッセージに変換します。 */
export function toFormErrors<T>(error: unknown): FormErrors<T> {
  if (!(error instanceof ApiError)) return { _form: '予期しないエラーが発生しました' };

  // 項目ごとに最初のメッセージだけを採用します。
  const entries = Object.entries(error.details ?? {}).map(([key, messages]) => [key, messages[0]]);
  // Object.fromEntries の戻り値は { [k: string]: ... } に広がるため、ここで型を合わせています。
  return { ...(Object.fromEntries(entries) as FormErrors<T>), _form: error.message };
}

/**
 * API から返ったエラーを、React Hook Form のエラーとして各入力欄に表示します。
 *
 * - `fields` に挙げた項目のエラーは、その入力欄に表示する（例: 存在しないレッスン → lessonId）
 * - 項目に属さないエラーは `root.server` に入れ、フォーム全体のエラーとして表示する
 *
 * `fields` を `keyof T & Path<T>` の配列にすることで、フォームに存在しない項目名を
 * 渡すとコンパイルエラーになります。
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly (keyof T & Path<T>)[],
): void {
  const errors = toFormErrors<T>(error);
  for (const field of fields) {
    const message = errors[field];
    if (message) setError(field, { type: 'server', message });
  }
  setError('root.server', { type: 'server', message: errors._form ?? '送信に失敗しました' });
}
