import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ArrowRight, Megaphone, CalendarDays, CheckCircle2, ChevronRight, Clock, Home as HomeIcon,
  Loader2, MapPin, Search, ShieldCheck, Star, UserRound, X, LayoutGrid,
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
  { bg: 'bg-[#F7EFE7]', text: 'text-[#6B5560]', border: 'border-[#E8D2C4]', icon: 'text-[#9E8189]', ring: 'ring-[#C7A9A3]' },
  { bg: 'bg-[#F0E4E2]', text: 'text-[#6B5560]', border: 'border-[#E8D2C4]', icon: 'text-[#9E8189]', ring: 'ring-[#C7A9A3]' },
  { bg: 'bg-[#F7EFE7]', text: 'text-[#3E3239]', border: 'border-[#C7A9A3]', icon: 'text-[#6B5560]', ring: 'ring-[#E8D2C4]' },
  { bg: 'bg-[#E8D2C4]', text: 'text-[#3E3239]', border: 'border-[#C7A9A3]', icon: 'text-[#6B5560]', ring: 'ring-[#9E8189]' },
  { bg: 'bg-[#F7EFE7]', text: 'text-[#6B5560]', border: 'border-[#E8D2C4]', icon: 'text-[#9E8189]', ring: 'ring-[#C7A9A3]' },
  { bg: 'bg-[#F0E4E2]', text: 'text-[#3E3239]', border: 'border-[#C7A9A3]', icon: 'text-[#6B5560]', ring: 'ring-[#E8D2C4]' },
  { bg: 'bg-[#E8D2C4]', text: 'text-[#3E3239]', border: 'border-[#C7A9A3]', icon: 'text-[#6B5560]', ring: 'ring-[#9E8189]' },
  { bg: 'bg-[#F7EFE7]', text: 'text-[#6B5560]', border: 'border-[#E8D2C4]', icon: 'text-[#9E8189]', ring: 'ring-[#C7A9A3]' },
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
  const [activeDockItem, setActiveDockItem] = useState<'home' | 'search' | 'bookings' | 'services' | 'profile'>('home');
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

  // Five familiar primary actions reduce choice overload while keeping the
  // most-used tasks one thumb-tap away on mobile.
  const handleDockNavigation = useCallback((item: 'home' | 'search' | 'bookings' | 'services' | 'profile') => {
    setActiveDockItem(item);
    if (item === 'search') {
      setActiveTab('home');
      setQuery('');
      setSearchOpen(true);
      return;
    }
    if (item === 'services') {
      setActiveTab('home');
      window.setTimeout(() => {
        document.getElementById('px-popular-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }
    setActiveTab(item);
    if (item === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  /* ── Render a single service card ── */
  const ServiceCard = ({ catId, index, color }: { catId: string; index: number; color: typeof GROUP_COLORS[0]; key?: React.Key }) => {
    const cat = PUNCHX_50_CATEGORIES.find(c => c.id === catId);
    if (!cat) return null;
    const IconComp = ICON_MAP[cat.iconName] || Wrench;
    return (
      <motion.button
        key={cat.id}
        onClick={() => openCategory(cat.name)}
        initial={{ opacity: 0, y: 18, scale: .97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: Math.min(index * 0.035, .28), duration: 0.42, ease: [.22, 1, .36, 1] }}
        whileHover={{ y: -4, scale: 1.015, boxShadow: '0 14px 34px rgba(62,50,57,.14)' }}
        whileTap={{ scale: 0.965, transition: { duration: 0.12 } }}
        className={`px-service-card group flex flex-col items-center gap-2 rounded-[1.2rem] border ${color.border}
                     bg-[#FFFCF8] p-2.5 sm:p-3 text-center transition-all duration-300 cursor-pointer`}
      >
        <div className="relative mb-1 h-[76px] w-full overflow-hidden rounded-xl bg-[#E8D2C4] sm:h-[90px]" style={{backgroundImage:"linear-gradient(135deg,#E8D2C4,#C7A9A3)"}}>
          <img
            src={({
              electrician: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=360&q=72',
              plumber: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=360&q=72',
              carpenter: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=360&q=72',
              painter: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=360&q=72',
              'ac-technician': 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=360&q=72',
              'cleaner-housekeeper': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=360&q=72',
              beautician: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=360&q=72',
              cook: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=360&q=72',
              'interior-decorator': 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=360&q=72',
              'packer-mover': 'https://images.unsplash.com/photo-1600518464441-9306b6a7a4c3?auto=format&fit=crop&w=360&q=72',
              'appliance-repair-technician': 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=360&q=72'
            } as Record<string, string>)[cat.id] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=360&q=72'}
            alt="" aria-hidden="true" loading="lazy"
            className="px-service-photo h-full w-full object-cover"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171813]/70 via-[#171813]/5 to-transparent" />
          <div className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-[#171813]/85 text-[#E8D2C4] backdrop-blur">
            <IconComp className="h-3.5 w-3.5" />
          </div>
        </div>
        <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#343329]
                         line-clamp-2 min-h-[30px] flex items-center">
          {cat.name}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-bold text-[#80663a]">
          <Info className="h-3 w-3" /> View details
        </span>
      </motion.button>
    );
  };

  return (
    <div className="punchx-citizen-shell min-h-screen bg-[#f5f2eb] pb-24 text-[#171813]">
      <style>{".punchx-citizen-shell .px-page-enter{animation:px-page-enter .42s cubic-bezier(.2,.7,.2,1) both}.punchx-citizen-shell .px-service-card{position:relative;overflow:hidden;isolation:isolate;border-color:#e5dfd1!important;box-shadow:0 7px 20px rgba(35,33,26,.045)}.punchx-citizen-shell .px-service-card:after{content:'';position:absolute;inset:0;background:linear-gradient(145deg,rgba(255,255,255,.22),transparent 46%);opacity:0;transition:opacity .3s ease;pointer-events:none}.punchx-citizen-shell .px-service-card:hover:after{opacity:1}.punchx-citizen-shell .px-service-photo{transition:transform .65s cubic-bezier(.2,.7,.2,1),filter .4s ease}.punchx-citizen-shell .px-service-card:hover .px-service-photo{transform:scale(1.08);filter:saturate(1.08)}.punchx-citizen-shell .px-tab-panel{animation:px-page-enter .38s cubic-bezier(.2,.7,.2,1) both}.punchx-citizen-shell .px-order-card{animation:px-page-enter .4s cubic-bezier(.2,.7,.2,1) both;transition:transform .25s ease,box-shadow .25s ease}.punchx-citizen-shell .px-order-card:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(35,33,26,.09)}.punchx-citizen-shell .px-premium-hero h1{color:#fff!important;text-shadow:0 2px 24px rgba(0,0,0,.3)}.punchx-citizen-shell .px-premium-hero p{color:rgba(255,255,255,.82)!important}@keyframes px-page-enter{from{opacity:0;transform:translate3d(0,14px,0)}to{opacity:1;transform:translate3d(0,0,0)}}@media(prefers-reduced-motion:reduce){.punchx-citizen-shell .px-page-enter,.punchx-citizen-shell .px-tab-panel,.punchx-citizen-shell .px-order-card{animation:none!important}.punchx-citizen-shell .px-service-photo,.punchx-citizen-shell .px-order-card{transition:none!important}}.punchx-citizen-shell{background-image:radial-gradient(ellipse at 10% 0%,rgba(199,169,163,.18),transparent 30%),radial-gradient(ellipse at 100% 35%,rgba(158,129,137,.08),transparent 30%)}.punchx-citizen-shell .px-premium-hero{box-shadow:0 24px 65px rgba(28,29,23,.2)}.punchx-citizen-shell .px-photo-card{transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s ease}.punchx-citizen-shell .px-photo-card:hover{transform:translateY(-5px);box-shadow:0 18px 35px rgba(27,29,22,.13)}.punchx-citizen-shell .px-shine{position:relative;isolation:isolate;overflow:hidden}.punchx-citizen-shell .px-shine:after{content:'';position:absolute;inset:-30% auto -30% -70%;width:38%;transform:skewX(-18deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);animation:px-home-shine 6.5s ease-in-out infinite;pointer-events:none}@keyframes px-home-shine{0%,58%{left:-70%}100%{left:140%}}@keyframes px-home-glow{0%,100%{opacity:.28;transform:scale(.96)}50%{opacity:.65;transform:scale(1.05)}}.punchx-citizen-shell main>section{animation:px-section-arrive .58s cubic-bezier(.22,1,.36,1) both}.punchx-citizen-shell main>section:nth-of-type(2){animation-delay:.06s}.punchx-citizen-shell main>section:nth-of-type(3){animation-delay:.12s}.punchx-citizen-shell main>section:nth-of-type(4){animation-delay:.18s}@keyframes px-section-arrive{from{opacity:0;transform:translate3d(0,16px,0)}to{opacity:1;transform:translate3d(0,0,0)}}.punchx-citizen-shell button,.punchx-citizen-shell a,[role=button]{transition:transform .22s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease,background-color .25s ease,border-color .25s ease,filter .25s ease}.punchx-citizen-shell button:active,.punchx-citizen-shell a:active,.punchx-citizen-shell [role=button]:active{transform:scale(.975)}.punchx-citizen-shell button:focus-visible,.punchx-citizen-shell a:focus-visible{outline:2px solid #9E8189;outline-offset:3px}.punchx-citizen-shell .px-service-card,.punchx-citizen-shell .px-photo-card,.punchx-citizen-shell .px-order-card{will-change:transform;transform-origin:center bottom}.punchx-citizen-shell .px-service-card:hover,.punchx-citizen-shell .px-photo-card:hover,.punchx-citizen-shell .px-order-card:hover{box-shadow:0 18px 38px rgba(62,50,57,.13)}.punchx-citizen-shell .px-premium-hero{transform:translateZ(0);background-size:140% 140%;animation:px-hero-breathe 12s ease-in-out infinite alternate}.punchx-citizen-shell .px-premium-hero:focus-within{box-shadow:0 0 0 3px rgba(199,169,163,.25),0 22px 54px rgba(62,50,57,.18)}@keyframes px-hero-breathe{from{background-position:0% 50%}to{background-position:100% 50%}}.punchx-citizen-shell .px-glow{animation:px-home-glow 7s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.punchx-citizen-shell *,.punchx-citizen-shell *:before,.punchx-citizen-shell *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}"}</style>
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-[#e5dfd1] bg-[#f8f6f0]/90 backdrop-blur-2xl shadow-[0_5px_24px_rgba(30,28,22,.035)]">
        <div className="mx-auto flex min-h-[62px] max-w-5xl items-center gap-3 px-4 py-2">
          <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-9 w-9 rounded-xl object-cover ring-1 ring-[#c4a568]/50 shadow-sm" />
          <span className="text-lg font-black tracking-[-.06em] text-[#24251f]">PUNCHX</span>

          <button
            onClick={() => onTransition('customer-setup')}
            className="ml-1 flex min-w-0 max-w-[50%] items-center gap-1.5 rounded-xl border border-[#e5dfd1] bg-[#FFFCF8]/70 px-2.5 py-1.5 text-left transition-colors hover:bg-[#f2ead8]"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B5560]" />
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Service area
              </span>
              <span className="block truncate text-xs font-bold text-gray-800">{area}</span>
            </span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B5560]" />}
          </button>

          <button
            onClick={onOpenProfile}
            aria-label="Open profile"
            className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-[#e5dfd1] bg-[#FFFCF8] px-3 text-[#343329] shadow-sm transition-colors hover:bg-[#f2ead8]"
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
            className="px-premium-hero px-shine rounded-[1.8rem] bg-[#3E3239] p-5 sm:p-8 text-white relative overflow-hidden border border-[#C7A9A3]/45" style={{backgroundImage:"linear-gradient(125deg,#3E3239 0%,#6B5560 54%,#9E8189 100%)"}}
          >
            <div className="absolute inset-0">
              <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=82" alt="" aria-hidden="true" className="h-full w-full object-cover opacity-35" />
              <div className="absolute inset-0" style={{background:"linear-gradient(125deg,rgba(62,50,57,.18),rgba(107,85,96,.08),rgba(158,129,137,.02))"}} />
              <div className="px-glow absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#c4a568]/20 blur-3xl" />
              <div className="absolute -bottom-20 right-8 h-48 w-48 rounded-full border border-[#d8c18d]/25" />
              <div className="absolute -bottom-12 right-16 h-32 w-32 rounded-full border border-[#d8c18d]/20" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E8D2C4]">
                <ShieldCheck className="h-4 w-4" /> THE PUNCHX EXPERIENCE
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold leading-tight">
                Your home. Your time.<br className="sm:hidden" /> Consider it handled.
              </h1>
              <p className="mt-2 max-w-md text-sm text-[#F7EFE7]/85 leading-relaxed">
                Thoughtfully chosen local services, designed around the way you live.
              </p>

              {/* Search bar */}
              <button
                type="button"
                onClick={() => { setQuery(''); setSearchOpen(true); }}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-[#FFFCF8] p-1.5 text-left
                           shadow-xl shadow-black/10 ring-1 ring-white/20
                           hover:ring-2 hover:ring-[#C7A9A3] transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7EFE7]">
                  <Search className="h-5 w-5 text-[#6B5560]" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-400">
                  Search 50+ services…
                </span>
                <span className="rounded-xl bg-[#c4a568] px-4 py-2.5 text-xs font-bold text-[#171813]
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
            { icon: <ShieldCheck className="h-3.5 w-3.5 text-[#6B5560]" />, text: 'Service details before booking' },
            
            { icon: <MapPin className="h-3.5 w-3.5 text-[#6B5560]" />, text: residential || 'Add address for visits' },
          ].map((pill, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2 rounded-full border border-[#E8D2C4]
                                    bg-[#FFFCF8] px-3.5 py-2 text-[11px] font-semibold text-[#796B70] shadow-sm">
              {pill.icon}
              <span className="truncate max-w-[180px]">{pill.text}</span>
            </div>
          ))}
        </section>

        {/* ── HOMEPAGE FEATURED AD SLOT ── */}
        <section aria-label="Featured advertising" className="pt-3">
          <div className="px-shine relative overflow-hidden rounded-[1.6rem] border border-[#C7A9A3]/50 p-4 text-white shadow-[0_16px_38px_rgba(62,50,57,.12)] sm:p-5" style={{backgroundImage:"linear-gradient(125deg,#3E3239 0%,#6B5560 54%,#9E8189 100%)"}}>
            <div className="px-glow absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#c4a568]/20 blur-2xl" />
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#c4a568] text-[#171813] shadow-sm">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#d8c18d]/15 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#E8D2C4] ring-1 ring-[#d8c18d]/30">Featured</span>
                  <span className="text-[10px] font-semibold text-[#E8D2C4]">PUNCHX SPOTLIGHT</span>
                </div>
                <h2 className="mt-1 text-base font-extrabold leading-5 text-[#F7EFE7] sm:text-lg">A little help changes everything.</h2>
                <p className="mt-1 text-xs leading-5 text-[#E8D2C4]">Discover skilled local professionals for the things that matter at home.</p>
              </div>
              <button type="button" onClick={() => { setQuery(''); setSearchOpen(true); }} className="relative shrink-0 rounded-xl bg-[#c4a568] px-3 py-2.5 text-xs font-extrabold text-[#171813] shadow-sm transition hover:bg-[#d8c18d] sm:px-4">Explore <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
            </div>
          </div>
        </section>

        {/* ── POPULAR CAROUSEL ── */}
        <section id="px-popular-services" className="pt-4 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-tight text-[#24251f]">Popular services</h2>
            <button
              onClick={() => { setQuery(''); setSearchOpen(true); }}
              className="flex items-center gap-1 text-xs font-bold text-[#6B5560]
                         hover:text-[#3E3239] transition-colors"
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
                  className="px-photo-card group flex shrink-0 w-[152px] flex-col rounded-[1.25rem] border border-[#e5dfd1] bg-[#FFFCF8] p-2.5 shadow-[0_5px_18px_rgba(35,33,26,.05)] transition-all cursor-pointer"
                >
                  <div className="relative mb-3 h-[92px] overflow-hidden rounded-xl bg-[#E8D2C4]" style={{backgroundImage:"linear-gradient(135deg,#E8D2C4,#C7A9A3)"}}>
                    <img
                      src={({
                        electrician: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=420&q=75',
                        plumber: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=420&q=75',
                        carpenter: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=420&q=75',
                        'ac-technician': 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=420&q=75',
                        'cleaner-housekeeper': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=420&q=75',
                        painter: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=420&q=75',
                        'appliance-repair-technician': 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=420&q=75',
                        beautician: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=420&q=75',
                      } as Record<string, string>)[cat.id] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=420&q=75'}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171813]/65 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-[#171813]/75 text-[#E8D2C4] backdrop-blur">
                      <IconComp className="h-4 w-4" />
                    </div>
                  </div>
                  <span className="text-[13px] font-bold text-[#24251f] leading-tight text-left line-clamp-2">
                    {cat.name}
                  </span>
                  <span className="mt-1 text-[10px] text-[#898577] text-left line-clamp-1">
                    {cat.shortDesc}
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#80663a]">
                    <Info className="h-3 w-3" /> View details
                    <span className="ml-auto flex items-center gap-0.5 text-[#9E8189]">

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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
            { icon: <ShieldCheck className="h-5 w-5 text-[#6B5560]" />,
              title: 'Professional information', desc: 'Review the available profile information before booking.' },
            { icon: <CalendarDays className="h-5 w-5 text-[#6B5560]" />,
              title: 'Easy booking flow', desc: 'Pick service → facility → exact work → confirm.' },
            { icon: <CheckCircle2 className="h-5 w-5 text-[#6B5560]" />,
              title: 'Door-step service', desc: 'The professional visits your confirmed address.' },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-2xl border border-[#E8D2C4] bg-[#FFFCF8] p-5 shadow-sm"
            >
              {card.icon}
              <h3 className="mt-3 text-sm font-bold text-gray-900">{card.title}</h3>
              <p className="mt-1 text-xs text-[#9E8189] leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </section>
          </>
        )}

        {activeTab === 'bookings' && (
          <section className="px-tab-panel pt-6 pb-20">
            <div className="mb-6 rounded-[1.6rem] bg-gradient-to-br from-[#3E3239] via-[#6B5560] to-[#9E8189] p-5 text-white shadow-[0_20px_50px_rgba(28,29,23,.18)]"><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#E8D2C4]">YOUR PUNCHX JOURNEY</span><h2 className="mt-2 text-2xl font-extrabold text-[#F7EFE7]">Your Bookings</h2><p className="mt-1 text-xs leading-relaxed text-[#E8D2C4]">Every service, all in one place. Your next little win starts here.</p><div className="mt-4 flex items-center gap-2 text-xs text-[#E8D2C4]"><CalendarDays className="h-4 w-4"/>{orderHistory.length} booking{orderHistory.length===1?'':'s'} in your history</div></div>
            {orderHistory.length === 0 ? (
              <div className="rounded-3xl bg-[#FFFCF8] p-10 text-center shadow-sm border border-[#E8D2C4]">
                <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">No recent bookings</h3>
                <p className="text-sm text-[#9E8189] mt-2">Services you book will appear here.</p>
                <button onClick={() => { setActiveTab('home'); setActiveDockItem('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mt-6 rounded-xl bg-[#6B5560] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#3E3239]">Find a service</button>
              </div>
            ) : (
              <div className="space-y-4">
                {orderHistory.map((order, i) => (
                  <div key={i} className="px-order-card rounded-[1.4rem] bg-[#FFFCF8] p-5 shadow-[0_8px_26px_rgba(30,28,22,.05)] border border-[#e5dfd1] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{order.category || 'Service Booking'}</span>
                        <span className="rounded-full bg-[#F7EFE7] px-2.5 py-0.5 text-[10px] font-bold text-[#6B5560] border border-[#E8D2C4]">Recent</span>
                      </div>
                      <div className="text-xs text-[#9E8189] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {order.date || 'Today'} {order.time || ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onTransition('tracking')} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-[#6B5560] hover:bg-[#F7EFE7] transition">Track Status</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="px-tab-panel pt-6 pb-20">
            <div className="mb-6 rounded-[1.6rem] bg-gradient-to-br from-[#3E3239] via-[#6B5560] to-[#9E8189] p-5 text-white shadow-[0_20px_50px_rgba(28,29,23,.18)]"><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#E8D2C4]">YOUR SPACE</span><h2 className="mt-2 text-2xl font-extrabold text-[#F7EFE7]">Your Profile</h2><p className="mt-1 text-xs text-[#E8D2C4]">Your details, your preferences, your PunchX.</p></div>
            <div className="rounded-3xl bg-[#FFFCF8] p-8 shadow-sm border border-[#E8D2C4] flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-[#F7EFE7] text-[#6B5560] flex items-center justify-center mb-5 ring-4 ring-white shadow-md">
                <UserRound className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{citizenName || 'PunchX Customer'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8 text-left">
                <div className="rounded-2xl bg-[#F7EFE7] p-4 border border-[#E8D2C4]">
                  <div className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4 text-gray-400" /><span className="text-[10px] font-bold uppercase tracking-wider text-[#9E8189]">Service Location</span></div>
                  <div className="text-sm font-semibold text-gray-800 ml-6">{citizenAddress || 'Not specified'}</div>
                </div>
                <div className="rounded-2xl bg-[#F7EFE7] p-4 border border-[#E8D2C4]">
                  <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-[#9E8189]" /><span className="text-[10px] font-bold uppercase tracking-wider text-[#9E8189]">Account Status</span></div>
                  <div className="text-sm font-semibold text-gray-800 ml-6">Customer account</div>
                </div>
              </div>
              
              <div className="w-full max-w-2xl mt-6 space-y-3">
                <button onClick={() => onTransition('customer-setup')} className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:bg-[#F7EFE7] transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#F7EFE7] text-[#6B5560] flex items-center justify-center"><MapPin className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-[#6B5560]">Update Address</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={onOpenProfile} className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:bg-[#F7EFE7] transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 text-[#796B70] flex items-center justify-center"><UserRound className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-[#6B5560]">Manage Account</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={() => {
                  try {
                    localStorage.setItem('punchx_auth_role', 'worker');
                    localStorage.setItem('punchx_edit_worker_signup', 'true');
                    localStorage.removeItem('punchx_worker_approved');
                  } catch {}
                  onTransition('worker-signup');
                }} className="w-full flex items-center justify-between rounded-xl border border-[#C7A9A3] bg-[#F7EFE7] p-4 hover:bg-[#E8D2C4] transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#E8D2C4] text-[#6B5560] flex items-center justify-center"><Wrench className="h-4 w-4" /></div>
                    <div className="text-left">
                      <span className="block text-sm font-bold text-[#3E3239]">Apply as Professional Specialist</span>
                      <span className="block text-[11px] text-[#6B5560]">Register your trade, set visiting fee, and start getting bookings</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6B5560]" />
                </button>
                <button onClick={() => onTransition('panel-select')} className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:bg-[#F7EFE7] transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 text-[#796B70] flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-[#6B5560]">Switch Workspace / Specialist Login</span>
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
                         flex-col overflow-hidden rounded-3xl bg-[#FFFCF8] shadow-2xl ring-1 ring-black/5"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-[#E8D2C4] px-5 py-4">
                <Search className="h-5 w-5 text-[#6B5560] shrink-0" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search all 50 services…"
                  className="min-w-0 flex-1 text-sm font-medium outline-none placeholder:text-gray-400"
                />
                <span className="hidden sm:flex items-center gap-1 rounded-full bg-[#F7EFE7] px-3 py-1
                                 text-[10px] font-bold text-[#6B5560]">
                  {matches.length} found
                </span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100
                             hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-[#796B70]" />
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
                                     border-[#E8D2C4] bg-[#F7EFE7]/50 p-3 text-center
                                     hover:bg-[#FFFCF8] hover:shadow-md hover:border-[#E8D2C4]
                                     transition-all cursor-pointer"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl
                                          bg-[#FFFCF8] shadow-sm group-hover:shadow
                                          transition-all">
                            <IconComp className="h-5 w-5 text-[#6B5560] group-hover:scale-110
                                                 transition-transform" />
                          </div>
                          <span className="text-[11px] font-semibold leading-tight text-[#6B5560]
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
                      No service matches "<span className="text-[#796B70]">{query}</span>"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-citizen-dock-safe-area md:hidden">
        <nav className="px-citizen-dock" aria-label="Citizen navigation">
          {([
            { id: 'home', label: 'Home', Icon: HomeIcon },
            { id: 'search', label: 'Search', Icon: Search },
            { id: 'bookings', label: 'Bookings', Icon: CalendarDays },
            { id: 'services', label: 'Services', Icon: LayoutGrid },
            { id: 'profile', label: 'Profile', Icon: UserRound },
          ] as const).map(({ id, label, Icon }) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => handleDockNavigation(id)}
              whileTap={{ scale: 0.93 }}
              aria-label={label}
              aria-current={activeDockItem === id ? 'page' : undefined}
              className={`px-citizen-dock-item ${activeDockItem === id ? 'is-active' : ''}`}
            >
              {activeDockItem === id && (
                <motion.span layoutId="px-citizen-dock-active" className="px-citizen-dock-active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <Icon className="px-citizen-dock-icon" aria-hidden="true" />
              <span className="px-citizen-dock-label">{label}</span>
            </motion.button>
          ))}
        </nav>
      </div>
    </div>
  );
}
