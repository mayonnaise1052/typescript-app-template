import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, User } from '@typequest/shared';
import { api, ApiError, unwrap } from '../../lib/api';
import { queryKeys } from '../../lib/query';

/**
 * ログイン中のユーザーを取得します。未ログインなら null です。
 * 「401 が返る」ことはここでは異常ではないので、エラーにせず null に変換します。
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<User | null> => {
      try {
        return (await unwrap(api.auth.me.$get())).user;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => unwrap(api.auth.login.$post({ json: input })),
    onSuccess: ({ user }) => queryClient.setQueryData(queryKeys.me, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => unwrap(api.auth.register.$post({ json: input })),
    onSuccess: ({ user }) => queryClient.setQueryData(queryKeys.me, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.auth.logout.$post()),
    onSuccess: () => {
      // 前のユーザーのデータが画面に残らないよう、キャッシュをすべて消します。
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}
