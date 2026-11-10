import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  ExternalLink,
  Radio,
  Lock,
  ArrowLeft,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface AdminBridgePortalProps {
  onTransition: (screen: AppScreen) => void;
  showNotification: (msg: string) => void;
}

export default function AdminBridgePortal({ onTransition, showNotification }: AdminBridgePortalProps) {
  const adminDashboardUrl = 'https://businressguy-netizen.github.io/Admin-dashboard-/';
  const [backendHealth, setBackendHealth] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const checkBridge = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/admin/health', {
          headers: {
            'x-admin-key': 'punchx_admin_secure_live_key_2026_9941a8',
          },
        });
        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          if (res.ok) {
            setBackendHealth('healthy');
            setLatency(elapsed);
          } else {
            setBackendHealth('offline');
          }
        }
      } catch {
        if (isMounted) setBackendHealth('offline');
      }
    };

    checkBridge();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLaunchDashboard = () => {
    showNotification('Launching PunchX Admin Command Center...');
    window.open(adminDashboardUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="relative min-h-screen bg-[#07122a] text-[#e1e3e4] px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff6b00]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-[#10b981]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo and Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-3">
            <img src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full object-contain" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${backendHealth === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-4 w-4 ${backendHealth === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff6b00]/30 bg-[#ff6b00]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff6b00] mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Dual-Repository Command Center
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
            PunchX Admin Command Center
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            Secured administrative operations are deployed to an isolated command center to maintain zero attack surface on consumer channels.
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-left mb-6 space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-[#ff6b00]" />
              <div>
                <h2 className="text-sm font-bold text-white">Platform API Bridge</h2>
                <p className="text-xs text-gray-400">Authenticated mutual telemetry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${backendHealth === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-mono text-gray-300">
                {backendHealth === 'healthy' ? `Connected (${latency}ms)` : 'Standby / Probing'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="text-gray-400 mb-1">Administrative Domain</div>
              <div className="text-white font-semibold truncate">businressguy-netizen.github.io</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="text-gray-400 mb-1">API Handshake Key</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                <Lock className="h-3 w-3" /> Active (x-admin-key)
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleLaunchDashboard}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff6b00] to-[#ff8533] px-6 py-4 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(255,107,0,0.3)] transition-all hover:shadow-[0_14px_32px_rgba(255,107,0,0.45)] hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <span>Launch Admin Dashboard</span>
              <ExternalLink className="h-4 w-4" />
            </button>

            <button
              onClick={() => onTransition('home')}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 active:scale-[0.99]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Citizen Platform
            </button>
          </div>
        </motion.div>

        {/* Security badge */}
        <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-gray-400" /> End-to-end encrypted administrative channel with rate-limit exemptions.
        </p>
      </div>
    </main>
  );
}

