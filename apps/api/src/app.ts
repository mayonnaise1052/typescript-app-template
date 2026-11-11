import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { createMiddleware } from 'hono/factory';
import { secureHeaders } from 'hono/secure-headers';
import { MAX_BODY_BYTES, parseConfig } from './config/config';
import { createDb } from './db/client';
import type { AppEnv } from './env';
import { handleError, handleNotFound } from './middleware/error-handler';
import { originCheck } from './middleware/origin-check';
import { authRoutes } from './routes/auth';
import { lessonRoutes } from './routes/lessons';
import { noteRoutes } from './routes/notes';
import { packageRoutes } from './routes/packages';
import { progressRoutes } from './routes/progress';
import { createServices, type ServiceDeps } from './services';

/** テストから依存を差し替えるためのオプション。本番では何も渡しません。 */
export type AppOptions = Partial<ServiceDeps>;

export function createApp(options: AppOptions = {}) {
  const deps: ServiceDeps = {
    fetch: options.fetch ?? ((input, init) => fetch(input, init)),
    now: options.now ?? (() => new Date()),
  };

  /** リクエストごとに設定とサービスを組み立て、`c.var` に積みます。 */
  const setup = createMiddleware<AppEnv>(async (c, next) => {
    c.set('config', parseConfig(c.env));
    c.set('services', createServices(createDb(c.env.DB), deps));
    // API の応答には個人のデータが含まれるので、ブラウザや中継サーバーにキャッシュさせません。
    c.header('Cache-Control', 'no-store');
    await next();
  });

  const app = new Hono<AppEnv>().basePath('/api');

  app.use(
    secureHeaders({
      // API は JSON しか返さないので、何も読み込ませず、どこにも埋め込ませません。
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    }),
  );
  app.use(bodyLimit({ maxSize: MAX_BODY_BYTES }));
  app.use(setup);
  app.use(originCheck);

  app.onError(handleError);
  app.notFound(handleNotFound);

  // ルートを登録した結果を返します。この戻り値の型に、全エンドポイントの
  // パス・入力・出力の情報が含まれています。
  return app
    .get('/health', (c) => c.json({ status: 'ok' }, 200))
    .route('/auth', authRoutes)
    .route('/lessons', lessonRoutes)
    .route('/progress', progressRoutes)
    .route('/notes', noteRoutes)
    .route('/packages', packageRoutes);
}

/**
 * API 全体の型。フロントエンドはこれを `import type` して、型付きクライアントを作ります
 * （apps/web/src/lib/api.ts）。型だけの import なので、API のコードがブラウザ向けの
 * バンドルに混ざることはありません。
 */
export type AppType = ReturnType<typeof createApp>;
