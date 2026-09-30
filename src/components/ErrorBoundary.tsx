import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import PUNCHX_LOGO from '../assets/logo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PunchX Runtime Error Boundary caught:', error, errorInfo);
    this.setState({ errorInfo });

    // Vite's `vite:preloadError` handler in main.tsx owns stale-chunk
    // recovery. Do not reload from this boundary as well: doing so can create
    // a reload loop and leave users permanently stuck on a recovery screen.
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem('punchx-vite-recovery-attempt');
      sessionStorage.removeItem('punchx-vite-recovery-version');
    } catch {
      // Ignore storage restrictions.
    }
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('punchx_'))
        .forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem('punchx-vite-recovery-attempt');
      sessionStorage.removeItem('punchx-vite-recovery-version');
    } catch (error) {
      console.warn('PunchX storage reset notice:', error);
    }
    window.location.replace(window.location.pathname);
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const errorMessage = this.state.error?.message?.trim() || 'Unknown application error';
    const isChunkError = /failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(errorMessage);

    return (
      <main
        id="punchx-error-fallback"
        className="min-h-screen w-full bg-[#f7f7fb] text-[#17191d] flex items-center justify-center p-5 font-sans"
      >
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(30,25,55,.12)] sm:p-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[#7358d7]/15 bg-white p-2 shadow-sm">
            <img src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full object-contain" />
          </div>

          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {isChunkError ? 'Refreshing PunchX' : 'Temporary application error'}
            </span>
          </div>

          <h1 className="text-center text-2xl font-black tracking-tight sm:text-3xl">
            {isChunkError ? 'PunchX needs a fresh version' : 'PunchX could not load this screen'}
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#69707d]">
            {isChunkError
              ? 'The browser has an older application asset. Refreshing loads the current PunchX deployment without changing your account data.'
              : 'A screen encountered an unexpected error. Your account data is not deleted. Try again, and reset the local PunchX session only if the problem continues.'}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              id="btn-error-reload"
              type="button"
              onClick={this.handleReload}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#7358d7]/20 transition hover:-translate-y-0.5 hover:bg-[#654bc9] active:translate-y-0"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh PunchX
            </button>
            <button
              id="btn-error-reset"
              type="button"
              onClick={this.handleResetAndReload}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-[#f6f7f9] px-4 py-3 text-sm font-bold text-[#3f4650] transition hover:bg-[#ececf4] active:scale-[.99]"
            >
              <Trash2 className="h-4 w-4" />
              Reset PunchX session
            </button>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-6 rounded-2xl border border-black/10 bg-[#f7f8fa] p-3 text-left">
              <summary className="cursor-pointer text-xs font-bold text-[#69707d]">Developer error details</summary>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-[#3f4650]">{errorMessage}</pre>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-[#69707d]">{this.state.errorInfo.componentStack}</pre>
              )}
            </details>
          )}
        </div>
      </main>
    );
  }
}
