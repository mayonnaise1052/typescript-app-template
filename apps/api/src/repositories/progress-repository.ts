import type { LessonId, UserId } from '@typequest/shared';
import { count, desc, eq, sum } from 'drizzle-orm';
import type { Database } from '../db/client';
import { lessonProgress, lessons, quizAttempts } from '../db/schema';

export function createProgressRepository(db: Database) {
  return {
    /**
     * 解答の記録と（合格時の）レッスン完了を、1 つのトランザクションとして実行します。
     * D1 では `db.batch()` に渡した文がまとめて成功するか、まとめて失敗します。
     */
    async recordAttempt(input: {
      userId: UserId;
      lessonId: LessonId;
      score: number;
      total: number;
      passed: boolean;
      now: Date;
    }): Promise<void> {
      const insertAttempt = db.insert(quizAttempts).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        lessonId: input.lessonId,
        score: input.score,
        total: input.total,
        createdAt: input.now,
      });

      if (!input.passed) {
        await insertAttempt;
        return;
      }

      await db.batch([
        insertAttempt,
        db
          .insert(lessonProgress)
          .values({ userId: input.userId, lessonId: input.lessonId, completedAt: input.now })
          // すでに完了済みなら、最初の完了日時を残します。
          .onConflictDoNothing(),
      ]);
    },

    async getAttemptTotals(userId: UserId) {
      const row = await db
        .select({
          attempts: count(),
          score: sum(quizAttempts.score).mapWith(Number),
          total: sum(quizAttempts.total).mapWith(Number),
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .get();
      return { attempts: row?.attempts ?? 0, score: row?.score ?? 0, total: row?.total ?? 0 };
    },

    async listRecentAttempts(userId: UserId, limit: number) {
      return db
        .select({
          lessonId: quizAttempts.lessonId,
          lessonTitle: lessons.title,
          score: quizAttempts.score,
          total: quizAttempts.total,
          createdAt: quizAttempts.createdAt,
        })
        .from(quizAttempts)
        .innerJoin(lessons, eq(quizAttempts.lessonId, lessons.id))
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(limit);
    },

    /** ストリーク計算用に、直近の学習日時を取得します。 */
    async listRecentActivityDates(userId: UserId, limit: number): Promise<Date[]> {
      const rows = await db
        .select({ createdAt: quizAttempts.createdAt })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
        .orderBy(desc(quizAttempts.createdAt))
        .limit(limit);
      return rows.map((row) => row.createdAt);
    },
  };
}

export type ProgressRepository = ReturnType<typeof createProgressRepository>;
