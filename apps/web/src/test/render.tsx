import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from 'vitest-browser-react';
import { createAppRouter } from '../router';

/** テスト用の QueryClient。失敗をすぐ確認したいので、リトライしません。 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/**
 * アプリ本体と同じルート定義（routeTree）で、指定した URL を開いた状態を描画します。
 *
 * 履歴はブラウザのものではなくメモリ上のもの（createMemoryHistory）を使うので、
 * テストごとに独立した状態で始められます。認証の確認（beforeLoad）や
 * 表示前のデータ取得（loader）、検索条件の検証も、本番と同じように動きます。
 * API の応答は各テストが MSW（worker.use）で用意します。
 */
export async function renderApp(url: string) {
  const queryClient = createTestQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [url] }),
    preloadOnIntent: false,
  });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { screen, router, queryClient };
}
