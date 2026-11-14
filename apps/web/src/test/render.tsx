import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { render } from 'vitest-browser-react';
import { RouteBoundary } from '../components/ErrorBoundaries';

/**
 * 画面のコンポーネントは Router と QueryClient が無いと動かないため、
 * テスト用にそれらで包んで、本物のブラウザの中に描画するヘルパーです。
 * 実際のアプリと同じく、画面を RouteBoundary（エラー表示と読み込み中の表示）で包みます。
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    // テストでは失敗をすぐ確認したいので、リトライしません。
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <RouteBoundary>{ui}</RouteBoundary>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
