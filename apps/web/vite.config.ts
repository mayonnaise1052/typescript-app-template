import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { msw } from 'msw/vite';
import { defineConfig } from 'vitest/config';

/** Vitest から起動されたときだけ true。テスト専用の設定を本番のビルドに混ぜないために使います。 */
const isTest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [
    react(),
    // React Compiler: 再描画を減らす最適化（メモ化）を、ビルド時に自動で挿入します。
    // useMemo や useCallback を手で書く必要が減ります（docs/specs/0001-...md の 5 章）。
    babel({ presets: [reactCompilerPreset()] }),
    // テスト時だけ、MSW の Service Worker（偽の API 応答を返す仕組み）を配信します。
    // public/ に置かないので、本番のビルド結果には含まれません。
    ...(isTest ? [msw({ mode: 'worker-only' })] : []),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // 開発中は /api へのリクエストを、wrangler dev が動かしている API（8787 番）へ転送します。
    // ブラウザから見ると同一オリジンになるので、Cookie がそのまま使えます。
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    // Browser Mode: コンポーネントテストを、Node 上の模倣環境（jsdom）ではなく
    // 本物の Chromium の中で実行します。操作は Playwright 経由で行われます。
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
      // テストの間、画面を見ながら確認したいときは `npm run test:watch -w @typequest/web -- --browser.headless=false`
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
});
