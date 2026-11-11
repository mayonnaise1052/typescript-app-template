import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, type PasswordHash } from './password';

describe('パスワードのハッシュ化', () => {
  it('正しいパスワードを検証できる', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(await verifyPassword('correct-horse-battery', hash)).toBe(true);
  });

  it('間違ったパスワードを拒否する', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('ハッシュに平文のパスワードを含まない', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash).not.toContain('correct-horse-battery');
    expect(hash).toMatch(/^pbkdf2_sha256\$100000\$[\w-]+\$[\w-]+$/);
  });

  it('同じパスワードでも毎回違うハッシュになる（ソルト）', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);
    expect(a).not.toBe(b);
  });

  it.each([
    ['形式が違う', 'not-a-hash'],
    ['アルゴリズムが違う', 'md5$1$abc$def'],
    ['反復回数が不正', 'pbkdf2_sha256$abc$c2FsdA$aGFzaA'],
    ['反復回数が多すぎる', 'pbkdf2_sha256$99999999$c2FsdA$aGFzaA'],
  ])('壊れたハッシュ（%s）は例外を投げずに false を返す', async (_label, stored) => {
    expect(await verifyPassword('anything', stored as PasswordHash)).toBe(false);
  });
});
