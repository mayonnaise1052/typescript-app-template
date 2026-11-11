import { CHAPTERS, type ProgressSummary, type UserId } from '@typequest/shared';
import { calculateStreak } from '../domain/streak';
import type { LessonRepository } from '../repositories/lesson-repository';
import type { ProgressRepository } from '../repositories/progress-repository';

type Deps = {
  lessons: LessonRepository;
  progress: ProgressRepository;
  now: () => Date;
};

export function createProgressService({ lessons, progress, now }: Deps) {
  return {
    async getSummary(userId: UserId): Promise<ProgressSummary> {
      const [summaries, completed, totals, recent, activityDates] = await Promise.all([
        lessons.listSummaries(),
        lessons.listCompletedLessonIds(userId),
        progress.getAttemptTotals(userId),
        progress.listRecentAttempts(userId, 5),
        progress.listRecentActivityDates(userId, 500),
      ]);

      return {
        completedLessons: summaries.filter((lesson) => completed.has(lesson.id)).length,
        totalLessons: summaries.length,
        chapters: CHAPTERS.map((chapter) => {
          const inChapter = summaries.filter((lesson) => lesson.chapterId === chapter.id);
          return {
            chapterId: chapter.id,
            title: chapter.title,
            completed: inChapter.filter((lesson) => completed.has(lesson.id)).length,
            total: inChapter.length,
          };
        }),
        totalAttempts: totals.attempts,
        accuracy: totals.total > 0 ? totals.score / totals.total : null,
        streakDays: calculateStreak(activityDates, now()),
        recentAttempts: recent.map((attempt) => ({
          lessonId: attempt.lessonId,
          lessonTitle: attempt.lessonTitle,
          score: attempt.score,
          total: attempt.total,
          attemptedAt: attempt.createdAt.toISOString(),
        })),
      };
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
