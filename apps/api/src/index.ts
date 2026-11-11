import { createApp } from './app';

export type { AppType } from './app';

/** Cloudflare Workers のエントリーポイント。Hono のアプリは fetch ハンドラを持っています。 */
export default createApp();
