import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './components/ErrorBoundaries';
import { createQueryClient } from './lib/query';
import { createAppRouter } from './router';
import './styles.css';

// 401 を受け取ったら、ルーターに認証の確認（beforeLoad）をやり直させます。
// queryClient と router は互いを参照するため、router は後から代入します。
const queryClient = createQueryClient({ onUnauthenticated: () => void router.invalidate() });
const router = createAppRouter({ queryClient });

const container = document.getElementById('root');
// getElementById の戻り値は HTMLElement | null。null の可能性を先に取り除きます。
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
