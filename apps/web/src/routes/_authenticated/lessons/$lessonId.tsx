import { createFileRoute } from '@tanstack/react-router';
import { LessonPage } from '../../../features/lessons/LessonPage';
import { lessonQuery } from '../../../features/lessons/queries';

/** ファイル名の `$lessonId` が URL のパラメータになります（/lessons/generics など）。 */
export const Route = createFileRoute('/_authenticated/lessons/$lessonId')({
  loader: ({ context: { queryClient }, params }) => queryClient.query(lessonQuery(params.lessonId)),
  // 「次のレッスン」へ移動しても、ルーターは同じ画面の部品を使い回します。そのままでは
  // 前のレッスンのクイズ結果が残るため、レッスン ID が変わったら部品を作り直させます。
  remountDeps: ({ params }) => params.lessonId,
  component: function LessonRoute() {
    const { lessonId } = Route.useParams();
    return <LessonPage lessonId={lessonId} />;
  },
});
