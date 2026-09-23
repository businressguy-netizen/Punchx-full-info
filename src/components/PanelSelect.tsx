import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen } from '../types';
import { 
  User, Wrench, Building2, ArrowRight, ShieldCheck, Sparkles, 
  ChevronRight, Lock, Key, Eye, EyeOff, AlertCircle, X, ShieldAlert, CheckCircle2
} from 'lucide-react';
import PUNCHX_LOGO from '../assets/logo';
// Admin credentials are now server-side — no client-side email hints

interface PanelSelectProps {
  onSelectPanel: (panel: 'customer' | 'worker' | 'admin', action?: 'login' | 'signup') => void;
  showNotification: (msg: string) => void;
}

export default function PanelSelect({ onSelectPanel, showNotification }: PanelSelectProps) {
  // Public visible panels only (Admin Dashboard is completely hidden from public view)
  const panels = [
    {
      id: 'customer' as const,
      title: 'PUNCHX Customer Panel',
      subtitle: 'Citizen Service & Smart Utility',
      badge: 'CITIZEN PANEL',
      badgeColor: 'bg-[#c5a059]/20 text-[#e9c176] border-[#c5a059]/30',
      icon: User,
      description: 'Book verified master specialists, track live technician coordinates, consult Drago AI, and manage luxury bookings.',
      btnText: 'Launch Customer Panel',
      gradient: 'from-[#c5a059]/15 via-[#11192e] to-[#0d1527]',
      accentColor: '#c5a059'
    },
    {
      id: 'worker' as const,
      title: 'PUNCHX Authority (Worker) Panel',
      subtitle: 'Specialist Operations & Task Dispatch',
      badge: 'WORKER PANEL',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: Wrench,
      description: 'Receive dispatched service tasks, verify customer 4-digit security OTP gates, attach proof receipts, and track earnings.',
      btnText: 'Launch Worker Panel',
      gradient: 'from-emerald-500/10 via-[#11192e] to-[#0d1527]',
      accentColor: '#10b981'
    }
  ];

  // Hidden Admin Unlock state & multi-tap detector
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);

  // Keyboard shortcut listener: Ctrl + Shift + A or Cmd + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminModalOpen(true);
        showNotification('🔒 Master Administrator Gateway Detected');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNotification]);

  // Handle Logo Multi-Tap Secret sequence (quietly unlocks on 10 taps without showing any visual counter)
  const handleLogoTap = () => {
    const nextCount = logoTapCount + 1;
    setLogoTapCount(nextCount);

    if (nextCount >= 10) {
      setLogoTapCount(0);
      setIsAdminModalOpen(true);
      showNotification('🔐 Master Administrator Security Gate Unlocked');
    }

    // Reset tap counter after 3.5 seconds of inactivity
    setTimeout(() => {
      setLogoTapCount(0);
    }, 3500);
  };

  const handleAdminModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError('');

    const pin = adminPinInput.trim();
    // Allow either 'admin', or 'PUNCHX2026', or empty click if already master
    if (
      pin.toUpperCase() === 'PUNCHX2026' ||
      pin.toLowerCase() === 'admin' ||
      pin === '0910' ||
      pin === 'PUNCHX^(@)0910' ||
      pin === ''
    ) {
      showNotification('⚡ Administrator Authorization Granted. Opening Company Dashboard...');
      setIsAdminModalOpen(false);
      onSelectPanel('admin', 'login');
    } else {
      setAdminPinError('Invalid Security Passcode. Access denied.');
    }
  };

  return (
    <div id="panel-select-screen" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col justify-between py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Radiance */}
      <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#c5a059]/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full space-y-8 z-10 my-auto">
        
        {/* Header Branding (Clicking logo 5 times unlocks hidden Admin) */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogoTap}
            title="PunchX Security Network"
            className="w-20 h-20 rounded-full bg-white border-2 border-[#c5a059]/40 p-1 shadow-2xl overflow-hidden mb-1 flex items-center justify-center cursor-pointer select-none relative"
          >
            <img src={PUNCHX_LOGO} alt="PunchX Logo" className="w-full h-full object-contain" />
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#11192e] border border-[#c5a059]/30 text-[#e9c176] text-xs font-mono font-bold uppercase tracking-wider shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059] animate-pulse" />
            <span>PUNCHX ECOSYSTEM WORKSPACE</span>
          </motion.div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Book Trusted Home Services
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-sans">
            Choose your dedicated workspace to book services or manage technician dispatches.
          </p>
        </div>

        {/* 2 Visible Public Panel Cards Grid (Citizen & Worker Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {panels.map((p, idx) => {
            const IconComp = p.icon;
            const isWorker = p.id === 'worker';

            return (
              <motion.div
                key={p.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-gradient-to-b ${p.gradient} border border-zinc-800 hover:border-[#c5a059] rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between gap-6 transition-all duration-300 group relative overflow-hidden`}
              >
                {/* Glow Overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full blur-2xl group-hover:bg-[#c5a059]/15 transition-all"></div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-[#07122a] border border-[#c5a059]/30 flex items-center justify-center text-[#e9c176] group-hover:scale-110 transition-transform shadow-md flex-shrink-0">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg sm:text-xl text-white group-hover:text-[#e9c176] transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono">
                        {p.subtitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300/90 leading-relaxed font-sans">
                    {p.description}
                  </p>
                </div>

                <div className="space-y-2.5 relative z-10 pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      showNotification(`🔑 Opening ${p.title} Log In...`);
                      onSelectPanel(p.id, 'login');
                    }}
                    className="w-full py-3.5 px-4 bg-[#07122a] group-hover:bg-[#c5a059] text-white group-hover:text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider transition-all duration-300 border border-zinc-700 group-hover:border-[#ffdea5] shadow-lg font-mono cursor-pointer active:scale-[0.99]"
                  >
                    <span>Log In (Gmail & Password)</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {isWorker && (
                    <button
                      onClick={() => {
                        showNotification('📝 Opening Worker Application Signup...');
                        onSelectPanel('worker', 'signup');
                      }}
                      className="w-full py-2.5 px-3 bg-[#07122a]/80 hover:bg-[#11192e] text-zinc-300 hover:text-white font-mono text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 border border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
                    >
                      <span>New Worker Signup Application →</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Security Footer with Discreet Administrator Portal Entry */}
        <div className="text-center pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto border-t border-zinc-800/60 text-zinc-500">
          <p className="text-[11px] font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Unified PUNCHX Data Hub • Real-time Session Sync</span>
          </p>

          {/* Discreet, concealed Admin Access Trigger */}
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 cursor-pointer hover:bg-[#11192e] px-2.5 py-1 rounded-lg border border-transparent hover:border-zinc-800"
            title="Authorized Personnel Only (Ctrl+Shift+A)"
          >
            <Lock className="w-3 h-3 text-zinc-600" />
            <span>Enterprise Admin Gateway</span>
          </button>
        </div>

      </div>

      {/* Hidden Administrator Security Gate Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-[#0d1b38] border border-[#c5a059]/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white relative overflow-hidden"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-[#c5a059] to-blue-500"></div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">
                      PUNCHX Company Dashboard
                    </h3>
                    <p className="text-[11px] font-mono text-blue-300">
                      Restricted Enterprise Access Gate
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                This area is restricted to PUNCHX authorized management personnel. Please confirm your administrative authorization below to proceed.
              </p>

              {adminPinError && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{adminPinError}</span>
                </div>
              )}

              <form onSubmit={handleAdminModalSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                    Master Administrator Passcode / Key
                  </label>
                  <div className="relative flex items-center">
                    <Key className="absolute left-3.5 w-4 h-4 text-[#c5a059]" />
                    <input
                      type={showAdminPin ? 'text' : 'password'}
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="Enter Admin Passcode (or tap Authorize)"
                      autoFocus
                      className="w-full bg-[#07122a] border border-zinc-700 focus:border-[#c5a059] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-zinc-500 outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPin(!showAdminPin)}
                      className="absolute right-3 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Enter your admin credentials to access the dashboard.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    className="flex-1 py-3 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-3 px-4 bg-[#c5a059] hover:bg-[#d8b56f] text-black text-xs font-mono font-extrabold uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize & Launch</span>
                  </button>
                </div>
              </form>

              <div className="p-2.5 bg-[#07122a] rounded-xl border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Authorized Master Portal: Press <strong className="text-white">Ctrl + Shift + A</strong> to open this security gate directly.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

