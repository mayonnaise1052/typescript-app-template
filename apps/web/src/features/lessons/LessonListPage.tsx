import { Link } from '@tanstack/react-router';
import { CHAPTERS } from '@typequest/shared';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLessons } from './queries';

export function LessonListPage() {
  // 読み込み中とエラーは、ルーターの pendingComponent / errorComponent が受け持ちます。
  const { data: lessons } = useLessons();

  return (
    <>
      <h1 className="text-3xl font-bold">レッスン</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        第0章から順に進めるのがおすすめです。TypeScript
        をはじめて学ぶ人は「はじめに」から、JavaScript
        に慣れている人は第1章から始めてもかまいません。各レッスンの最後にあるクイズに全問正解すると完了になります。
      </p>
      {CHAPTERS.map((chapter) => {
        const inChapter = lessons.filter((lesson) => lesson.chapterId === chapter.id);
        const done = inChapter.filter((lesson) => lesson.completed).length;
        return (
          <section key={chapter.id} className="mt-9">
            <h2 className="flex items-baseline gap-3 text-xl font-bold">
              {chapter.title}
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {done} / {inChapter.length}
              </span>
            </h2>
            <ol className="mt-3 grid gap-2">
              {inChapter.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    to="/lessons/$lessonId"
                    params={{ lessonId: lesson.id }}
                    className="flex items-start gap-3.5 rounded-lg border bg-card px-4 py-3.5 text-foreground transition-colors hover:border-primary"
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                        lesson.completed
                          ? 'bg-success-soft text-success'
                          : 'bg-muted text-muted-foreground',
                      )}
                      aria-label={lesson.completed ? '完了' : '未完了'}
                    >
                      {lesson.completed ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        lesson.order
                      )}
                    </span>
                    <span>
                      <span className="block font-semibold">{lesson.title}</span>
                      <span className="block text-sm text-muted-foreground">{lesson.summary}</span>
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
