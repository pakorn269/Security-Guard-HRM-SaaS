import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://69e17d78d976d185ff491610a9516935@o4510766004633600.ingest.us.sentry.io/4510766032224256',
  // Send default PII data (e.g. IP address)
  sendDefaultPii: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
