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
import './styles/demo-mode.css';
import './styles/demo-shell.css';
import './styles/demo-persistence.css';
import './styles/demo-execution.css';
import './styles/demo-planning.css';
import './styles/demo-technician.css';
import './styles/demo-assets.css';
import './styles/demo-detail-actions.css';
import './styles/demo-module-actions.css';
import './styles/demo-report-actions.css';
import './styles/real-clean-mode.css';

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
