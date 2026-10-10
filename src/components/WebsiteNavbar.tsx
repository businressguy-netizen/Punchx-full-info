import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell, CalendarDays, ChevronDown, Grid2X2, MapPin, Menu, Navigation2,
  Search, ShieldCheck, Sparkles, UserRound, Wrench, X, LogOut, UsersRound
} from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { useAuth } from '../lib/authContext';
import { getStoredPushNotifications } from '../lib/pushNotifications';
import ServiceCategoryModal from './ServiceCategoryModal';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WebsiteNavbarProps {
  currentScreen: AppScreen;
  onTransition: (target: AppScreen) => void;
  activePanelRole: 'customer' | 'worker' | 'admin';
  setActivePanelRole: (role: 'customer' | 'worker' | 'admin') => void;
  citizenName: string;
  citizenAddress: string;
  onOpenNotificationCenter: () => void;
  onOpenProfile?: () => void;
  onSelectCategory?: (category: string) => void;
  showNotification: (msg: string) => void;
  hasActiveBooking?: boolean;
}

const QUICK_CATEGORIES = PUNCHX_50_CATEGORIES.slice(0, 8);

export default function WebsiteNavbar({
  currentScreen,
  onTransition,
  activePanelRole,
  setActivePanelRole,
  citizenName,
  citizenAddress,
  onOpenNotificationCenter,
  onOpenProfile,
  onSelectCategory,
  showNotification,
  hasActiveBooking = false,
}: WebsiteNavbarProps) {
  const { currentUser, userProfile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const sync = () => setUnreadCount(getStoredPushNotifications().filter(n => !n.read).length);
    sync();
    const id = window.setInterval(sync, 4000);
    return () => window.clearInterval(id);
  }, []);

  const go = (screen: AppScreen) => {
    setMobileOpen(false);
    setServicesOpen(false);
    setProfileOpen(false);
    onTransition(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const chooseCategory = (name: string) => {
    onSelectCategory?.(name);
    setServicesOpen(false);
    setMobileOpen(false);
    setCategoryModalOpen(false);
    onTransition('providers');
    showNotification(`Showing verified PunchX professionals for ${name}.`);
  };

  const signOut = async () => {
    try {
      await logout();
      setProfileOpen(false);
      showNotification('Signed out successfully.');
      onTransition('panel-select');
    } catch {
      showNotification('Unable to sign out. Please try again.');
    }
  };

  return (
    <>
      <header id="punchx-website-navbar" className="sticky top-0 z-[80] w-full border-b border-black/5 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:h-[76px] lg:px-8">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileOpen(v => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8] text-[#30333a] transition hover:bg-[#eeeef2] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button onClick={() => go('home')} className="group flex items-center gap-2.5 text-left" aria-label="PunchX Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white p-1 shadow-[0_8px_24px_rgba(76,61,150,0.10)] ring-1 ring-black/5 transition group-hover:-translate-y-0.5">
              <img src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full rounded-[10px] object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[17px] font-black tracking-[-0.03em] text-[#17191d]">PunchX</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7f8390]">Local service network</div>
            </div>
          </button>

          <button className="ml-auto hidden min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#f6f7fa] lg:flex" onClick={() => showNotification('Location selector is ready for your service address.')}>
            <MapPin className="h-4 w-4 shrink-0 text-[#7358d7]" />
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9296a0]">Service at</div>
              <div className="max-w-[235px] truncate text-xs font-extrabold text-[#272a31]">{citizenAddress || 'Choose service location'}</div>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            <button onClick={() => go('home')} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${currentScreen === 'home' ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}>Home</button>

            <div className="relative">
              <button
                onClick={() => setServicesOpen(v => !v)}
                className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold transition ${servicesOpen ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}
              >
                Services <ChevronDown className={`h-3.5 w-3.5 transition ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 7, scale: .98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 7, scale: .98 }}
                    className="absolute left-0 top-[calc(100%+8px)] w-[360px] rounded-3xl border border-black/5 bg-white p-3 shadow-[0_24px_70px_rgba(24,24,30,.14)]"
                  >
                    <div className="mb-2 flex items-center justify-between rounded-2xl bg-[#f7f5ff] px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-black text-[#2d2d34]"><Grid2X2 className="h-4 w-4 text-[#7358d7]" /> Quick services</div>
                      <button onClick={() => { setServicesOpen(false); setCategoryModalOpen(true); }} className="text-[10px] font-extrabold text-[#7358d7]">Browse all 50</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => chooseCategory(cat.name)} className="group flex items-start gap-2 rounded-2xl border border-black/5 bg-[#fbfbfc] p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-[#f4f1ff]">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eee9ff] text-[#7358d7]"><Wrench className="h-4 w-4" /></div>
                          <div className="min-w-0"><div className="truncate text-[11px] font-black text-[#252830]">{cat.name}</div><div className="mt-0.5 line-clamp-2 text-[9px] leading-3.5 text-[#8a8e97]">{cat.shortDesc}</div></div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => go('tracking')} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${currentScreen === 'tracking' ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}>
              <Navigation2 className="h-3.5 w-3.5" /> Live tracking
              {hasActiveBooking && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
            </button>

            <button onClick={() => go('providers')} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${currentScreen === 'providers' || currentScreen === 'provider-details' ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}>
              Find a pro
            </button>

            <button onClick={() => go('catalogue')} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${currentScreen === 'catalogue' ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}>Price catalogue</button>

            <button onClick={() => go('founder')} className={`hidden rounded-xl px-3 py-2 text-xs font-extrabold transition lg:block ${currentScreen === 'founder' ? 'bg-[#f0ecff] text-[#5b45c7]' : 'text-[#60656f] hover:bg-[#f6f7fa] hover:text-[#17191d]'}`}>
              Team
            </button>
          </nav>

          <div className="flex items-center gap-1.5">
            <button onClick={onOpenNotificationCenter} className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f7f8] text-[#5f636d] transition hover:bg-[#efeff3]" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7358d7] px-1 text-[8px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {currentUser ? (
              <div className="relative">
                <button onClick={() => setProfileOpen(v => !v)} className="flex h-10 items-center gap-2 rounded-xl bg-[#17191d] px-2.5 text-white transition hover:bg-[#24272d]" aria-label="Open profile">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10"><UserRound className="h-4 w-4" /></div>
                  <span className="hidden max-w-24 truncate text-xs font-extrabold sm:block">{citizenName || userProfile?.name || 'Citizen'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: 7, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 7, scale: .98 }} className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-3xl border border-black/5 bg-white p-3 shadow-[0_24px_70px_rgba(24,24,30,.14)]">
                      <div className="rounded-2xl bg-[#f7f5ff] p-3">
                        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17191d] text-white"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><div className="truncate text-xs font-black">{citizenName || 'PunchX Citizen'}</div><div className="truncate text-[10px] text-[#848994]">{citizenAddress || 'Service address not set'}</div></div></div>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[9px] font-extrabold text-[#5b45c7] ring-1 ring-[#7358d7]/10"><ShieldCheck className="h-3 w-3" /> PunchX verified account</div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <button onClick={() => { setProfileOpen(false); onOpenProfile?.(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#4b4f58] hover:bg-[#f7f7f9]"><UserRound className="h-4 w-4 text-[#7358d7]" /> Manage account & bookings</button>
                        <button onClick={() => { setProfileOpen(false); onOpenNotificationCenter(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#4b4f58] hover:bg-[#f7f7f9]"><Bell className="h-4 w-4 text-[#7358d7]" /> Alerts & notifications</button>
                        <button onClick={() => { setProfileOpen(false); setCategoryModalOpen(true); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#4b4f58] hover:bg-[#f7f7f9]"><Search className="h-4 w-4 text-[#7358d7]" /> Search all services</button>
                        <button onClick={() => { setProfileOpen(false); go('tracking'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#4b4f58] hover:bg-[#f7f7f9]"><Navigation2 className="h-4 w-4 text-[#7358d7]" /> Active service tracking</button>
                        <div className="my-1 border-t border-black/5" />
                        <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-50"><LogOut className="h-4 w-4" /> Sign out</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={() => go('auth')} className="rounded-xl bg-[#7358d7] px-4 py-2.5 text-xs font-black text-white shadow-[0_10px_25px_rgba(115,88,215,.20)] transition hover:bg-[#5b45c7]">Sign in</button>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 pb-2 lg:hidden">
          <button onClick={() => showNotification('Use your saved service address or refresh your location from the service flow.')} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2 text-left">
            <MapPin className="h-4 w-4 shrink-0 text-[#7358d7]" />
            <span className="truncate text-[10px] font-bold text-[#6d727c]">{citizenAddress || 'Set your service location'}</span>
          </button>
          <button onClick={() => go('providers')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0ecff] text-[#7358d7]" aria-label="Find a professional"><Search className="h-4 w-4" /></button>
          <button onClick={() => go('catalogue')} className="rounded-xl bg-[#171c35] px-3 py-2 text-[10px] font-extrabold text-white" aria-label="Open price catalogue">₹ Prices</button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-black/5 bg-white md:hidden">
              <div className="space-y-1 p-3">
                {[
                  ['Home', 'home', Sparkles],
                  ['Services', 'services-categories', Grid2X2],
                  ['Live tracking', 'tracking', Navigation2],
                  ['Find a professional', 'providers', UsersRound],
                  ['Founding team', 'founder', ShieldCheck],
                  ['Switch portal', 'panel-select', Wrench],
                ].map(([label, screen, Icon]) => (
                  <button key={String(label)} onClick={() => {
                    if (screen === 'services-categories') { setMobileOpen(false); setCategoryModalOpen(true); return; }
                    go(screen as AppScreen);
                  }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-black text-[#444850] hover:bg-[#f7f7fa]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0ecff] text-[#7358d7]"><Icon className="h-4 w-4" /></span>
                    {String(label)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <ServiceCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        mode="citizen"
        selectedCategory=""
        onSelectCategory={chooseCategory}
      />
    </>
  );
}
