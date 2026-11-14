/**
 * エラー境界（ErrorBoundary）。
 *
 * React では、描画中に投げられた例外を受け止める仕組みがないと、アプリ全体が消えて
 * 画面が真っ白になります。ErrorBoundary で包んだ範囲の例外は、その範囲だけを
 * 「代わりの表示（fallback）」に置き換えて受け止められます。
 *
 * このアプリでは 2 段構えにしています（docs/specs/0001-...md の 3.1）。
 *   - AppErrorBoundary:   アプリ全体。どこにも受け止められなかった例外の最後の砦
 *   - RouteErrorBoundary: 各画面。メニューを残したまま、その画面だけをエラー表示にする
 */
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Link, useLocation } from 'react-router';
import { errorMessage } from '../lib/api';
import { Loading } from './Feedback';

/** 受け止めたエラーを記録します。本番ではここからエラー監視サービスへ送るのが一般的です。 */
function logError(error: unknown): void {
  console.error('画面の表示中にエラーが発生しました:', error);
}

function RouteErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <section className="card error-panel" role="alert">
      <h1>表示できませんでした</h1>
      {/* API のエラーは内容を表示し、想定外のエラーは一般的な文言だけを表示します。 */}
      <p>{errorMessage(error)}</p>
      <div className="form-actions">
        <button type="button" className="button primary" onClick={resetErrorBoundary}>
          再試行
        </button>
        <Link to="/" className="button ghost">
          ダッシュボードへ戻る
        </Link>
      </div>
    </section>
  );
}

/**
 * 画面単位のエラー境界と、読み込み中の表示（Suspense）をまとめたもの。
 *
 * - QueryErrorResetBoundary: 「再試行」を押したときに、失敗したデータ取得をやり直させる
 * - resetKeys: URL のパスが変わったら（別の画面へ移動したら）エラー表示を解除する
 * - Suspense: useSuspenseQuery がデータを待っている間、共通の「読み込み中」を表示する
 */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={RouteErrorFallback}
          onReset={reset}
          onError={logError}
          resetKeys={[pathname]}
        >
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function AppErrorFallback() {
  return (
    <main className="auth-page" role="alert">
      <h1>問題が発生しました</h1>
      <p>ページを読み込み直してください。解決しない場合は、時間をおいてからお試しください。</p>
      <div className="form-actions">
        <button type="button" className="button primary" onClick={() => window.location.reload()}>
          再読み込み
        </button>
        {/* Router の外側でも動くよう、通常のリンクを使います。 */}
        <a href="/" className="button ghost">
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
