import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Toaster } from '../components/ui/sonner';
import type { RouterContext } from '../router';

/** すべての画面の土台。通知（トースト）の表示場所もここに 1 つだけ置きます。 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
});
