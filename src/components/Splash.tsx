import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Sparkles, Wrench, Home, Zap, Droplets, Hammer, Wind, Settings2, ArrowUpRight } from 'lucide-react';
import { AppScreen } from '../types';
const PUNCHX_LOGO = '/favicon.svg';

interface SplashProps {
  onTransition: (target: AppScreen) => void;
}

export default function Splash({ onTransition }: SplashProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onTransition('panel-select'), 1800);
    return () => window.clearTimeout(timer);
  }, [onTransition]);

  const serviceIcons = [Wrench, Home, Zap, Droplets, Hammer, ShieldCheck, Wind, Settings2];
  const particles = useMemo(
    () => Array.from({ length: 24 }, (_, index) => ({
      left: `${(index * 41 + 9) % 100}%`,
      top: `${(index * 67 + 13) % 100}%`,
      size: index % 4 === 0 ? 3 : 2,
      delay: (index % 8) * 0.42,
      duration: 4.5 + (index % 5) * 0.9,
    })),
    []
  );

  return (
    <main
      onClick={() => onTransition('panel-select')}
      className="punchx-splash relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#10110F] px-6 text-[#F5F0E6] cursor-pointer select-none"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTransition('panel-select');
        }}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 rounded-full border border-[#B99A62]/30 bg-[#1B1A16]/80 px-3.5 py-1.5 text-[11px] font-semibold text-[#D9C28F] backdrop-blur transition-all hover:bg-[#B99A62]/20 active:scale-95"
      >
        Skip <ArrowUpRight className="h-3 w-3" />
      </button>
      <style>{`
        .punchx-splash { isolation:isolate; }
        @keyframes px-ambient { 0%,100% { transform:translate3d(-4%,0,0) scale(1); opacity:.35; } 50% { transform:translate3d(5%,4%,0) scale(1.13); opacity:.7; } }
        @keyframes px-ambient-alt { 0%,100% { transform:translate3d(4%,2%,0) scale(1.08); opacity:.2; } 50% { transform:translate3d(-5%,-3%,0) scale(.96); opacity:.48; } }
        @keyframes px-particle { 0%,100% { transform:translateY(7px) scale(.65); opacity:.12; } 50% { transform:translateY(-13px) scale(1.15); opacity:.78; } }
        @keyframes px-orbit { from { transform:translate(-50%,-50%) rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); } to { transform:translate(-50%,-50%) rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); } }
        @keyframes px-light-sweep { 0% { transform:translateX(-150%) skewX(-18deg); opacity:0; } 20% { opacity:.55; } 70% { opacity:.2; } 100% { transform:translateX(230%) skewX(-18deg); opacity:0; } }
        @keyframes px-progress { 0% { transform:translateX(-105%); } 100% { transform:translateX(155%); } }
        @keyframes px-ring-breathe { 0%,100% { transform:scale(.94); opacity:.25; } 50% { transform:scale(1.06); opacity:.7; } }
        .px-reduce-motion { animation:none !important; }
        @media (prefers-reduced-motion: reduce) {
          .punchx-splash *, .punchx-splash *::before, .punchx-splash *::after { animation:none !important; transition:none !important; }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_43%,rgba(52,47,34,.72)_0%,rgba(23,23,19,.5)_36%,rgba(16,17,15,1)_76%)]" />
        <div className="absolute -left-[22%] -top-[25%] h-[70vw] w-[70vw] rounded-full bg-[#B99A62]/[.13] blur-[100px]" style={{ animation:'px-ambient 11s ease-in-out infinite' }} />
        <div className="absolute -bottom-[30%] -right-[20%] h-[78vw] w-[78vw] rounded-full bg-[#64745D]/[.12] blur-[120px]" style={{ animation:'px-ambient-alt 13s ease-in-out infinite' }} />
        <div className="absolute inset-0 opacity-[.14]" style={{ backgroundImage:'linear-gradient(rgba(231,212,167,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(231,212,167,.15) 1px,transparent 1px)', backgroundSize:'58px 58px', maskImage:'radial-gradient(ellipse at center,black 0%,transparent 76%)' }} />
        {particles.map((particle,index) => (
          <span key={index} className="absolute rounded-full bg-[#D9C28F]" style={{ left:particle.left, top:particle.top, width:particle.size, height:particle.size, animation:`px-particle ${particle.duration}s ease-in-out ${particle.delay}s infinite` }} />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <motion.div initial={{ opacity:0, y:18, scale:.96 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ duration:.8, ease:[.22,1,.36,1] }} className="relative flex flex-col items-center">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#B99A62]/20" style={{ animation:'px-ring-breathe 4s ease-in-out infinite' }} />
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#B99A62]/15" style={{ animation:'px-orbit 36s linear infinite', ['--orbit-radius' as string]:'0px' }} />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-[#D9C28F]/50 bg-gradient-to-br from-[#29271F] via-[#191915] to-[#11110F] p-3 shadow-[0_24px_90px_rgba(0,0,0,.48)]">
            <img src={PUNCHX_LOGO} alt="PunchX local services marketplace logo" className="h-full w-full rounded-2xl object-contain" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
              <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{ animation:'px-light-sweep 3.6s ease-in-out .7s infinite' }} />
            </span>
          </div>
          {serviceIcons.map((Icon,index) => (
            <motion.div key={index} className="absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-xl border border-[#B99A62]/30 bg-[#1B1A16]/95 text-[#D9C28F] shadow-[0_8px_28px_rgba(0,0,0,.32)] backdrop-blur" style={{ ['--orbit-radius' as string]: '124px', animation:`px-orbit ${22+index*1.8}s linear ${-index*2.3}s infinite` }}>
              <Icon className="h-4 w-4" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.24, duration:.65, ease:[.22,1,.36,1] }} className="mt-16">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#B99A62]/30 bg-[#B99A62]/[.08] px-4 py-2 text-[9px] font-bold uppercase tracking-[.24em] text-[#D9C28F]">
            <Sparkles className="h-3.5 w-3.5" /> Everyday help. Elevated.
          </div>
          <h1 className="text-[2.7rem] font-black leading-none tracking-[-.075em] text-[#F5F0E6] sm:text-5xl">PUNCH<span className="text-[#D9C28F]">X</span></h1>
          <p className="mt-4 text-sm leading-relaxed text-[#B9B4A8]">Trusted local professionals, brought closer.</p>
        </motion.div>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.65, duration:.5 }} className="mt-10 w-full max-w-[250px]">
          <div className="flex items-center justify-center gap-2 text-[10px] font-semibold tracking-[.12em] text-[#A6A092]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D9C28F]" />
            A better way to get things done
          </div>
          <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[.09]">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[#80663A] via-[#E7D4A7] to-[#80663A]" style={{ animation:'px-progress 2.4s cubic-bezier(.4,0,.2,1) infinite' }} />
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-[.22em] text-[#797568]">Made for your everyday</p>
        </motion.div>

        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.05, duration:.5 }} className="mt-8 flex items-center gap-2 text-[10px] text-[#8E897D]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D9C28F]" />
          Welcome to PunchX <ArrowUpRight className="h-3 w-3" />
        </motion.div>
      </div>
    </main>
  );
}
