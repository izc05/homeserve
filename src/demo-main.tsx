import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoApp from './DemoApp';
import './styles/global.css';
import './styles/auth.css';
import './styles/real-data.css';
import './styles/demo-mode.css';
import './styles/demo-shell.css';
import './styles/demo-persistence.css';
import './styles/demo-execution.css';
import './styles/ui-polish.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>,
);
