import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;

/**
 * E2E テストの設定。
 *
 * `webServer` により、テスト開始前に「フロントをビルド → テスト専用の DB を用意 →
 * wrangler dev で起動」までを自動で行います。開発用の DB（.wrangler/state）とは
 * 別の場所（.wrangler/e2e）を使うので、手元のデータには影響しません。
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run e2e:serve',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
