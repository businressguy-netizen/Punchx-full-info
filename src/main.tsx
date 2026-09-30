import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './punchx-marketplace.css';

// Production-safe recovery for Vite deployment/version skew. Vite documents that
// an old HTML document can reference chunks removed by a newer deployment. A
// plain reload can reuse that stale HTML, so recovery uses a one-time cache-busting
// URL and the server sends no-cache headers for the HTML document.
if (typeof window !== 'undefined') {
  const recoveryKey = 'punchx-vite-recovery-version';

  const recoverFromStaleDeployment = () => {
    try {
      const currentVersion = sessionStorage.getItem(recoveryKey);
      const recoveryVersion = String(Date.now());
      // Allow one cache-busted recovery for each browser session/version incident.
      if (currentVersion) return;
      sessionStorage.setItem(recoveryKey, recoveryVersion);

      const url = new URL(window.location.href);
      url.searchParams.set('__punchx_refresh', recoveryVersion);
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    recoverFromStaleDeployment();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '').toLowerCase();

    if (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('importing a module script failed') ||
      msg.includes('loading chunk') ||
      msg.includes('chunkloaderror')
    ) {
      event.preventDefault();
      recoverFromStaleDeployment();
      return;
    }

    if (msg.includes('websocket') && (msg.includes('vite') || msg.includes('ws'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);