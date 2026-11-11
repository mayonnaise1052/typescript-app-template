import { appError, type AppError, type ErrorCode, type FieldErrors } from '@typequest/shared';

/**
 * ルートから投げる例外。app.onError がこれを受け取り、決まった形の JSON に変換します。
 *
 * サービス層は Result 型でエラーを「返し」、HTTP の境界（ルート）でだけ例外に変換する、
 * という役割分担にしています。
 */
export class HttpError extends Error {
  readonly appError: AppError;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'HttpError';
    this.appError = error;
  }

  static of(code: ErrorCode, message: string, details?: FieldErrors): HttpError {
    return new HttpError(appError(code, message, details));
  }
}
