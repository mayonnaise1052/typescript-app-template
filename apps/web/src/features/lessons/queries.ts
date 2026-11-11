import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Answer } from '@typequest/shared';
import { api, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

export function useLessons() {
  return useQuery({
    queryKey: queryKeys.lessons,
    queryFn: async () => (await unwrap(api.lessons.$get())).lessons,
  });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: async () =>
      (await unwrap(api.lessons[':lessonId'].$get({ param: { lessonId } }))).lesson,
  });
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
