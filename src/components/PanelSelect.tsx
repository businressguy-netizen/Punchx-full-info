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
    <main className="relative min-h-screen overflow-hidden bg-[#F7EFE7] text-[#1D1E1A] px-5 py-8 sm:px-8">
      <style>{`
        @keyframes punchx-drift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(35px,-22px,0) scale(1.06); } }
        @keyframes punchx-grid-move { from { background-position: 0 0; } to { background-position: 48px 48px; } }
        @keyframes punchx-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes punchx-sheen { 0%, 55% { transform: translateX(-160%) skewX(-18deg); } 100% { transform: translateX(260%) skewX(-18deg); } }
        @keyframes punchx-soft-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(185,154,98,.16); } 50% { box-shadow: 0 0 0 12px rgba(185,154,98,0); } }
        .px-workspace-card { transform: translateZ(0); transition: box-shadow .35s ease, border-color .35s ease; }
        .px-workspace-card:before { content:''; position:absolute; inset:0; border-radius:inherit; padding:1px; background:linear-gradient(135deg,rgba(255,255,255,.95),rgba(196,165,104,.28),rgba(185,154,98,.12)); -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; opacity:.7; }
        .px-workspace-card:after { content:''; position:absolute; top:-30%; bottom:-30%; left:0; width:28%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent); transform:translateX(-160%) skewX(-18deg); pointer-events:none; }
        .px-workspace-card:hover:after { animation:punchx-sheen 1.05s ease-out; }
        .px-workspace-orbit { position:absolute; inset:-7px; border-radius:9999px; border:1px solid rgba(185,154,98,.17); animation:punchx-orbit 18s linear infinite; }
        .px-workspace-orbit:after { content:''; position:absolute; top:12%; left:17%; width:6px; height:6px; border-radius:50%; background:#c4a568; box-shadow:0 0 14px rgba(196,165,104,.7); }
        @media(prefers-reduced-motion:reduce) { .px-workspace-card:after,.px-workspace-orbit { animation:none!important; } * { scroll-behavior:auto!important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full bg-[#64745D]/10 blur-[100px]" style={{ animation: 'punchx-drift 9s ease-in-out infinite' }} />
        <div className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-[#D9C28F]/10 blur-[110px]" style={{ animation: 'punchx-drift 11s ease-in-out infinite reverse' }} />
        <div className="absolute -bottom-48 left-1/3 h-[500px] w-[500px] rounded-full bg-[#D9C28F]/30 blur-[110px]" />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(185,154,98,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(185,154,98,.055) 1px, transparent 1px)', backgroundSize: '48px 48px', animation: 'punchx-grid-move 18s linear infinite' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col items-center justify-center">
        <motion.div initial={{ y: -22, opacity: 0, filter:"blur(7px)" }} animate={{ y: 0, opacity: 1, filter:"blur(0px)" }} transition={{duration:.65,ease:[.22,1,.36,1]}} className="mb-8 flex flex-col items-center text-center">
          <motion.div initial={{scale:.82,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:180,damping:16,delay:.08}} className="relative mb-5 rounded-full border border-[#D9C28F] bg-white/85 p-2 shadow-[0_16px_45px_rgba(185,154,98,.16)] backdrop-blur">
            <div className="px-workspace-orbit" aria-hidden="true" />
            <motion.div animate={{y:[0,-3,0]}} transition={{duration:4,ease:"easeInOut",repeat:Infinity}} className="h-16 w-16 rounded-full bg-white p-1.5"><img src={PUNCHX_LOGO} alt="PUNCHX" className="h-full w-full object-contain" /></motion.div>
          </motion.div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D9C28F] bg-white/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#64745D] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> PUNCHX UNIFIED PLATFORM
          </div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#1D1E1A] sm:text-5xl">Select Your PunchX Workspace</h1>
          <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-[#77776C] sm:text-base">Book local professionals or sign in as a service professional.</p>
        </motion.div>

        {/* Dual Cards: Customer vs Specialist */}
        <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Customer Workspace Card */}
          <motion.section initial={{ opacity: 0, y: 34, scale:.975 }} whileInView={{ opacity: 1, y: 0, scale:1 }} viewport={{once:true,amount:.2}} transition={{ delay: 0.12, duration: 0.62, ease:[.22,1,.36,1] }} whileHover={{y:-7,scale:1.008}} whileTap={{scale:.99}} className="px-workspace-card group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#E6DECC] bg-white/90 p-6 shadow-[0_22px_70px_rgba(40,34,21,.10)] backdrop-blur-xl sm:p-8 hover:border-[#D9C28F] hover:shadow-[0_30px_85px_rgba(40,34,21,.17)]">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#64745D]/7 blur-3xl transition-all duration-500 group-hover:bg-[#D9C28F]/12" />
            <div className="relative flex flex-col items-center text-center flex-1">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#80663A]">
                <User className="h-3 w-3" /> Customer Workspace
              </div>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D9C28F] bg-gradient-to-br from-white to-[#F7EFE7] text-[#64745D] shadow-[0_8px_22px_rgba(185,154,98,.12)] transition-transform duration-500 group-hover:rotate-[-4deg] group-hover:scale-110">
                <User className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1D1E1A]">Customer Portal</h2>
              <p className="mt-2 text-xs sm:text-sm text-[#77776C] mb-6 leading-relaxed">
                Explore local professionals for AC, electrical, plumbing, carpentry and other home services. Tracking availability depends on the booking.
              </p>
            </div>
            <button onClick={() => { showNotification(`Opening Customer portal...`); onSelectPanel('customer', 'login'); }} className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#64745D] via-[#B99A62] to-[#1D1E1A] px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(185,154,98,.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(185,154,98,.34)] active:scale-[.985] before:absolute before:inset-y-0 before:left-0 before:w-1/3 before:-translate-x-[160%] before:skew-x-[-18deg] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[360%]">
              Log in to book services <ArrowRight className="h-4 w-4" />
            </button>
          </motion.section>

          {/* Specialist Partner Card */}
          <motion.section initial={{ opacity: 0, y: 38, scale:.975 }} whileInView={{ opacity: 1, y: 0, scale:1 }} viewport={{once:true,amount:.2}} transition={{ delay: 0.24, duration: 0.68, ease:[.22,1,.36,1] }} whileHover={{y:-7,scale:1.008}} whileTap={{scale:.99}} className="px-workspace-card group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#fef3c7] bg-white/95 p-6 shadow-[0_22px_70px_rgba(62,50,57,.08)] backdrop-blur-xl sm:p-8 hover:border-[#D9C28F] hover:shadow-[0_30px_85px_rgba(62,50,57,.13)]">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#F7EFE7]0/10 blur-3xl transition-all duration-500 group-hover:bg-[#F7EFE7]0/20" />
            <div className="relative flex flex-col items-center text-center flex-1">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#D9C28F] bg-[#F7EFE7] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64745D]">
                <ShieldCheck className="h-3 w-3" /> Specialist Workspace
              </div>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D9C28F] bg-gradient-to-br from-white to-amber-50 text-[#64745D] shadow-[0_8px_22px_rgba(185,154,98,.12)] transition-transform duration-500 group-hover:rotate-[4deg] group-hover:scale-110">
                <Wrench className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1D1E1A]">Worker / Specialist Portal</h2>
              <p className="mt-2 text-xs sm:text-sm text-[#77776C] mb-6 leading-relaxed">
                Receive instant neighborhood dispatches, manage active orders, and track daily payouts.
              </p>
            </div>
            <div className="space-y-2.5 w-full">
              <button onClick={() => { showNotification(`Opening Specialist login...`); onSelectPanel('worker', 'login'); }} className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#64745D] via-[#B99A62] to-[#1D1E1A] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(62,50,57,.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(62,50,57,.24)] active:scale-[.985] before:absolute before:inset-y-0 before:left-0 before:w-1/3 before:-translate-x-[160%] before:skew-x-[-18deg] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[360%]">
                Specialist Partner Login <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => { showNotification(`Opening Specialist Application...`); onSelectPanel('worker', 'signup'); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9C28F] bg-[#F7EFE7]/60 px-5 py-2.5 text-xs font-bold text-[#1D1E1A] transition-all hover:bg-[#E6DECC]/70 active:scale-[.99]">
                Apply as Professional Specialist ➔
              </button>
            </div>
          </motion.section>

        </div>
      </div>
    </main>
  );
}

