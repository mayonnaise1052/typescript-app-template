# テストガイド

## まず実行してみる

```bash
npm test              # 単体テスト・結合テスト・型のテスト（約 20 秒）
npm run test:e2e      # ブラウザを使った E2E テスト（初回のみブラウザの準備が必要、下記参照）
npm run check         # 整形の確認 + lint + 型チェック + テスト（プッシュ前に）
```

## テストの種類と置き場所

| 種類                 | 何を確かめるか                             | 場所                                  | 道具                        |
| -------------------- | ------------------------------------------ | ------------------------------------- | --------------------------- |
| 単体テスト           | 関数 1 つの入出力                          | 対象の隣（`*.test.ts`）               | Vitest                      |
| 型のテスト           | 型そのものが意図どおりか                   | `packages/shared/src/types.test-d.ts` | Vitest（`expectTypeOf`）    |
| 結合テスト           | API を呼んで DB まで通した動作             | `apps/api/test/`                      | Vitest + Workers ランタイム |
| コンポーネントテスト | 画面の部品を、ユーザーの操作を通して       | 対象の隣（`*.test.tsx`）              | Testing Library + MSW       |
| E2E テスト           | 実際のブラウザで、主要な流れが通しで動くか | `e2e/`                                | Playwright                  |

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

Testing Library は「ユーザーから見える内容」で要素を探します。CSS のクラス名のような実装の詳細に依存しないので、見た目を変えてもテストが壊れにくくなります。

```tsx
await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
await user.click(screen.getByRole('button', { name: 'ログイン' }));
expect(await screen.findByRole('alert')).toHaveTextContent('正しくありません');
```

API の応答は MSW で差し替えます。テストごとに、必要な応答だけを登録します。

```tsx
server.use(
  http.post('*/api/auth/login', () =>
    HttpResponse.json({ error: { code: 'UNAUTHENTICATED', message: '…' } }, { status: 401 }),
  ),
);
```

登録していない API を呼ぶとテストが失敗する設定にしているので、「呼ばれないはずの API が呼ばれた」ことにも気付けます。

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
