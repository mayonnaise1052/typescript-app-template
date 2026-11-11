import { sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { rateLimits } from '../db/schema';

export function createRateLimitRepository(db: Database) {
  return {
    /**
     * カウンターを 1 増やし、増やした後の値を返します。
     * 「読んでから書く」と同時リクエストで数え漏れるため、1 つの SQL 文で原子的に行います。
     * ウィンドウが変わっていたら 1 から数え直します。
     */
    async increment(key: string, windowStart: number): Promise<number> {
      const [row] = await db
        .insert(rateLimits)
        .values({ key, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`CASE WHEN ${rateLimits.windowStart} = excluded.window_start THEN ${rateLimits.count} + 1 ELSE 1 END`,
            windowStart: sql`excluded.window_start`,
          },
        })
        .returning({ count: rateLimits.count });
      return row?.count ?? 1;
    },
  };
}

export type RateLimitRepository = ReturnType<typeof createRateLimitRepository>;
