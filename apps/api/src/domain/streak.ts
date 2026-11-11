/**
 * 連続学習日数（ストリーク）の計算。純粋関数なので、時刻を引数で渡してテストできます。
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** 「1 日」の区切りに使うタイムゾーン（日本時間 = UTC+9）。 */
export const STREAK_UTC_OFFSET_MINUTES = 9 * 60;

/** 日時を「その地域での通算日数」に変換します。同じ日なら同じ数になります。 */
export function toLocalDayNumber(date: Date, utcOffsetMinutes: number): number {
  return Math.floor((date.getTime() + utcOffsetMinutes * 60_000) / DAY_MS);
}

/**
 * 今日まで（今日まだ学習していなければ昨日まで）連続して学習した日数を返します。
 * 昨日も今日も学習していなければ 0 です。
 */
export function calculateStreak(
  activityDates: readonly Date[],
  now: Date,
  utcOffsetMinutes: number = STREAK_UTC_OFFSET_MINUTES,
): number {
  const activeDays = new Set(activityDates.map((date) => toLocalDayNumber(date, utcOffsetMinutes)));
  const today = toLocalDayNumber(now, utcOffsetMinutes);

  let cursor = activeDays.has(today) ? today : today - 1;
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}
