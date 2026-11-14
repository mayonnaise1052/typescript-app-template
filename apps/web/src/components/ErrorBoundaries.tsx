/**
 * エラー・読み込み中・ページなしの表示。
 *
 * 2 段構えでエラーを受け止めます（docs/specs/0001 の 3.1、0002 の 4.5）。
 *   - 画面単位: ルーターの errorComponent（RouteErrorFallback）。メニューを残したまま、
 *               その画面だけをエラー表示にする。別の画面へ移動すると自動で解除される
 *   - アプリ全体: AppErrorBoundary。ルーターの外側も含め、どこにも受け止められなかった例外の最後の砦
 */
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { errorMessage } from '../lib/api';
import { Loading } from './Feedback';
import { Button, buttonVariants } from './ui/button';
import { Card } from './ui/card';

/** 受け止めたエラーを記録します。本番ではここからエラー監視サービスへ送るのが一般的です。 */
function logError(error: unknown): void {
  console.error('画面の表示中にエラーが発生しました:', error);
}

/** 画面単位のエラー表示。ルーターの defaultErrorComponent として使います。 */
export function RouteErrorFallback({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  // 記録は副作用なので、描画の中ではなく useEffect で行います（同じエラーなら 1 回だけ）。
  useEffect(() => {
    logError(error);
  }, [error]);

  function retry() {
    // 1. TanStack Query に「失敗したクエリをもう一度取得してよい」と伝える
    // 2. ルーターに、この画面の読み込み（loader）からやり直させる
    queryErrorResetBoundary.reset();
    void router.invalidate();
  }

  return (
    <Card role="alert" className="max-w-xl border-l-4 border-l-destructive">
      <h1 className="text-xl font-bold">表示できませんでした</h1>
      {/* API のエラーは内容を表示し、想定外のエラーは一般的な文言だけを表示します。 */}
      <p className="mt-1 text-muted-foreground">{errorMessage(error)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={retry}>
          再試行
        </Button>
        <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
          ダッシュボードへ戻る
        </Link>
      </div>
    </Card>
  );
}

/** 画面の読み込み中の表示。ルーターの defaultPendingComponent として使います。 */
export function RoutePending() {
  return <Loading />;
}

/** 存在しない URL の表示。ルーターの defaultNotFoundComponent として使います。 */
export function RouteNotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-muted-foreground">URL が正しいか確認してください。</p>
      <Link to="/" className={buttonVariants({ variant: 'primary', className: 'mt-6' })}>
        ダッシュボードへ戻る
      </Link>
    </main>
  );
}

function AppErrorFallback() {
  return (
    <main className="mx-auto max-w-md px-4 py-16" role="alert">
      <h1 className="text-2xl font-bold">問題が発生しました</h1>
      <p className="mt-2 text-muted-foreground">
        ページを読み込み直してください。解決しない場合は、時間をおいてからお試しください。
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="primary" onClick={() => window.location.reload()}>
          再読み込み
        </Button>
        {/* ルーターの外側でも動くよう、通常のリンクを使います。 */}
        <a href="/" className={buttonVariants({ variant: 'ghost' })}>
          トップへ
        </a>
      </div>
    </main>
  );
}

/** アプリ全体のエラー境界。ほかのどこにも受け止められなかった例外を受け止めます。 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback} onError={logError}>
      {children}
    </ErrorBoundary>
  );
}
