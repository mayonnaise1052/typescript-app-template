import type { AppError, Result } from '@typequest/shared';
import { HttpError } from './http-error';

/**
 * サービス層の Result を HTTP の世界へ橋渡しします。
 * 成功なら値を取り出し、失敗なら HttpError を投げて app.onError に処理を任せます。
 */
export function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new HttpError(result.error);
  return result.value;
}
