import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock, Home as HomeIcon,
  Loader2, MapPin, Search, ShieldCheck, Star, UserRound, X,
  Zap, Droplet, Hammer, Paintbrush, HardHat, Flame, Scissors, Wrench, Bike, Car, Home,
  Wind, Snowflake, Waves, Smartphone, Laptop, Tv, Video, Sun, Droplets, Key,
  Sparkles, Bug, Sprout, Utensils, Cake, Package, Truck, Shield, Palette, Camera, Music, FileText, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import { getCatalogCategory } from '../data/serviceCatalogs';
import PUNCHX_LOGO from '../assets/logo';
import { getAccurateCurrentPosition, reverseGeocodeCoords } from '../lib/location';

/* ── Icon map: resolve each category.iconName to a Lucide component ── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Droplet, Hammer, Paintbrush, HardHat, Flame, Scissors, Wrench, Bike, Car,
  Wind, Snowflake, Waves, Smartphone, Laptop, Tv, Video, Sun, Droplets, Key,
  Sparkles, Bug, Sprout, Utensils, Cake, Package, Truck, Shield, Palette, Camera, Music,
};

/* ── Semantic groupings for the category grid ── */
const CATEGORY_GROUPS: { title: string; emoji: string; ids: string[] }[] = [
  { title: 'Home Repairs', emoji: '🏠', ids: ['electrician', 'plumber', 'carpenter', 'painter', 'mason', 'welder', 'locksmith', 'pop-false-ceiling-worker', 'glass-glazier-worker', 'waterproofing-specialist'] },
  { title: 'Appliances & Technology', emoji: '🔧', ids: ['ac-technician', 'appliance-repair-technician', 'ro-water-purifier-technician', 'electronics-repair-technician', 'computer-laptop-technician', 'mobile-repair-technician', 'cctv-technician', 'solar-technician'] },
  { title: 'Cleaning & Home Care', emoji: '🧹', ids: ['cleaner-housekeeper', 'upholstery-sofa-cleaner', 'pest-control-worker', 'gardener', 'laundry-dry-cleaner', 'home-disinfection', 'vehicle-detailing'] },
  { title: 'Beauty & Personal Care', emoji: '✨', ids: ['beautician', 'massage-spa', 'tailor', 'cobbler-shoe-repairer'] },
  { title: 'Daily Help & Moving', emoji: '📦', ids: ['packer-mover', 'delivery-driver', 'domestic-help', 'cook', 'caterer', 'security-guard'] },
  { title: 'Design & Events', emoji: '🎬', ids: ['interior-decorator', 'event-decorator', 'photographer', 'videographer', 'dj-sound-technician'] },
];

const POPULAR_IDS = ['electrician', 'plumber', 'carpenter', 'ac-technician', 'cleaner-housekeeper', 'painter', 'appliance-repair-technician', 'beautician'];

