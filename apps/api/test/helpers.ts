/**
 * 結合テスト用のヘルパー。
 *
 * `app.request()` に Request を渡すと、HTTP サーバーを起動せずにアプリを直接呼び出せます。
 * ミドルウェア → ルート → サービス → リポジトリ → D1 まで、本番と同じ経路を通ります。
 */
import {
  ApiErrorResponseSchema,
  UserSchema,
  type ApiErrorResponse,
  type User,
} from '@typequest/shared';
import { env } from 'cloudflare:workers';
import { expect } from 'vitest';
import { z } from 'zod';
import { createApp, type AppOptions } from '../src/app';
import { LESSONS } from '../src/content/index';
import { buildSeedStatements } from '../src/db/seed';

export const ORIGIN = 'https://typequest.test';

const TABLES = [
  'api_cache',
  'rate_limits',
  'package_bookmarks',
  'notes',
  'quiz_attempts',
  'lesson_progress',
  'questions',
  'lessons',
  'sessions',
  'users',
] as const;

/** 全テーブルを空にし、教材を投入し直します。各テストの前に呼びます。 */
export async function resetDatabase(): Promise<void> {
  await env.DB.batch(TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
  await env.DB.batch(
    buildSeedStatements(LESSONS).map(({ sql, params }) => env.DB.prepare(sql).bind(...params)),
  );
}

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  /** false を渡すと Origin ヘッダーを付けません（CSRF 対策のテスト用）。 */
  origin?: string | false;
};

/**
 * ブラウザの代わりをするテスト用クライアント。
 * Set-Cookie で受け取ったセッション Cookie を覚えておき、次のリクエストで送ります。
 */
export class TestClient {
  private cookie: string | undefined;
  private readonly app: ReturnType<typeof createApp>;

  constructor(options: AppOptions = {}) {
    this.app = createApp(options);
  }

  async request(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (options.origin !== false) headers.set('Origin', options.origin ?? ORIGIN);
    if (this.cookie) headers.set('Cookie', this.cookie);
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');

    const response = await this.app.request(
      `${ORIGIN}${path}`,
      {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : typeof options.body === 'string'
              ? options.body
              : JSON.stringify(options.body),
      },
      env,
    );

    const setCookie = response.headers.get('Set-Cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0] ?? '';
      // 値が空の Cookie は「削除」を意味します。
      this.cookie = pair.endsWith('=') ? undefined : pair;
    }
    return response;
  }

  get = (path: string, options?: RequestOptions) => this.request('GET', path, options);
  post = (path: string, body?: unknown, options?: RequestOptions) =>
    this.request('POST', path, { ...options, body });
  patch = (path: string, body?: unknown, options?: RequestOptions) =>
    this.request('PATCH', path, { ...options, body });
  delete = (path: string, options?: RequestOptions) => this.request('DELETE', path, options);

  /** ユーザーを登録し、ログイン済みの状態にします。 */
  async register(overrides: Partial<typeof DEFAULT_USER> = {}): Promise<User> {
    const response = await this.post('/api/auth/register', { ...DEFAULT_USER, ...overrides });
    expect(response.status).toBe(201);
    const body = await readJson(response, UserResponseSchema);
    return body.user;
  }

  clearCookie(): void {
    this.cookie = undefined;
  }

  get sessionCookie(): string | undefined {
    return this.cookie;
  }
}

export const DEFAULT_USER = {
  email: 'taro@example.com',
  displayName: '太郎',
  password: 'correct-horse-battery',
};

const UserResponseSchema = z.object({ user: UserSchema });

/**
 * 応答の JSON をスキーマで検証して返します。
 * テストでも `as` で型を決め打ちせず、実際の形を確かめます。
 */
export async function readJson<Schema extends z.ZodType>(
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const json: unknown = await response.json();
  return schema.parse(json);
}

/** エラー応答であることを確かめ、その中身を返します。 */
export async function expectError(
  response: Response,
  status: number,
  code: ApiErrorResponse['error']['code'],
): Promise<ApiErrorResponse['error']> {
  expect(response.status).toBe(status);
  const body = ApiErrorResponseSchema.parse(await response.json());
  expect(body.error.code).toBe(code);
  return body.error;
}
