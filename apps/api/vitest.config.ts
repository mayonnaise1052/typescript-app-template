import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/**
 * API のテスト設定。
 *
 * テストは Node ではなく、本番と同じ Workers ランタイム（workerd）の中で実行されます。
 * D1 もローカルで再現されるので、外部サービスなしで「本物の SQL」を通る結合テストが書けます。
 */
export default defineConfig(async () => {
  // マイグレーション SQL は Node 側で読み込み、バインディングとしてテストに渡します。
  const migrations = await readD1Migrations('./migrations');

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations, ALLOWED_ORIGINS: 'https://allowed.example' },
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
      setupFiles: ['./test/setup.ts'],
      coverage: {
        // Workers ランタイムでは V8 のカバレッジが使えないため、istanbul を使います。
        provider: 'istanbul' as const,
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/content/chapter*.ts'],
      },
    },
  };
});
