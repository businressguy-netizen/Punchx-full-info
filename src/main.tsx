import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './punchx-marketplace.css';

// Production-safe recovery for Vite deployment/version skew.
// The recovery key is deployment-specific so an old browser session cannot
// block recovery for a newer deployment.
if (typeof window !== 'undefined') {
  const BUILD_MARKER = '2026-09-30-ui-recovery-v2';
  const recoveryKey = `punchx-vite-recovery:${BUILD_MARKER}`;

  const recoverFromStaleDeployment = () => {
    try {
      // Remove legacy recovery flags from older builds. They can otherwise
      // prevent the current build from performing its first recovery attempt.
      sessionStorage.removeItem('punchx-vite-recovery-version');
      sessionStorage.removeItem('punchx-vite-recovery-attempt');

      if (sessionStorage.getItem(recoveryKey) === '1') return;
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
