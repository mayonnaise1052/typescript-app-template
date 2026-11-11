import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * クエリキーの一覧。文字列を各所に直接書くと打ち間違えても気付けないため、1 か所で定義します。
 * `as const` により、各キーは readonly なタプル型になります。
 */
export const queryKeys = {
  me: ['auth', 'me'],
  lessons: ['lessons'],
  lesson: (id: string) => ['lessons', id],
  progress: ['progress'],
  notes: (params: { page: number; q: string; lessonId: string }) => ['notes', params],
  allNotes: ['notes'],
  bookmarks: ['packages', 'bookmarks'],
  packageSearch: (q: string) => ['packages', 'search', q],
} as const;

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // どの API でも 401 が返ったら「ログアウト状態」にします。
        // RequireAuth がそれを検知して、ログイン画面へ移動させます。
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
          client.setQueryData(queryKeys.me, null);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx はやり直しても結果が変わらないので、通信エラーと 5xx だけリトライします。
        retry: (failureCount, error) =>
          failureCount < 2 &&
          !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
  });
  return client;
}
