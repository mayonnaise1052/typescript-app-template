import { CHAPTERS } from '@typequest/shared';
import { Link, useParams } from 'react-router';
import { ErrorMessage, Loading } from '../../components/Feedback';
import { RichText } from '../../components/RichText';
import { QuizForm } from '../quiz/QuizForm';
import { ContentRenderer } from './ContentRenderer';
import { useLesson, useSubmitQuiz } from './queries';

export function LessonPage() {
  // URL のパラメータは「無いかもしれない」ので string | undefined です。
  const { lessonId = '' } = useParams();
  const { data: lesson, isPending, error } = useLesson(lessonId);
  const submitQuiz = useSubmitQuiz(lessonId);

  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  const chapter = CHAPTERS.find((candidate) => candidate.id === lesson.chapterId);
  const completed = lesson.completed || submitQuiz.data?.passed === true;

  return (
    <article className="lesson">
      <p className="breadcrumb">
        <Link to="/lessons">レッスン</Link> / {chapter?.title}
      </p>
      <h1>
        {lesson.title}
        {completed && <span className="badge">完了</span>}
      </h1>
      <p className="lead">{lesson.summary}</p>

      <ContentRenderer blocks={lesson.body} />

      {lesson.codeRefs.length > 0 && (
        <section className="code-refs">
          <h2>このアプリでの使用箇所</h2>
          <p>このレッスンの内容が、実際にこのアプリのソースコードで使われている場所です。</p>
          <ul>
            {lesson.codeRefs.map((ref) => (
              <li key={ref.path}>
                <code>{ref.path}</code>
                <span>
                  <RichText text={ref.description} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>確認クイズ</h2>
        {/* key を変えるとコンポーネントが作り直され、別のレッスンの解答が残りません。 */}
        <QuizForm
          key={lesson.id}
          questions={lesson.questions}
          result={submitQuiz.data}
          isSubmitting={submitQuiz.isPending}
          error={submitQuiz.error}
          onSubmit={(answers) => submitQuiz.mutate(answers)}
          onRetry={() => submitQuiz.reset()}
        />
      </section>

      <nav className="lesson-nav" aria-label="前後のレッスン">
        {lesson.previousLessonId ? (
          <Link to={`/lessons/${lesson.previousLessonId}`}>← 前のレッスン</Link>
        ) : (
          <span />
        )}
        <Link to={`/notes?lessonId=${lesson.id}`}>このレッスンのノート</Link>
        {lesson.nextLessonId ? (
          <Link to={`/lessons/${lesson.nextLessonId}`}>次のレッスン →</Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
