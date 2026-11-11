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

async function register(page: Page, user = uniqueUser()) {
  await page.goto('/register');
  await page.getByLabel('表示名').fill(user.displayName);
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill(user.password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
  return user;
}

test('登録してレッスンを学び、クイズに合格すると進捗に反映される', async ({ page }) => {
  await register(page);

  // ダッシュボードの「次のレッスン」から最初のレッスンへ
  await expect(page.getByText('完了したレッスン')).toBeVisible();
  await page.getByRole('link', { name: '学習する' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '型注釈と型推論' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'このアプリでの使用箇所' })).toBeVisible();

  // クイズに解答する
  await page.getByRole('radio', { name: "'ready'" }).check();
  await page.getByRole('radio', { name: '型はコンパイル時にだけ存在し、実行時には消える' }).check();
  await page.getByRole('button', { name: '解答する' }).click();

  await expect(page.getByText('2 問中 2 問正解')).toBeVisible();
  await expect(page.getByText('完了', { exact: true })).toBeVisible();

  // 進捗がダッシュボードとレッスン一覧に反映されている
  await page.getByRole('link', { name: 'ダッシュボード' }).click();
  const completed = page.locator('.stat', { hasText: '完了したレッスン' });
  await expect(completed).toContainText('1');
  await expect(page.getByRole('cell', { name: '2 / 2' })).toBeVisible();

  await page.getByRole('link', { name: 'レッスン', exact: true }).click();
  await expect(page.getByRole('link', { name: /型注釈と型推論/ }).getByLabel('完了')).toBeVisible();
});

test('クイズを間違えると、正解と解説が表示され、やり直せる', async ({ page }) => {
  await register(page);
  await page.goto('/lessons/functions');

  await page.getByRole('radio', { name: 'number | null' }).check();
  await page.getByRole('textbox', { name: /空欄/ }).fill('undefined');
  await page.getByRole('button', { name: '解答する' }).click();

  await expect(page.getByText('2 問中 0 問正解')).toBeVisible();
  await expect(page.getByText('✗ 不正解')).toHaveCount(2);
  await expect(page.getByText('正解: void')).toBeVisible();

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

  // 削除（確認ダイアログで OK を押す）
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByRole('heading', { name: 'ジェネリクスのメモ（改）' })).toBeHidden();
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
