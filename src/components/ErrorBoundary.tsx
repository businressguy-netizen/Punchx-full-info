import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';
import PUNCHX_LOGO from '../assets/logo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const RECOVERY_KEY = 'punchx-runtime-recovery-v4';
const CHUNK_ERROR_RE = /failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror|dynamically imported module/i;

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PunchX Runtime Error Boundary caught:', error, errorInfo);
    this.setState({ errorInfo });

    const message = error?.message || '';
    if (CHUNK_ERROR_RE.test(message)) {
      try {
        if (sessionStorage.getItem(RECOVERY_KEY) !== '1') {
          sessionStorage.setItem(RECOVERY_KEY, '1');
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith('punchx-vite-recovery:'))
            .forEach((key) => sessionStorage.removeItem(key));
          const url = new URL(window.location.href);
          url.searchParams.set('__punchx_runtime_refresh', `${Date.now()}`);
          window.setTimeout(() => window.location.replace(url.toString()), 150);
        }
      } catch {
        window.setTimeout(() => window.location.reload(), 150);
      }
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem(RECOVERY_KEY);
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('punchx-vite-recovery:'))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch { /* Ignore storage restrictions. */ }
    const url = new URL(window.location.href);
    url.searchParams.set('__punchx_manual_refresh', `${Date.now()}`);
    window.location.replace(url.toString());
  };

  private handleResetAndReload = () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('punchx_'))
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('punchx-'))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('PunchX storage reset notice:', error);
    }
    window.location.replace(`/?__punchx_reset=${Date.now()}`);
  };

  private handleHome = () => {
    try { sessionStorage.removeItem(RECOVERY_KEY); } catch { /* Ignore. */ }
    window.location.replace(`/?__punchx_home=${Date.now()}`);
  };

  public render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const errorMessage = this.state.error?.message?.trim() || 'Unknown application error';
    const isChunkError = CHUNK_ERROR_RE.test(errorMessage);

    return (
      <main id="punchx-error-fallback" className="min-h-screen w-full bg-[#f7faff] text-[#0f172a] flex items-center justify-center p-5 font-sans">
        <div className="w-full max-w-md rounded-3xl border border-[#bfdbfe] bg-white p-6 shadow-[0_24px_80px_rgba(30,70,130,.12)] sm:p-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#bfdbfe] bg-white p-2 shadow-sm">
            <img src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full rounded-full object-cover" />
          </div>
          <div className="mb-4 flex justify-center"><span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"><AlertTriangle className="h-3.5 w-3.5" />{isChunkError ? 'Refreshing PunchX' : 'Temporary application error'}</span></div>
          <h1 className="text-center text-2xl font-black tracking-tight sm:text-3xl">{isChunkError ? 'PunchX needs a fresh version' : 'PunchX could not load this screen'}</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#64748b]">{isChunkError ? 'A newer application asset is available. PunchX is refreshing safely without deleting your account data.' : 'The screen hit a temporary runtime problem. PunchX will keep your account data and provide a safe recovery path.'}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button id="btn-error-reload" type="button" onClick={this.handleReload} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] active:translate-y-0"><RefreshCw className="h-4 w-4" /> Refresh PunchX</button>
            <button type="button" onClick={this.handleHome} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] px-4 py-3 text-sm font-bold text-[#2563eb] transition hover:bg-[#eef6ff]"><Home className="h-4 w-4" /> Open PunchX Home</button>
            <button id="btn-error-reset" type="button" onClick={this.handleResetAndReload} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-[#f6f7f9] px-4 py-3 text-sm font-bold text-[#475569] transition hover:bg-[#eceff3] active:scale-[.99]"><Trash2 className="h-4 w-4" /> Reset PunchX session</button>
          </div>
          {import.meta.env.DEV && (<details className="mt-6 rounded-2xl border border-[#dbeafe] bg-[#f7fbff] p-3 text-left"><summary className="cursor-pointer text-xs font-bold text-[#64748b]">Developer error details</summary><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-[#334155]">{errorMessage}</pre>{this.state.errorInfo?.componentStack && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-[#64748b]">{this.state.errorInfo.componentStack}</pre>}</details>)}
        </div>
      </main>
    );
  }
}
