/**
 * E2E（エンドツーエンド）テスト。
 *
 * 実際のブラウザでアプリを操作し、フロント → API → DB の全体がつながって動くことを確かめます。
 * 単体テストや結合テストより遅く壊れやすいので、「これが動かないと困る」という
 * 主要な流れに絞って書くのが定石です。
 */
import { expect, test, type Page } from '@playwright/test';

/** テストごとに別のユーザーを作るので、何度実行しても互いに影響しません。 */
function uniqueUser() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    displayName: 'テスト太郎',
    email: `e2e-${suffix}@example.com`,
    password: 'correct-horse-battery',
  };
}

/**
 * API はログイン・登録の試行回数を接続元（CF-Connecting-IP）ごとに制限しています。
 * E2E ではテストごとに多数のユーザーを登録するので、テストごとに別の接続元として扱わせます。
 * （本番では Cloudflare がこのヘッダーを実際の接続元で上書きするため、偽装はできません。）
 */
async function useDistinctClient(page: Page) {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.setExtraHTTPHeaders({ 'CF-Connecting-IP': `10.${octet()}.${octet()}.${octet()}` });
}

async function register(page: Page, user = uniqueUser()) {
  await useDistinctClient(page);
  await page.goto('/register');
  await page.getByLabel('表示名').fill(user.displayName);
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill(user.password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
  return user;
}

/** 「基本の型と型推論」のクイズに全問正解で解答します。 */
async function passBasicTypesQuiz(page: Page) {
  await page.getByRole('radio', { name: 'number', exact: true }).check();
  await page.getByRole('radio', { name: '3 行目', exact: true }).check();
  await page.getByRole('textbox', { name: /空欄/ }).fill('string');
  await page
    .getByRole('radio', { name: '最初に入れた値から、TypeScript が型を自動で決める' })
    .check();
  await page.getByRole('button', { name: '解答する' }).click();
  await expect(page.getByText('4 問中 4 問正解')).toBeVisible();
}

test('登録してレッスンを学び、クイズに合格すると進捗に反映される', async ({ page }) => {
  await register(page);

  // ダッシュボードの「次のレッスン」から最初のレッスンへ
  await expect(page.getByText('完了したレッスン')).toBeVisible();
  await page.getByRole('link', { name: '学習する' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'TypeScript とは' })).toBeVisible();

  // 「発展: このアプリでの使われ方」は初期状態では閉じていて、開くと一覧が見える
  const codeRef = page.getByText('package.json', { exact: true });
  await expect(page.getByRole('heading', { name: '発展: このアプリでの使われ方' })).toBeVisible();
  await expect(codeRef).toBeHidden();
  await page.getByRole('heading', { name: '発展: このアプリでの使われ方' }).click();
  await expect(codeRef).toBeVisible();

  // クイズに解答する
  await page.getByRole('radio', { name: 'プログラムを実行する前', exact: true }).check();
  await page.getByRole('radio', { name: 'let count = 1;', exact: true }).check();
  await page
    .getByRole('radio', { name: 'number 型の値を、string 型の場所に入れようとしている' })
    .check();
  await page.getByRole('button', { name: '解答する' }).click();

  await expect(page.getByText('3 問中 3 問正解')).toBeVisible();
  await expect(page.getByText('完了', { exact: true })).toBeVisible();

  // 進捗がダッシュボードとレッスン一覧に反映されている
  await page.getByRole('link', { name: 'ダッシュボード' }).click();
  // 見出し（dt）と値（dd）の組を、CSS のクラス名ではなく役割で探します
  const completed = page.getByRole('term').filter({ hasText: '完了したレッスン' }).locator('..');
  await expect(completed).toContainText('1');
  await expect(page.getByRole('cell', { name: '3 / 3' })).toBeVisible();

  await page.getByRole('link', { name: 'レッスン', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /TypeScript とは/ }).getByLabel('完了'),
  ).toBeVisible();
});

test('クイズを間違えると、正解と解説が表示され、やり直せる', async ({ page }) => {
  await register(page);
  await page.goto('/lessons/types-and-inference');

  await page.getByRole('radio', { name: 'string', exact: true }).check();
  await page.getByRole('radio', { name: '1 行目', exact: true }).check();
  await page.getByRole('textbox', { name: /空欄/ }).fill('number');
  await page.getByRole('radio', { name: '型推論を使うと、型の検査が行われなくなる' }).check();
  await page.getByRole('button', { name: '解答する' }).click();

  await expect(page.getByText('4 問中 0 問正解')).toBeVisible();
  await expect(page.getByText('✗ 不正解')).toHaveCount(4);
  await expect(page.getByText('正解: string')).toBeVisible();

  await page.getByRole('button', { name: 'もう一度挑戦する' }).click();
  await expect(page.getByRole('button', { name: '解答する' })).toBeVisible();
});

