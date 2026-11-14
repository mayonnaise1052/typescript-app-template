import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { Answer } from '@typequest/shared';
import { api, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

/**
 * クエリの定義（キーと取得関数の組）を、使う場所から切り離して 1 か所にまとめます。
 * `queryOptions` を通すと、キーと戻り値の型が結び付き、ほかの画面で
 * `useSuspenseQueries` などに渡したときも型が正しく伝わります。
 */
export const lessonsQuery = queryOptions({
  queryKey: queryKeys.lessons,
  queryFn: async () => (await unwrap(api.lessons.$get())).lessons,
});

export const lessonQuery = (lessonId: string) =>
  queryOptions({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: async () =>
      (await unwrap(api.lessons[':lessonId'].$get({ param: { lessonId } }))).lesson,
  });

/**
 * useSuspenseQuery は、データが届くまで描画を「保留」し、失敗したら例外を投げます。
 * 保留は Suspense が「読み込み中」を、例外は ErrorBoundary がエラー表示を受け持つので、
 * 呼び出す画面は data が必ずある前提で書けます（data の型に undefined が含まれない）。
 */
export function useLessons() {
  return useSuspenseQuery(lessonsQuery);
}

export function useLesson(lessonId: string) {
  return useSuspenseQuery(lessonQuery(lessonId));
}

export function useSubmitQuiz(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (answers: Answer[]) =>
      (
        await unwrap(
          api.lessons[':lessonId'].quiz.$post({ param: { lessonId }, json: { answers } }),
        )
      ).result,
    onSuccess: () => {
      // 解答すると完了状況と進捗が変わるので、関連するキャッシュを取り直させます。
      void queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
  });
}
