import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { authHandlers, dashboardHandlers, testUser } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { worker } from '../../test/server';

type Screen = Awaited<ReturnType<typeof renderApp>>['screen'];

async function fillAndSubmit(screen: Screen, email: string, password: string) {
  if (email) await screen.getByLabelText('メールアドレス').fill(email);
  if (password) await screen.getByLabelText('パスワード').fill(password);
  await screen.getByRole('button', { name: 'ログイン' }).click();
}

describe('ログイン画面', () => {
  it('ログインに成功するとダッシュボードへ移動する', async () => {
    let received: unknown;
    worker.use(
      authHandlers.signedOut(),
      http.post('*/api/auth/login', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ user: testUser });
      }),
      ...dashboardHandlers(),
    );
    const { screen, router } = await renderApp('/login');

    await fillAndSubmit(screen, 'Taro@Example.com', 'correct-horse-battery');

    await expect.element(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
    // スキーマによって、メールアドレスが小文字に正規化されてから送られている
    expect(received).toEqual({ email: 'taro@example.com', password: 'correct-horse-battery' });
  });

  it('ログイン後は、元々開こうとしていた画面（redirect）へ戻る', async () => {
    worker.use(
      authHandlers.signedOut(),
      http.post('*/api/auth/login', () => HttpResponse.json({ user: testUser })),
      http.get('*/api/lessons', () => HttpResponse.json({ lessons: [] })),
    );
    const { screen, router } = await renderApp('/login?redirect=%2Flessons');

    await fillAndSubmit(screen, 'taro@example.com', 'correct-horse-battery');

    await expect.element(screen.getByRole('heading', { level: 1, name: 'レッスン' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/lessons');
  });

  it('入力が不正なら API を呼ばずに、項目ごとのエラーを表示する', async () => {
    // ログインの応答を登録していないので、もし API を呼べば setup.ts の検査でテストが失敗します。
    worker.use(authHandlers.signedOut());
    const { screen } = await renderApp('/login');

    await fillAndSubmit(screen, 'not-an-email', '');

    await expect.element(screen.getByText('メールアドレスの形式が正しくありません')).toBeVisible();
    await expect.element(screen.getByText('パスワードを入力してください')).toBeVisible();
    await expect
      .element(screen.getByLabelText('メールアドレス'))
      .toHaveAttribute('aria-invalid', 'true');
  });

  it('一度送信した後は、入力を直すとその場でエラー表示が消える', async () => {
    worker.use(authHandlers.signedOut());
    const { screen } = await renderApp('/login');
    await fillAndSubmit(screen, 'not-an-email', 'x');
    await expect.element(screen.getByText('メールアドレスの形式が正しくありません')).toBeVisible();

    // 送信し直さず、入力を直すだけ
    await screen.getByLabelText('メールアドレス').fill('taro@example.com');

    await expect
      .element(screen.getByText('メールアドレスの形式が正しくありません'))
      .not.toBeInTheDocument();
  });

  it('認証に失敗したら、API のエラーメッセージを表示する', async () => {
    worker.use(
      authHandlers.signedOut(),
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
    const { screen } = await renderApp('/login');

    await fillAndSubmit(screen, 'taro@example.com', 'wrong-password');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('メールアドレスまたはパスワードが正しくありません');
    await expect.element(screen.getByRole('button', { name: 'ログイン' })).toBeEnabled();
  });

  it('サーバーに接続できないときは、その旨を表示する', async () => {
    worker.use(
      authHandlers.signedOut(),
      http.post('*/api/auth/login', () => HttpResponse.error()),
    );
    const { screen } = await renderApp('/login');

    await fillAndSubmit(screen, 'taro@example.com', 'correct-horse-battery');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('サーバーに接続できませんでした');
  });
});

describe('認証による画面の振り分け', () => {
  it('未ログインで保護された画面を開くと、ログイン画面へ移動し、戻り先を覚えておく', async () => {
    // ノートの API を登録していないので、もし画面を描画して API を呼べばテストが失敗します。
    worker.use(authHandlers.signedOut());
    const { screen, router } = await renderApp('/notes?q=generics');

    await expect.element(screen.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ redirect: '/notes?q=generics' });
  });

  it('ログイン済みでログイン画面を開くと、ダッシュボードへ移動する', async () => {
    worker.use(authHandlers.signedIn(), ...dashboardHandlers());
    const { screen, router } = await renderApp('/login');

    await expect.element(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
  });

  it('外部サイトの戻り先は無視し、ダッシュボードへ移動する', async () => {
    worker.use(authHandlers.signedIn(), ...dashboardHandlers());
    const { screen, router } = await renderApp('/login?redirect=https%3A%2F%2Fevil.example%2F');

    await expect.element(screen.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    expect(router.state.location.href).toBe('/');
  });
});
