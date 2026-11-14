import { NavLink, Outlet, useNavigate } from 'react-router';
import { useCurrentUser, useLogout } from '../features/auth/useAuth';
import { RouteBoundary } from './ErrorBoundaries';

const NAV_ITEMS = [
  { to: '/', label: 'ダッシュボード', end: true },
  { to: '/lessons', label: 'レッスン', end: false },
  { to: '/notes', label: 'ノート', end: false },
  { to: '/packages', label: 'パッケージ', end: false },
] as const;

export function Layout() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand">
            Type<span>Quest</span>
          </NavLink>
          <nav aria-label="メインメニュー">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-menu">
            <span className="user-name">{user?.displayName}</span>
            <button
              type="button"
              className="button ghost"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate('/login') })}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        {/* 各画面のエラーと読み込み中はここで受け止めるので、ヘッダーとメニューは常に残ります。 */}
        <RouteBoundary>
          <Outlet />
        </RouteBoundary>
      </main>
    </>
  );
}
