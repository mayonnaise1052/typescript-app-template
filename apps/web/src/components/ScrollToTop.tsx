import { useLayoutEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

/**
 * 画面（パス）が変わったら、ページの先頭へスクロールします。
 *
 * React Router の <ScrollRestoration> はデータルーター（createBrowserRouter）専用で、
 * このアプリの <BrowserRouter> では使えないため、同じ役割の最小限の部品を自作しています。
 *
 * - リンクのクリックや navigate() による移動（PUSH / REPLACE）だけ先頭へ戻します。
 * - 戻る・進む（POP）はブラウザ標準のスクロール位置の復元に任せます。初回表示も POP です。
 * - `/notes?page=2` のようにクエリ文字列だけが変わったときは、パスが同じなので何もしません。
 *
 * useEffect ではなく useLayoutEffect を使うのは、新しい画面が「前の位置のまま」一瞬描画されるのを
 * 防ぐためです（画面に描かれる前に同期的に実行されます）。
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  // 前回のパスを覚えておき、「パスが変わったとき」だけ動くようにします。
  // （依存配列に navigationType も入るため、それだけでは POP → クエリだけの PUSH でも実行されてしまいます。）
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (navigationType !== NavigationType.Pop) window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
