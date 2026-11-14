import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { RouteErrorFallback, RouteNotFound, RoutePending } from './components/ErrorBoundaries';
import { routeTree } from './routeTree.gen';

/** すべてのルートの beforeLoad / loader から使える値（ルーターのコンテキスト）。 */
export type RouterContext = {
  queryClient: QueryClient;
};

type CreateAppRouterOptions = {
  queryClient: QueryClient;
  /** テストではメモリ上の履歴（createMemoryHistory）を渡します。省略するとブラウザの履歴を使います。 */
  history?: RouterHistory;
  /**
   * リンクにマウスを乗せた時点で移動先のデータを取得し始めるか。既定は有効。
   * テストでは、マウスの位置によって API 呼び出しが変わらないよう無効にします。
   */
  preloadOnIntent?: boolean;
};

/**
 * ルーターを作ります。アプリ本体（main.tsx）とテストが同じ設定を使うため、関数にしています。
 *
 * `routeTree` は src/routes/ のファイルから自動生成された、型付きのルート一覧です。
 */
export function createAppRouter({
  queryClient,
  history,
  preloadOnIntent = true,
}: CreateAppRouterOptions) {
  return createRouter({
    routeTree,
    context: { queryClient },
    ...(history && { history }),
    // リンクにマウスを乗せた時点で、移動先の loader（データの取得）を始めます。
    defaultPreload: preloadOnIntent ? 'intent' : false,
    // データの新しさの管理は TanStack Query に任せるので、ルーター側ではキャッシュしません。
    defaultPreloadStaleTime: 0,
    // 画面を移動したら先頭へスクロールし、戻る・進むでは元の位置を復元します。
    scrollRestoration: true,
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteErrorFallback,
    defaultNotFoundComponent: RouteNotFound,
  });
}

/**
 * ルーターの型をライブラリに登録します（宣言のマージ）。
 * これで `<Link to="...">` や `useNavigate()` が、このアプリに存在する URL だけを受け付けるようになります。
 */
declare module '@tanstack/react-router' {
  // 宣言のマージができるのは interface だけなので、ここでは type ではなく interface を使います。
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
