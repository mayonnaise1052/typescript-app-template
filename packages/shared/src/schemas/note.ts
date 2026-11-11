import { z } from 'zod';
import { IsoDateTimeSchema, LessonIdSchema, NoteIdSchema, PaginationQuerySchema } from './common';

export const NOTE_TITLE_MAX = 100;
export const NOTE_BODY_MAX = 5000;

export const NoteSchema = z.object({
  id: NoteIdSchema,
  lessonId: LessonIdSchema.nullable(),
  title: z.string(),
  body: z.string(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const CreateNoteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'タイトルを入力してください')
    .max(NOTE_TITLE_MAX, `タイトルは ${NOTE_TITLE_MAX} 文字以内にしてください`),
  body: z
    .string()
    .trim()
    .min(1, '本文を入力してください')
    .max(NOTE_BODY_MAX, `本文は ${NOTE_BODY_MAX} 文字以内にしてください`),
  lessonId: LessonIdSchema.nullable().default(null),
});

/**
 * 更新は「指定した項目だけ」を変える部分更新です。
 * `.partial()` は型でいう `Partial<T>` に相当します。空の更新は `.refine()` で弾きます。
 */
export const UpdateNoteInputSchema = CreateNoteInputSchema.omit({ lessonId: true })
  .extend({ lessonId: LessonIdSchema.nullable() })
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: '更新する項目を 1 つ以上指定してください',
  });

export const NoteListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  lessonId: LessonIdSchema.optional(),
});

export type Note = z.infer<typeof NoteSchema>;
/** z.input は「検証前」の型。default のあるフィールドが省略可能になります。 */
export type CreateNoteInput = z.input<typeof CreateNoteInputSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;
export type NoteListQuery = z.infer<typeof NoteListQuerySchema>;
