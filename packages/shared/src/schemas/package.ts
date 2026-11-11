import { z } from 'zod';
import { BookmarkIdSchema, IsoDateTimeSchema } from './common';

/** npm のパッケージ名の規則（スコープ付きも可、最大 214 文字） */
const PackageNameSchema = z
  .string()
  .max(214)
  .regex(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/, 'パッケージ名が不正です');

export const PackageSearchQuerySchema = z.object({
  q: z.string().trim().min(1, '検索語を入力してください').max(100),
});

/** 外部 API（npm レジストリ）の応答を、このアプリで使う形に正規化したもの。 */
export const PackageInfoSchema = z.object({
  name: PackageNameSchema,
  version: z.string().max(64),
  description: z.string().max(500),
});

export const CreateBookmarkInputSchema = PackageInfoSchema;

export const BookmarkSchema = PackageInfoSchema.extend({
  id: BookmarkIdSchema,
  createdAt: IsoDateTimeSchema,
});

export type PackageSearchQuery = z.infer<typeof PackageSearchQuerySchema>;
export type PackageInfo = z.infer<typeof PackageInfoSchema>;
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>;
export type Bookmark = z.infer<typeof BookmarkSchema>;
