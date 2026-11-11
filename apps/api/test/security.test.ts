import { beforeEach, describe, expect, it } from 'vitest';
import { RATE_LIMITS } from '../src/config/config';
import { parseConfig } from '../src/config/config';
import { DEFAULT_USER, expectError, ORIGIN, resetDatabase, TestClient } from './helpers';

beforeEach(resetDatabase);

describe('CSRF 対策（Origin の検査）', () => {
  it('別サイトからの POST を拒否する', async () => {
    const response = await new TestClient().post('/api/auth/register', DEFAULT_USER, {
      origin: 'https://evil.example',
    });
    await expectError(response, 403, 'FORBIDDEN');
  });

  it('Origin ヘッダーのない POST を拒否する', async () => {
    const response = await new TestClient().post('/api/auth/register', DEFAULT_USER, {
      origin: false,
    });
    await expectError(response, 403, 'FORBIDDEN');
  });

  it('ログイン済みでも、別サイトからの状態変更は拒否する', async () => {
    const client = new TestClient();
    await client.register();

    const response = await client.post(
      '/api/notes',
      { title: '勝手に作られたノート', body: 'x' },
      { origin: 'https://evil.example' },
    );

    await expectError(response, 403, 'FORBIDDEN');
  });

  it('同一オリジンと、許可リストにあるオリジンは受け付ける', async () => {
    const same = await new TestClient().post('/api/auth/register', DEFAULT_USER, {
      origin: ORIGIN,
    });
    expect(same.status).toBe(201);

    // vitest.config.ts で ALLOWED_ORIGINS に設定しているオリジン
    const allowed = await new TestClient().post(
      '/api/auth/register',
      { ...DEFAULT_USER, email: 'other@example.com' },
      { origin: 'https://allowed.example' },
    );
    expect(allowed.status).toBe(201);
  });

  it('GET は Origin がなくても受け付ける', async () => {
    const response = await new TestClient().get('/api/health', { origin: false });
    expect(response.status).toBe(200);
  });
});

describe('レート制限', () => {
  it('ログインの試行回数が上限を超えると 429 を返す', async () => {
    const client = new TestClient();
    const attempt = () =>
      client.post(
        '/api/auth/login',
        { email: 'nobody@example.com', password: 'wrong-password' },
        { headers: { 'CF-Connecting-IP': '203.0.113.1' } },
      );

    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    await expectError(blocked, 429, 'RATE_LIMITED');
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('接続元ごとに別々に数える', async () => {
    const client = new TestClient();
    const attempt = (ip: string) =>
      client.post(
        '/api/auth/login',
        { email: 'nobody@example.com', password: 'wrong-password' },
        { headers: { 'CF-Connecting-IP': ip } },
      );

    for (let i = 0; i <= RATE_LIMITS.auth.limit; i++) await attempt('203.0.113.1');

    expect((await attempt('203.0.113.2')).status).toBe(401);
  });

  it('時間が経って次のウィンドウに入ると、再び受け付ける', async () => {
    let now = new Date('2026-01-01T00:00:00Z');
    const client = new TestClient({ now: () => now });
    const attempt = () =>
      client.post('/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password' });

    for (let i = 0; i <= RATE_LIMITS.auth.limit; i++) await attempt();
    expect((await attempt()).status).toBe(429);

    now = new Date(now.getTime() + RATE_LIMITS.auth.windowSeconds * 1000);
    expect((await attempt()).status).toBe(401);
  });
});

describe('レスポンスヘッダーとエラー応答', () => {
  it('セキュリティ関連のヘッダーを付ける', async () => {
    const response = await new TestClient().get('/api/health');

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('存在しない API は JSON の 404 を返す', async () => {
    await expectError(await new TestClient().get('/api/no-such-endpoint'), 404, 'NOT_FOUND');
  });

  it('大きすぎるリクエストは 413 で拒否する', async () => {
    const response = await new TestClient().post('/api/auth/register', {
      ...DEFAULT_USER,
      displayName: 'x'.repeat(100_000),
    });
    expect(response.status).toBe(413);
  });
});

describe('設定の検証', () => {
  it('カンマ区切りのオリジンを配列にする', () => {
    expect(parseConfig({ ALLOWED_ORIGINS: 'http://localhost:5173, https://a.example' })).toEqual({
      allowedOrigins: ['http://localhost:5173', 'https://a.example'],
    });
    expect(parseConfig({})).toEqual({ allowedOrigins: [] });
  });

  it('URL でない値が混ざっていたら起動時に失敗する', () => {
    expect(() => parseConfig({ ALLOWED_ORIGINS: 'not a url' })).toThrow('環境変数');
  });
});
