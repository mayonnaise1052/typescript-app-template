# Cloudflare へのデプロイ

API（Hono）とフロントエンド（ビルドした静的ファイル）を、1 つの Worker としてデプロイします。Cloudflare の無料プランで動かせます。

> この手順は、設定ファイル（`apps/api/wrangler.jsonc`）の内容に基づいて書いています。ローカルの `wrangler dev` では同じ構成で動作を確認していますが、実際のアカウントへのデプロイは各自の環境で行ってください。

## 1. Cloudflare にログインする

```bash
npx wrangler login
```

## 2. D1 データベースを作成する

```bash
npx wrangler d1 create typequest
```

出力される `database_id` を、`apps/api/wrangler.jsonc` の `d1_databases[0].database_id` に書き写します（初期値の `00000000-…` を置き換えます）。

## 3. 本番の DB にテーブルと教材を作る

```bash
npm run db:migrate:remote -w @typequest/api
npm run db:seed:remote -w @typequest/api
```

## 4. デプロイする

```bash
npm run deploy
```

フロントエンドをビルドしてから `wrangler deploy` を実行します。完了すると `https://typequest.<あなたのサブドメイン>.workers.dev` のような URL が表示されます。

## 更新するとき

| 変更した内容   | 実行するコマンド                                                                         |
| -------------- | ---------------------------------------------------------------------------------------- |
| コード         | `npm run deploy`                                                                         |
| DB のスキーマ  | `npm run db:generate` → `npm run db:migrate:remote -w @typequest/api` → `npm run deploy` |
| レッスンや問題 | `npm run db:seed:remote -w @typequest/api`                                               |

## 仕組み

`apps/api/wrangler.jsonc` の `assets` の設定により、リクエストは次のように振り分けられます。

- `/api/*` → Worker（Hono）が処理
- それ以外 → `apps/web/dist` の静的ファイルを返す。該当するファイルがなければ `index.html`（画面の経路は React Router がブラウザ側で解決するため）

フロントと API が同じオリジンになるので、CORS の設定は不要で、Cookie もそのまま使えます。

## 設定値

| 名前              | 用途                                                             | 既定値 |
| ----------------- | ---------------------------------------------------------------- | ------ |
| `ALLOWED_ORIGINS` | 状態を変更するリクエストを許可する追加のオリジン（カンマ区切り） | 空     |

同一オリジンからのリクエストは常に許可されるため、通常は空のままで構いません。ローカル開発では `apps/api/.dev.vars` で `http://localhost:5173`（Vite）を許可しています。
