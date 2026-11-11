import { UserSchema } from '@typequest/shared';
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DEFAULT_USER, expectError, readJson, resetDatabase, TestClient } from './helpers';

const UserResponseSchema = z.object({ user: UserSchema });

beforeEach(resetDatabase);

describe('POST /api/auth/register', () => {
  it('ユーザーを登録し、ログイン済みの状態にする', async () => {
    const client = new TestClient();

    const response = await client.post('/api/auth/register', DEFAULT_USER);

    expect(response.status).toBe(201);
    const { user } = await readJson(response, UserResponseSchema);
    expect(user).toMatchObject({ email: 'taro@example.com', displayName: '太郎' });

    // 登録直後から、認証が必要な API を呼べる
    const me = await client.get('/api/auth/me');
    expect(me.status).toBe(200);
  });

  it('応答にパスワードやそのハッシュを含めない', async () => {
    const response = await new TestClient().post('/api/auth/register', DEFAULT_USER);
    const text = await response.text();
    expect(text).not.toContain('password');
    expect(text).not.toContain('pbkdf2');
  });

  it('パスワードを平文で保存しない', async () => {
    await new TestClient().register();
    const row = await env.DB.prepare('SELECT password_hash FROM users').first<{
      password_hash: string;
    }>();
    expect(row?.password_hash).toMatch(/^pbkdf2_sha256\$/);
    expect(row?.password_hash).not.toContain(DEFAULT_USER.password);
  });

  it('セッション Cookie に HttpOnly / Secure / SameSite を付ける', async () => {
    const response = await new TestClient().post('/api/auth/register', DEFAULT_USER);
    const cookie = response.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('セッショントークンそのものは DB に保存しない（ハッシュだけ）', async () => {
    const client = new TestClient();
    await client.register();
    const token = client.sessionCookie?.split('=')[1] ?? '';
    const row = await env.DB.prepare('SELECT token_hash FROM sessions').first<{
      token_hash: string;
    }>();
    expect(token.length).toBeGreaterThan(30);
    expect(row?.token_hash).not.toBe(token);
  });

  it('登録済みのメールアドレスは 409 を返す（大文字小文字は区別しない）', async () => {
    await new TestClient().register();
    const response = await new TestClient().post('/api/auth/register', {
      ...DEFAULT_USER,
      email: 'TARO@example.com',
    });
    await expectError(response, 409, 'CONFLICT');
  });

  it('不正な入力は 400 とフィールドごとのエラーを返す', async () => {
    const response = await new TestClient().post('/api/auth/register', {
      email: 'not-an-email',
      displayName: '',
      password: 'short',
    });
    const error = await expectError(response, 400, 'VALIDATION_ERROR');
    expect(Object.keys(error.details ?? {}).sort()).toEqual(['displayName', 'email', 'password']);
  });

  it('JSON として壊れた body は 400 を返す', async () => {
    const response = await new TestClient().post('/api/auth/register', '{broken');
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await new TestClient().register();
  });

  it('正しい認証情報でログインできる', async () => {
    const client = new TestClient();
    const response = await client.post('/api/auth/login', {
      email: DEFAULT_USER.email,
      password: DEFAULT_USER.password,
    });
    expect(response.status).toBe(200);
    expect((await client.get('/api/auth/me')).status).toBe(200);
  });

  it('パスワード違いと未登録のメールアドレスで、同じエラーを返す', async () => {
    const wrongPassword = await new TestClient().post('/api/auth/login', {
      email: DEFAULT_USER.email,
      password: 'wrong-password-123',
    });
    const unknownEmail = await new TestClient().post('/api/auth/login', {
      email: 'nobody@example.com',
      password: DEFAULT_USER.password,
    });

    // どちらが間違っているかを区別できると、登録済みのメールアドレスを調べられてしまう
    const a = await expectError(wrongPassword, 401, 'UNAUTHENTICATED');
    const b = await expectError(unknownEmail, 401, 'UNAUTHENTICATED');
    expect(a.message).toBe(b.message);
  });
});

describe('セッション', () => {
  it('未ログインで /me を呼ぶと 401 を返す', async () => {
    await expectError(await new TestClient().get('/api/auth/me'), 401, 'UNAUTHENTICATED');
  });

  it('でたらめな Cookie では認証されない', async () => {
    const response = await new TestClient().get('/api/auth/me', {
      headers: { Cookie: 'tq_session=forged-token' },
    });
    await expectError(response, 401, 'UNAUTHENTICATED');
  });

  it('ログアウトするとセッションが無効になる', async () => {
    const client = new TestClient();
    await client.register();
    const cookie = client.sessionCookie ?? '';

    expect((await client.post('/api/auth/logout')).status).toBe(200);

    // Cookie を消しただけでなく、サーバー側でもセッションが削除されている
    const reuse = await new TestClient().get('/api/auth/me', { headers: { Cookie: cookie } });
    await expectError(reuse, 401, 'UNAUTHENTICATED');
  });

  it('有効期限を過ぎたセッションは無効になる', async () => {
    // 現在時刻を差し替えられる設計なので、「8 日後」を簡単に再現できます。
    let now = new Date('2026-01-01T00:00:00Z');
    const client = new TestClient({ now: () => now });
    await client.register();
    expect((await client.get('/api/auth/me')).status).toBe(200);

    now = new Date('2026-01-09T00:00:00Z');
    await expectError(await client.get('/api/auth/me'), 401, 'UNAUTHENTICATED');
  });
});
