import { LessonIdSchema } from '@typequest/shared';
import { z } from 'zod';

/**
 * ノート一覧の検索条件（`/notes?page=2&q=…&lessonId=…`）。
 *
 * ルートの validateSearch に渡すと、画面の部品は検証済みで型の付いた値を受け取れます
 * （page は number、lessonId は LessonId など）。
 *
 * - `.default(...)`: 指定がないときの値。リンクを書くときに省略できるようになる
 * - `.catch(...)`:  不正な値（`?page=abc` など）のときの値。URL を手で書き換えられても画面は壊れない
 */
export const NotesSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  q: z.string().trim().max(100).default('').catch(''),
  lessonId: LessonIdSchema.optional().catch(undefined),
});

export type NotesSearch = z.infer<typeof NotesSearchSchema>;
