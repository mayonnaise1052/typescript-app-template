# セキュリティ対策

このアプリが取り入れている対策と、その理由・実装場所の一覧です。それぞれにテストがあるので、対策を外すとテストが失敗することを確かめられます。

## 認証

| 対策                                                               | 理由                                      | 実装                                    |
| ------------------------------------------------------------------ | ----------------------------------------- | --------------------------------------- |
| パスワードはソルト付きでハッシュ化して保存                         | DB が漏れても平文のパスワードが分からない | `apps/api/src/lib/password.ts`          |
| ハッシュの比較は定数時間で行う                                     | 応答時間の差から値を推測させない          | `apps/api/src/lib/encoding.ts`          |
| ログイン失敗時は「メールアドレスまたはパスワードが違う」とだけ返す | 登録済みのメールアドレスを調べさせない    | `apps/api/src/services/auth-service.ts` |
| 未登録のメールアドレスでも同じだけ計算する                         | 応答時間から登録の有無を推測させない      | 同上（`verifyAgainstDummy`）            |
| セッショントークンは 256 ビットの乱数                              | 推測できない                              | `apps/api/src/lib/session-token.ts`     |
| DB にはトークンのハッシュだけを保存                                | DB が漏れてもセッションを乗っ取れない     | 同上                                    |
| ログインのたびに新しいトークンを発行                               | セッション固定攻撃を防ぐ                  | `auth-service.ts`                       |
| ログアウト時にサーバー側のセッションも削除                         | Cookie を控えられていても再利用できない   | 同上                                    |
| セッションは 7 日で失効                                            | 盗まれた場合の被害を限定する              | `apps/api/src/config/config.ts`         |

### Cookie の属性

`apps/api/src/middleware/auth.ts`

- `HttpOnly` — JavaScript から読めない。XSS があってもトークンを盗めません。トークンを `localStorage` に置かないのも同じ理由です。
- `Secure` — HTTPS でのみ送信（`http://localhost` での開発時を除く）。
- `SameSite=Lax` — 他サイトからの POST には付与されません。

### パスワードハッシュについての注意

Cloudflare Workers では argon2 や bcrypt のネイティブ実装が使えないため、Web Crypto API の **PBKDF2-HMAC-SHA256（10 万回）** を使っています。Workers が反復回数を 10 万回までに制限しているためで、OWASP の現在の推奨値（60 万回）より少ない値です。次の対策で補っています。

- パスワードは 10 文字以上
- ログイン・登録の試行にレート制限

ハッシュには反復回数を含めて保存しているので、将来アルゴリズムや回数を変えても、古いハッシュを検証できます。より強い方式が必要になった場合は、認証を専用のサービスに任せることも検討してください。

## 認可

| 対策                                                           | 理由                                                 | 実装                                                |
| -------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| ユーザーのデータへの問い合わせには必ず `userId` の条件を付ける | ID を知っていても他人のデータに触れない（IDOR 対策） | `apps/api/src/repositories/note-repository.ts` ほか |
| 他人のデータは 403 ではなく 404 を返す                         | その ID のデータが存在すること自体を伝えない         | `apps/api/src/services/note-service.ts`             |
| 画面の出し分け（`RequireAuth`）を守りの境界にしない            | ブラウザ側のコードは書き換えられる                   | 守るのは常に API 側                                 |

## CSRF（クロスサイトリクエストフォージェリ）

状態を変更するリクエスト（POST / PATCH / DELETE）は、`Origin` ヘッダーが自分自身のオリジン（または許可リスト）と一致するときだけ受け付けます（`apps/api/src/middleware/origin-check.ts`）。`SameSite=Lax` の Cookie と合わせた二重の対策です。

## 入力の検証とインジェクション

| 対策                                                              | 実装                                        |
| ----------------------------------------------------------------- | ------------------------------------------- |
| body・クエリ・パスパラメータをすべて Zod で検証                   | `apps/api/src/middleware/validate.ts`       |
| SQL はすべてパラメータ化クエリ（文字列連結をしない）              | Drizzle ORM                                 |
| LIKE 検索の `%` と `_` をエスケープ                               | `note-repository.ts`（`escapeLikePattern`） |
| リクエストのサイズを 64KB に制限                                  | `apps/api/src/app.ts`                       |
| 件数の上限（ノート 1000 件、ブックマーク 100 件、1 ページ 50 件） | `apps/api/src/config/config.ts`             |
| 外部 API の応答・キャッシュの中身・環境変数も検証してから使う     | `apps/api/src/lib/npm-registry.ts` ほか     |

## XSS（クロスサイトスクリプティング）

- React は文字列を自動でエスケープします。`dangerouslySetInnerHTML` は使っていません。
- レッスン本文は HTML ではなく構造化データで保存し、React の要素として描画します（`ContentRenderer.tsx`）。
- Content-Security-Policy で、同一オリジンのスクリプトだけを実行させます（`apps/web/public/_headers`）。インラインスクリプトは動きません。
- 外部リンクには `rel="noopener noreferrer"` を付けています。

## クイズの不正防止

正解と解説はブラウザに送らず、採点はサーバーで行います。レッスンの応答に正解が含まれないことは、テストで確認しています（`apps/api/test/lessons.test.ts`）。

## レート制限

`apps/api/src/middleware/rate-limit.ts`

| 対象                              | 上限                          |
| --------------------------------- | ----------------------------- |
| ログイン・登録                    | 接続元ごとに 1 分あたり 10 回 |
| パッケージ検索（外部 API を呼ぶ） | 接続元ごとに 1 分あたり 30 回 |

D1 のカウンターを使った簡易的な実装です。大規模な攻撃への備えとしては、Cloudflare の WAF や Rate Limiting ルールを併用してください。

## レスポンスヘッダー

- API の応答（`apps/api/src/app.ts`）: `Content-Security-Policy: default-src 'none'`、`X-Content-Type-Options`、`Strict-Transport-Security`、`Cache-Control: no-store` など
- 静的ファイル（`apps/web/public/_headers`）: CSP、`X-Frame-Options: DENY`、`Referrer-Policy`、`Permissions-Policy`

## エラーと情報の漏えい

- 想定外のエラーの詳細はログにだけ出し、クライアントには一般的なメッセージを返します（`apps/api/src/middleware/error-handler.ts`）。
- ユーザー情報の応答にパスワードハッシュを含めません（`toUser` で必要な項目だけを取り出す）。
- パスワードやトークンをログに出力しません。

## 秘密情報の管理

- `.dev.vars` と `.env` は `.gitignore` に入れ、コミットしません。
- 現在のアプリは秘密の値（API キーなど）を必要としません。追加する場合は `wrangler secret put` を使い、`wrangler.jsonc` の `vars` には書かないでください。

## 依存パッケージ

```bash
npm audit --omit=dev   # 本番で動くパッケージの脆弱性を確認
```

開発用ツール（ローカルの Workers エミュレーターなど）に対する指摘が出ることがありますが、それらはデプロイされるコードには含まれません。

## このアプリが扱っていないこと

学習用として範囲を絞っているため、次の機能はありません。実際のサービスでは検討が必要です。

- メールアドレスの確認、パスワードの再設定
- 多要素認証
- アカウントのロック、不審なログインの通知
- 監査ログ
