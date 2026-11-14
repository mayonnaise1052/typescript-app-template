# テストガイド

## まず実行してみる

```bash
npx playwright install chromium   # 初回のみ: テスト用ブラウザの準備（コンポーネントテストと E2E で使う）
npm test              # 単体テスト・結合テスト・コンポーネントテスト・型のテスト（約 30 秒）
npm run test:e2e      # ブラウザを使った E2E テスト（初回のみブラウザの準備が必要、下記参照）
npm run check         # 整形の確認 + lint + 型チェック + テスト（プッシュ前に）
```

## 型チェックはいつ行われるか

TypeScript の型チェックは、コードを実行する前に間違いを見つけるための仕組みです。ところが、開発サーバー（Vite / wrangler）もビルドも、速さのために**型を取り除くだけで、型が正しいかは調べません**。型エラーがあっても画面は動いてしまいます。そこで、次の 4 段階で型チェックが必ず行われるようにしています。

| 段階                  | 仕組み                                                            | 型エラーがあると                       |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| 開発中                | `npm run dev` が型チェックも常駐させる（`[types]` の行）          | ターミナルにエラーが表示される         |
| コミット時            | Git フック（`.githooks/pre-commit`）が `npm run typecheck` を実行 | コミットが中止される                   |
| `main` へのプッシュ後 | GitHub Actions の CI                                              | CI が失敗する                          |
| デプロイ時            | `npm run deploy` の最初に `npm run typecheck`                     | デプロイが中止され、本番は前の版のまま |

Git フックは `npm install` のときに自動で有効になります（`scripts/install-git-hooks.mjs`）。緊急時にどうしても飛ばしたいときは `git commit --no-verify` を使えますが、その場合もデプロイ時のチェックで止まります。

## テストの種類と置き場所

| 種類                 | 何を確かめるか                                       | 場所                                  | 道具                        |
| -------------------- | ---------------------------------------------------- | ------------------------------------- | --------------------------- |
| 単体テスト           | 関数 1 つの入出力                                    | 対象の隣（`*.test.ts`）               | Vitest                      |
| 型のテスト           | 型そのものが意図どおりか                             | `packages/shared/src/types.test-d.ts` | Vitest（`expectTypeOf`）    |
| 結合テスト           | API を呼んで DB まで通した動作                       | `apps/api/test/`                      | Vitest + Workers ランタイム |
| コンポーネントテスト | 画面の部品を、本物のブラウザでユーザーの操作を通して | 対象の隣（`*.test.tsx`）              | Vitest Browser Mode + MSW   |
| E2E テスト           | 実際のブラウザで、主要な流れが通しで動くか           | `e2e/`                                | Playwright                  |

下に行くほど「本物に近い」代わりに、遅く、失敗の原因を特定しにくくなります。そのため、細かい条件分岐は単体テストで網羅し、E2E は主要な流れだけに絞っています。

## 一部だけ実行する

テストはワークスペース（`packages/shared`、`apps/api`、`apps/web`）ごとに分かれています。`-w` で対象を指定します。

```bash
# API のテストだけ
npm test -w @typequest/api

# ファイルを指定（パスの一部でよい）
npm test -w @typequest/api -- grading
npm test -w @typequest/web -- QuizForm

# テスト名で絞り込む
npm test -w @typequest/api -- -t "他人のノート"

# 変更を監視して自動で再実行（開発中はこれが便利）
npm run test:watch -w @typequest/api

# カバレッジ（結果は各ワークスペースの coverage/ に出力）
npm run test:coverage
```

## API のテストの仕組み

API のテストは Node ではなく、**本番と同じ Workers ランタイム（workerd）の中**で実行されます（`apps/api/vitest.config.ts`）。D1 もローカルで再現されるので、モックではない本物の SQL が動きます。外部サービスやアカウントは不要です。

結合テストは `TestClient`（`apps/api/test/helpers.ts`）を使って書きます。Cookie を覚えてくれる、ブラウザの代役です。

```ts
import { beforeEach, expect, it } from 'vitest';
import { expectError, resetDatabase, TestClient } from './helpers';

beforeEach(resetDatabase); // 各テストの前に DB を空にして教材を入れ直す

it('他人のノートは取得できない', async () => {
  const taro = new TestClient();
  await taro.register();
  const created = await taro.post('/api/notes', { title: 'メモ', body: '本文' });
  const { note } = await created.json();

  const hanako = new TestClient();
  await hanako.register({ email: 'hanako@example.com' });

  await expectError(await hanako.get(`/api/notes/${note.id}`), 404, 'NOT_FOUND');
});
```

### 時刻と外部 API を差し替える

