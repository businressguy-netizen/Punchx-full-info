import React from 'react';
import { NamoIDProvider } from '@namoidhq/react';
import { ErrorBoundary } from './ErrorBoundary';
import { namoidFetcher } from '../lib/namoidFetcher';

const CLIENT_ID = import.meta.env.VITE_NAMOID_CLIENT_ID || 'namoid_client_live_6SHiIOdLuGIBZmiJjC5Iu5KCbqB2QQjd';

export default function NamoIDAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      name="NamoID authentication"
      fallback={
        <main className="min-h-[70vh] flex items-center justify-center bg-[#f7faff] p-6 text-center">
          <section className="w-full max-w-md rounded-3xl border border-[#dbeafe] bg-white p-7 shadow-[0_24px_80px_rgba(30,70,130,.12)]">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#bfdbfe] border-t-[#2563eb] animate-spin" />
            <h1 className="text-xl font-black text-[#0f172a]">Secure sign-in is temporarily unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">PunchX is still available. Please refresh the sign-in screen and try again.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#1d4ed8]">Retry secure sign-in</button>
          </section>
        </main>
      }
    >
      <NamoIDProvider clientId={CLIENT_ID} fetcher={namoidFetcher}>
        {children}
      </NamoIDProvider>
    </ErrorBoundary>
  );
}
