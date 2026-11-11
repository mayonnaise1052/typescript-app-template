import { z } from 'zod';
import { IsoDateTimeSchema, UserIdSchema } from './common';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('メールアドレスの形式が正しくありません').max(254));

const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `パスワードは ${PASSWORD_MIN_LENGTH} 文字以上にしてください`)
  .max(PASSWORD_MAX_LENGTH, `パスワードは ${PASSWORD_MAX_LENGTH} 文字以内にしてください`);

export const RegisterInputSchema = z.object({
  email: EmailSchema,
  displayName: z
    .string()
    .trim()
    .min(1, '表示名を入力してください')
    .max(40, '表示名は 40 文字以内にしてください'),
  password: PasswordSchema,
});

export const LoginInputSchema = z.object({
  email: EmailSchema,
  // ログイン時は長さの下限を検証しません（ポリシー変更前のパスワードでも入れるように）。
  password: z.string().min(1, 'パスワードを入力してください').max(PASSWORD_MAX_LENGTH),
});

/** クライアントに返してよいユーザー情報。パスワードハッシュは含めません。 */
export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.string(),
  displayName: z.string(),
  createdAt: IsoDateTimeSchema,
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type User = z.infer<typeof UserSchema>;
