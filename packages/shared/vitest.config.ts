import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // *.test-d.ts は「型のテスト」。実行はせず、型チェックだけを行います。
    typecheck: { enabled: true, include: ['src/**/*.test-d.ts'] },
  },
});
