import { describe, expect, it, vi } from 'vitest';
import { createNpmRegistryClient, type FetchLike } from './npm-registry';

/**
 * 外部 API のテストでは、本物の npm レジストリへは接続しません。
 * fetch を偽物（モック）に差し替え、「相手がこう応答したら、こう振る舞う」を確かめます。
 */
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const searchBody = {
  objects: [
    { package: { name: 'zod', version: '4.0.0', description: 'スキーマ検証' } },
    { package: { name: 'hono', version: '4.1.0' } },
  ],
};

function createClient(fetch: FetchLike) {
  // リトライ前の待機を即座に終わらせ、テストを速くします。
  return createNpmRegistryClient({ fetch, sleep: () => Promise.resolve() });
}

describe('npm レジストリクライアント', () => {
  it('検索結果をこのアプリの形に正規化する', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse(searchBody));

    const result = await createClient(fetch).search('schema validation');

    expect(result).toEqual({
      ok: true,
      value: [
        { name: 'zod', version: '4.0.0', description: 'スキーマ検証' },
        { name: 'hono', version: '4.1.0', description: '' },
      ],
    });
  });

  it('検索語を URL エンコードして送る', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ objects: [] }));

    await createClient(fetch).search('a&size=999 #x');

    const url = new URL(fetch.mock.calls[0]?.[0] ?? '');
    expect(url.origin).toBe('https://registry.npmjs.org');
    expect(url.searchParams.get('text')).toBe('a&size=999 #x');
    expect(url.searchParams.get('size')).toBe('10');
  });

  it('5xx の応答はリトライし、成功すれば結果を返す', async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(searchBody));

    const result = await createClient(fetch).search('zod');

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('通信エラーが続いたら、上限までリトライしてエラーを返す', async () => {
    const fetch = vi.fn<FetchLike>().mockRejectedValue(new TypeError('network error'));

    const result = await createClient(fetch).search('zod');

    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_SERVICE_ERROR' } });
    expect(fetch).toHaveBeenCalledTimes(3); // 初回 + リトライ 2 回
  });

  it('4xx の応答はリトライしない', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({}, 400));

    const result = await createClient(fetch).search('zod');

    expect(result.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('想定と違う形の応答はエラーとして扱う', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ unexpected: true }));

    expect((await createClient(fetch).search('zod')).ok).toBe(false);
  });

  it('JSON でない応答はエラーとして扱う', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('<html>'));

    expect((await createClient(fetch).search('zod')).ok).toBe(false);
  });

  it('名前が不正なパッケージは結果から除外する', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        objects: [
          { package: { name: '<script>alert(1)</script>', version: '1.0.0' } },
          { package: { name: 'valid-name', version: '1.0.0', description: 'x'.repeat(1000) } },
        ],
      }),
    );

    const result = await createClient(fetch).search('x');

    expect(result.ok && result.value).toEqual([
      { name: 'valid-name', version: '1.0.0', description: 'x'.repeat(500) },
    ]);
  });
});
