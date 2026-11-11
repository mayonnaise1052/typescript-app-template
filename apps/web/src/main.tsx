import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { createQueryClient } from './lib/query';
import './styles.css';

const container = document.getElementById('root');
// getElementById の戻り値は HTMLElement | null。null の可能性を先に取り除きます。
if (!container) throw new Error('#root が見つかりません');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
