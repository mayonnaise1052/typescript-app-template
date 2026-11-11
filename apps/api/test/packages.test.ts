import { BookmarkSchema, PackageInfoSchema } from '@typequest/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { FetchLike } from '../src/lib/npm-registry';
import { expectError, readJson, resetDatabase, TestClient } from './helpers';

const SearchSchema = z.object({ packages: z.array(PackageInfoSchema) });
const BookmarkResponseSchema = z.object({ bookmark: BookmarkSchema });
const BookmarkListSchema = z.object({ bookmarks: z.array(BookmarkSchema) });

const npmResponse = () =>
  new Response(
    JSON.stringify({
      objects: [{ package: { name: 'zod', version: '4.0.0', description: 'スキーマ検証' } }],
    }),
  );

const zod = { name: 'zod', version: '4.0.0', description: 'スキーマ検証' };

beforeEach(resetDatabase);

describe('GET /api/packages/search', () => {
  it('npm レジストリの検索結果を返す', async () => {
    // 本物の npm には接続せず、偽の fetch を注入します。
    const fetch = vi.fn<FetchLike>().mockImplementation(() => Promise.resolve(npmResponse()));
    const client = new TestClient({ fetch });
    await client.register();

    const response = await client.get('/api/packages/search?q=zod');

    expect(await readJson(response, SearchSchema)).toEqual({ packages: [zod] });
  });

  it('同じ検索語の 2 回目はキャッシュを使い、外部 API を呼ばない', async () => {
    const fetch = vi.fn<FetchLike>().mockImplementation(() => Promise.resolve(npmResponse()));
    const client = new TestClient({ fetch });
    await client.register();

    await client.get('/api/packages/search?q=zod');
    const second = await client.get('/api/packages/search?q=ZOD');

    expect(await readJson(second, SearchSchema)).toEqual({ packages: [zod] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('キャッシュの有効期限が切れたら、もう一度外部 API を呼ぶ', async () => {
    let now = new Date('2026-01-01T00:00:00Z');
    const fetch = vi.fn<FetchLike>().mockImplementation(() => Promise.resolve(npmResponse()));
    const client = new TestClient({ fetch, now: () => now });
    await client.register();

    await client.get('/api/packages/search?q=zod');
    now = new Date('2026-01-01T00:11:00Z'); // 11 分後
    await client.get('/api/packages/search?q=zod');

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('外部 API が失敗したら 502 を返し、内部の詳細は漏らさない', async () => {
    const fetch = vi.fn<FetchLike>().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1'));
    const client = new TestClient({ fetch });
    await client.register();

    const error = await expectError(
      await client.get('/api/packages/search?q=zod'),
      502,
      'EXTERNAL_SERVICE_ERROR',
    );
    expect(error.message).not.toContain('ECONNREFUSED');
  });

  it('検索語がなければ 400 を返す', async () => {
    const client = new TestClient();
    await client.register();
    await expectError(await client.get('/api/packages/search?q='), 400, 'VALIDATION_ERROR');
  });

  it('未ログインでは 401 を返す（外部 API の踏み台にさせない）', async () => {
    const fetch = vi.fn<FetchLike>();
    const response = await new TestClient({ fetch }).get('/api/packages/search?q=zod');
    await expectError(response, 401, 'UNAUTHENTICATED');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('ブックマーク', () => {
  let client: TestClient;

  beforeEach(async () => {
    client = new TestClient();
    await client.register();
  });

  it('追加・一覧・削除ができる', async () => {
    const created = await client.post('/api/packages/bookmarks', zod);
    expect(created.status).toBe(201);
    const { bookmark } = await readJson(created, BookmarkResponseSchema);

    const list = await readJson(await client.get('/api/packages/bookmarks'), BookmarkListSchema);
    expect(list.bookmarks).toEqual([bookmark]);

    expect((await client.delete(`/api/packages/bookmarks/${bookmark.id}`)).status).toBe(200);
    const after = await readJson(await client.get('/api/packages/bookmarks'), BookmarkListSchema);
    expect(after.bookmarks).toEqual([]);
  });

  it('同じパッケージを 2 回追加すると 409 を返す', async () => {
    await client.post('/api/packages/bookmarks', zod);
    await expectError(await client.post('/api/packages/bookmarks', zod), 409, 'CONFLICT');
  });

  it('不正なパッケージ名は 400 を返す', async () => {
    const response = await client.post('/api/packages/bookmarks', { ...zod, name: '<script>' });
    await expectError(response, 400, 'VALIDATION_ERROR');
  });

  it('他人のブックマークは見えず、削除もできない', async () => {
    const created = await client.post('/api/packages/bookmarks', zod);
    const { bookmark } = await readJson(created, BookmarkResponseSchema);

    const other = new TestClient();
    await other.register({ email: 'hanako@example.com' });

    const list = await readJson(await other.get('/api/packages/bookmarks'), BookmarkListSchema);
    expect(list.bookmarks).toEqual([]);
    await expectError(
      await other.delete(`/api/packages/bookmarks/${bookmark.id}`),
      404,
      'NOT_FOUND',
    );
  });
});
