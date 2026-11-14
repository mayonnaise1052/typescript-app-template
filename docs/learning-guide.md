# 学習ガイド

このアプリのソースコードを、TypeScript の教材として読むための案内です。

## 1. リクエストの流れを追う

まず「ノートを 1 件作る」ときに、どのファイルを通るかを追ってみましょう。

```
ブラウザ
  apps/web/src/features/notes/NoteForm.tsx      入力を Zod スキーマで検証
  apps/web/src/features/notes/queries.ts        型付きクライアントで POST /api/notes
        │
        ▼  HTTP（JSON + セッション Cookie）
API
  apps/api/src/app.ts                           共通ミドルウェア（ヘッダー・サイズ制限・CSRF 対策）
  apps/api/src/middleware/auth.ts               Cookie からログイン中のユーザーを特定
  apps/api/src/routes/notes.ts                  同じ Zod スキーマでもう一度検証
  apps/api/src/services/note-service.ts         件数上限やレッスンの存在を確認
  apps/api/src/repositories/note-repository.ts  SQL を発行
        │
        ▼
  D1（SQLite）
```

ポイントは 2 つです。

- **同じスキーマ**（`packages/shared/src/schemas/note.ts`）を、フロントと API の両方が使っている
- フロントで検証していても、**API 側でも必ず検証する**（ブラウザ側のコードは書き換えられるため）

## 2. 概念と使用箇所の対応表

アプリ内の各レッスンにも同じ情報がありますが、一覧にまとめます。

### 基礎

| 概念                       | 見るファイル                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------- |
| 型注釈と型推論             | `apps/api/src/config/config.ts`                                                    |
| 関数の型・既定値つき引数   | `apps/api/src/domain/streak.ts`、`apps/api/src/lib/npm-registry.ts`（`FetchLike`） |
| オブジェクト型             | `apps/api/src/env.ts`                                                              |
| `readonly` な配列          | `apps/api/src/domain/grading.ts`                                                   |
| 添字アクセスと `undefined` | `apps/api/src/services/lesson-service.ts`                                          |
| ユニオン型・リテラル型     | `packages/shared/src/errors.ts`（`ErrorCode`）                                     |

### 中級

| 概念                         | 見るファイル                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| 型の絞り込み（`instanceof`） | `apps/api/src/middleware/error-handler.ts`、`apps/web/src/lib/api.ts`                                     |
| `unknown` の絞り込み         | `apps/web/src/features/auth/redirect.ts`                                                                  |
| 自作の型ガード（`x is T`）   | `apps/web/src/features/quiz/QuizForm.tsx`（`filter` の中）                                                |
| 判別可能ユニオン             | `packages/shared/src/schemas/quiz.ts`、`packages/shared/src/schemas/lesson.ts`                            |
| 網羅性チェック（`never`）    | `apps/api/src/domain/grading.ts`、`apps/web/src/features/lessons/ContentRenderer.tsx`                     |
| あり得ない状態を型で排除する | `apps/web/src/features/notes/NotesPage.tsx`（`Mode`）                                                     |
| ジェネリクス                 | `packages/shared/src/result.ts`、`packages/shared/src/schemas/common.ts`（`Paginated<T>`）                |
| ジェネリクスの制約           | `apps/api/src/middleware/validate.ts`、`apps/web/src/lib/api.ts`（`unwrap`）                              |
| ユーティリティ型             | `apps/api/src/repositories/note-repository.ts`（`Partial<Pick<...>>`）、各 `ReturnType<typeof create...>` |
| `as const` / `satisfies`     | `packages/shared/src/errors.ts`、`apps/api/src/config/config.ts`                                          |

### 上級

| 概念                            | 見るファイル                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `keyof typeof`                  | `apps/api/src/config/config.ts`（`RateLimitName`）                                                      |
| インデックスアクセス型          | `packages/shared/src/schemas/lesson.ts`（`ChapterId`）                                                  |
| Mapped Types                    | `apps/web/src/lib/form.ts`（`FormErrors<T>`）                                                           |
| 条件型と分配                    | `apps/api/src/content/types.ts`（`DistributiveOmit`）                                                   |
| `Awaited` / `ReturnType` の合成 | `apps/web/src/lib/api.ts`（`unwrap` の戻り値）                                                          |
| テンプレートリテラル型          | `apps/api/src/routes/notes.ts`（パスからパラメータ名の型が導かれる）                                    |
| Branded Types                   | `packages/shared/src/brand.ts`、`packages/shared/src/schemas/common.ts`、`apps/api/src/lib/password.ts` |
| 宣言のマージ                    | `apps/api/test/env.d.ts`                                                                                |

