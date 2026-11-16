import React, { useEffect } from 'react';
import { AppScreen, WorkerApplication } from '../types';
import { auth } from '../lib/firebase';

interface WorkerOtpPassProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  workerApplication: WorkerApplication | null;
  setWorkerApplicationData: (data: WorkerApplication) => void;
}

export default function WorkerOtpPass({ onTransition, showNotification, workerApplication }: WorkerOtpPassProps) {
  useEffect(() => {
    if (!auth.currentUser) {
      showNotification('Please sign in before continuing professional onboarding.');
      onTransition('auth');
      return;
    }
    // OTP is not configured. Never simulate verification or grant approval here.
    onTransition(workerApplication?.id ? 'worker-pending-approval' : 'worker-signup');
  }, [onTransition, showNotification, workerApplication?.id]);

  return (
    <main className="min-h-screen bg-[#07122a] text-white flex items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[#c5a059]/40 bg-[#11192e] p-6 text-center">
        <h1 className="text-xl font-bold">Professional application verification</h1>
        <p className="mt-3 text-sm text-zinc-300">Phone and email OTP delivery is not configured in this step. Your application status is handled by the PUNCHX administrator.</p>
      </div>
    </main>
  );
}
