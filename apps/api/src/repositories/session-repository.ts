import type { UserId } from '@typequest/shared';
import { and, eq, lt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions, users } from '../db/schema';

export function createSessionRepository(db: Database) {
  return {
    async insert(row: typeof sessions.$inferInsert): Promise<void> {
      await db.insert(sessions).values(row);
    },

    /** トークンのハッシュからセッションとユーザーをまとめて取得します。 */
    async findWithUser(tokenHash: string) {
      return db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.tokenHash, tokenHash))
        .get();
    },

    async delete(tokenHash: string): Promise<void> {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },

    async deleteExpiredForUser(userId: UserId, now: Date): Promise<void> {
      await db
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
