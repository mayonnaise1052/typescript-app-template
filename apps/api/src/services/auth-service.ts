import {
  appError,
  err,
  ok,
  type AppError,
  type LoginInput,
  type RegisterInput,
  type Result,
  type User,
  type UserId,
} from '@typequest/shared';
import { SESSION_TTL_MS } from '../config/config';
import type { UserRow } from '../db/schema';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../lib/password';
import { generateSessionToken, hashSessionToken } from '../lib/session-token';
import type { SessionRepository } from '../repositories/session-repository';
import type { UserRepository } from '../repositories/user-repository';

export type AuthSession = {
  user: User;
  /** Cookie に入れる生のトークン。DB にはハッシュだけを保存します。 */
  token: string;
  expiresAt: Date;
};

/** DB の行から、クライアントに返してよい項目だけを取り出します（passwordHash を落とす）。 */
export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
  };
}

type Deps = {
  users: UserRepository;
  sessions: SessionRepository;
  now: () => Date;
};

/**
 * Service 層: ビジネスロジックを担当します。HTTP のことも SQL のことも知りません。
 * 依存（リポジトリや現在時刻）を引数で受け取るので、テストで差し替えられます。
 */
export function createAuthService({ users, sessions, now }: Deps) {
  async function startSession(row: UserRow): Promise<AuthSession> {
    const token = generateSessionToken();
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
    await sessions.deleteExpiredForUser(row.id, createdAt);
    await sessions.insert({
      tokenHash: await hashSessionToken(token),
      userId: row.id,
      createdAt,
      expiresAt,
    });
    return { user: toUser(row), token, expiresAt };
  }

  return {
    async register(input: RegisterInput): Promise<Result<AuthSession, AppError>> {
      const row: UserRow = {
        // randomUUID() の戻り値はただの string なので、ここで UserId として「発行」します。
        id: crypto.randomUUID() as UserId,
        email: input.email,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        createdAt: now(),
      };

      // 「先に検索してから挿入」だと同時リクエストで重複し得るため、
      // DB の UNIQUE 制約に判定を任せ、挿入できたかどうかで分岐します。
      const inserted = await users.insert(row);
      if (!inserted) {
        return err(appError('CONFLICT', 'このメールアドレスはすでに登録されています'));
      }
      return ok(await startSession(row));
    },

    async login(input: LoginInput): Promise<Result<AuthSession, AppError>> {
      // 「メールアドレスが存在しない」と「パスワードが違う」を区別できないよう、
      // どちらの場合も同じメッセージ・同程度の処理時間で応答します。
      const invalid = err(
        appError('UNAUTHENTICATED', 'メールアドレスまたはパスワードが正しくありません'),
      );

      const row = await users.findByEmail(input.email);
      if (!row) {
        await verifyAgainstDummy(input.password);
        return invalid;
      }
      if (!(await verifyPassword(input.password, row.passwordHash))) return invalid;

      // ログインのたびに新しいトークンを発行します（セッション固定攻撃への対策）。
      return ok(await startSession(row));
    },

    async logout(token: string): Promise<void> {
      await sessions.delete(await hashSessionToken(token));
    },

    /** Cookie のトークンからログイン中のユーザーを特定します。無効なら null。 */
    async authenticate(token: string): Promise<User | null> {
      const tokenHash = await hashSessionToken(token);
      const found = await sessions.findWithUser(tokenHash);
      if (!found) return null;

      if (found.session.expiresAt <= now()) {
        await sessions.delete(tokenHash);
        return null;
      }
      return toUser(found.user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
