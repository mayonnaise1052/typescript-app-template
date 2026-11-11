import { z } from 'zod';
import { IsoDateTimeSchema, LessonIdSchema } from './common';
import { ChapterIdSchema } from './lesson';

export const ChapterProgressSchema = z.object({
  chapterId: ChapterIdSchema,
  title: z.string(),
  completed: z.number().int(),
  total: z.number().int(),
});

export const RecentAttemptSchema = z.object({
  lessonId: LessonIdSchema,
  lessonTitle: z.string(),
  score: z.number().int(),
  total: z.number().int(),
  attemptedAt: IsoDateTimeSchema,
});

export const ProgressSummarySchema = z.object({
  completedLessons: z.number().int(),
  totalLessons: z.number().int(),
  chapters: z.array(ChapterProgressSchema),
  totalAttempts: z.number().int(),
  /** 全解答に対する正答率（0〜1）。まだ解答がなければ null。 */
  accuracy: z.number().min(0).max(1).nullable(),
  /** 今日（または昨日）まで連続して学習した日数 */
  streakDays: z.number().int(),
  recentAttempts: z.array(RecentAttemptSchema),
});

export type ChapterProgress = z.infer<typeof ChapterProgressSchema>;
export type RecentAttempt = z.infer<typeof RecentAttemptSchema>;
export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;
