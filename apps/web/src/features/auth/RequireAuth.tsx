import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorMessage, Loading } from '../../components/Feedback';
import { redirectTarget } from './redirect';
import { useCurrentUser } from './useAuth';

/**
 * ログインが必要な画面を包むコンポーネント。
 *
 * これは画面の出し分け（使い勝手）のためのもので、セキュリティの境界ではありません。
 * ブラウザ側のコードは書き換えられるので、データを守るのは常に API 側の認証・認可です。
 */
export function RequireAuth() {
  const location = useLocation();
  const { data: user, isPending, error } = useCurrentUser();

  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/**
 * ログイン済みのユーザーがログイン画面を開いたら、アプリの中へ送ります。
 * ログイン直後もここを通るので、元々開こうとしていた画面があればそこへ戻します。
 */
export function GuestOnly() {
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <Loading />;
  if (user) return <Navigate to={redirectTarget(location.state)} replace />;
  return <Outlet />;
}
