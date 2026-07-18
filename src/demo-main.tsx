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
import './styles/demo-planning.css';
import './styles/demo-technician.css';
import './styles/demo-assets.css';
import './styles/demo-detail-actions.css';
import './styles/demo-module-actions.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>,
);
