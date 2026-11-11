import type { D1Migration } from 'cloudflare:test';

// テスト内で `import { env } from 'cloudflare:workers'` したときの型を宣言します。
// 同名の interface は自動で結合される（宣言のマージ）ので、既存の定義に項目を足せます。
declare global {
  namespace Cloudflare {
    // 宣言のマージができるのは interface だけなので、ここでは type ではなく interface を使います。
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Env {
      DB: D1Database;
      ALLOWED_ORIGINS: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
