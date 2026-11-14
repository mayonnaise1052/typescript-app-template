import { queryOptions, useSuspenseQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, unwrap } from '../../lib/api';
import { formatDateTime, formatPercent } from '../../lib/format';
import { queryKeys } from '../../lib/query';
import { useCurrentUser } from '../auth/useAuth';
import { lessonsQuery } from '../lessons/queries';

const progressQuery = queryOptions({
  queryKey: queryKeys.progress,
  queryFn: async () => (await unwrap(api.progress.$get())).progress,
});

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  // 2 つのデータを「並列に」取得します。useSuspenseQuery を 2 回続けて書くと、
  // 1 つ目が届くまで 2 つ目の取得が始まらない「直列の待ち」になってしまいます。
  // 戻り値はタプルとして型が付くので、分割代入でそれぞれの data を取り出せます。
  const [{ data: summary }, { data: lessons }] = useSuspenseQueries({
    queries: [progressQuery, lessonsQuery],
  });

  const nextLesson = lessons.find((lesson) => !lesson.completed);

  return (
    <>
      <h1>ダッシュボード</h1>
      <p className="lead">{user?.displayName} さん、今日も少しずつ進めましょう。</p>

      <dl className="stats">
        <div className="stat">
          <dt>完了したレッスン</dt>
          <dd>
            {summary.completedLessons}
            <small> / {summary.totalLessons}</small>
          </dd>
        </div>
        <div className="stat">
          <dt>正答率</dt>
          <dd>{formatPercent(summary.accuracy)}</dd>
        </div>
        <div className="stat">
          <dt>連続学習日数</dt>
          <dd>
            {summary.streakDays}
            <small> 日</small>
          </dd>
        </div>
        <div className="stat">
          <dt>クイズ解答回数</dt>
          <dd>
            {summary.totalAttempts}
            <small> 回</small>
          </dd>
        </div>
      </dl>

      <section className="card next-lesson">
        {nextLesson ? (
          <>
            <div>
              <p className="eyebrow">次のレッスン</p>
              <h2>{nextLesson.title}</h2>
              <p>{nextLesson.summary}</p>
            </div>
            <Link to={`/lessons/${nextLesson.id}`} className="button primary">
              学習する
            </Link>
          </>
        ) : (
          <div>
            <p className="eyebrow">おめでとうございます</p>
            <h2>すべてのレッスンを完了しました</h2>
            <p>docs/learning-guide.md を手がかりに、このアプリのソースコードを読んでみましょう。</p>
          </div>
        )}
      </section>

      <section>
        <h2>章ごとの進み具合</h2>
        <ul className="chapter-progress">
          {summary.chapters.map((chapter) => (
            <li key={chapter.chapterId}>
              <span>{chapter.title}</span>
              <progress
                value={chapter.completed}
                max={Math.max(chapter.total, 1)}
                aria-label={`${chapter.title}の進み具合`}
              />
              <span className="count">
                {chapter.completed} / {chapter.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>最近の解答</h2>
        {summary.recentAttempts.length === 0 ? (
          <p className="empty">まだ解答がありません。最初のレッスンから始めてみましょう。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">レッスン</th>
                <th scope="col">結果</th>
                <th scope="col">日時</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentAttempts.map((attempt) => (
                <tr key={`${attempt.lessonId}-${attempt.attemptedAt}`}>
                  <td>
                    <Link to={`/lessons/${attempt.lessonId}`}>{attempt.lessonTitle}</Link>
                  </td>
                  <td>
                    {attempt.score} / {attempt.total}
                  </td>
                  <td>{formatDateTime(attempt.attemptedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
