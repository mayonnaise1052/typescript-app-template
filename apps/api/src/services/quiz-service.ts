import {
  appError,
  err,
  ok,
  type AppError,
  type LessonId,
  type QuizResult,
  type QuizSubmission,
  type Result,
  type UserId,
} from '@typequest/shared';
import { gradeQuiz } from '../domain/grading';
import type { LessonRepository } from '../repositories/lesson-repository';
import type { ProgressRepository } from '../repositories/progress-repository';

type Deps = {
  lessons: LessonRepository;
  progress: ProgressRepository;
  now: () => Date;
};

export function createQuizService({ lessons, progress, now }: Deps) {
  return {
    async submit(
      userId: UserId,
      lessonId: LessonId,
      submission: QuizSubmission,
    ): Promise<Result<QuizResult, AppError>> {
      const questions = await lessons.listQuestions(lessonId);
      if (questions.length === 0) {
        return err(appError('NOT_FOUND', 'レッスンが見つかりません'));
      }

      const graded = gradeQuiz(questions, submission.answers);
      const attemptedAt = now();
      await progress.recordAttempt({
        userId,
        lessonId,
        score: graded.score,
        total: graded.total,
        passed: graded.passed,
        now: attemptedAt,
      });

      return ok({ lessonId, ...graded, attemptedAt: attemptedAt.toISOString() });
    },
  };
}

export type QuizService = ReturnType<typeof createQuizService>;
