import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import { initCapacitor } from './capacitor-init';
import { initI18n } from './i18n';

// ── Sentry (production crash + chunk-error reporting) ────────────
// Gated on REACT_APP_SENTRY_DSN so dev/local runs don't need a DSN.
// Sentry is also exposed on window so AppErrorBoundary's defensive
// capture path can pick it up without coupling the boundary to the
// Sentry import (boundary stays a no-op if Sentry init was skipped).
if (process.env.REACT_APP_SENTRY_DSN) {
  // Lazy-load Sentry so the bundle doesn't pull it on dev / for users
  // when the DSN isn't configured.
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.REACT_APP_SENTRY_RELEASE || undefined,
      tracesSampleRate: 0.1,
      // Don't capture errors from extensions / random network noise.
      ignoreErrors: [
        'Non-Error promise rejection captured',
        'ResizeObserver loop',
        'Network request failed',
      ],
    });
    window.Sentry = Sentry;
  }).catch((err) => {
    // Sentry failed to load? Don't crash the app — log and move on.
    console.warn('[Sentry] failed to initialize:', err?.message);
  });
}

initCapacitor();

const root = ReactDOM.createRoot(document.getElementById('root'));
// Language pack render se PEHLE load hota hai. Warna Hindi/English wale user
// ko pehla frame Hinglish me dikhta aur uske turant baad poori UI badal jaati.
// Default (Hinglish) pack bundle me hi hai, to uske liye ye instant resolve
// hota hai — sirf hi/en par ek chhota dynamic import lagta hai.
initI18n().finally(() => {
  root.render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );
});
