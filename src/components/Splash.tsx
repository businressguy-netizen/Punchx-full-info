import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, Wrench, Home, Zap, Droplets, Hammer, Wind, Settings2 } from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface SplashProps {
  onTransition: (target: AppScreen) => void;
}

export default function Splash({ onTransition }: SplashProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onTransition('panel-select'), 2600);
    return () => window.clearTimeout(timer);
  }, [onTransition]);

  const serviceIcons = [Wrench, Home, Zap, Droplets, Hammer, ShieldCheck, Wind, Settings2];
  const particles = useMemo(
    () => Array.from({ length: 30 }, (_, index) => ({
      left: `${(index * 37) % 100}%`,
      top: `${(index * 61 + 7) % 100}%`,
      size: 2 + (index % 3),
      delay: (index % 10) * 0.35,
      duration: 3.5 + (index % 5) * 0.8,
    })),
    []
  );

  return (
    <main className="punchx-splash relative min-h-screen overflow-hidden bg-[#f4f8ff] text-[#0f172a] flex items-center justify-center px-6">
      <style>{`
        @keyframes punchx-grid-drift {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(24px,18px,0) scale(1.035); }
          100% { transform: translate3d(48px,36px,0) scale(1); }
        }
        @keyframes punchx-aurora {
          0%,100% { transform: translate3d(-5%,0,0) scale(1); opacity:.42; }
          50% { transform: translate3d(8%,5%,0) scale(1.12); opacity:.68; }
        }
        @keyframes punchx-aurora-two {
          0%,100% { transform: translate3d(6%,4%,0) scale(1.05); opacity:.28; }
          50% { transform: translate3d(-7%,-5%,0) scale(1.16); opacity:.52; }
        }
        @keyframes punchx-wave {
          0% { transform: translateX(-18%) rotate(-7deg); }
          100% { transform: translateX(18%) rotate(7deg); }
        }
        @keyframes punchx-particle {
          0%,100% { transform: translate3d(0,8px,0) scale(.65); opacity:.12; }
          50% { transform: translate3d(0,-12px,0) scale(1.25); opacity:.8; }
        }
        @keyframes punchx-orbit {
          from { transform: rotate(0deg) translateX(clamp(112px,27vw,178px)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(clamp(112px,27vw,178px)) rotate(-360deg); }
        }
        @keyframes punchx-scan {
          0% { transform: translateY(-130%); opacity:0; }
          18% { opacity:.5; }
          82% { opacity:.5; }
          100% { transform: translateY(130%); opacity:0; }
        }
        @keyframes punchx-shimmer {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(180%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .punchx-motion { animation:none !important; transition:none !important; }
        }
      `}</style>

      {/* Layered animated atmosphere: deliberately CSS-only so the splash stays reliable on mobile and slow networks. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,.98)_0%,rgba(238,246,255,.88)_35%,rgba(221,239,255,.72)_70%,rgba(244,248,255,1)_100%)]" />
        <div className="punchx-motion absolute -left-[25%] -top-[28%] h-[620px] w-[620px] rounded-full bg-[#2563eb]/25 blur-[115px]" style={{ animation: 'punchx-aurora 8s ease-in-out infinite' }} />
        <div className="punchx-motion absolute -right-[25%] -bottom-[30%] h-[680px] w-[680px] rounded-full bg-[#38bdf8]/25 blur-[125px]" style={{ animation: 'punchx-aurora-two 10s ease-in-out infinite' }} />
        <div className="absolute inset-0 opacity-[.34]" style={{ backgroundImage: 'linear-gradient(rgba(37,99,235,.075) 1px, transparent 1px),linear-gradient(90deg,rgba(37,99,235,.075) 1px,transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at center, black 0%, transparent 78%)', animation: 'punchx-grid-drift 18s linear infinite' }} />

        {/* Soft flowing light ribbons */}
        <div className="punchx-motion absolute left-1/2 top-[38%] h-[240px] w-[150%] -translate-x-1/2 rounded-[50%] border border-[#60a5fa]/15 bg-[#60a5fa]/[.025] blur-[1px]" style={{ animation: 'punchx-wave 7s ease-in-out infinite alternate' }} />
        <div className="punchx-motion absolute left-1/2 top-[44%] h-[320px] w-[160%] -translate-x-1/2 rounded-[50%] border border-[#38bdf8]/10" style={{ animation: 'punchx-wave 9s ease-in-out infinite alternate-reverse' }} />

        {/* Ambient particles */}
        {particles.map((particle, index) => (
          <span
            key={index}
            className="punchx-motion absolute rounded-full bg-[#2563eb]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animation: `punchx-particle ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}

        {/* Central radar field */}
        <motion.div className="absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2563eb]/12" animate={{ scale: [.92,1.08,.92], opacity:[.2,.55,.2] }} transition={{ duration:4.2, repeat:Infinity, ease:'easeInOut' }} />
        <motion.div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38bdf8]/10" animate={{ scale:[1.05,.94,1.05], opacity:[.1,.38,.1] }} transition={{ duration:5.5, repeat:Infinity, ease:'easeInOut' }} />
        <motion.div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#60a5fa]/10" animate={{ rotate:360 }} transition={{ duration:28, repeat:Infinity, ease:'linear' }} />

        {/* Moving scan beam */}
        <div className="absolute left-1/2 top-[18%] h-[64%] w-[1px] -translate-x-1/2 overflow-visible bg-gradient-to-b from-transparent via-[#60a5fa]/25 to-transparent" style={{ animation: 'punchx-scan 4.8s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <motion.div initial={{ scale:.55, opacity:0, rotate:-8 }} animate={{ scale:1, opacity:1, rotate:0 }} transition={{ duration:.8, ease:[.22,1,.36,1] }} className="relative">
          <motion.div className="absolute inset-[-20px] rounded-full border border-[#2563eb]/20" animate={{ scale:[1,1.12,1], opacity:[.5,.05,.5] }} transition={{ duration:2.8, repeat:Infinity }} />
          <motion.div className="absolute inset-[-42px] rounded-full border border-[#38bdf8]/10" animate={{ scale:[1.05,.95,1.05], opacity:[.15,.45,.15] }} transition={{ duration:4.2, repeat:Infinity }} />
          <motion.div className="absolute inset-[-66px] rounded-full border border-dashed border-[#60a5fa]/10" animate={{ rotate:360 }} transition={{ duration:18, repeat:Infinity, ease:'linear' }} />

          <motion.div animate={{ y:[0,-7,0], scale:[1,1.018,1] }} transition={{ duration:2.7, repeat:Infinity, ease:'easeInOut' }} className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[#bfdbfe] bg-white p-2 shadow-[0_22px_80px_rgba(37,99,235,.24)]">
            <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-full w-full rounded-full object-cover" />
            <span className="absolute inset-0 overflow-hidden rounded-full"><span className="absolute left-0 top-0 h-full w-1/3 bg-white/30 blur-md" style={{ animation:'punchx-shimmer 2.6s ease-in-out infinite' }} /></span>
          </motion.div>

          {serviceIcons.map((Icon,index)=>(
            <motion.div key={index} className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/90 bg-white/90 text-[#2563eb] shadow-[0_10px_28px_rgba(37,99,235,.18)] backdrop-blur" style={{ animation:`punchx-orbit ${9+index*.7}s linear infinite`, animationDelay:`${-index*1.1}s` }}>
              <Icon className="h-4 w-4" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ y:22, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:.25, duration:.55 }} className="mt-16">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-white/90 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563eb] shadow-[0_8px_25px_rgba(37,99,235,.1)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Local service marketplace
          </div>
          <motion.h1 initial={{ letterSpacing:'-.06em' }} animate={{ letterSpacing:'-.025em' }} transition={{ delay:.35, duration:.6 }} className="text-4xl font-black tracking-tight text-[#0f172a]">PUNCH<span className="text-[#2563eb]">X</span></motion.h1>
          <p className="mt-2 text-sm font-medium text-[#64748b]">Connecting people with trusted local professionals.</p>
        </motion.div>

        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.75, duration:.45 }} className="mt-8 flex items-center gap-2 text-[11px] font-semibold text-[#64748b]">
          <motion.span className="h-2 w-2 rounded-full bg-[#2563eb]" animate={{ scale:[1,1.5,1], opacity:[.5,1,.5] }} transition={{ duration:1.1, repeat:Infinity }} />
          Preparing your secure workspace...
        </motion.div>

        <div className="mt-5 h-1.5 w-52 overflow-hidden rounded-full bg-[#dbeafe] shadow-inner">
          <motion.div initial={{ x:'-105%' }} animate={{ x:'105%' }} transition={{ duration:2.2, ease:'easeInOut' }} className="relative h-full w-2/3 rounded-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#2563eb]" />
        </div>
      </div>
    </main>
  );
}
