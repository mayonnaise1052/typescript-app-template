import { Link } from '@tanstack/react-router';
import { CHAPTERS } from '@typequest/shared';
import { RichText } from '../../components/RichText';
import { Badge } from '../../components/ui/badge';
import { QuizForm } from '../quiz/QuizForm';
import { ContentRenderer } from './ContentRenderer';
import { useLesson, useSubmitQuiz } from './queries';

const navLinkClass = 'text-primary underline-offset-4 hover:underline';

/**
 * レッスンの画面。lessonId はルート（routes/_authenticated/lessons/$lessonId.tsx）から受け取ります。
 * レッスンが変わったときの作り直しは、ルートの remountDeps が受け持ちます。
 */
export function LessonPage({ lessonId }: { lessonId: string }) {
  const { data: lesson } = useLesson(lessonId);
  const submitQuiz = useSubmitQuiz(lessonId);

  const chapter = CHAPTERS.find((candidate) => candidate.id === lesson.chapterId);
  const completed = lesson.completed || submitQuiz.data?.passed === true;

  return (
    <article className="max-w-3xl">
      <p className="text-sm text-muted-foreground">
        <Link to="/lessons" className={navLinkClass}>
          レッスン
        </Link>{' '}
        / {chapter?.title}
      </p>
      <h1 className="mt-1 text-3xl font-bold">
        {lesson.title}
        {completed && (
          <Badge variant="success" className="ml-3">
            完了
          </Badge>
        )}
      </h1>
      <p className="mt-2 text-muted-foreground">{lesson.summary}</p>

      <div className="mt-6">
        <ContentRenderer blocks={lesson.body} />
      </div>

      {lesson.codeRefs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">このアプリでの使用箇所</h2>
          <p className="mt-1 text-muted-foreground">
            このレッスンの内容が、実際にこのアプリのソースコードで使われている場所です。
          </p>
          <ul className="mt-3 grid gap-2.5">
            {lesson.codeRefs.map((ref) => (
              <li key={ref.path} className="grid gap-0.5 rounded-lg border bg-card px-4 py-3">
                <code className="font-mono text-sm font-semibold text-primary [overflow-wrap:anywhere]">
                  {ref.path}
                </code>
                <span className="text-sm text-muted-foreground">
                  <RichText text={ref.description} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">確認クイズ</h2>
        <QuizForm
          questions={lesson.questions}
          result={submitQuiz.data}
          isSubmitting={submitQuiz.isPending}
          error={submitQuiz.error}
          onSubmit={(answers) => submitQuiz.mutate(answers)}
          onRetry={() => submitQuiz.reset()}
        />
      </section>

      <nav
        className="mt-12 flex flex-wrap justify-between gap-4 border-t pt-5"
        aria-label="前後のレッスン"
      >
        {/* to と params の組み合わせは型で検査され、パラメータの書き漏れはコンパイルエラーになります。 */}
        {lesson.previousLessonId ? (
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: lesson.previousLessonId }}
            className={navLinkClass}
          >
            ← 前のレッスン
          </Link>
        ) : (
          <span />
        )}
        <Link to="/notes" search={{ lessonId: lesson.id }} className={navLinkClass}>
          このレッスンのノート
        </Link>
        {lesson.nextLessonId ? (
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: lesson.nextLessonId }}
            className={navLinkClass}
          >
            次のレッスン →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
