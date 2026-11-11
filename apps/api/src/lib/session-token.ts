import { bytesToBase64Url, sha256Hex } from './encoding';

/** 推測不可能なセッショントークン（256 ビットの乱数）を生成します。 */
export function generateSessionToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** DB に保存・照合するときは、トークンのハッシュを使います。 */
export function hashSessionToken(token: string): Promise<string> {
  return sha256Hex(token);
}
