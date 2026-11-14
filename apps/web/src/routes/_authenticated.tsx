import { createFileRoute, redirect } from '@tanstack/react-router';
import { Layout } from '../components/Layout';
import { currentUserQuery } from '../features/auth/useAuth';

/**
 * ログインが必要な画面をまとめるルート。
 *
 * beforeLoad は画面を描画する「前」に実行されます。未ログインならここでログイン画面へ移動するので、
 * 保護された画面が一瞬でも描画されたり、無駄な API 呼び出しが起きたりしません。
 *
 * これは使い勝手のための仕組みで、データを守る境界ではありません。
 * データは常に API 側の認証・認可で守られています。
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.query(currentUserQuery);
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: Layout,
});
