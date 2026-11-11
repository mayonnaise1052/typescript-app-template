import { ERROR_STATUS, type ApiErrorResponse } from '@typequest/shared';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

/**
 * すべてのエラーを 1 か所で受け、決まった形の JSON に変換します。
 *
 * 想定外のエラーの詳細（スタックトレースや SQL など）はログにだけ出し、
 * クライアントには一般的なメッセージしか返しません。内部情報は攻撃の手がかりになるためです。
 */
export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof HttpError) {
    const body: ApiErrorResponse = { error: error.appError };
    return c.json(body, ERROR_STATUS[error.appError.code]);
  }

  // Hono 組み込みのミドルウェア（bodyLimit など）が投げる例外
  if (error instanceof HTTPException) {
    const body: ApiErrorResponse = {
      error: { code: 'VALIDATION_ERROR', message: 'リクエストを処理できませんでした' },
    };
    return c.json(body, error.status);
  }

  console.error('Unhandled error:', error);
  const body: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' },
  };
  return c.json(body, 500);
};

export const handleNotFound: NotFoundHandler<AppEnv> = (c) => {
  const body: ApiErrorResponse = {
    error: { code: 'NOT_FOUND', message: '指定された API は存在しません' },
  };
  return c.json(body, 404);
};
