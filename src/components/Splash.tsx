import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface SplashProps {
  onTransition: (target: AppScreen) => void;
}

export default function Splash({ onTransition }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const duration = 2200;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const value = Math.min(100, Math.round(((now - started) / duration) * 100));
      setProgress(value);
      if (value >= 100) {
        setReady(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const proceed = () => onTransition('panel-select');

  return (
    <main id="splash-screen-container" className="relative flex min-h-screen w-full select-none items-center justify-center overflow-hidden px-5 py-10">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div id="splash-core" className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <motion.button
          type="button"
          id="splash-logo-container"
          onClick={proceed}
          className="relative rounded-full"
          initial={{ opacity: 0, scale: .86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          aria-label="Continue to PunchX"
        >
          <div className="absolute inset-[-18px] rounded-full blur-3xl" />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border bg-white p-3 shadow-xl sm:h-40 sm:w-40">
            <img id="splash-logo-image" src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full object-contain" />
          </div>
        </motion.button>

        <motion.div
          id="splash-brand-details"
          className="mt-7"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .15, duration: .45 }}
        >
          <h1 id="splash-brand-heading" className="text-5xl font-black tracking-[-.06em] sm:text-6xl">
            PUNCH<span className="font-semibold">X</span>
          </h1>
          <p id="splash-brand-tagline" className="mt-2 text-[11px] font-extrabold uppercase tracking-[.28em]">
            Everyday services, made simple
          </p>
        </motion.div>

        <motion.p
          id="splash-brand-description"
          className="mt-5 max-w-sm text-sm leading-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: .3 }}
        >
          Discover verified local professionals, book a service and follow your service journey from dispatch to completion.
        </motion.p>

        <div id="splash-loader-area" className="mt-10 w-full max-w-xs">
          {ready ? (
            <motion.button
              id="splash-proceed-btn"
              type="button"
              onClick={proceed}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black shadow-lg"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Explore PunchX <ArrowRight className="h-4 w-4" />
            </motion.button>
          ) : (
            <button type="button" onClick={proceed} className="w-full text-left" aria-label="Skip welcome screen">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.14em]">
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Preparing your service network</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                <div id="loading-bar-completion" className="h-full rounded-full transition-[width] duration-75" style={{ width: `${progress}%` }} />
              </div>
            </button>
          )}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em]">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure PunchX experience
          </div>
        </div>
      </div>
    </main>
  );
}
