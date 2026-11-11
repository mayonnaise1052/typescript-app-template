import type { ChapterId, CodeRef, ContentBlock, Question } from '@typequest/shared';

/**
 * ユニオン型の各メンバーに対して個別に Omit を適用する型。
 *
 * 普通の `Omit<Question, 'id'>` は、ユニオン全体を 1 つのオブジェクトとして扱うため、
 * 各メンバー固有のフィールド（answerIndex など）が失われてしまいます。
 * `T extends unknown ? ... : never` と書くと条件型がユニオンに「分配」され、
 * メンバーごとに Omit が適用されます。
 *
 * 関連レッスン: conditional-types
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** 教材として書く問題。ID はレッスン ID と順番から自動で振ります。 */
export type QuestionContent = DistributiveOmit<Question, 'id'>;

export type LessonContent = {
  id: string;
  chapterId: ChapterId;
  title: string;
  summary: string;
  body: ContentBlock[];
  codeRefs: CodeRef[];
  questions: QuestionContent[];
};

// ---- 教材を短く書くための小さなヘルパー ----

export const h = (text: string): ContentBlock => ({ type: 'heading', text });
export const p = (text: string): ContentBlock => ({ type: 'paragraph', text });
export const code = (source: string, caption?: string): ContentBlock =>
  caption === undefined
    ? { type: 'code', code: source.trim() }
    : { type: 'code', code: source.trim(), caption };
export const list = (...items: string[]): ContentBlock => ({ type: 'list', items });
export const info = (text: string): ContentBlock => ({ type: 'callout', tone: 'info', text });
export const warn = (text: string): ContentBlock => ({ type: 'callout', tone: 'warning', text });

type QuestionExtras = { code?: string };

export const single = (
  prompt: string,
  choices: string[],
  answerIndex: number,
  explanation: string,
  extras: QuestionExtras = {},
): QuestionContent => ({
  kind: 'single-choice',
  prompt,
  choices,
  answerIndex,
  explanation,
  ...extras,
});

export const multi = (
  prompt: string,
  choices: string[],
  answerIndexes: number[],
  explanation: string,
  extras: QuestionExtras = {},
): QuestionContent => ({
  kind: 'multiple-choice',
  prompt,
  choices,
  answerIndexes,
  explanation,
  ...extras,
});

export const blank = (
  prompt: string,
  source: string,
  acceptedAnswers: string[],
  explanation: string,
): QuestionContent => ({
  kind: 'fill-blank',
  prompt,
  code: source.trim(),
  acceptedAnswers,
  explanation,
});
