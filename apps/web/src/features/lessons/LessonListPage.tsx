import { CHAPTERS } from '@typequest/shared';
import { Link } from 'react-router';
import { useLessons } from './queries';

export function LessonListPage() {
  // 読み込み中とエラーは、Layout の RouteBoundary が受け持ちます。
  const { data: lessons } = useLessons();

  return (
    <>
      <h1>レッスン</h1>
      <p className="lead">
        基礎から順に進めるのがおすすめです。各レッスンの最後にあるクイズに全問正解すると完了になります。
      </p>
      {CHAPTERS.map((chapter) => {
        const inChapter = lessons.filter((lesson) => lesson.chapterId === chapter.id);
        const done = inChapter.filter((lesson) => lesson.completed).length;
        return (
          <section key={chapter.id} className="chapter">
            <h2>
              {chapter.title}
              <span className="count">
                {done} / {inChapter.length}
              </span>
            </h2>
            <ol className="lesson-list">
              {inChapter.map((lesson) => (
                <li key={lesson.id}>
                  <Link to={`/lessons/${lesson.id}`} className="lesson-link">
                    <span
                      className={lesson.completed ? 'status done' : 'status'}
                      aria-label={lesson.completed ? '完了' : '未完了'}
                    >
                      {lesson.completed ? '✓' : lesson.order}
                    </span>
                    <span>
                      <span className="lesson-title">{lesson.title}</span>
                      <span className="lesson-summary">{lesson.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
