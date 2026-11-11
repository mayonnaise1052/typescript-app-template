import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// MSW（Mock Service Worker）: テスト中の fetch を横取りし、偽の API 応答を返します。
// ハンドラが定義されていないリクエストは、見落としを防ぐためエラーにします。
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
