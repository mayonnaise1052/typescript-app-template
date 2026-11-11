import { z } from 'zod';

/**
 * アプリ全体で使うエラーコード。
 *
 * `as const` を付けると、string[] ではなく「この 8 個の文字列リテラルのタプル」として
 * 推論されます。そこから `(typeof ERROR_CODES)[number]` でユニオン型を取り出します。
 *
 * 関連レッスン: as-const-and-satisfies, keyof-typeof
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EXTERNAL_SERVICE_ERROR',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * エラーコード → HTTP ステータスの対応表。
 *
 * `satisfies Record<ErrorCode, number>` により「全コードを網羅しているか」を検査しつつ、
 * 値の型は 400 や 404 といったリテラルのまま保たれます（型注釈だと number に広がる）。
 */
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EXTERNAL_SERVICE_ERROR: 502,
  INTERNAL_ERROR: 500,
} as const satisfies Record<ErrorCode, number>;

export type ErrorStatus = (typeof ERROR_STATUS)[ErrorCode];

/** フィールド名 → エラーメッセージの配列 */
export type FieldErrors = Record<string, string[]>;

export type AppError = {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: FieldErrors;
};

export function appError(code: ErrorCode, message: string, details?: FieldErrors): AppError {
  return details ? { code, message, details } : { code, message };
}

/** API がエラー時に返す JSON の形。フロント側でもこのスキーマで検証します。 */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
