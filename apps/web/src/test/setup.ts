// vitest-browser-react の型（page.render など）を読み込みます。
import 'vitest-browser-react';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { worker } from './server';

/** 偽の応答を登録していないのに呼ばれた API。テストの最後に空であることを確かめます。 */
const unhandledApiRequests: string[] = [];

/** MSW から渡される値（unknown）が、HTTP のリクエストを持っているかを確かめる型ガード。 */
function hasRequest(data: unknown): data is { request: Request } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'request' in data &&
    data.request instanceof Request
  );
}

beforeAll(async () => {
  await worker.start({
    quiet: true,
    // ブラウザでは、テスト用のスクリプトや画像の読み込みも Service Worker を通ります。
    // それらは素通しし、/api/ への未登録の呼び出しだけを記録してテストを失敗させます。
    onUnhandledFrame: ({ frame }) => {
      if (frame.protocol !== 'http' || !hasRequest(frame.data)) return;
      const url = new URL(frame.data.request.url);
      if (url.pathname.startsWith('/api/')) {
        unhandledApiRequests.push(`${frame.data.request.method} ${url.pathname}`);
      }
    },
  });
});

afterEach(() => {
  worker.resetHandlers();
  const calls = unhandledApiRequests.splice(0);
  expect(calls, '偽の応答を登録していない API が呼ばれました').toEqual([]);
});

afterAll(async () => {
  await worker.stop();
});
