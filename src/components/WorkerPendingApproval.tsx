import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { AppScreen, WorkerApplication } from '../types';
import { Building2, Clock, CheckCircle2, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';

interface WorkerPendingApprovalProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  workerApplication: WorkerApplication | null;
  setWorkerApplicationData: (data: WorkerApplication) => void;
}

export default function WorkerPendingApproval({
  onTransition,
  showNotification,
  workerApplication,
  setWorkerApplicationData
}: WorkerPendingApprovalProps) {
  const [appStatus, setAppStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>(
    workerApplication?.status === 'APPROVED' || workerApplication?.status === 'REJECTED'
      ? workerApplication.status : 'PENDING'
  );
  const [isChecking, setIsChecking] = useState(false);

  const refreshStatus = useCallback(async (notify = false) => {
    const user = auth.currentUser;
    if (!user) {
      if (notify) showNotification('Please sign in again to check your application status.');
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/workers/status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Status check failed.');
      if (!result.registered) {
        setAppStatus('PENDING');
        if (notify) showNotification('We could not find your application yet. Please contact PUNCHX support.');
        return;
      }
      const status = result.status === 'APPROVED' || result.status === 'REJECTED' ? result.status : 'PENDING';
      setAppStatus(status);
      if (workerApplication) {
        setWorkerApplicationData({
          ...workerApplication,
          id: result.applicationId || workerApplication.id,
          status,
          skill: result.skill || workerApplication.skill,
          categories: result.categories || workerApplication.categories
        });
      }
      if (notify) showNotification(status === 'APPROVED'
        ? 'Your application has been approved. You can now enter the professional dashboard.'
        : status === 'REJECTED'
          ? 'Your application was rejected. Please contact PUNCHX support for details.'
          : 'Your application is still pending admin review.');
    } catch (error) {
      if (notify) showNotification(error instanceof Error ? error.message : 'Could not check application status.');
    }
  }, [workerApplication, setWorkerApplicationData, showNotification]);

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 30000);
    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await refreshStatus(true);
    setIsChecking(false);
  };

  const handleEnterWorkerTerminal = () => {
    if (appStatus !== 'APPROVED') {
      showNotification('Your application must be approved by an administrator first.');
      return;
    }
    window.location.assign('/worker/dashboard');
  };

  return (
    <div id="worker-pending-screen" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans py-10 px-4 sm:px-6 relative flex flex-col justify-center">
      
      <div className="max-w-2xl mx-auto w-full bg-[#11192e] border border-[#c5a059]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
        
        {/* Header Icon Status */}
        <div className="text-center space-y-3 border-b border-zinc-800 pb-5">
          <div className="relative inline-block">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl border ${
              appStatus === 'APPROVED' 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-amber-500/10 border-[#c5a059] text-[#e9c176]'
            }`}>
              {appStatus === 'APPROVED' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : (
                <Clock className="w-8 h-8 text-[#e9c176] animate-pulse" />
              )}
            </div>
            {appStatus === 'PENDING' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping"></span>
            )}
          </div>

          <div>
            <span className={`text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full border ${
              appStatus === 'APPROVED' 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {appStatus === 'APPROVED' ? 'STATUS: AUTHORIZED & APPROVED' : 'STATUS: PENDING ADMIN DASHBOARD REVIEW'}
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">
              {appStatus === 'APPROVED' 
                ? 'WORKER AUTHORIZATION GRANTED' 
                : 'REQUEST SENT TO ADMIN DASHBOARD'}
            </h1>
            <p className="text-xs text-zinc-300 max-w-md mx-auto mt-1 leading-relaxed">
              {appStatus === 'APPROVED'
                ? 'Your credentials and technical profile have been approved by the Admin Dashboard. You may now launch your fresh Worker Operations Terminal.'
                : 'Your profile details and service hub location have been submitted to the Admin Dashboard. Once the admin accepts your request, your dashboard access will be unlocked.'}
            </p>
          </div>
        </div>

        {/* Submitted Details Card */}
        <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="text-[10px] font-mono text-[#e9c176] font-bold uppercase">SUBMITTED APPLICATION DOSSIER</span>
            <span className="text-[10px] font-mono text-zinc-500">{workerApplication?.id || 'APP-PENDING'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block">Legal Name</span>
              <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-[#c5a059]" /> {workerApplication?.legalName || 'Specialist Technician'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-400 block">Specialist Skill</span>
              <span className="font-bold text-[#e9c176] flex items-center gap-1.5 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-[#c5a059]" /> {workerApplication?.skill || 'Certified Field Technician'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-400 block">Service Hub Location</span>
              <span className="font-bold text-zinc-300 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#c5a059]" /> {workerApplication?.sector || 'Active Service Hub'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-400 block">Registered Contacts</span>
              <span className="font-bold text-zinc-300 flex items-center gap-1.5 mt-0.5 truncate">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> {workerApplication?.phone || '+91 Contact Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Notice */}
        {appStatus === 'PENDING' ? (
          <div className="bg-[#0d1629] border border-[#c5a059]/40 rounded-2xl p-4 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-[#e9c176]">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-bold font-mono uppercase">Live Admin Review in Progress</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              When the company administrator accepts your request in the <span className="text-[#e9c176] font-bold">Admin Dashboard</span>, this screen will automatically activate your terminal.
            </p>

            <button
              id="check-approval-status-btn"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="px-4 py-2 bg-[#15203b] hover:bg-[#c5a059] text-[#e9c176] hover:text-black border border-[#c5a059]/50 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Admin Status...' : 'Check Live Admin Status'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold font-mono uppercase">AUTHORIZATION ACCEPTED BY ADMIN</span>
            </div>
            <p className="text-xs text-emerald-200">Your profile is authorized to receive live customer requests in your sector.</p>
          </div>
        )}

        {/* Enter Worker Terminal Action */}
        <button
          id="enter-worker-terminal-btn"
          onClick={handleEnterWorkerTerminal}
          disabled={appStatus !== 'APPROVED'}
          className="w-full py-4 rounded-xl font-extrabold text-xs uppercase tracking-widest font-mono transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-teal-400 text-black border border-emerald-300 hover:brightness-110 active:scale-[0.98]"
        >
          <span>Enter Professional Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
