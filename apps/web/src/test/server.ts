import { setupWorker } from 'msw/browser';

/**
 * MSW（Mock Service Worker）のブラウザ版。
 * テスト中のブラウザで Service Worker として動き、fetch を横取りして偽の API 応答を返します。
 * 各テストが `worker.use(...)` で、そのテストに必要な応答だけを登録します。
 */
export const worker = setupWorker();
