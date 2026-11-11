/**
 * データベースのスキーマ定義。
 *
 * Drizzle ORM ではテーブルを TypeScript のコードとして書きます。ここから
 *   - マイグレーション SQL（`npm run db:generate`）
 *   - 各テーブルの行の型（`typeof users.$inferSelect`）
 * の両方が導かれるため、DB と型がずれません。
 */
import type {
  BookmarkId,
  ChapterId,
  CodeRef,
  ContentBlock,
  LessonId,
  NoteId,
  Question,
  QuestionId,
  UserId,
} from '@typequest/shared';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { PasswordHash } from '../lib/password';

/** 日時は UNIX ミリ秒の整数で保存し、TypeScript 側では Date として扱います。 */
const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const users = sqliteTable('users', {
  // `.$type<UserId>()` で、この列の値を Branded Type として扱わせます。
  id: text('id').primaryKey().$type<UserId>(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull().$type<PasswordHash>(),
  createdAt: timestamp('created_at').notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    // セッショントークンそのものではなく、その SHA-256 ハッシュを保存します。
    // DB が漏れても、ハッシュからは Cookie の値を復元できません。
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey().$type<LessonId>(),
  chapterId: text('chapter_id').notNull().$type<ChapterId>(),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  // JSON として保存する列。読み出し時に自動で JSON.parse されます。
  body: text('body', { mode: 'json' }).notNull().$type<ContentBlock[]>(),
  codeRefs: text('code_refs', { mode: 'json' }).notNull().$type<CodeRef[]>(),
});

export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey().$type<QuestionId>(),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' })
      .$type<LessonId>(),
    position: integer('position').notNull(),
    data: text('data', { mode: 'json' }).notNull().$type<Question>(),
  },
  (table) => [index('questions_lesson_id_idx').on(table.lessonId)],
);

export const lessonProgress = sqliteTable(
  'lesson_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' })
      .$type<LessonId>(),
    completedAt: timestamp('completed_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
);

export const quizAttempts = sqliteTable(
  'quiz_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' })
      .$type<LessonId>(),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [index('quiz_attempts_user_created_idx').on(table.userId, table.createdAt)],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey().$type<NoteId>(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    lessonId: text('lesson_id')
      .references(() => lessons.id, { onDelete: 'set null' })
      .$type<LessonId>(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [index('notes_user_updated_idx').on(table.userId, table.updatedAt)],
);

export const packageBookmarks = sqliteTable(
  'package_bookmarks',
  {
    id: text('id').primaryKey().$type<BookmarkId>(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .$type<UserId>(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [uniqueIndex('package_bookmarks_user_name_idx').on(table.userId, table.name)],
);

/** レート制限用のカウンター（固定ウィンドウ方式）。 */
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull(),
});

/** 外部 API の応答キャッシュ。 */
export const apiCache = sqliteTable('api_cache', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

/** 行の型はスキーマから導出します（手書きしない）。 */
export type UserRow = typeof users.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type LessonRow = typeof lessons.$inferSelect;
export type BookmarkRow = typeof packageBookmarks.$inferSelect;
