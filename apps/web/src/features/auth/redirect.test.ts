import { describe, expect, it } from 'vitest';
import { redirectTarget } from './redirect';

describe('redirectTarget', () => {
  it('アプリ内のパスならそこへ戻す', () => {
    expect(redirectTarget({ from: '/notes' })).toBe('/notes');
  });

  it.each([
    ['state がない', null],
    ['from がない', {}],
    ['from が文字列でない', { from: 42 }],
    ['外部サイトの URL', { from: 'https://evil.example/' }],
    ['プロトコル相対 URL', { from: '//evil.example/' }],
  ])('%s ときはトップへ送る', (_label, state) => {
    expect(redirectTarget(state)).toBe('/');
  });
});
