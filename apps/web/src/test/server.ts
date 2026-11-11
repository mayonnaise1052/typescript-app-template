import { setupServer } from 'msw/node';

/** 各テストが `server.use(...)` で、そのテストに必要な応答だけを登録します。 */
export const server = setupServer();
