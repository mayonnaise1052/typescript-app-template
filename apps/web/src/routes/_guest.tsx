import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { currentUserQuery } from '../features/auth/useAuth';
import { GuestSearchSchema } from '../features/auth/redirect';

/**
 * ログインしていない人向けの画面（ログイン・新規登録）をまとめるルート。
 * ファイル名の `_` は「URL に現れないまとめ役」の印です（URL は /login, /register）。
 */
export const Route = createFileRoute('/_guest')({
  // `?redirect=...` を検証してから使います（外部サイトへの戻り先は捨てる）。
  validateSearch: GuestSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.query(currentUserQuery);
    // ログイン済みなら、戻り先（なければトップ）へ移動します。
    // ログイン成功時もルーターがこの確認をやり直すので、戻り先の判断はこの 1 か所だけです。
    if (user) throw redirect({ href: search.redirect ?? '/' });
  },
  component: () => (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Outlet />
    </main>
  ),
});
