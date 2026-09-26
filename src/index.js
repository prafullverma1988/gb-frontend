import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';
import { initCapacitor } from './capacitor-init';
import { initI18n, loadFullPack } from './i18n';

// ── Sentry (production crash + chunk-error reporting) ────────────
// Gated on REACT_APP_SENTRY_DSN so dev/local runs don't need a DSN.
// Sentry is also exposed on window so AppErrorBoundary's defensive
// capture path can pick it up without coupling the boundary to the
// Sentry import (boundary stays a no-op if Sentry init was skipped).
if (process.env.REACT_APP_SENTRY_DSN) {
  // Lazy-load Sentry so the bundle doesn't pull it on dev / for users
  // when the DSN isn't configured.
  // PERF-16: pehle poora namespace (import * + window.Sentry = Sentry) tha, isliye
  // webpack kuch bhi tree-shake nahi kar paata tha — 473 KB chunk me rrweb
  // (session replay, 77 KB) bhi aata tha jabki replay configure hi nahi hai.
  // Ab sirf init + captureException (AppErrorBoundary yahi maangta hai) liye
  // jaate hain — destructuring hai, isliye webpack baaki export (replay, feedback ..)
  // tree-shake kar deta hai (webpackExports comment ki zaroorat nahi — webpack khud
  // warning deta hai) — aur load first render ke baad browser ke khaali waqt me
  // hota hai, login/dashboard ke raaste me nahi.
  const startSentry = () => import('@sentry/react').then(({ init, captureException }) => {
    init({
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
    window.Sentry = { captureException };
  }).catch((err) => {
    // Sentry failed to load? Don't crash the app — log and move on.
    console.warn('[Sentry] failed to initialize:', err?.message);
  });
  const whenIdle = () => (typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(startSentry, { timeout: 4000 })
    : setTimeout(startSentry, 1500));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
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
  // PERF-04: entry me sirf core pack hai (i18n/index.js). Poora pack pehli render
  // ke baad browser ke khaali waqt me — lazy module usse pehle chalta hi nahi
  // (App.js lazyWithPreload), isliye koi screen key ka naam nahi dikhati.
  const fullPack = () => { loadFullPack().catch(() => {}); };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fullPack, { timeout: 1500 });
  else setTimeout(fullPack, 500);
});
