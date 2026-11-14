import { queryOptions, useSuspenseQueries } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '../../components/Feedback';
import { buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { api, unwrap } from '../../lib/api';
import { formatDateTime, formatPercent } from '../../lib/format';
import { queryKeys } from '../../lib/query';
import { useCurrentUser } from '../auth/useAuth';
import { lessonsQuery } from '../lessons/queries';

/** ルートの loader（表示前の取得）と画面の両方から使うので、定義を export します。 */
export const progressQuery = queryOptions({
  queryKey: queryKeys.progress,
  queryFn: async () => (await unwrap(api.progress.$get())).progress,
});

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="px-5 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-3xl font-bold tabular-nums">{children}</dd>
    </Card>
  );
}

function Unit({ children }: { children: ReactNode }) {
  return <small className="text-base font-medium text-muted-foreground">{children}</small>;
}

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  // 2 つのデータを「並列に」取得します。useSuspenseQuery を 2 回続けて書くと、
  // 1 つ目が届くまで 2 つ目の取得が始まらない「直列の待ち」になってしまいます。
  // 戻り値はタプルとして型が付くので、分割代入でそれぞれの data を取り出せます。
  // （ルートの loader が先に取得を始めているので、ここではほとんど待ちません。）
  const [{ data: summary }, { data: lessons }] = useSuspenseQueries({
    queries: [progressQuery, lessonsQuery],
  });

  const nextLesson = lessons.find((lesson) => !lesson.completed);

  return (
    <>
      <h1 className="text-3xl font-bold">ダッシュボード</h1>
      <p className="mt-2 text-muted-foreground">
        {user?.displayName} さん、今日も少しずつ進めましょう。
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="完了したレッスン">
          {summary.completedLessons}
          <Unit> / {summary.totalLessons}</Unit>
        </Stat>
        <Stat label="正答率">{formatPercent(summary.accuracy)}</Stat>
        <Stat label="連続学習日数">
          {summary.streakDays}
          <Unit> 日</Unit>
        </Stat>
        <Stat label="クイズ解答回数">
          {summary.totalAttempts}
          <Unit> 回</Unit>
        </Stat>
      </dl>

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary">
        {nextLesson ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">次のレッスン</p>
              <h2 className="text-xl font-bold">{nextLesson.title}</h2>
              <p className="mt-1 text-muted-foreground">{nextLesson.summary}</p>
            </div>
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: nextLesson.id }}
              className={buttonVariants({ variant: 'primary' })}
            >
              学習する
            </Link>
          </>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">おめでとうございます</p>
            <h2 className="text-xl font-bold">すべてのレッスンを完了しました</h2>
            <p className="mt-1 text-muted-foreground">
              docs/learning-guide.md を手がかりに、このアプリのソースコードを読んでみましょう。
            </p>
          </div>
        )}
      </Card>

      <section className="mt-9">
        <h2 className="text-xl font-bold">章ごとの進み具合</h2>
        <ul className="mt-3 grid gap-3">
          {summary.chapters.map((chapter) => (
            <li
              key={chapter.chapterId}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[9rem_1fr_auto]"
            >
              <span>{chapter.title}</span>
              <Progress
                value={chapter.completed}
                max={Math.max(chapter.total, 1)}
                label={`${chapter.title}の進み具合`}
                className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              />
              <span className="text-sm text-muted-foreground tabular-nums">
                {chapter.completed} / {chapter.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-9">
        <h2 className="text-xl font-bold">最近の解答</h2>
        {summary.recentAttempts.length === 0 ? (
          <EmptyState>まだ解答がありません。最初のレッスンから始めてみましょう。</EmptyState>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="px-2 py-2 font-semibold">
                    レッスン
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold">
                    結果
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold">
                    日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.recentAttempts.map((attempt) => (
                  <tr key={`${attempt.lessonId}-${attempt.attemptedAt}`} className="border-b">
                    <td className="px-2 py-2.5">
                      <Link
                        to="/lessons/$lessonId"
                        params={{ lessonId: attempt.lessonId }}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {attempt.lessonTitle}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">
                      {attempt.score} / {attempt.total}
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {formatDateTime(attempt.attemptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
