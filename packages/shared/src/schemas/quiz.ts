import { z } from 'zod';
import { IsoDateTimeSchema, LessonIdSchema, QuestionIdSchema } from './common';

/**
 * クイズの問題。`kind` を判別子にした判別可能ユニオンです。
 *
 * - single-choice:   選択肢から 1 つ選ぶ
 * - multiple-choice: 選択肢から当てはまるものをすべて選ぶ
 * - fill-blank:      空欄に入るコードを入力する
 */
const questionBase = {
  id: QuestionIdSchema,
  prompt: z.string(),
  /** 問題文に添えるコード例 */
  code: z.string().optional(),
  explanation: z.string(),
};

const SingleChoiceQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal('single-choice'),
  choices: z.array(z.string()).min(2),
  answerIndex: z.number().int().min(0),
});

const MultipleChoiceQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal('multiple-choice'),
  choices: z.array(z.string()).min(2),
  answerIndexes: z.array(z.number().int().min(0)).min(1),
});

const FillBlankQuestionSchema = z.object({
  ...questionBase,
  kind: z.literal('fill-blank'),
  acceptedAnswers: z.array(z.string()).min(1),
});

/** 正解を含む完全な問題。サーバー内部だけで扱います。 */
export const QuestionSchema = z.discriminatedUnion('kind', [
  SingleChoiceQuestionSchema,
  MultipleChoiceQuestionSchema,
  FillBlankQuestionSchema,
]);

/**
 * クライアントに送る問題。正解と解説を `.omit()` で取り除いています。
 * 正解をブラウザに渡さないことが、サーバー側採点の前提です。
 */
export const PublicQuestionSchema = z.discriminatedUnion('kind', [
  SingleChoiceQuestionSchema.omit({ answerIndex: true, explanation: true }),
  MultipleChoiceQuestionSchema.omit({ answerIndexes: true, explanation: true }),
  FillBlankQuestionSchema.omit({ acceptedAnswers: true, explanation: true }),
]);

export type Question = z.infer<typeof QuestionSchema>;
export type PublicQuestion = z.infer<typeof PublicQuestionSchema>;
export type QuestionKind = Question['kind'];

/** ユーザーの解答。問題と同じ `kind` で判別します。 */
export const AnswerSchema = z.discriminatedUnion('kind', [
  z.object({
    questionId: QuestionIdSchema,
    kind: z.literal('single-choice'),
    selectedIndex: z.number().int().min(0).max(20),
  }),
  z.object({
    questionId: QuestionIdSchema,
    kind: z.literal('multiple-choice'),
    selectedIndexes: z.array(z.number().int().min(0).max(20)).max(20),
  }),
  z.object({
    questionId: QuestionIdSchema,
    kind: z.literal('fill-blank'),
    text: z.string().max(200),
  }),
]);

export const QuizSubmissionSchema = z.object({
  answers: z.array(AnswerSchema).max(20),
});

export type Answer = z.infer<typeof AnswerSchema>;
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

/** 採点後に明かす正解。 */
export const CorrectAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('single-choice'), answerIndex: z.number().int() }),
  z.object({ kind: z.literal('multiple-choice'), answerIndexes: z.array(z.number().int()) }),
  z.object({ kind: z.literal('fill-blank'), acceptedAnswers: z.array(z.string()) }),
]);

export const QuestionResultSchema = z.object({
  questionId: QuestionIdSchema,
  correct: z.boolean(),
  correctAnswer: CorrectAnswerSchema,
  explanation: z.string(),
});

export const QuizResultSchema = z.object({
  lessonId: LessonIdSchema,
  score: z.number().int(),
  total: z.number().int(),
  passed: z.boolean(),
  results: z.array(QuestionResultSchema),
  attemptedAt: IsoDateTimeSchema,
});

export type CorrectAnswer = z.infer<typeof CorrectAnswerSchema>;
export type QuestionResult = z.infer<typeof QuestionResultSchema>;
export type QuizResult = z.infer<typeof QuizResultSchema>;
