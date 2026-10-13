import React from 'react';
import { motion } from 'motion/react';
import { User, Wrench, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface PanelSelectProps {
  onSelectPanel: (panel: 'customer' | 'worker' | 'admin', action?: 'login' | 'signup') => void;
  showNotification: (msg: string) => void;
}

export default function PanelSelect({ onSelectPanel, showNotification }: PanelSelectProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7faff] text-[#0f172a] px-5 py-8 sm:px-8">
      <style>{`
        @keyframes punchx-drift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(35px,-22px,0) scale(1.06); } }
        @keyframes punchx-grid-move { from { background-position: 0 0; } to { background-position: 48px 48px; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full bg-[#2563eb]/10 blur-[100px]" style={{ animation: 'punchx-drift 9s ease-in-out infinite' }} />
        <div className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-[#38bdf8]/10 blur-[110px]" style={{ animation: 'punchx-drift 11s ease-in-out infinite reverse' }} />
        <div className="absolute -bottom-48 left-1/3 h-[500px] w-[500px] rounded-full bg-[#bfdbfe]/30 blur-[110px]" />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(37,99,235,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.055) 1px, transparent 1px)', backgroundSize: '48px 48px', animation: 'punchx-grid-move 18s linear infinite' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col items-center justify-center">
        <motion.div initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 rounded-full border border-[#bfdbfe] bg-white/80 p-2 shadow-lg backdrop-blur">
            <div className="h-16 w-16 rounded-full bg-white p-1.5"><img src={PUNCHX_LOGO} alt="PUNCHX" className="h-full w-full object-contain" /></div>
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563eb] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> PUNCHX UNIFIED PLATFORM
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#0f172a] sm:text-5xl">Select Your PunchX Workspace</h1>
          <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-[#64748b] sm:text-base">Book local professionals or sign in as a service professional.</p>
        </motion.div>

        {/* Dual Cards: Customer vs Specialist */}
        <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Customer Workspace Card */}
          <motion.section initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#dbeafe] bg-white/90 p-6 shadow-[0_22px_70px_rgba(30,64,175,.10)] backdrop-blur-xl sm:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#2563eb]/7 blur-3xl transition-all duration-500 group-hover:bg-[#38bdf8]/12" />
            <div className="relative flex flex-col items-center text-center flex-1">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                <User className="h-3 w-3" /> Customer Workspace
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] shadow-sm mb-4 transition-transform duration-300 group-hover:scale-105">
                <User className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#0f172a]">Customer Portal</h2>
              <p className="mt-2 text-xs sm:text-sm text-[#64748b] mb-6 leading-relaxed">
                Explore local professionals for AC, electrical, plumbing, carpentry and other home services. Tracking availability depends on the booking.
              </p>
            </div>
            <button onClick={() => { showNotification(`Opening Customer portal...`); onSelectPanel('customer', 'login'); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(37,99,235,.24)] transition-all hover:bg-[#1d4ed8] hover:shadow-[0_16px_34px_rgba(37,99,235,.30)] active:scale-[.99]">
              Log in to book services <ArrowRight className="h-4 w-4" />
            </button>
          </motion.section>

          {/* Specialist Partner Card */}
          <motion.section initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#fef3c7] bg-white/95 p-6 shadow-[0_22px_70px_rgba(217,119,6,.10)] backdrop-blur-xl sm:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20" />
            <div className="relative flex flex-col items-center text-center flex-1">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                <ShieldCheck className="h-3 w-3" /> Specialist Workspace
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm mb-4 transition-transform duration-300 group-hover:scale-105">
                <Wrench className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#0f172a]">Worker / Specialist Portal</h2>
              <p className="mt-2 text-xs sm:text-sm text-[#64748b] mb-6 leading-relaxed">
                Receive instant neighborhood dispatches, manage active orders with OTP verification, and track daily payouts.
              </p>
            </div>
            <div className="space-y-2.5 w-full">
              <button onClick={() => { showNotification(`Opening Specialist login...`); onSelectPanel('worker', 'login'); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(217,119,6,.24)] transition-all hover:bg-amber-700 active:scale-[.99]">
                Specialist Partner Login <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => { showNotification(`Opening Specialist Application...`); onSelectPanel('worker', 'signup'); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50/60 px-5 py-2.5 text-xs font-bold text-amber-900 transition-all hover:bg-amber-100/70 active:scale-[.99]">
                Apply as Professional Specialist ➔
              </button>
            </div>
          </motion.section>

        </div>
      </div>
    </main>
  );
}

