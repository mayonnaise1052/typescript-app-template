import type { UserId } from '@typequest/shared';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users, type UserRow } from '../db/schema';

/**
 * Repository 層: DB への問い合わせだけを担当します。
 * SQL はすべて Drizzle が組み立てるパラメータ化クエリなので、SQL インジェクションは起きません。
 */
export function createUserRepository(db: Database) {
  return {
    async findByEmail(email: string): Promise<UserRow | undefined> {
      return db.select().from(users).where(eq(users.email, email)).get();
    },

    async findById(id: UserId): Promise<UserRow | undefined> {
      return db.select().from(users).where(eq(users.id, id)).get();
    },

    /** メールアドレスが重複していた場合は false を返します。 */
    async insert(row: UserRow): Promise<boolean> {
      const inserted = await db
        .insert(users)
        .values(row)
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });
      return inserted.length > 0;
    },
  };
}

// 戻り値の型を手書きせず、関数から導出します（ReturnType はユーティリティ型の一種）。
export type UserRepository = ReturnType<typeof createUserRepository>;
