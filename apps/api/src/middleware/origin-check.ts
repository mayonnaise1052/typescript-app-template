import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF（クロスサイトリクエストフォージェリ）対策。
 *
 * Cookie はブラウザが自動で送るため、悪意あるサイトがユーザーのブラウザに
 * 「このアプリへの POST」を送らせると、ログイン済みの権限で実行されてしまいます。
 * ブラウザは状態を変更するリクエストに必ず Origin ヘッダーを付けるので、
 * それが自分自身のオリジン（または許可リスト）と一致するときだけ受け付けます。
 */
export const originCheck = createMiddleware<AppEnv>(async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header('Origin');
    const ownOrigin = new URL(c.req.url).origin;
    const allowed = origin === ownOrigin || c.var.config.allowedOrigins.includes(origin ?? '');
    if (!origin || !allowed) {
      throw HttpError.of('FORBIDDEN', '許可されていないオリジンからのリクエストです');
    }
  }
  await next();
});
