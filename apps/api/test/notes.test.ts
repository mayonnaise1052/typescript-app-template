import { NoteSchema, type Note } from '@typequest/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { escapeLikePattern } from '../src/repositories/note-repository';
import { expectError, readJson, resetDatabase, TestClient } from './helpers';

const NoteResponseSchema = z.object({ note: NoteSchema });
const NoteListSchema = z.object({
  items: z.array(NoteSchema),
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

async function createNote(
  client: TestClient,
  input: { title: string; body?: string; lessonId?: string | null },
): Promise<Note> {
  const response = await client.post('/api/notes', { body: '本文', ...input });
  expect(response.status).toBe(201);
  return (await readJson(response, NoteResponseSchema)).note;
}

let client: TestClient;

beforeEach(async () => {
  await resetDatabase();
  client = new TestClient();
  await client.register();
});

describe('ノートの作成・取得・更新・削除', () => {
  it('作成したノートを取得できる', async () => {
    const created = await createNote(client, {
      title: ' ジェネリクスのメモ ',
      body: 'T は型の引数',
      lessonId: 'generics',
    });
    expect(created).toMatchObject({ title: 'ジェネリクスのメモ', lessonId: 'generics' });

    const fetched = await readJson(
      await client.get(`/api/notes/${created.id}`),
      NoteResponseSchema,
    );
    expect(fetched.note).toEqual(created);
  });

  it('指定した項目だけを更新する', async () => {
    const note = await createNote(client, { title: '元のタイトル', body: '元の本文' });

    const response = await client.patch(`/api/notes/${note.id}`, { title: '新しいタイトル' });

    const updated = (await readJson(response, NoteResponseSchema)).note;
    expect(updated).toMatchObject({ title: '新しいタイトル', body: '元の本文' });
  });

  it('削除したノートは取得できない', async () => {
    const note = await createNote(client, { title: '消すノート' });

    expect((await client.delete(`/api/notes/${note.id}`)).status).toBe(200);
    await expectError(await client.get(`/api/notes/${note.id}`), 404, 'NOT_FOUND');
  });

  it('不正な入力は 400 を返す', async () => {
    await expectError(
      await client.post('/api/notes', { title: '', body: 'x' }),
      400,
      'VALIDATION_ERROR',
    );
    await expectError(
      await client.post('/api/notes', { title: 'x'.repeat(101), body: 'x' }),
      400,
      'VALIDATION_ERROR',
    );
  });

  it('存在しないレッスンには紐付けられない', async () => {
    const response = await client.post('/api/notes', {
      title: 't',
      body: 'b',
      lessonId: 'no-such-lesson',
    });
    const error = await expectError(response, 400, 'VALIDATION_ERROR');
    expect(error.details).toHaveProperty('lessonId');
  });

  it('空の更新は 400 を返す', async () => {
    const note = await createNote(client, { title: 't' });
    await expectError(await client.patch(`/api/notes/${note.id}`, {}), 400, 'VALIDATION_ERROR');
  });

  it('UUID でない ID は 400 を返す', async () => {
    await expectError(await client.get('/api/notes/1%20OR%201=1'), 400, 'VALIDATION_ERROR');
  });
});

describe('ノートの一覧・検索・ページネーション', () => {
  it('更新が新しい順に、ページごとに返す', async () => {
    let now = new Date('2026-01-01T00:00:00Z');
    const timed = new TestClient({ now: () => now });
    await timed.register({ email: 'timed@example.com' });
    for (let i = 1; i <= 5; i++) {
      now = new Date(now.getTime() + 1000);
      await createNote(timed, { title: `ノート${i}` });
    }

    const page1 = await readJson(await timed.get('/api/notes?page=1&pageSize=2'), NoteListSchema);
    const page3 = await readJson(await timed.get('/api/notes?page=3&pageSize=2'), NoteListSchema);

    expect(page1).toMatchObject({ page: 1, pageSize: 2, totalItems: 5, totalPages: 3 });
    expect(page1.items.map((note) => note.title)).toEqual(['ノート5', 'ノート4']);
    expect(page3.items.map((note) => note.title)).toEqual(['ノート1']);
  });

  it('タイトルと本文を検索できる', async () => {
    await createNote(client, { title: 'ジェネリクス', body: '型の引数' });
    await createNote(client, { title: '条件型', body: 'infer で取り出す' });

    const byTitle = await readJson(await client.get('/api/notes?q=ジェネ'), NoteListSchema);
    const byBody = await readJson(await client.get('/api/notes?q=infer'), NoteListSchema);

    expect(byTitle.items.map((note) => note.title)).toEqual(['ジェネリクス']);
    expect(byBody.items.map((note) => note.title)).toEqual(['条件型']);
  });

  it('検索語の % や _ は、ワイルドカードではなく文字として扱う', async () => {
    await createNote(client, { title: '進捗 100% 達成' });
    await createNote(client, { title: '進捗 100 件' });

    const result = await readJson(
      await client.get(`/api/notes?q=${encodeURIComponent('100%')}`),
      NoteListSchema,
    );

    expect(result.items.map((note) => note.title)).toEqual(['進捗 100% 達成']);
    expect(escapeLikePattern('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('SQL として解釈されそうな検索語も、ただの文字列として扱われる', async () => {
    await createNote(client, { title: '普通のノート' });

    const response = await client.get(
      `/api/notes?q=${encodeURIComponent("' OR '1'='1'; DROP TABLE notes; --")}`,
    );

    expect((await readJson(response, NoteListSchema)).items).toEqual([]);
    // テーブルは無事
    expect((await readJson(await client.get('/api/notes'), NoteListSchema)).totalItems).toBe(1);
  });

  it('レッスンで絞り込める', async () => {
    await createNote(client, { title: 'A', lessonId: 'generics' });
    await createNote(client, { title: 'B', lessonId: 'narrowing' });
    await createNote(client, { title: 'C' });

    const result = await readJson(await client.get('/api/notes?lessonId=generics'), NoteListSchema);
    expect(result.items.map((note) => note.title)).toEqual(['A']);
  });

  it('範囲外のページサイズは 400 を返す', async () => {
    await expectError(await client.get('/api/notes?pageSize=1000'), 400, 'VALIDATION_ERROR');
  });
});

/**
 * 認可のテスト。
 * 「ログインしていれば誰のデータでも触れる」という不具合（IDOR）は、
 * 機能のテストだけでは見つかりません。別のユーザーで試すテストを必ず書きます。
 */
describe('認可: 他人のノートにはアクセスできない', () => {
  let note: Note;
  let other: TestClient;

  beforeEach(async () => {
    note = await createNote(client, { title: '太郎の秘密のメモ' });
    other = new TestClient();
    await other.register({ email: 'hanako@example.com', displayName: '花子' });
  });

  it('取得できない（存在を悟らせないよう 404 を返す）', async () => {
    await expectError(await other.get(`/api/notes/${note.id}`), 404, 'NOT_FOUND');
  });

  it('更新できない', async () => {
    await expectError(
      await other.patch(`/api/notes/${note.id}`, { title: '書き換え' }),
      404,
      'NOT_FOUND',
    );
    const mine = await readJson(await client.get(`/api/notes/${note.id}`), NoteResponseSchema);
    expect(mine.note.title).toBe('太郎の秘密のメモ');
  });

  it('削除できない', async () => {
    await expectError(await other.delete(`/api/notes/${note.id}`), 404, 'NOT_FOUND');
    expect((await client.get(`/api/notes/${note.id}`)).status).toBe(200);
  });

  it('一覧や検索に他人のノートは含まれない', async () => {
    const list = await readJson(await other.get('/api/notes'), NoteListSchema);
    const search = await readJson(await other.get('/api/notes?q=秘密'), NoteListSchema);
    expect(list.items).toEqual([]);
    expect(search.items).toEqual([]);
  });

  it('未ログインでは 401 を返す', async () => {
    await expectError(await new TestClient().get(`/api/notes/${note.id}`), 401, 'UNAUTHENTICATED');
  });
});
