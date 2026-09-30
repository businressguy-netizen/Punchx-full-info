import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './punchx-marketplace.css';

// Production-safe recovery for Vite deployment/version skew.
// Vite recommends handling preload errors by refreshing and serving the HTML
// with no-cache headers so old HTML cannot keep referencing deleted chunks.
if (typeof window !== 'undefined') {
  const BUILD_MARKER = '2026-09-30-ui-recovery-v3';
  const recoveryKey = `punchx-vite-recovery:${BUILD_MARKER}`;

  const recoverFromStaleDeployment = () => {
    try {
      // Remove recovery flags from older builds so a stale browser session
      // cannot block the current deployment from recovering once.
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('punchx-vite-recovery:'))
        .forEach((key) => sessionStorage.removeItem(key));

      if (sessionStorage.getItem(recoveryKey) === '1') {
        // A recovery was already attempted for this build. Let the normal
        // ErrorBoundary show a retryable error instead of creating a loop.
        return;
      }

      sessionStorage.setItem(recoveryKey, '1');
      const url = new URL(window.location.href);
      url.searchParams.set('__punchx_refresh', `${BUILD_MARKER}-${Date.now()}`);
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
    }
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('PunchX root element was not found. Check index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