「8 日後にセッションが切れる」「npm レジストリが落ちている」といった状況は、そのままではテストできません。このアプリは現在時刻と `fetch` を外から渡せる設計（依存の注入）にしてあるので、テストで自由に差し替えられます。

```ts
let now = new Date('2026-01-01T00:00:00Z');
const fetch = vi.fn().mockRejectedValue(new Error('network error'));

const client = new TestClient({ now: () => now, fetch });

now = new Date('2026-01-09T00:00:00Z'); // 8 日後に進める
```

実例: `apps/api/test/auth.test.ts`（有効期限）、`apps/api/test/packages.test.ts`（外部 API とキャッシュ）

## フロントエンドのテストの仕組み

コンポーネントテストは **Vitest Browser Mode** で、本物の Chromium の中で実行します（`apps/web/vite.config.ts` の `test.browser`）。Node 上でブラウザを模倣する方式（jsdom）と違い、レイアウト・フォーカス・イベントが実際のブラウザと同じように動きます。

要素は「ユーザーから見える内容」（役割・ラベル・文字）で探します。CSS のクラス名のような実装の詳細に依存しないので、見た目を変えてもテストが壊れにくくなります。

```tsx
const screen = await render(<LoginPage />);

await screen.getByLabelText('メールアドレス').fill('taro@example.com');
await screen.getByRole('button', { name: 'ログイン' }).click();

// expect.element(...) は、条件を満たすまで自動で待ちます（タイミングのずれに強い）
await expect.element(screen.getByRole('alert')).toBeVisible();
```

| よく使うもの                                             | 意味                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `screen.getByRole(...)` / `getByLabelText` / `getByText` | 要素を探す「ロケーター」を作る（この時点では探さない）                                                                                        |
| `.click()` / `.fill(...)`                                | 本物のブラウザでの操作として実行する                                                                                                          |
| `await expect.element(ロケーター).toBeVisible()`         | 見えるようになるまで待って確かめる                                                                                                            |
| `.not.toBeInTheDocument()`                               | 消えるまで待って確かめる                                                                                                                      |
| `toHaveTextContent('…')`                                 | 要素の文字が**全体として一致**するかを確かめる（部分一致ではない点に注意。一部だけ確かめたいときは、その文字を持つ要素を `getByText` で探す） |

API の応答は MSW のブラウザ版で差し替えます。テストの間だけ Service Worker として動き、fetch を横取りします。テストごとに、必要な応答だけを登録します。

```tsx
worker.use(
  http.post('*/api/auth/login', () =>
    HttpResponse.json({ error: { code: 'UNAUTHENTICATED', message: '…' } }, { status: 401 }),
  ),
);
```

応答を登録していない `/api/` を呼ぶとテストが失敗する設定にしているので（`apps/web/src/test/setup.ts`）、「呼ばれないはずの API が呼ばれた」ことにも気付けます。

MSW の Service Worker は、テストのときだけ Vite のプラグインが配信します。`public/` には置かないので、本番のビルド結果には含まれません。

失敗したテストは、その瞬間の画面のスクリーンショットが `apps/web/.vitest/` に保存されます。ブラウザの画面を見ながら実行したいときは次のようにします。

```bash
npm run test:watch -w @typequest/web -- --browser.headless=false
```

## E2E テスト

```bash
npx playwright install chromium   # 初回のみ: テスト用ブラウザのダウンロード
npm run test:e2e
```

実行すると、次のことが自動で行われます（`playwright.config.ts` の `webServer`）。

1. フロントエンドをビルドする
2. E2E 専用の DB（`apps/api/.wrangler/e2e`）にマイグレーションと教材を適用する
3. `wrangler dev` を 8788 番ポートで起動する
4. ブラウザを操作してテストする

開発用の DB とは別の場所を使うので、手元のデータには影響しません。

```bash
npx playwright test --ui        # 画面を見ながら 1 ステップずつ実行
npx playwright test --headed    # ブラウザを表示して実行
npx playwright test --trace on  # 失敗の調査用に操作の記録を残す
```

## テストを書くときの指針

- **テスト名は「〜すると〜になる」と仕様を文章で書く**。一覧を読むだけで仕様書になります。
- **準備 → 実行 → 確認** の 3 段に分け、空行で区切る。
- **1 つのテストで確かめることは 1 つ**。
- **失敗する場合も必ずテストする**（不正な入力、権限がない、外部 API の障害）。
- **認可は「別のユーザーで試す」テストを書く**。正常系のテストだけでは、他人のデータが見えてしまう不具合は見つかりません（`apps/api/test/notes.test.ts`）。
- **応答の JSON は `as` で決め打ちせず、スキーマで検証する**（`readJson`）。

## CI

GitHub にプッシュすると、`.github/workflows/ci.yml` が整形の確認・lint・型チェック・テスト・ビルド・E2E を自動で実行します。
