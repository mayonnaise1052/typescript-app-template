import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/render';
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

async function fillAndSubmit(email: string, password: string) {
  const actor = userEvent.setup();
  if (email) await actor.type(screen.getByLabelText('メールアドレス'), email);
  if (password) await actor.type(screen.getByLabelText('パスワード'), password);
  await actor.click(screen.getByRole('button', { name: 'ログイン' }));
}

describe('LoginPage', () => {
  it('ログインに成功するとダッシュボードへ移動する', async () => {
    let received: unknown;
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user });
      }),
    );
    renderLogin();

    await fillAndSubmit('Taro@Example.com', 'correct-horse-battery');

    expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument();
    // スキーマによって、メールアドレスが小文字に正規化されてから送られている
    expect(received).toEqual({ email: 'taro@example.com', password: 'correct-horse-battery' });
  });

  it('入力が不正なら API を呼ばずに、項目ごとのエラーを表示する', async () => {
    // ハンドラを登録していないので、もし API を呼べば onUnhandledFrame でテストが失敗します。
    renderLogin();

    await fillAndSubmit('not-an-email', '');

    expect(await screen.findByText('メールアドレスの形式が正しくありません')).toBeInTheDocument();
    expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('aria-invalid', 'true');
  });

  it('認証に失敗したら、API のエラーメッセージを表示する', async () => {
    server.use(
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
    renderLogin();

    await fillAndSubmit('taro@example.com', 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'メールアドレスまたはパスワードが正しくありません',
    );
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeEnabled();
  });

  it('サーバーに接続できないときは、その旨を表示する', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()));
    renderLogin();

    await fillAndSubmit('taro@example.com', 'correct-horse-battery');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('サーバーに接続できませんでした'),
    );
  });
});
