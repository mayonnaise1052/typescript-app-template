import { describe, expect, it } from 'vitest';
import { assertNever, err, mapResult, ok, unwrapOr, type Result } from './result';

function divide(a: number, b: number): Result<number, 'DIVISION_BY_ZERO'> {
  return b === 0 ? err('DIVISION_BY_ZERO') : ok(a / b);
}

describe('Result', () => {
  it('成功時は value を持つ', () => {
    const result = divide(6, 3);
    expect(result).toEqual({ ok: true, value: 2 });
  });

  it('失敗時は error を持つ', () => {
    const result = divide(1, 0);
    expect(result).toEqual({ ok: false, error: 'DIVISION_BY_ZERO' });
  });

  it('mapResult は成功時の値だけを変換する', () => {
    expect(mapResult(divide(6, 3), (n) => n * 10)).toEqual(ok(20));
    expect(mapResult(divide(1, 0), (n) => n * 10)).toEqual(err('DIVISION_BY_ZERO'));
  });

  it('unwrapOr は失敗時に代替値を返す', () => {
    expect(unwrapOr(divide(6, 3), -1)).toBe(2);
    expect(unwrapOr(divide(1, 0), -1)).toBe(-1);
  });

  it('assertNever は呼ばれたら例外を投げる', () => {
    expect(() => assertNever('unexpected' as never)).toThrow('想定外の値です');
  });
});
