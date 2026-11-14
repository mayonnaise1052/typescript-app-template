import { useSuspenseQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { Link, Outlet, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { api, unwrap } from '../lib/api';
import { renderWithProviders } from '../test/render';
import { worker } from '../test/server';
import { AppErrorBoundary, RouteBoundary } from './ErrorBoundaries';

beforeEach(() => {
  // React はエラー境界で受け止めた例外もコンソールに出力します。
  // テストの出力を見やすくするために止め、記録されたことだけを確かめます。
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 描画中に例外を投げる部品。shouldThrow が true の間だけ失敗します。 */
const control = { shouldThrow: true };
function Unstable() {
  if (control.shouldThrow) throw new Error('内部の詳細なエラー（画面に出してはいけない）');
  return <p>復旧しました</p>;
}

/** 実際のアプリと同じく、メニュー付きの画面の中に RouteBoundary を置いた構成。 */
function AppShell() {
  return (
    <>
      <nav aria-label="メインメニュー">
        <Link to="/broken">壊れた画面</Link>
        <Link to="/other">別の画面</Link>
      </nav>
      <RouteBoundary>
        <Outlet />
      </RouteBoundary>
    </>
  );
}

function renderShell(route: string) {
  // renderWithProviders も RouteBoundary で包むので、ここではその内側にもう一つの構成を置きます。
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/broken" element={<Unstable />} />
        <Route path="/other" element={<h1>別の画面です</h1>} />
        <Route path="/progress" element={<ProgressView />} />
      </Route>
    </Routes>,
    { route },
  );
}

function ProgressView() {
  const { data } = useSuspenseQuery({
    queryKey: ['progress-for-test'],
    queryFn: async () => (await unwrap(api.progress.$get())).progress,
  });
  return <p>完了したレッスン: {data.completedLessons}</p>;
}

describe('RouteBoundary（画面単位のエラー境界）', () => {
  beforeEach(() => {
    control.shouldThrow = true;
  });

  it('描画中の例外を受け止め、メニューを残したままエラーを表示する', async () => {
    const screen = await renderShell('/broken');

    const alert = screen.getByRole('alert');
    await expect
      .element(alert.getByRole('heading', { name: '表示できませんでした' }))
      .toBeVisible();
    // 想定外のエラーは、内部の詳細を出さずに一般的な文言だけを表示する
    await expect.element(alert.getByText('予期しないエラーが発生しました')).toBeVisible();
    expect(alert.element().textContent).not.toContain('内部の詳細');
    // メニューは残っている
    await expect.element(screen.getByRole('link', { name: '別の画面' })).toBeVisible();
    expect(console.error).toHaveBeenCalled();
  });

  it('「再試行」で描画し直し、原因が解消していれば元の画面に戻る', async () => {
    const screen = await renderShell('/broken');
    await expect.element(screen.getByRole('alert')).toBeVisible();

    control.shouldThrow = false;
    await screen.getByRole('button', { name: '再試行' }).click();

    await expect.element(screen.getByText('復旧しました')).toBeVisible();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  });

  it('別の画面へ移動すると、エラー表示が解除される', async () => {
    const screen = await renderShell('/broken');
    await expect.element(screen.getByRole('alert')).toBeVisible();

    await screen.getByRole('link', { name: '別の画面' }).click();

    await expect.element(screen.getByRole('heading', { name: '別の画面です' })).toBeVisible();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  });

  it('データ取得の失敗では API のメッセージを表示し、「再試行」で取得し直す', async () => {
    let calls = 0;
    worker.use(
      http.get('*/api/progress', () => {
        calls++;
        if (calls === 1) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          progress: {
            completedLessons: 3,
            totalLessons: 20,
            chapters: [],
            totalAttempts: 0,
            accuracy: null,
            streakDays: 0,
            recentAttempts: [],
          },
        });
      }),
    );
    const screen = await renderShell('/progress');

    // 読み込み中 → 失敗 → API のメッセージを表示
    await expect
      .element(screen.getByRole('alert').getByText('サーバーでエラーが発生しました'))
      .toBeVisible();

    await screen.getByRole('button', { name: '再試行' }).click();

    await expect.element(screen.getByText('完了したレッスン: 3')).toBeVisible();
    expect(calls).toBe(2);
  });
});

describe('AppErrorBoundary（アプリ全体のエラー境界）', () => {
  it('どこにも受け止められなかった例外でも、画面が真っ白にならない', async () => {
    control.shouldThrow = true;

    const screen = await render(
      <AppErrorBoundary>
        <Unstable />
      </AppErrorBoundary>,
    );

    await expect.element(screen.getByRole('heading', { name: '問題が発生しました' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: '再読み込み' })).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'トップへ' }))
      .toHaveAttribute('href', '/');
  });
});
