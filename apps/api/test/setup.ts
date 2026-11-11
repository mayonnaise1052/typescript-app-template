import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// 各テストファイルの実行前に、空の DB へマイグレーションを適用します。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
