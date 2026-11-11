import { z } from 'zod';

/**
 * ID のスキーマ。`.brand()` で Branded Type になるため、
 * `UserId` を要求する関数に `LessonId` を渡すとコンパイルエラーになります。
 * 型は `z.infer` でスキーマから導出するので、スキーマと型がずれることがありません。
 */
export const UserIdSchema = z.string().min(1).max(64).brand<'UserId'>();
export const LessonIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,64}$/)
  .brand<'LessonId'>();
export const QuestionIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,80}$/)
  .brand<'QuestionId'>();
export const NoteIdSchema = z.uuid().brand<'NoteId'>();
export const BookmarkIdSchema = z.uuid().brand<'BookmarkId'>();

export type UserId = z.infer<typeof UserIdSchema>;
export type LessonId = z.infer<typeof LessonIdSchema>;
export type QuestionId = z.infer<typeof QuestionIdSchema>;
export type NoteId = z.infer<typeof NoteIdSchema>;
export type BookmarkId = z.infer<typeof BookmarkIdSchema>;

/** JSON では Date を送れないため、日時は ISO 8601 文字列でやり取りします。 */
export const IsoDateTimeSchema = z.iso.datetime();

export const MAX_PAGE_SIZE = 50;

/**
 * ページネーションのクエリ。クエリ文字列は常に string で届くので、
 * `z.coerce.number()` で数値に変換してから検証します。
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** ジェネリクスの例: どんな要素型 T にも使える「ページ付き一覧」の型。 */
export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function paginate<T>(items: T[], totalItems: number, query: PaginationQuery): Paginated<T> {
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
  };
}
