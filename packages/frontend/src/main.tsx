import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { SplashLoader } from '@/components/ui/loaders';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

function Root() {
  const [appReady, setAppReady] = useState(false);

  return (
    <HelmetProvider>
      {!appReady && (
        <SplashLoader
          onComplete={() => setAppReady(true)}
          navLogoPosition={{ top: 18, left: 20 }}
          navLogoSize={32}
        />
      )}
      <div
        style={{
          visibility: appReady ? 'visible' : 'hidden',
          opacity: appReady ? 1 : 0,
          transition: appReady ? 'opacity 0.3s ease' : 'none',
        }}
      >
        <App />
      </div>
    </HelmetProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
