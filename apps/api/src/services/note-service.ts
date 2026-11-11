import {
  appError,
  err,
  ok,
  paginate,
  type AppError,
  type LessonId,
  type Note,
  type NoteId,
  type NoteListQuery,
  type Paginated,
  type Result,
  type UpdateNoteInput,
  type UserId,
} from '@typequest/shared';
import { MAX_NOTES_PER_USER } from '../config/config';
import type { NoteRow } from '../db/schema';
import type { LessonRepository } from '../repositories/lesson-repository';
import type { NoteRepository } from '../repositories/note-repository';

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    lessonId: row.lessonId,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type Deps = {
  notes: NoteRepository;
  lessons: LessonRepository;
  now: () => Date;
};

const notFound = () => err(appError('NOT_FOUND', 'ノートが見つかりません'));

export function createNoteService({ notes, lessons, now }: Deps) {
  async function lessonExists(lessonId: LessonId | null | undefined): Promise<boolean> {
    if (lessonId === null || lessonId === undefined) return true;
    return (await lessons.findById(lessonId)) !== undefined;
  }

  const unknownLesson = () =>
    err(
      appError('VALIDATION_ERROR', '入力内容を確認してください', {
        lessonId: ['指定されたレッスンは存在しません'],
      }),
    );

  return {
    async list(userId: UserId, query: NoteListQuery): Promise<Paginated<Note>> {
      const filter = { userId, q: query.q, lessonId: query.lessonId };
      const [rows, total] = await Promise.all([
        notes.list(filter, {
          limit: query.pageSize,
          offset: (query.page - 1) * query.pageSize,
        }),
        notes.count(filter),
      ]);
      return paginate(rows.map(toNote), total, query);
    },

    async get(userId: UserId, id: NoteId): Promise<Result<Note, AppError>> {
      // 他人のノートは「権限がない（403）」ではなく「存在しない（404）」として扱います。
      // 403 を返すと、その ID のノートが存在すること自体が伝わってしまうためです。
      const row = await notes.findById(userId, id);
      return row ? ok(toNote(row)) : notFound();
    },

    async create(
      userId: UserId,
      input: { title: string; body: string; lessonId: LessonId | null },
    ): Promise<Result<Note, AppError>> {
      if (!(await lessonExists(input.lessonId))) return unknownLesson();
      if ((await notes.count({ userId })) >= MAX_NOTES_PER_USER) {
        return err(appError('CONFLICT', `ノートは ${MAX_NOTES_PER_USER} 件まで作成できます`));
      }

      const timestamp = now();
      const row: NoteRow = {
        id: crypto.randomUUID() as NoteId,
        userId,
        lessonId: input.lessonId,
        title: input.title,
        body: input.body,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await notes.insert(row);
      return ok(toNote(row));
    },

    async update(
      userId: UserId,
      id: NoteId,
      input: UpdateNoteInput,
    ): Promise<Result<Note, AppError>> {
      if (!(await lessonExists(input.lessonId))) return unknownLesson();

      const row = await notes.update(userId, id, {
        // 指定された（undefined でない）項目だけを更新対象に含めます。
        ...(input.title !== undefined && { title: input.title }),
        ...(input.body !== undefined && { body: input.body }),
        ...(input.lessonId !== undefined && { lessonId: input.lessonId }),
        updatedAt: now(),
      });
      return row ? ok(toNote(row)) : notFound();
    },

    async delete(userId: UserId, id: NoteId): Promise<Result<null, AppError>> {
      return (await notes.delete(userId, id)) ? ok(null) : notFound();
    },
  };
}

export type NoteService = ReturnType<typeof createNoteService>;
