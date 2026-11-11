import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { apiCache } from '../db/schema';

export function createCacheRepository(db: Database) {
  return {
    async get(key: string, now: Date): Promise<string | undefined> {
      const row = await db.select().from(apiCache).where(eq(apiCache.key, key)).get();
      return row && row.expiresAt > now ? row.value : undefined;
    },

    async set(key: string, value: string, expiresAt: Date): Promise<void> {
      await db
        .insert(apiCache)
        .values({ key, value, expiresAt })
        .onConflictDoUpdate({ target: apiCache.key, set: { value, expiresAt } });
    },
  };
}

export type CacheRepository = ReturnType<typeof createCacheRepository>;
