import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Compass, MapPin, ShieldCheck, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { SignIn } from '@namoidhq/react';
import { requestAndAutoUpdateLocation, LocationData } from '../lib/location';

interface AuthProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  setAuthMethodDetail: (method: 'phone' | 'gmail', target: string) => void;
  activePanelRole?: 'customer' | 'worker' | 'admin';
}

export default function Auth({ onTransition, showNotification, setAuthMethodDetail, activePanelRole = 'customer' }: AuthProps) {
  const punchxAppMode = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('punchxApp') || (() => { try { return localStorage.getItem('punchx_native_app_mode'); } catch { return null; } })())
    : null;
  const isDedicatedApp = punchxAppMode === 'citizen' || punchxAppMode === 'professional';
  // Keep the configured callback URL exact so the identity provider's redirect allowlist continues to match.
  const authRedirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : import.meta.env.VITE_NAMOID_REDIRECT_URI || 'https://www.punchxapp.co.in/auth/callback';
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      requestAndAutoUpdateLocation(activePanelRole).then((loc) => {
        if (loc) setLocationData(loc);
      });
    }
  }, [activePanelRole]);

  const handleRequestLocation = async () => {
    setIsLocating(true);
    const loc = await requestAndAutoUpdateLocation(activePanelRole);
    setIsLocating(false);
    if (loc) {
      setLocationData(loc);
      showNotification(`Location updated: ${loc.area || loc.address.split(',')[0]}`);
    } else {
      showNotification('Location access is unavailable. You can continue and update it later.');
    }
  };

  const roleLabels = {
    customer: { title: 'Customer Sign In', sub: 'Book verified home services with a secure PUNCHX account.' },
    worker: { title: 'Professional Sign In', sub: 'Access your PUNCHX jobs, dispatches and earnings.' },
    admin: { title: 'Admin Secure Login', sub: 'Access the protected PUNCHX management workspace.' },
  };
  const role = roleLabels[activePanelRole];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7faff] text-[#0f172a] px-5 py-7 sm:px-8">
      <style>{`
        @keyframes punchx-auth-drift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(28px,-20px,0); } }
        @keyframes punchx-auth-grid { from { background-position: 0 0; } to { background-position: 44px 44px; } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-44 -top-36 h-[540px] w-[540px] rounded-full bg-[#B99A62]/10 blur-[110px]" style={{ animation: 'punchx-auth-drift 9s ease-in-out infinite' }} />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-[#D9C28F]/10 blur-[110px]" style={{ animation: 'punchx-auth-drift 12s ease-in-out infinite reverse' }} />
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(185,154,98,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(185,154,98,.055) 1px, transparent 1px)', backgroundSize: '44px 44px', animation: 'punchx-auth-grid 18s linear infinite' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col items-center justify-center">
        {!isDedicatedApp && <button onClick={() => onTransition('panel-select')} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D9C28F] bg-white/80 px-4 py-2 text-xs font-bold text-[#B99A62] shadow-sm backdrop-blur transition-all hover:bg-white hover:shadow-md">
          <ArrowLeft className="h-4 w-4" /> Choose Different Panel
        </button>}

        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 h-20 w-20 rounded-full border border-[#D9C28F] bg-white p-1.5 shadow-[0_16px_45px_rgba(185,154,98,.18)]">
            <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-full w-full object-contain" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9C28F] bg-white/75 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B99A62] shadow-sm backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Secure PUNCHX Gateway</div>
          <h1 className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">{role.title}</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#64748b]">{role.sub}</p>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="w-full max-w-2xl rounded-[30px] border border-[#E6DECC] bg-white/90 p-4 shadow-[0_30px_90px_rgba(30,64,175,.12)] backdrop-blur-xl sm:p-6">
          <div className="rounded-2xl border border-[#D9C28F] bg-[#eff6ff] p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#B99A62] shadow-sm"><Compass className={`h-5 w-5 ${isLocating ? 'animate-spin' : ''}`} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1e40af]"><MapPin className="h-3.5 w-3.5" /> {locationData?.area || 'Service area detection'}</div>
                <p className="mt-0.5 truncate text-[11px] text-[#64748b]">{locationData?.address || 'Your device location helps PUNCHX match local professionals.'}</p>
              </div>
              <button type="button" onClick={handleRequestLocation} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#B99A62] px-3 py-2 text-[10px] font-extrabold uppercase text-white shadow-sm hover:bg-[#80663A]">{locationData ? <RefreshCw className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{locationData ? 'Re-sync' : 'Allow GPS'}</button>
            </div>
          </div>

          <div className="my-6 flex justify-center">
            <div className="w-full overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-1 shadow-sm">
              <SignIn redirectUri={authRedirectUri} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-[#e2e8f0] pt-5 text-center text-[11px] font-medium text-[#64748b]">
            <ShieldCheck className="h-4 w-4 text-[#B99A62]" />
            Secure authentication powered by NamoID
          </div>
          <p className="mt-3 text-center text-[11px] leading-5 text-[#64748b]">
            By signing in, you agree to our{' '}
            <button onClick={() => onTransition('privacy-policy')} className="font-bold text-[#B99A62] underline underline-offset-2">Privacy Policy</button>{' '}and{' '}
            <button onClick={() => onTransition('terms-and-conditions')} className="font-bold text-[#B99A62] underline underline-offset-2">Terms & Conditions</button>.
          </p>
        </motion.section>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">PUNCHX • Secure Local Service Marketplace</p>
      </div>
    </main>
  );
}
