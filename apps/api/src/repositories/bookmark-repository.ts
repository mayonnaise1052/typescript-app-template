import type { BookmarkId, UserId } from '@typequest/shared';
import { and, count, desc, eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { packageBookmarks, type BookmarkRow } from '../db/schema';

export function createBookmarkRepository(db: Database) {
  return {
    async list(userId: UserId): Promise<BookmarkRow[]> {
      return db
        .select()
        .from(packageBookmarks)
        .where(eq(packageBookmarks.userId, userId))
        .orderBy(desc(packageBookmarks.createdAt));
    },

    async count(userId: UserId): Promise<number> {
      const row = await db
        .select({ value: count() })
        .from(packageBookmarks)
        .where(eq(packageBookmarks.userId, userId))
        .get();
      return row?.value ?? 0;
    },

    /** 同じパッケージをすでにブックマーク済みなら false を返します。 */
    async insert(row: BookmarkRow): Promise<boolean> {
      const inserted = await db
        .insert(packageBookmarks)
        .values(row)
        .onConflictDoNothing()
        .returning({ id: packageBookmarks.id });
      return inserted.length > 0;
    },

    async delete(userId: UserId, id: BookmarkId): Promise<boolean> {
      const deleted = await db
        .delete(packageBookmarks)
        .where(and(eq(packageBookmarks.id, id), eq(packageBookmarks.userId, userId)))
        .returning({ id: packageBookmarks.id });
      return deleted.length > 0;
    },
  };
}

export type BookmarkRepository = ReturnType<typeof createBookmarkRepository>;
