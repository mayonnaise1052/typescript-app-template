# TypeQuest

TypeScript を学ぶための学習アプリです。アプリでレッスンとクイズを進められるだけでなく、**このリポジトリのソースコード自体が、実務的な TypeScript の教材**になっています。

- レッスン 20 本（基礎 → 中級 → 上級 → 実務）と確認クイズ 40 問
- ユーザー登録・ログイン、進捗管理、学習ノート（CRUD・検索・ページネーション）
- 外部 API（npm レジストリ）の検索とブックマーク
- Cloudflare Workers + D1 にそのままデプロイできる構成

## 技術スタック

| 層             | 採用技術                                                 |
| -------------- | -------------------------------------------------------- |
| フロントエンド | React / Vite / React Router / TanStack Query             |
| API            | Hono（Cloudflare Workers）                               |
| データベース   | Cloudflare D1（SQLite 互換）/ Drizzle ORM                |
| 検証と型の共有 | Zod（`packages/shared`）                                 |
| テスト         | Vitest / Testing Library / MSW / Playwright              |
| 品質           | TypeScript（strict）/ ESLint / Prettier / GitHub Actions |

## はじめかた

必要なもの: **Node.js 22 以上**（Docker や Cloudflare のアカウントは、ローカルで動かすだけなら不要です）

```bash
npm install     # 依存パッケージのインストール
npm run setup   # ローカル DB の作成と教材の投入（確認を求められたら y）
npm run dev     # 開発サーバーの起動
```

ブラウザで <http://localhost:5173> を開き、「新規登録」からアカウントを作成してください。

`npm run dev` は 2 つのサーバーを同時に起動します。

| サーバー     | URL                     | 役割                                     |
| ------------ | ----------------------- | ---------------------------------------- |
| Vite         | <http://localhost:5173> | フロントエンド。`/api` を下の API へ転送 |
| wrangler dev | <http://localhost:8787> | API。Workers と D1 を手元で再現          |

## よく使うコマンド

| コマンド                | 内容                                               |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | 開発サーバーを起動                                 |
| `npm test`              | 単体テスト・結合テスト・型のテストをすべて実行     |
| `npm run test:coverage` | カバレッジ付きでテストを実行                       |
| `npm run test:e2e`      | ブラウザを使った E2E テストを実行                  |
| `npm run typecheck`     | 型チェック                                         |
| `npm run lint`          | ESLint                                             |
| `npm run format`        | Prettier で整形                                    |
| `npm run check`         | 整形の確認・lint・型チェック・テストをまとめて実行 |
| `npm run db:seed`       | 教材（レッスンと問題）を DB に入れ直す             |
| `npm run db:generate`   | スキーマの変更からマイグレーション SQL を生成      |

テストの詳しい実行方法と書き方は [docs/testing.md](docs/testing.md) を参照してください。

## ディレクトリ構成

```
packages/shared/        フロントと API が共有する「契約」
  src/schemas/            Zod スキーマと、そこから導出した型
  src/result.ts           Result 型
  src/errors.ts           エラーコードの定義
apps/api/               API（Cloudflare Workers）
  src/routes/             HTTP の入出力（検証 → サービス呼び出し → JSON）
  src/services/           ビジネスロジック
  src/repositories/       DB への問い合わせ
  src/middleware/         認証・CSRF 対策・レート制限・エラー処理
  src/domain/             採点などの純粋関数
  src/db/                 テーブル定義（Drizzle）
  src/content/            レッスンと問題の本文
  migrations/             マイグレーション SQL
  test/                   結合テスト
apps/web/               フロントエンド（React）
  src/features/           機能ごとの画面（auth / lessons / quiz / progress / notes / packages）
  src/components/         共通の部品
  src/lib/                型付き API クライアントなど
e2e/                    Playwright の E2E テスト
docs/                   ドキュメント
```

## ドキュメント

| ファイル                                         | 内容                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| [docs/learning-guide.md](docs/learning-guide.md) | TypeScript の各概念が、どのファイルで使われているか |
| [docs/testing.md](docs/testing.md)               | テストの実行方法・種類・書き方                      |
| [docs/security.md](docs/security.md)             | 取り入れているセキュリティ対策と、その理由          |
| [docs/deploy.md](docs/deploy.md)                 | Cloudflare へのデプロイ手順                         |

## おすすめの学び方

1. アプリでレッスンを読み、クイズを解く
2. 各レッスンの「このアプリでの使用箇所」に載っているファイルを開いて読む
3. 対応するテストを読み、`npm run test:watch -w @typequest/api` で動かしながらコードを書き換えてみる
4. [docs/learning-guide.md](docs/learning-guide.md) の「練習課題」に挑戦する
