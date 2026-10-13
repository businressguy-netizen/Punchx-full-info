import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './punchx-marketplace.css';
import './punchx-blue-theme.css';
import './punchx-motion-fixes.css';

// Production-safe recovery for Vite deployment/version skew.
// Keep this marker unique for every recovery implementation so a browser that
// already consumed an older recovery attempt can still recover after a deploy.
if (typeof window !== 'undefined') {
  const BUILD_MARKER = '2026-10-01-runtime-recovery-v3';
  const recoveryKey = `punchx-vite-recovery:${BUILD_MARKER}`;

  const isChunkFailure = (value: unknown) => {
    const message = String((value as any)?.message || value || '').toLowerCase();
    return (
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('importing a module script failed') ||
      message.includes('loading chunk') ||
      message.includes('chunkloaderror') ||
      message.includes('dynamically imported module')
    );
  };

  const recoverFromStaleDeployment = () => {
    try {
      // Remove recovery markers from older builds so they cannot block recovery.
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('punchx-vite-recovery:') && key !== recoveryKey)
        .forEach((key) => sessionStorage.removeItem(key));

      if (sessionStorage.getItem(recoveryKey) === '1') return;
      sessionStorage.setItem(recoveryKey, '1');

      const url = new URL(window.location.href);
      url.searchParams.set('__punchx_refresh', `${BUILD_MARKER}-${Date.now()}`);
      // Replace instead of reload so the browser requests a fresh document URL.
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
    if (isChunkFailure(event.reason)) {
      event.preventDefault();
      recoverFromStaleDeployment();
    }
  });

  window.addEventListener('error', (event) => {
    if (isChunkFailure(event.error || event.message)) {
      event.preventDefault();
      recoverFromStaleDeployment();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('PunchX root element was not found. Check index.html.');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
