import { describe, expect, it } from 'vitest';
import { calculateStreak, toLocalDayNumber } from './streak';

// 日本時間（UTC+9）で考えやすいよう、JST の日時から Date を作るヘルパー。
const jst = (text: string) => new Date(`${text}+09:00`);

describe('calculateStreak', () => {
  const now = jst('2026-03-10T12:00:00');

  it('学習記録がなければ 0', () => {
    expect(calculateStreak([], now)).toBe(0);
  });

  it('今日だけ学習していれば 1', () => {
    expect(calculateStreak([jst('2026-03-10T08:00:00')], now)).toBe(1);
  });

  it('今日まで 3 日連続なら 3', () => {
    const dates = [
      jst('2026-03-10T08:00:00'),
      jst('2026-03-09T23:59:00'),
      jst('2026-03-08T00:01:00'),
    ];
    expect(calculateStreak(dates, now)).toBe(3);
  });

  it('今日まだ学習していなくても、昨日までの連続は途切れない', () => {
    const dates = [jst('2026-03-09T20:00:00'), jst('2026-03-08T20:00:00')];
    expect(calculateStreak(dates, now)).toBe(2);
  });

  it('1 日空くと連続が途切れる', () => {
    const dates = [jst('2026-03-10T08:00:00'), jst('2026-03-08T08:00:00')];
    expect(calculateStreak(dates, now)).toBe(1);
  });

  it('最後の学習がおととい以前なら 0', () => {
    expect(calculateStreak([jst('2026-03-08T08:00:00')], now)).toBe(0);
  });

  it('同じ日に何度学習しても 1 日として数える', () => {
    const dates = [jst('2026-03-10T08:00:00'), jst('2026-03-10T09:00:00')];
    expect(calculateStreak(dates, now)).toBe(1);
  });

  it('日付の区切りは UTC ではなく指定したタイムゾーンで判定する', () => {
    // JST の 3/10 00:30 は、UTC ではまだ 3/9。JST 基準なら「今日」の学習になる。
    const earlyMorning = jst('2026-03-10T00:30:00');
    expect(calculateStreak([earlyMorning], now)).toBe(1);
    expect(toLocalDayNumber(earlyMorning, 0)).toBe(toLocalDayNumber(now, 0) - 1);
  });
});
