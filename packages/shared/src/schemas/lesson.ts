import { z } from 'zod';
import { LessonIdSchema } from './common';
import { PublicQuestionSchema } from './quiz';

/** 章の定義。`as const` により id がリテラル型として保たれます。 */
export const CHAPTERS = [
  { id: 'basics', title: '第1章 基礎' },
  { id: 'intermediate', title: '第2章 中級' },
  { id: 'advanced', title: '第3章 上級' },
  { id: 'practical', title: '第4章 実務' },
] as const;

/** 'basics' | 'intermediate' | 'advanced' | 'practical' */
export type ChapterId = (typeof CHAPTERS)[number]['id'];

// CHAPTERS から id のタプルを作る。map の結果は string[] に広がってしまうため、
// 「空でないタプル」であることを型アサーションで伝えています（z.enum の要件）。
const chapterIds = CHAPTERS.map((chapter) => chapter.id) as [ChapterId, ...ChapterId[]];
export const ChapterIdSchema = z.enum(chapterIds);

/**
 * レッスン本文を構成するブロック。
 *
 * `type` を判別子にした判別可能ユニオンです。HTML 文字列ではなく構造化データで持つことで、
 * 描画側（apps/web の ContentRenderer）は switch で安全に分岐でき、XSS の心配もありません。
 */
export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('code'), code: z.string(), caption: z.string().optional() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()).min(1) }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['info', 'warning']),
    text: z.string(),
  }),
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

/** 「この概念はアプリのどこで使われているか」へのポインタ。 */
export const CodeRefSchema = z.object({
  path: z.string(),
  description: z.string(),
});

export type CodeRef = z.infer<typeof CodeRefSchema>;

export const LessonSummarySchema = z.object({
  id: LessonIdSchema,
  chapterId: ChapterIdSchema,
  order: z.number().int(),
  title: z.string(),
  summary: z.string(),
  completed: z.boolean(),
});

/** `.extend()` で既存スキーマにフィールドを足します（型でいう交差型 / extends に相当）。 */
export const LessonDetailSchema = LessonSummarySchema.extend({
  body: z.array(ContentBlockSchema),
  codeRefs: z.array(CodeRefSchema),
  questions: z.array(PublicQuestionSchema),
  previousLessonId: LessonIdSchema.nullable(),
  nextLessonId: LessonIdSchema.nullable(),
});

export type LessonSummary = z.infer<typeof LessonSummarySchema>;
export type LessonDetail = z.infer<typeof LessonDetailSchema>;