test('ノートを作成・検索・編集・削除できる', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'ノート' }).click();
  await expect(page.getByText('まだノートがありません')).toBeVisible();

  // 作成
  await page.getByRole('button', { name: '新しいノート' }).click();
  await page.getByLabel('タイトル').fill('ジェネリクスのメモ');
  await page.getByLabel('本文').fill('T は型の引数');
  await page.getByLabel('関連するレッスン（任意）').selectOption({ label: 'ジェネリクス' });
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ' })).toBeVisible();

  // 再読み込みしても残っている（DB に保存されている）
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ' })).toBeVisible();

  // 検索
  await page.getByRole('searchbox', { name: 'ノートを検索' }).fill('存在しない言葉');
  await page.getByRole('button', { name: '検索' }).click();
  await expect(page.getByText('条件に一致するノートはありません。')).toBeVisible();
  await page.getByRole('searchbox', { name: 'ノートを検索' }).fill('ジェネ');
  await page.getByRole('button', { name: '検索' }).click();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ' })).toBeVisible();

  // 編集
  await page.getByRole('button', { name: '編集' }).click();
  await page.getByLabel('タイトル').fill('ジェネリクスのメモ（改）');
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ（改）' })).toBeVisible();

  // 削除: 確認ダイアログで「キャンセル」なら残り、「削除する」で消える
  await page.getByRole('button', { name: '削除' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'ノートを削除しますか？' });
  await dialog.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ（改）' })).toBeVisible();

  await page.getByRole('button', { name: '削除' }).click();
  await dialog.getByRole('button', { name: '削除する' }).click();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ（改）' })).toBeHidden();
  await expect(page.getByText('「ジェネリクスのメモ（改）」を削除しました')).toBeVisible();
});

test('ログアウトすると保護された画面に入れず、再ログインで戻れる', async ({ page }) => {
  const user = await register(page);

  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();

  // 未ログインで保護された画面を開くと、ログイン画面へ移動する
  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();

  // 間違ったパスワードではログインできない
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill('wrong-password-123');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'メールアドレスまたはパスワードが正しくありません',
  );

  // 正しいパスワードでログインすると、元々開こうとしていた画面に戻る
  await page.getByLabel('パスワード').fill(user.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { name: 'ノート', exact: true })).toBeVisible();
});

test('セキュリティヘッダーが付き、ブラウザのコンソールにエラーが出ない', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const response = await page.goto('/register');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');

  // 一通りの画面を開き、CSP 違反などのエラーが出ないことを確かめる
  await register(page);
  await page.goto('/lessons/generics');
  await expect(page.getByRole('heading', { level: 1, name: 'ジェネリクス' })).toBeVisible();
  await page.goto('/packages');
  await expect(page.getByRole('heading', { level: 1, name: 'パッケージ' })).toBeVisible();

  // 未ログイン時の /api/auth/me の 401 は想定内なので除外する
  expect(consoleErrors.filter((text) => !text.includes('401'))).toEqual([]);
});

test('合格後に次のレッスンへ進むと、前のレッスンの結果を引き継がず解答できる', async ({ page }) => {
  await register(page);
  await page.goto('/lessons/types-and-inference');
  await passBasicTypesQuiz(page);

  await page.getByRole('link', { name: '次のレッスン →' }).click();

  await expect(page.getByRole('heading', { level: 1, name: '配列とタプル' })).toBeVisible();
  await expect(page.getByText('完了', { exact: true })).toBeHidden();
  await expect(page.getByText(/問中/)).toBeHidden();
  await expect(page.getByRole('button', { name: '解答する' })).toBeEnabled();
});

test('ページの下までスクロールしてから次のレッスンへ進むと、新しいレッスンの先頭が表示される', async ({
  page,
}) => {
  await register(page);
  await page.goto('/lessons/types-and-inference');
  await expect(page.getByRole('heading', { level: 1, name: '基本の型と型推論' })).toBeVisible();

  // 合格してから、ページの一番下までスクロールする
  await passBasicTypesQuiz(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.getByRole('link', { name: '次のレッスン →' }).click();

  const heading = page.getByRole('heading', { level: 1, name: '配列とタプル' });
  await expect(heading).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('存在しないレッスンを開くとエラーが表示され、メニューから別の画面へ移動できる', async ({
  page,
}) => {
  await register(page);

  await page.goto('/lessons/no-such-lesson');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('表示できませんでした');
  await expect(alert).toContainText('レッスンが見つかりません');
  await expect(alert.getByRole('button', { name: '再試行' })).toBeVisible();

  // ヘッダーのメニューは残っていて、移動するとエラー表示が解除される
  await page.getByRole('link', { name: 'レッスン', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'レッスン' })).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();
});

test('ログイン画面の戻り先に外部サイトを指定しても、アプリの外へは移動しない', async ({ page }) => {
  const user = await register(page);
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();

  await page.goto(`/login?redirect=${encodeURIComponent('https://evil.example/')}`);
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill(user.password);
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
  expect(page.url()).not.toContain('evil.example');
});

test.describe('スマートフォンの幅', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('主要な画面で横スクロールが発生しない', async ({ page }) => {
    await register(page);
    for (const path of ['/', '/lessons', '/lessons/generics', '/notes', '/packages']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} で横にはみ出しています`).toBeLessThanOrEqual(0);
    }
  });
});
