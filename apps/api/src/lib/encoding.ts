/** バイト列と文字列の相互変換。Workers / ブラウザ / Node のどこでも動く Web 標準 API だけを使います。 */

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * 定数時間での比較。
 * 普通の `===` は最初に違う文字で打ち切るため、応答時間の差から値を推測される余地があります
 * （タイミング攻撃）。長さが同じなら必ず最後まで比較することで、それを防ぎます。
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