### 実務

| 概念                                              | 見るファイル                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| スキーマからの型推論（`z.infer`）                 | `packages/shared/src/schemas/` 全体                                                                             |
| `z.input` と `z.infer` の違い                     | `packages/shared/src/schemas/note.ts`                                                                           |
| Result 型によるエラー設計                         | `apps/api/src/services/auth-service.ts`、`apps/api/src/lib/unwrap.ts`                                           |
| `Promise.all` による並列実行                      | `apps/api/src/services/progress-service.ts`                                                                     |
| 依存の注入（テストしやすい設計）                  | `apps/api/src/services/index.ts`、`apps/api/src/app.ts`（`AppOptions`）                                         |
| API の型をフロントと共有する                      | `apps/api/src/app.ts`（`AppType`）→ `apps/web/src/lib/api.ts`                                                   |
| DB のスキーマから型を導出する                     | `apps/api/src/db/schema.ts`（`$inferSelect`）                                                                   |
| 型のテスト                                        | `packages/shared/src/types.test-d.ts`                                                                           |
| エラー境界と Suspense（データがある前提で書く）   | `apps/web/src/components/ErrorBoundaries.tsx`、`apps/web/src/features/lessons/queries.ts`（`useSuspenseQuery`） |
| `useSuspenseQueries` の戻り値のタプル型と並列取得 | `apps/web/src/features/progress/DashboardPage.tsx`                                                              |
| `key` によるコンポーネントの作り直し              | `apps/web/src/features/lessons/LessonPage.tsx`                                                                  |
| 描画前に DOM を操作する `useLayoutEffect`         | `apps/web/src/components/ScrollToTop.tsx`（画面遷移時に先頭へスクロール）                                       |

## 3. tsconfig の読み方

このリポジトリには、実行環境の異なるコードが 3 種類あります。

| 場所                      | 実行環境           | 読み込む型                  |
| ------------------------- | ------------------ | --------------------------- |
| `apps/web/src`            | ブラウザ           | `lib: ["DOM"]`              |
| `apps/api/src`            | Cloudflare Workers | `@cloudflare/workers-types` |
| `apps/api/scripts`、`e2e` | Node.js            | `@types/node`               |
| `packages/shared/src`     | どこでも           | 環境固有の型は読み込まない  |

共通の設定は `tsconfig.base.json` にあり、各 `tsconfig.json` が `extends` で継承して差分だけを書いています。たとえば `apps/api/src` で `document` と書くとエラーになり、`apps/web/src` で `process` と書くとエラーになります。「その環境に存在しない API」を型で防いでいるわけです。

## 4. 型の恩恵を体験する実験

コードを少し壊して、どこがエラーになるかを確かめてみましょう（終わったら `git checkout .` で戻せます）。

1. **API の応答を変える** — `apps/api/src/routes/progress.ts` の `{ progress }` を `{ summary: progress }` に変えて `npm run typecheck`。フロントの `DashboardPage.tsx` がエラーになります。
2. **問題の種類を増やす** — `packages/shared/src/schemas/quiz.ts` の `QuestionSchema` に新しい `kind` を追加。採点（`grading.ts`）と画面（`QuizForm.tsx`）の `assertNever` がエラーになり、対応が必要な箇所がすべて分かります。
3. **ID を取り違える** — `apps/api/src/services/note-service.ts` で `notes.findById(userId, id)` の引数を逆にする。Branded Types によりエラーになります。
4. **エラーコードを増やす** — `packages/shared/src/errors.ts` の `ERROR_CODES` に 1 つ追加。`ERROR_STATUS` の `satisfies` がエラーになります。

## 5. 練習課題

やさしい順に並べています。いずれも「テストを先に書く → 実装する」の順で進めるのがおすすめです。

1. **レッスンを 1 本追加する** — `apps/api/src/content/` に追記し、`npm run db:seed`。`content.test.ts` が教材の形式を検査してくれます。
2. **ノートを更新日時の古い順にも並べ替えられるようにする** — スキーマ → リポジトリ → 画面の順に、`sort` パラメータを追加します。
3. **並べ替え問題（`kind: 'ordering'`）を追加する** — 上の実験 2 の続きです。
4. **パスワード変更機能を追加する** — 現在のパスワードの確認、他のセッションの無効化まで考えてみましょう。
5. **レッスンごとの正答率を進捗画面に出す** — SQL の集計（`GROUP BY`）を Drizzle で書きます。
