import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { authHandlers, testLesson } from '../test/fixtures';
import { renderApp } from '../test/render';
import { worker } from '../test/server';
import { AppErrorBoundary } from './ErrorBoundaries';

beforeEach(() => {
  // React はエラー境界で受け止めた例外もコンソールに出力します。
  // テストの出力を見やすくするために止め、記録されたことだけを確かめます。
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const progress = {
  completedLessons: 3,
  totalLessons: 20,
  chapters: [],
  totalAttempts: 0,
  accuracy: null,
  streakDays: 0,
  recentAttempts: [],
};

describe('画面単位のエラー表示（ルーターの errorComponent）', () => {
  it('存在しないレッスンでは API のメッセージを表示し、メニューから移動すると解除される', async () => {
    worker.use(
      authHandlers.signedIn(),
      http.get('*/api/lessons/:lessonId', () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'レッスンが見つかりません' } },
          { status: 404 },
        ),
      ),
      http.get('*/api/lessons', () => HttpResponse.json({ lessons: [testLesson] })),
    );
    const { screen } = await renderApp('/lessons/no-such-lesson');

    const alert = screen.getByRole('alert');
    await expect
      .element(alert.getByRole('heading', { name: '表示できませんでした' }))
      .toBeVisible();
    await expect.element(alert.getByText('レッスンが見つかりません')).toBeVisible();
    await expect.element(alert.getByRole('button', { name: '再試行' })).toBeVisible();

    // ヘッダーのメニューは残っていて、移動するとエラー表示が解除される
    await screen
      .getByRole('navigation', { name: 'メインメニュー' })
      .getByRole('link', { name: 'レッスン' })
      .click();

    await expect.element(screen.getByRole('heading', { level: 1, name: 'レッスン' })).toBeVisible();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('データ取得の失敗では「再試行」で取得し直し、成功すれば元の画面に戻る', async () => {
    let calls = 0;
    worker.use(
      authHandlers.signedIn(),
      http.get('*/api/lessons', () => HttpResponse.json({ lessons: [testLesson] })),
      http.get('*/api/progress', () => {
        calls++;
        if (calls === 1) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'サーバーでエラーが発生しました' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({ progress });
      }),
    );
    const { screen } = await renderApp('/');

    await expect
      .element(screen.getByRole('alert').getByText('サーバーでエラーが発生しました'))
      .toBeVisible();

    await screen.getByRole('button', { name: '再試行' }).click();

    await expect.element(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('描画中の想定外の例外では、内部の詳細を出さずに一般的な文言を表示する', async () => {
    worker.use(
      authHandlers.signedIn(),
      http.get('*/api/lessons', () => HttpResponse.json({ lessons: [testLesson] })),
      // 想定と違う形の応答 → 画面の描画中に TypeError が起きる
      http.get('*/api/progress', () => HttpResponse.json({ progress: {} })),
    );
    const { screen } = await renderApp('/');

    const alert = screen.getByRole('alert');
    await expect.element(alert.getByText('予期しないエラーが発生しました')).toBeVisible();
    expect(alert.element().textContent).not.toContain('TypeError');
    await expect.element(screen.getByRole('navigation', { name: 'メインメニュー' })).toBeVisible();
  });

  it('存在しない URL では「ページが見つかりません」を表示する', async () => {
    worker.use(authHandlers.signedIn());
    const { screen } = await renderApp('/no-such-page');

    await expect
      .element(screen.getByRole('heading', { name: 'ページが見つかりません' }))
      .toBeVisible();
  });
});

describe('AppErrorBoundary（アプリ全体のエラー境界）', () => {
  it('どこにも受け止められなかった例外でも、画面が真っ白にならない', async () => {
    function Broken(): never {
      throw new Error('内部の詳細なエラー');
    }

    const screen = await render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );

    await expect.element(screen.getByRole('heading', { name: '問題が発生しました' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: '再読み込み' })).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'トップへ' }))
      .toHaveAttribute('href', '/');
  });
});
