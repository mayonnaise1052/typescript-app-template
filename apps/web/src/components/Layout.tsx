import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useCurrentUser, useLogout } from '../features/auth/useAuth';
import { Button } from './ui/button';

/**
 * メニューの項目。`to` はルーターに登録された URL だけを受け付けるので、
 * 存在しない URL を書くとコンパイルエラーになります（`as const` でリテラル型を保つ）。
 */
const NAV_ITEMS = [
  { to: '/', label: 'ダッシュボード', exact: true },
  { to: '/lessons', label: 'レッスン', exact: false },
  { to: '/notes', label: 'ノート', exact: false },
  { to: '/packages', label: 'パッケージ', exact: false },
] as const;

export function Layout() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            Type<span className="text-primary">Quest</span>
          </Link>
          <nav
            aria-label="メインメニュー"
            className="order-3 flex basis-full flex-wrap gap-1 sm:order-none sm:basis-auto sm:flex-1"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground data-[status=active]:bg-accent data-[status=active]:font-semibold data-[status=active]:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.displayName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSuccess: () => void navigate({ to: '/login' }) })
              }
            >
              ログアウト
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16">
        {/* 各画面のエラーと読み込み中は、ルーターがこの Outlet の中で表示するので、メニューは常に残ります。 */}
        <Outlet />
      </main>
    </>
  );
}
