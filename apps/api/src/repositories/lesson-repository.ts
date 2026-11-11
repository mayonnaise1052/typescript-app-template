import type { LessonId, Question, UserId } from '@typequest/shared';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { lessonProgress, lessons, questions, type LessonRow } from '../db/schema';

export function createLessonRepository(db: Database) {
  return {
    /** 一覧用。本文などの重い列は取得しません。 */
    async listSummaries() {
      return db
        .select({
          id: lessons.id,
          chapterId: lessons.chapterId,
          position: lessons.position,
          title: lessons.title,
          summary: lessons.summary,
        })
        .from(lessons)
        .orderBy(asc(lessons.position));
    },

    async findById(id: LessonId): Promise<LessonRow | undefined> {
      return db.select().from(lessons).where(eq(lessons.id, id)).get();
    },

    async listQuestions(lessonId: LessonId): Promise<Question[]> {
      const rows = await db
        .select({ data: questions.data })
        .from(questions)
        .where(eq(questions.lessonId, lessonId))
        .orderBy(asc(questions.position));
      return rows.map((row) => row.data);
    },

    async listCompletedLessonIds(userId: UserId): Promise<Set<LessonId>> {
      const rows = await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId));
      return new Set(rows.map((row) => row.lessonId));
    },
  };
}

export type LessonRepository = ReturnType<typeof createLessonRepository>;