/* ── Accent color per group for visual variety ── */
const GROUP_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'text-blue-500', ring: 'ring-blue-200' },
  { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', icon: 'text-violet-500', ring: 'ring-violet-200' },
  { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', icon: 'text-pink-500', ring: 'ring-pink-200' },
  { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'text-amber-500', ring: 'ring-amber-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'text-emerald-500', ring: 'ring-emerald-200' },
  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', icon: 'text-orange-500', ring: 'ring-orange-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100', icon: 'text-cyan-500', ring: 'ring-cyan-200' },
  { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: 'text-rose-500', ring: 'ring-rose-200' },
];

interface Props {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: Worker) => void;
  onSelectCategory: (category: string) => void;
  citizenName: string;
  citizenAddress: string;
  onOpenProfile?: () => void;
}

export default function CitizenHomeCatalog({
  onTransition, onSelectCategory, citizenName, citizenAddress, onOpenProfile,
}: Props) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('Choose your location');
  const [areaAddress, setAreaAddress] = useState('');
  const [residential, setResidential] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile'>('home');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const history = localStorage.getItem('punchx_order_history');
      if (history) {
        setOrderHistory(JSON.parse(history));
      }
    } catch {}
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PUNCHX_50_CATEGORIES.filter(c =>
      !q || `${c.name} ${c.shortDesc} ${c.keywords.join(' ')}`.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    try { setResidential(localStorage.getItem('punchx_residential_address_label') || citizenAddress || ''); } catch { /* */ }
  }, [citizenAddress]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (!navigator.geolocation) { setMessage('Location is not supported on this device.'); return; }
      setLoading(true);
      setMessage('Updating service area…');
      try {
        const p = await getAccurateCurrentPosition(true);
        const r = await reverseGeocodeCoords(p.lat, p.lng);
        if (cancelled) return;
        const next = r.area || r.city || 'Local Area';
        setArea(next);
        setAreaAddress(r.address || '');
        localStorage.setItem('punchx_user_location', JSON.stringify({
          lat: p.lat, lng: p.lng, area: next, address: r.address,
          city: r.city, sector: r.sector, timestamp: new Date().toISOString(),
        }));
        setMessage('Service area updated');
      } catch { if (!cancelled) setMessage('Choose your service location to continue.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const openCategory = useCallback((name: string) => {
    setSearchOpen(false);
    setQuery('');
    onSelectCategory(name);
    onTransition('providers');
  }, [onSelectCategory, onTransition]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  /* ── Render a single service card ── */
  const ServiceCard = ({ catId, index, color }: { catId: string; index: number; color: typeof GROUP_COLORS[0] }) => {
    const cat = PUNCHX_50_CATEGORIES.find(c => c.id === catId);
    if (!cat) return null;
    const IconComp = ICON_MAP[cat.iconName] || Wrench;
    return (
      <motion.button
        key={cat.id}
        onClick={() => openCategory(cat.name)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.35, ease: [.25, .46, .45, .94] }}
        whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,.08)' }}
        whileTap={{ scale: 0.97 }}
        className={`group flex flex-col items-center gap-2.5 rounded-2xl border ${color.border}
                     bg-white p-3 sm:p-4 text-center transition-all duration-200
                     hover:${color.border} hover:shadow-lg cursor-pointer`}
      >
        <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center
                         rounded-xl ${color.bg} transition-colors duration-200
                         group-hover:ring-2 ${color.ring}`}>
          <IconComp className={`h-6 w-6 sm:h-7 sm:w-7 ${color.icon} transition-transform
                                duration-200 group-hover:scale-110`} />
        </div>
        <span className="text-[11px] sm:text-xs font-semibold leading-tight text-[#334155]
                         line-clamp-2 min-h-[28px] flex items-center">
          {cat.name}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
          <Clock className="h-3 w-3" /> 45 min
        </span>
      </motion.button>
    );
  };

  return (
    <div className="punchx-citizen-shell min-h-screen bg-[#f7faff] pb-24 text-[#0f172a]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="mx-auto flex min-h-[56px] max-w-5xl items-center gap-3 px-4 py-2">
          <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-8 w-8 rounded-xl object-cover" />
          <span className="text-lg font-extrabold tracking-tight">PUNCHX</span>

          <button
            onClick={() => onTransition('customer-setup')}
            className="ml-1 flex min-w-0 max-w-[50%] items-center gap-1.5 rounded-xl px-2.5 py-1.5
                       text-left hover:bg-blue-50/60 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Service area
              </span>
              <span className="block truncate text-xs font-bold text-gray-800">{area}</span>
            </span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
          </button>

          <button
            onClick={onOpenProfile}
            aria-label="Open profile"
            className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-gray-50 px-3
                       text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden max-w-24 truncate text-xs font-semibold sm:block">
              {citizenName || 'Profile'}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {activeTab === 'home' && (
          <>
        {/* ── HERO ── */}
        <section className="pt-6 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-to-br from-[#1e3a5f] via-[#1a365d] to-[#2563eb]
                       p-6 sm:p-8 text-white relative overflow-hidden"
          >
            {/* Subtle decorative circle */}
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
            <div className="absolute -left-8 -bottom-12 h-36 w-36 rounded-full bg-white/[.03]" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                <ShieldCheck className="h-4 w-4" /> Verified local professionals
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight">
                What service do<br className="sm:hidden" /> you need today?
              </h1>
              <p className="mt-2 max-w-md text-sm text-blue-100/80 leading-relaxed">
                Book verified professionals for home, vehicle, and personal care services.
              </p>

              {/* Search bar */}
              <button
                type="button"
                onClick={() => { setQuery(''); setSearchOpen(true); }}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-white p-1.5 text-left
                           shadow-xl shadow-black/10 ring-1 ring-white/20
                           hover:ring-2 hover:ring-blue-300 transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-400">
                  Search 50+ services…
                </span>
                <span className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white
                                 mr-0.5">
                  Search
                </span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* ── INFO PILLS ── */}
        <section className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
          {[
            { icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />, text: 'Background-verified pros' },
            { icon: <Clock className="h-3.5 w-3.5 text-blue-600" />, text: 'Avg. 45 min response' },
            { icon: <MapPin className="h-3.5 w-3.5 text-violet-600" />, text: residential || 'Add address for visits' },
          ].map((pill, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2 rounded-full border border-gray-100
                                    bg-white px-3.5 py-2 text-[11px] font-semibold text-gray-600 shadow-sm">
              {pill.icon}
              <span className="truncate max-w-[180px]">{pill.text}</span>
            </div>
          ))}
        </section>

        {/* ── POPULAR CAROUSEL ── */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">Popular services</h2>
            <button
              onClick={() => { setQuery(''); setSearchOpen(true); }}
              className="flex items-center gap-1 text-xs font-bold text-blue-600
                         hover:text-blue-700 transition-colors"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
            {POPULAR_IDS.map((id, i) => {
              const cat = PUNCHX_50_CATEGORIES.find(c => c.id === id);
              if (!cat) return null;
              const IconComp = ICON_MAP[cat.iconName] || Wrench;
              const catalog = getCatalogCategory(cat.id);
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => openCategory(cat.name)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex shrink-0 w-[140px] flex-col rounded-2xl border border-gray-100
                             bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50
                                  group-hover:bg-blue-100 transition-colors mb-3">
                    <IconComp className="h-7 w-7 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900 leading-tight text-left line-clamp-2">
                    {cat.name}
                  </span>
                  <span className="mt-1 text-[10px] text-gray-400 text-left line-clamp-1">
                    {cat.shortDesc}
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Clock className="h-3 w-3" /> 45 min
                    <span className="ml-auto flex items-center gap-0.5 text-amber-500">

                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── CATEGORY GROUPS ── */}
        {CATEGORY_GROUPS.map((group, gi) => {
          const color = GROUP_COLORS[gi % GROUP_COLORS.length];
          const groupCats = group.ids.filter(id => PUNCHX_50_CATEGORIES.some(c => c.id === id));
          if (groupCats.length === 0) return null;
          return (
            <section key={group.title} className="pt-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.08, duration: 0.4 }}
                className="flex items-center gap-2 mb-4"
              >
                <span className="text-xl">{group.emoji}</span>
                <h2 className="text-lg font-extrabold text-gray-900">{group.title}</h2>
                <span className="ml-auto text-[11px] font-semibold text-gray-400">
                  {groupCats.length} services
                </span>
              </motion.div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {groupCats.map((catId, ci) => (
                  <ServiceCard key={catId} catId={catId} index={ci} color={color} />
                ))}
              </div>
            </section>
          );
        })}

        {/* ── TRUST FOOTER ── */}
        <section className="py-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <ShieldCheck className="h-5 w-5 text-blue-600" />,
              title: 'Verified professionals', desc: 'Every pro is background-checked and skill-verified.' },
            { icon: <CalendarDays className="h-5 w-5 text-violet-600" />,
              title: 'Easy booking flow', desc: 'Pick service → facility → exact work → confirm.' },
            { icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
              title: 'Door-step service', desc: 'The professional visits your confirmed address.' },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              {card.icon}
              <h3 className="mt-3 text-sm font-bold text-gray-900">{card.title}</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </section>
          </>
        )}

        {activeTab === 'bookings' && (
          <section className="pt-6 pb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Your Bookings</h2>
            {orderHistory.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm border border-gray-100">
                <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">No recent bookings</h3>
                <p className="text-sm text-gray-500 mt-2">Services you book will appear here.</p>
                <button onClick={() => setActiveTab('home')} className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">Find a service</button>
              </div>
            ) : (
              <div className="space-y-4">
                {orderHistory.map((order, i) => (
                  <div key={i} className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{order.category || 'Service Booking'}</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">Recent</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {order.date || 'Today'} {order.time || ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onTransition('tracking')} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition">Track Status</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="pt-6 pb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Your Profile</h2>
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-5 ring-4 ring-white shadow-md">
                <UserRound className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{citizenName || 'PunchX Citizen'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8 text-left">
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Service Location</span></div>
                  <div className="text-sm font-semibold text-gray-800 ml-6">{citizenAddress || 'Not specified'}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-emerald-500" /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Account Status</span></div>
                  <div className="text-sm font-semibold text-gray-800 ml-6">Verified Citizen</div>
                </div>
              </div>
              
              <div className="w-full max-w-2xl mt-6 space-y-3">
                <button onClick={() => onTransition('customer-setup')} className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><MapPin className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-gray-700">Update Address</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={onOpenProfile} className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center"><UserRound className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-gray-700">Manage Account</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ── SEARCH MODAL ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm"
            onMouseDown={e => { if (e.currentTarget === e.target) setSearchOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
              className="mx-auto mt-12 sm:mt-16 flex max-h-[85vh] w-[calc(100%-20px)] max-w-3xl
                         flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                <Search className="h-5 w-5 text-blue-600 shrink-0" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search all 50 services…"
                  className="min-w-0 flex-1 text-sm font-medium outline-none placeholder:text-gray-400"
                />
                <span className="hidden sm:flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1
                                 text-[10px] font-bold text-blue-600">
                  {matches.length} found
                </span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100
                             hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Results */}
              <div className="overflow-y-auto p-4 sm:p-5">
                {matches.length ? (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {matches.map((cat, i) => {
                      const IconComp = ICON_MAP[cat.iconName] || Wrench;
                      return (
                        <motion.button
                          key={cat.id}
                          onClick={() => openCategory(cat.name)}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.02 }}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.96 }}
                          className="group flex flex-col items-center gap-2 rounded-2xl border
                                     border-gray-100 bg-gray-50/50 p-3 text-center
                                     hover:bg-white hover:shadow-md hover:border-blue-100
                                     transition-all cursor-pointer"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl
                                          bg-white shadow-sm group-hover:shadow
                                          transition-all">
                            <IconComp className="h-5 w-5 text-blue-600 group-hover:scale-110
                                                 transition-transform" />
                          </div>
                          <span className="text-[11px] font-semibold leading-tight text-gray-700
                                           line-clamp-2">
                            {cat.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <Search className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-400">
                      No service matches "<span className="text-gray-600">{query}</span>"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-[68px] grid-cols-3 border-t border-gray-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>
          <HomeIcon className="h-5 w-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={() => setActiveTab('bookings')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'bookings' ? 'text-blue-600' : 'text-gray-500'}`}>
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px] font-bold">Bookings</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center gap-1 active:scale-95 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}>
          <UserRound className="h-5 w-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
}
