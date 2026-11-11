import {
  appError,
  err,
  ok,
  PublicQuestionSchema,
  type AppError,
  type LessonDetail,
  type LessonId,
  type LessonSummary,
  type Result,
  type UserId,
} from '@typequest/shared';
import type { LessonRepository } from '../repositories/lesson-repository';

type Deps = { lessons: LessonRepository };

export function createLessonService({ lessons }: Deps) {
  async function list(userId: UserId): Promise<LessonSummary[]> {
    // 互いに依存しない問い合わせは Promise.all で並列に実行します。
    const [rows, completed] = await Promise.all([
      lessons.listSummaries(),
      lessons.listCompletedLessonIds(userId),
    ]);
    return rows.map((row) => ({
      id: row.id,
      chapterId: row.chapterId,
      order: row.position,
      title: row.title,
      summary: row.summary,
      completed: completed.has(row.id),
    }));
  }

  return {
    list,

    async get(userId: UserId, id: LessonId): Promise<Result<LessonDetail, AppError>> {
      const [row, questions, summaries] = await Promise.all([
        lessons.findById(id),
        lessons.listQuestions(id),
        list(userId),
      ]);
      if (!row) return err(appError('NOT_FOUND', 'レッスンが見つかりません'));

      const index = summaries.findIndex((summary) => summary.id === id);
      return ok({
        id: row.id,
        chapterId: row.chapterId,
        order: row.position,
        title: row.title,
        summary: row.summary,
        completed: summaries[index]?.completed ?? false,
        body: row.body,
        codeRefs: row.codeRefs,
        // 公開用スキーマで parse すると、正解と解説のフィールドが取り除かれます。
        // 「消し忘れ」が起きないよう、手作業ではなくスキーマに任せています。
        questions: questions.map((question) => PublicQuestionSchema.parse(question)),
        previousLessonId: summaries[index - 1]?.id ?? null,
        nextLessonId: summaries[index + 1]?.id ?? null,
      });
    },
  };
}

export type LessonService = ReturnType<typeof createLessonService>;
