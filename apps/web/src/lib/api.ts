/**
 * 型付きの API クライアント。
 *
 * `hc<AppType>()` は、API のルート定義（apps/api/src/app.ts）の型から、
 * `client.notes.$get(...)` のようなメソッドを持つオブジェクトを作ります。
 * パス・入力・応答のすべてに型が付くので、API 側を変更するとここがコンパイルエラーになります。
 *
 * `import type` なので、API のコードがブラウザ向けのファイルに混ざることはありません。
 */
import type { AppType } from '@typequest/api';
import { ApiErrorResponseSchema, type ErrorCode, type FieldErrors } from '@typequest/shared';
import { hc } from 'hono/client';

export const api = hc<AppType>(window.location.origin, {
  // Cookie は同一オリジンへのリクエストにだけ付けます。
  init: { credentials: 'same-origin' },
}).api;

/** API 呼び出しの失敗を表す例外。通信そのものの失敗は NETWORK_ERROR として扱います。 */
export class ApiError extends Error {
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly status: number;
  readonly details: FieldErrors | undefined;

  constructor(code: ApiError['code'], message: string, status: number, details?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** この関数が受け取れる「応答」の最小限の形。 */
type JsonResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

/**
 * 応答を確認し、成功なら JSON を、失敗なら ApiError を投げます。
 *
 * 戻り値の型は「渡された応答の json() が返す型」です。
 * `Awaited<ReturnType<R['json']>>` で、R から Promise の中身の型を取り出しています。
 */
export async function unwrap<R extends JsonResponse>(
  request: Promise<R>,
): Promise<Awaited<ReturnType<R['json']>>> {
  let response: R;
  try {
    response = await request;
  } catch {
    throw new ApiError('NETWORK_ERROR', 'サーバーに接続できませんでした', 0);
  }

  if (response.ok) {
    // 成功時の形は、Hono がルート定義から導いた型で保証されています。
    return (await response.json()) as Awaited<ReturnType<R['json']>>;
  }

  // エラー時の JSON は unknown として受け、スキーマで検証します。
  const body: unknown = await response.json().catch(() => null);
  const parsed = ApiErrorResponseSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    throw new ApiError(code, message, response.status, details);
  }
  throw new ApiError('INTERNAL_ERROR', 'サーバーでエラーが発生しました', response.status);
}

/** 画面に表示するエラーメッセージを取り出します。 */
export function errorMessage(error: unknown): string {
  // catch した値は unknown なので、instanceof で絞り込んでから使います。
  if (error instanceof ApiError) return error.message;
  return '予期しないエラーが発生しました';
}
