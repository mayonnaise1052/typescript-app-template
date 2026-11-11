import type { LessonId, NoteId, UserId } from '@typequest/shared';
import { and, count, desc, eq, or, sql, type Column, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client';
import { notes, type NoteRow } from '../db/schema';

/** LIKE の特殊文字（% と _）をエスケープし、ユーザーの入力を「ただの文字」として検索します。 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * SQLite の LIKE には既定のエスケープ文字がないため、ESCAPE 句で明示します。
 * pattern は SQL 文字列に連結されず、プレースホルダの値として渡されます。
 */
const likeEscaped = (column: Column, pattern: string): SQL =>
  sql`${column} LIKE ${pattern} ESCAPE '\\'`;

export type NoteFilter = {
  userId: UserId;
  q?: string | undefined;
  lessonId?: LessonId | undefined;
};

function buildWhere(filter: NoteFilter): SQL | undefined {
  // 条件を配列に集めてから and() でつなぎます。undefined の条件は Drizzle が無視します。
  const conditions: (SQL | undefined)[] = [eq(notes.userId, filter.userId)];
  if (filter.lessonId) conditions.push(eq(notes.lessonId, filter.lessonId));
  if (filter.q) {
    const pattern = `%${escapeLikePattern(filter.q)}%`;
    conditions.push(or(likeEscaped(notes.title, pattern), likeEscaped(notes.body, pattern)));
  }
  return and(...conditions);
}

/**
 * 重要: すべての問い合わせに必ず userId の条件を付けています。
 * 「ID を知っていれば他人のノートを読める」という認可の抜け（IDOR）を、構造として防ぎます。
 */
export function createNoteRepository(db: Database) {
  return {
    async list(filter: NoteFilter, page: { limit: number; offset: number }): Promise<NoteRow[]> {
      return db
        .select()
        .from(notes)
        .where(buildWhere(filter))
        .orderBy(desc(notes.updatedAt), desc(notes.id))
        .limit(page.limit)
        .offset(page.offset);
    },

    async count(filter: NoteFilter): Promise<number> {
      const row = await db.select({ value: count() }).from(notes).where(buildWhere(filter)).get();
      return row?.value ?? 0;
    },

    async findById(userId: UserId, id: NoteId): Promise<NoteRow | undefined> {
      return db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .get();
    },

    async insert(row: NoteRow): Promise<void> {
      await db.insert(notes).values(row);
    },

    async update(
      userId: UserId,
      id: NoteId,
      // Pick と Partial の組み合わせ: 「この 3 列のうち、指定されたものだけ」を表します。
      changes: Partial<Pick<NoteRow, 'title' | 'body' | 'lessonId'>> & { updatedAt: Date },
    ): Promise<NoteRow | undefined> {
      const [row] = await db
        .update(notes)
        .set(changes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .returning();
      return row;
    },

    async delete(userId: UserId, id: NoteId): Promise<boolean> {
      const deleted = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .returning({ id: notes.id });
      return deleted.length > 0;
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
