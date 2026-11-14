import { describe, expect, it } from 'vitest';
import { GuestSearchSchema } from './redirect';

describe('GuestSearchSchema（ログイン後の戻り先）', () => {
  it('アプリ内のパスならそのまま使う', () => {
    expect(GuestSearchSchema.parse({ redirect: '/notes?page=2' })).toEqual({
      redirect: '/notes?page=2',
    });
  });

  it.each([
    ['指定がない', {}],
    ['文字列でない', { redirect: 42 }],
    ['外部サイトの URL', { redirect: 'https://evil.example/' }],
    ['プロトコル相対 URL', { redirect: '//evil.example/' }],
    ['相対パス', { redirect: 'notes' }],
  ])('%s ときは戻り先なしとして扱う', (_label, search) => {
    expect(GuestSearchSchema.parse(search)).toEqual({ redirect: undefined });
  });
});
