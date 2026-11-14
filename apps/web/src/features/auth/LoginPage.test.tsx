import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { worker } from '../../test/server';
import { LoginPage } from './LoginPage';

const user = {
  id: 'user-1',
  email: 'taro@example.com',
  displayName: '太郎',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>ダッシュボード</h1>} />
    </Routes>,
    { route: '/login' },
  );
}

type Screen = Awaited<ReturnType<typeof renderLogin>>;

async function fillAndSubmit(screen: Screen, email: string, password: string) {
  if (email) await screen.getByLabelText('メールアドレス').fill(email);
  if (password) await screen.getByLabelText('パスワード').fill(password);
  await screen.getByRole('button', { name: 'ログイン' }).click();
}

describe('LoginPage', () => {
  it('ログインに成功するとダッシュボードへ移動する', async () => {
    let received: unknown;
    worker.use(
      http.post('*/api/auth/login', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user });
      }),
    );
    const screen = await renderLogin();

    await fillAndSubmit(screen, 'Taro@Example.com', 'correct-horse-battery');

    await expect.element(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    // スキーマによって、メールアドレスが小文字に正規化されてから送られている
    expect(received).toEqual({ email: 'taro@example.com', password: 'correct-horse-battery' });
  });

  it('入力が不正なら API を呼ばずに、項目ごとのエラーを表示する', async () => {
    // 応答を登録していないので、もし API を呼べば setup.ts の検査でテストが失敗します。
    const screen = await renderLogin();

    await fillAndSubmit(screen, 'not-an-email', '');

    await expect.element(screen.getByText('メールアドレスの形式が正しくありません')).toBeVisible();
    await expect.element(screen.getByText('パスワードを入力してください')).toBeVisible();
    await expect
      .element(screen.getByLabelText('メールアドレス'))
      .toHaveAttribute('aria-invalid', 'true');
  });

  it('認証に失敗したら、API のエラーメッセージを表示する', async () => {
    worker.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHENTICATED',
              message: 'メールアドレスまたはパスワードが正しくありません',
            },
          },
          { status: 401 },
        ),
      ),
    );
    const screen = await renderLogin();

    await fillAndSubmit(screen, 'taro@example.com', 'wrong-password');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('メールアドレスまたはパスワードが正しくありません');
    await expect.element(screen.getByRole('button', { name: 'ログイン' })).toBeEnabled();
  });

  it('サーバーに接続できないときは、その旨を表示する', async () => {
    worker.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    const screen = await renderLogin();

    await fillAndSubmit(screen, 'taro@example.com', 'correct-horse-battery');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('サーバーに接続できませんでした');
  });
});
