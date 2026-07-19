import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AuthApp from './AuthApp';
import './styles/global.css';
import './styles/auth.css';
import './styles/real-data.css';
import './styles/work-order-create.css';
import './styles/ui-polish.css';
import './styles/real-clean-mode.css';
import './styles/real-mobile-fixes.css';
import './styles/clients.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthApp />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
