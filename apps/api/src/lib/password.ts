import type { Brand } from '@typequest/shared';
import { base64UrlToBytes, bytesToBase64Url, timingSafeEqual } from './encoding';

/**
 * パスワードのハッシュ化。
 *
 * Cloudflare Workers では argon2 / bcrypt のネイティブ実装が使えないため、
 * Web Crypto API に含まれる PBKDF2-HMAC-SHA256 を使います。
 *
 * 保存形式:  pbkdf2_sha256$<反復回数>$<ソルト>$<ハッシュ>
 * 反復回数を文字列に含めているので、将来回数を増やしても古いハッシュを検証できます。
 *
 * 注意: Workers の Web Crypto は PBKDF2 の反復回数を 100,000 回までに制限しています。
 * OWASP の推奨値（PBKDF2-SHA256 で 600,000 回）より少ないため、パスワードの最小長を
 * 10 文字にし、ログイン試行にレート制限をかけて補っています。詳しくは docs/security.md。
 */
const ALGORITHM = 'pbkdf2_sha256';
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/**
 * ハッシュ化済みパスワードを表す Branded Type。
 * 平文のパスワード（ただの string）を誤って DB の password_hash 列へ保存しようとすると、
 * コンパイルエラーになります。
 */
export type PasswordHash = Brand<string, 'PasswordHash'>;

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  const encoded = [ALGORITHM, ITERATIONS, bytesToBase64Url(salt), bytesToBase64Url(hash)].join('$');
  // 型アサーションはこの 1 か所だけ。PasswordHash を作れるのはこの関数だけ、という設計です。
  return encoded as PasswordHash;
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterationsText);
  if (
    algorithm !== ALGORITHM ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > ITERATIONS ||
    saltText === undefined ||
    hashText === undefined
  ) {
    return false;
  }
  try {
    const actual = await derive(password, base64UrlToBytes(saltText), iterations);
    return timingSafeEqual(actual, base64UrlToBytes(hashText));
  } catch {
    return false;
  }
}

/**
 * 存在しないメールアドレスでのログイン時にも同じ計算時間をかけるためのダミー。
 * これがないと、応答の速さから「そのメールアドレスが登録済みか」を推測できてしまいます。
 */
let dummyHash: Promise<PasswordHash> | undefined;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(password, await dummyHash);
}
