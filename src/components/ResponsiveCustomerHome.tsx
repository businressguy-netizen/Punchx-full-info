import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ChevronRight, Star, ShieldCheck, Navigation, Home, Grid2X2, ClipboardList, User, Bell, Gift, ArrowRight, Zap, Sparkles, Clock3, Wrench, Heart } from 'lucide-react';
import { AppScreen } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import { serviceCategories, ServiceItem } from '../data/serviceCatalogs';
import CategoryIcon from './CategoryIcon';
import ServiceCategoryModal from './ServiceCategoryModal';

interface ResponsiveCustomerHomeProps {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: any) => void;
  onSelectCategory: (category: string) => void;
  hasActiveBooking: boolean;
  promoApplied: boolean;
  hasClaimedBonus?: boolean;
  hasUsedBonus?: boolean;
  onClaimPromo: () => void;
  citizenName: string;
  setCitizenName: (val: string) => void;
  citizenAddress: string;
  setCitizenAddress: (val: string) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  onOpenNotificationCenter?: () => void;
}

const fallbackImages: Record<string, string> = {
  ac: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80',
  plumbing: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=80',
  beauty: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80'
};

const norm = (v: string) => v.trim().toLowerCase();

function SafeImage({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [value, setValue] = useState(src);
  useEffect(() => setValue(src), [src]);
  return (
    <img
      src={value}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        const key = norm(alt);
        const next = key.includes('ac') ? fallbackImages.ac : key.includes('clean') ? fallbackImages.cleaning : key.includes('plumb') ? fallbackImages.plumbing : key.includes('beaut') || key.includes('hair') || key.includes('salon') ? fallbackImages.beauty : fallbackImages.cleaning;
        if (value !== next) setValue(next);
      }}
    />
  );
}

export default function ResponsiveCustomerHome({
  onTransition,
  onSelectCategory,
  citizenName,
  setCitizenAddress,
  citizenAddress,
  showNotification,
  onOpenNotificationCenter,
  hasActiveBooking
}: ResponsiveCustomerHomeProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'tracking' | 'bookings' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState(citizenAddress || 'Set your service location');
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => setLocationLabel(citizenAddress || 'Set your service location'), [citizenAddress]);
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('punchx_order_history') || '[]');
      setHistoryOrders(Array.isArray(parsed) ? parsed : []);
    } catch { setHistoryOrders([]); }
  }, []);

  const activeOrder = useMemo(
    () => historyOrders.find((order) => ['Pending', 'In Progress', 'In-Progress', 'Out for Service', 'Arrived'].includes(order?.status)),
    [historyOrders]
  );

  const flatServices = useMemo(() => {
    const items: Array<ServiceItem & { categoryName: string }> = [];
    serviceCategories.forEach((category) => category.subcategories.forEach((sub) => sub.items.forEach((item) => items.push({ ...item, categoryName: category.name }))));
    return items;
  }, []);

  const mostBooked = useMemo(() => {
    const keywords = ['ac', 'clean', 'plumb', 'electric', 'hair', 'water'];
    const selected: Array<ServiceItem & { categoryName: string }> = [];
    keywords.forEach((keyword) => {
      const found = flatServices.find((item) => norm(item.name).includes(keyword));
      if (found && !selected.some((item) => item.id === found.id)) selected.push(found);
    });
    return (selected.length ? selected : flatServices).slice(0, 6);
  }, [flatServices]);

  const quickCategories = useMemo(() => PUNCHX_50_CATEGORIES.slice(0, 12), []);
  const sectionGroups = useMemo(() => [
    { title: 'Home & Repairs', subtitle: 'Everyday fixes by verified specialists', icon: <Wrench className="w-4 h-4" />, terms: ['electrician', 'plumber', 'carpenter', 'painter', 'mason', 'welder', 'locksmith'] },
    { title: 'Beauty & Personal Care', subtitle: 'Grooming and self-care at home', icon: <Heart className="w-4 h-4" />, terms: ['beautician', 'barber', 'hair', 'makeup', 'tailor'] },
    { title: 'Tech & Appliances', subtitle: 'Repair and smart-home support', icon: <Zap className="w-4 h-4" />, terms: ['ac', 'appliance', 'mobile', 'computer', 'cctv', 'solar', 'ro'] }
  ], []);

  const handleSyncLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Location services are not supported on this device.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationLabel('Current device location');
        setCitizenAddress(lat.toFixed(5) + ', ' + lng.toFixed(5));
        try { localStorage.setItem('punchx_user_location', JSON.stringify({ lat, lng, timestamp: new Date().toISOString() })); } catch {}
        setIsLocating(false);
        showNotification('✓ Live service location updated from your device GPS.');
      },
      () => {
        setIsLocating(false);
        showNotification('⚠️ Location permission was not granted. Set your address from Profile.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  const chooseCategory = (name: string) => {
    onSelectCategory(name);
    setIsCategoryModalOpen(true);
  };

  const filteredCategories = quickCategories.filter((category) => norm(category.name).includes(norm(searchQuery)) || norm(category.shortDesc).includes(norm(searchQuery)));

  const openTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'services') setIsCategoryModalOpen(true);
    if (tab === 'tracking') onTransition('tracking');
    if (tab === 'bookings') {
      if (activeOrder) onTransition('tracking');
      else showNotification('No active booking yet. Book a service to see live status here.');
    }
    if (tab === 'profile') showNotification('Use your account controls to edit your profile.');
  };

  const referralLink = typeof window !== 'undefined'
    ? window.location.origin + '/?ref=PUNCHX-' + (citizenName || 'FRIEND').replace(/\s+/g, '-').toUpperCase()
    : 'https://www.punchxapp.co.in/?ref=PUNCHX-FRIEND';

  const shareReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      showNotification('✓ PunchX referral link copied.');
    } catch { showNotification('Copy the referral link manually.'); }
  };

  return (
    <div id="punchx-responsive-customer-home" className="min-h-screen bg-[#f7f7f8] text-zinc-900 lg:bg-[#07122a] lg:text-[#e1e3e4] font-sans overflow-x-hidden pb-20 lg:pb-0">
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-200">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={() => openTab('home')} className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#07122a] flex items-center justify-center text-[#e9c176] font-black text-sm">PX</div>
            <div className="text-left min-w-0"><div className="font-black text-lg leading-none">PUNCH<span className="text-[#c5a059]">X</span></div><div className="text-[8px] uppercase tracking-[0.18em] font-bold text-zinc-500">Service Utility</div></div>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onOpenNotificationCenter} className="w-9 h-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center relative"><Bell className="w-4 h-4" />{hasActiveBooking && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />}</button>
            <button onClick={() => openTab('profile')} className="w-9 h-9 rounded-full bg-[#07122a] text-white flex items-center justify-center"><User className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-3">
          <button onClick={handleSyncLocation} className="w-full flex items-center gap-2 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-left">
            <MapPin className="w-4 h-4 text-[#c5a059]" /><span className="text-xs font-semibold truncate flex-1">{isLocating ? 'Detecting your live location…' : locationLabel}</span><span className="text-[10px] font-bold text-[#8b5e16]">{isLocating ? 'GPS' : 'Change'}</span>
          </button>
        </div>
      </header>

      <header className="hidden md:flex lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-zinc-200">
        <div className="w-full max-w-5xl mx-auto px-6 py-3 flex items-center gap-5">
          <button onClick={() => openTab('home')} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#07122a] flex items-center justify-center text-[#e9c176] font-black">PX</div>
            <div className="min-w-0 text-left">
              <div className="font-black text-lg leading-none">PUNCH<span className="text-[#c5a059]">X</span></div>
              <div className="text-[8px] uppercase tracking-[0.18em] font-bold text-zinc-500">Service Utility</div>
            </div>
          </button>
          <nav className="flex items-center gap-1.5 flex-1 justify-center">
            <button onClick={() => openTab('home')} className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 hover:bg-zinc-100">Home</button>
            <button onClick={() => openTab('services')} className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 hover:bg-zinc-100">Services</button>
            <button onClick={() => openTab('tracking')} className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 hover:bg-zinc-100">Live Tracking</button>
            <button onClick={() => openTab('bookings')} className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 hover:bg-zinc-100">Bookings</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={handleSyncLocation} className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-[10px] font-bold text-[#8b5e16]"><Navigation className="inline w-3.5 h-3.5 mr-1" />{isLocating ? 'GPS…' : 'Live location'}</button>
            <button onClick={() => openTab('profile')} className="w-10 h-10 rounded-xl bg-[#07122a] text-white flex items-center justify-center"><User className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <header className="hidden lg:block sticky top-0 z-50 border-b border-[#c5a059]/25 bg-[#07122a]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between gap-8">
          <button onClick={() => openTab('home')} className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white border border-[#c5a059]/50 flex items-center justify-center"><span className="text-[#07122a] font-black">PX</span></div><div className="text-left"><div className="text-xl font-black text-white">PUNCH<span className="text-[#c5a059]">X</span></div><div className="text-[9px] uppercase tracking-[0.26em] font-bold text-[#c5a059]">Prestige Service Utility</div></div></button>
          <nav className="flex items-center gap-1">{[['home', 'Home'], ['services', 'Services'], ['tracking', 'Live Tracking'], ['bookings', 'Bookings']].map(([key, label]) => <button key={key} onClick={() => openTab(key as typeof activeTab)} className={'px-4 py-2 rounded-xl text-xs font-bold transition ' + (activeTab === key ? 'text-[#e9c176] bg-[#c5a059]/12' : 'text-zinc-300 hover:text-white hover:bg-white/5')}>{label}</button>)}</nav>
          <div className="flex items-center gap-2.5"><button onClick={handleSyncLocation} className="px-3 py-2 rounded-xl border border-[#c5a059]/30 bg-[#0b1731] text-[10px] font-bold text-[#e9c176] flex items-center gap-2"><Navigation className="w-3.5 h-3.5" />{isLocating ? 'GPS Syncing…' : 'Use live location'}</button><button onClick={() => openTab('profile')} className="px-3 py-2 rounded-xl bg-[#0f1d38] border border-zinc-800 text-white text-xs font-bold">{citizenName || 'PunchX Member'}</button></div>
        </div>
      </header>

      <main>
        <section className="bg-white lg:bg-gradient-to-br lg:from-[#0a1732] lg:to-[#10264b]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-12">
            <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/25 px-3 py-1 text-[9px] uppercase tracking-wider font-extrabold text-[#8b5e16] lg:text-[#e9c176]"><Sparkles className="w-3 h-3" /> Smart service dispatch</div>
                <h1 className="mt-3 text-2xl sm:text-3xl lg:text-5xl font-black tracking-tight text-zinc-950 lg:text-white">Trusted help, right when your home needs it.</h1>
                <p className="mt-2 text-sm lg:text-base text-zinc-500 lg:text-zinc-300 max-w-2xl">Browse 50 service trades, compare starting prices, choose the exact service and follow your specialist live.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2.5"><button onClick={() => setIsCategoryModalOpen(true)} className="px-5 py-3 rounded-xl bg-[#07122a] lg:bg-[#c5a059] text-white lg:text-black text-xs font-extrabold flex items-center justify-center gap-2"><Search className="w-4 h-4" />Find a service</button><button onClick={() => onTransition(hasActiveBooking ? 'tracking' : 'providers')} className="px-5 py-3 rounded-xl border border-zinc-200 lg:border-[#c5a059]/35 bg-white lg:bg-[#0a1833] text-zinc-800 lg:text-white text-xs font-bold flex items-center justify-center gap-2"><Navigation className="w-4 h-4 text-[#c5a059]" />{hasActiveBooking ? 'Track my specialist' : 'Find specialists'}</button></div>
                <div className="mt-4 flex items-center gap-4 text-[10px] font-semibold text-zinc-500 lg:text-zinc-400 flex-wrap"><span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified professionals</span><span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-[#c5a059]" /> Live ETA</span><span className="flex items-center gap-1.5"><Grid2X2 className="w-3.5 h-3.5 text-[#c5a059]" /> 50 trades</span></div>
              </div>
              <div className="hidden md:block"><div className="rounded-3xl border border-zinc-200 lg:border-[#c5a059]/25 bg-zinc-50 lg:bg-[#07122a]/55 p-5"><div className="flex items-center justify-between"><div><div className="text-[9px] uppercase tracking-widest text-zinc-500 lg:text-zinc-400">Live service center</div><div className="mt-1 text-base font-black text-zinc-950 lg:text-white">{activeOrder ? 'Your specialist is on the move' : 'Everything in one place'}</div></div><div className="w-11 h-11 rounded-2xl bg-[#c5a059]/15 text-[#8b5e16] lg:text-[#e9c176] flex items-center justify-center"><Navigation className="w-5 h-5" /></div></div><div className="mt-4 grid grid-cols-3 gap-2">{[['GPS', activeOrder ? 'Live' : 'Ready'], ['ETA', activeOrder ? 'Auto' : 'Instant'], ['Support', '24/7']].map(([label, value]) => <div key={label} className="rounded-xl bg-white lg:bg-[#0c1832] border border-zinc-200 lg:border-zinc-800 p-3"><div className="text-[8px] uppercase text-zinc-400 font-mono">{label}</div><div className="mt-1 text-sm font-black text-zinc-950 lg:text-white">{value}</div></div>)}</div>{activeOrder && <button onClick={() => onTransition('tracking')} className="mt-3 w-full rounded-xl bg-[#07122a] lg:bg-[#c5a059] text-white lg:text-black py-2.5 text-[10px] font-extrabold">Open live route <ArrowRight className="inline w-3.5 h-3.5 ml-1" /></button>}</div></div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1 lg:mt-5 relative z-10"><div className="rounded-2xl lg:rounded-3xl bg-white lg:bg-[#0b1730] border border-zinc-200 lg:border-[#c5a059]/25 p-2 lg:p-3"><div className="flex items-center gap-2 px-2"><Search className="w-4 h-4 text-zinc-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for a service, trade or specialist" className="flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm text-zinc-900 lg:text-white placeholder:text-zinc-400" /><button onClick={() => setIsCategoryModalOpen(true)} className="hidden sm:flex px-3 py-2 rounded-xl bg-[#07122a] lg:bg-[#c5a059] text-white lg:text-black text-[10px] font-extrabold">Browse</button></div></div></section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
          <div className="flex items-end justify-between mb-3"><div><h2 className="text-lg sm:text-xl lg:text-2xl font-black text-zinc-950 lg:text-white">Services for every need</h2><p className="text-[11px] text-zinc-500 lg:text-zinc-400 mt-1">Tap a trade to open its full subcategory and pricing catalogue.</p></div><button onClick={() => setIsCategoryModalOpen(true)} className="text-[11px] font-bold text-[#8b5e16] lg:text-[#e9c176] flex items-center">All 50 <ChevronRight className="w-3.5 h-3.5" /></button></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 lg:gap-3">{filteredCategories.map((cat) => <button key={cat.id} onClick={() => chooseCategory(cat.name)} className="rounded-2xl bg-white lg:bg-[#0c1933] border border-zinc-200 lg:border-zinc-800 p-3 text-left shadow-sm lg:shadow-none"><div className="w-10 h-10 rounded-xl bg-[#07122a] text-[#e9c176] flex items-center justify-center"><CategoryIcon category={cat.name} className="w-5 h-5" /></div><div className="mt-2 text-[11px] font-extrabold text-zinc-900 lg:text-white line-clamp-2">{cat.name}</div><div className="mt-1 text-[9px] text-zinc-500 lg:text-zinc-400 line-clamp-2">{cat.shortDesc}</div></button>)}</div>
        </section>

        {hasActiveBooking && <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5"><button onClick={() => onTransition('tracking')} className="w-full rounded-2xl bg-gradient-to-r from-[#07122a] to-[#153d75] border border-[#c5a059]/30 text-white p-4 flex items-center gap-3 text-left"><div className="w-11 h-11 rounded-2xl bg-emerald-400/15 flex items-center justify-center"><Navigation className="w-5 h-5 text-emerald-300 animate-pulse" /></div><div className="min-w-0 flex-1"><div className="text-[9px] uppercase tracking-wider text-[#e9c176] font-bold">Live booking</div><div className="text-sm font-black truncate">{activeOrder?.category || 'Your specialist'} is being tracked in real time</div><div className="text-[10px] text-zinc-300">Open the live route for exact shared position and ETA.</div></div><ChevronRight className="w-5 h-5 text-[#e9c176]" /></button></section>}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 lg:pb-8"><div className="rounded-3xl overflow-hidden border border-zinc-200 lg:border-[#c5a059]/20 bg-white lg:bg-[#0b1730]"><div className="grid md:grid-cols-2"><div className="p-5 sm:p-7 lg:p-9 flex flex-col justify-center"><div className="inline-flex w-fit items-center gap-1.5 px-2 py-1 rounded-full bg-[#c5a059]/10 text-[#8b5e16] lg:text-[#e9c176] text-[8px] font-extrabold uppercase tracking-wider">In the spotlight</div><h3 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black text-zinc-950 lg:text-white">PunchX Smart Dispatch + Live Radar</h3><p className="mt-2 text-xs sm:text-sm text-zinc-500 lg:text-zinc-400">Choose the exact service item, book the specialist and keep their live location visible from departure to arrival.</p><button onClick={() => onTransition('providers')} className="mt-4 w-fit px-4 py-2.5 rounded-xl bg-[#07122a] lg:bg-[#c5a059] text-white lg:text-black text-[10px] font-extrabold">Explore specialists <ArrowRight className="inline w-3.5 h-3.5" /></button></div><div className="min-h-[180px] flex items-center justify-center p-8 bg-gradient-to-br from-[#111f3f] to-[#07122a]"><div className="w-full max-w-sm rounded-3xl bg-white/10 border border-white/10 p-5"><div className="flex items-center justify-between text-[10px] text-white"><span className="font-bold">PUNCHX LIVE RADAR</span><span className="flex items-center gap-1 text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Live</span></div><div className="mt-5 relative aspect-[1.6] rounded-2xl overflow-hidden bg-[#0c1833] border border-[#c5a059]/15"><div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,#c5a059_1px,transparent_1px)] [background-size:18px_18px]" /><motion.div animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.35, 0.65, 0.35] }} transition={{ duration: 2.8, repeat: Infinity }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-[#e9c176]/40" /><div className="absolute left-[30%] top-[56%] w-4 h-4 rounded-full bg-white" /><motion.div animate={{ x: [0, 65, 12, 0], y: [0, -18, 24, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-[45%] top-[45%] w-5 h-5 rounded-full bg-[#c5a059] flex items-center justify-center"><Navigation className="w-3 h-3 text-black" /></motion.div></div></div></div></div></div></section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-7 lg:pb-10"><div className="flex items-end justify-between mb-3"><div><h2 className="text-lg sm:text-xl lg:text-2xl font-black text-zinc-950 lg:text-white">Most booked services</h2><p className="text-[11px] text-zinc-500 lg:text-zinc-400 mt-1">Popular service items with clear starting prices.</p></div><button onClick={() => setIsCategoryModalOpen(true)} className="text-[11px] font-bold text-[#8b5e16] lg:text-[#e9c176]">See all</button></div><div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto lg:overflow-visible pb-2 no-scrollbar">{mostBooked.map((item) => <button key={item.id} onClick={() => chooseCategory(item.categoryName)} className="min-w-[220px] sm:min-w-[250px] lg:min-w-0 text-left rounded-2xl bg-white lg:bg-[#0c1933] border border-zinc-200 lg:border-zinc-800 overflow-hidden"><SafeImage src={item.image} alt={item.name} className="w-full h-32 sm:h-36 object-cover" /><div className="p-3.5"><div className="font-extrabold text-xs text-zinc-900 lg:text-white line-clamp-2">{item.name}</div><div className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-500"><Star className="w-3 h-3 fill-current" /> 4.8 • PunchX</div><div className="mt-2 flex items-end justify-between"><div><div className="text-[8px] text-zinc-400 uppercase">Starts at</div><div className="text-sm font-black text-zinc-950 lg:text-white">₹{item.price.toLocaleString('en-IN')}</div></div><span className="px-3 py-1.5 rounded-lg bg-zinc-50 lg:bg-[#07122a] border border-zinc-200 lg:border-zinc-700 text-[9px] font-extrabold text-[#8b5e16] lg:text-[#e9c176]">View</span></div></div></button>)}</div></section>

        {sectionGroups.map((group) => { const groupCategories = PUNCHX_50_CATEGORIES.filter((cat) => group.terms.some((term) => norm(cat.id).includes(term) || norm(cat.name).includes(term) || norm(cat.shortDesc).includes(term))).slice(0, 6); return <section key={group.title} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-7 lg:pb-10"><div className="flex items-center justify-between mb-3"><div><div className="flex items-center gap-2 text-[#8b5e16] lg:text-[#e9c176] text-[9px] font-extrabold uppercase tracking-wider">{group.icon}{group.title}</div><p className="text-[11px] text-zinc-500 lg:text-zinc-400 mt-1">{group.subtitle}</p></div><button onClick={() => setIsCategoryModalOpen(true)} className="text-[11px] font-bold text-[#8b5e16] lg:text-[#e9c176]">See all</button></div><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">{groupCategories.map((cat) => <button key={cat.id} onClick={() => chooseCategory(cat.name)} className="rounded-2xl bg-white lg:bg-[#0c1933] border border-zinc-200 lg:border-zinc-800 p-3 text-left"><div className="w-9 h-9 rounded-xl bg-zinc-100 lg:bg-[#07122a] text-[#8b5e16] lg:text-[#e9c176] flex items-center justify-center"><CategoryIcon category={cat.name} className="w-4 h-4" /></div><div className="mt-2 text-[10px] font-extrabold text-zinc-900 lg:text-white line-clamp-2">{cat.name}</div><div className="mt-1 text-[8px] text-zinc-500 lg:text-zinc-400 line-clamp-2">{cat.shortDesc}</div></button>)}</div></section>; })}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-7 lg:pb-10"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[['Verified specialists', 'Identity and background checked', ShieldCheck], ['30-day guarantee', 'Protection on eligible completed services', ClipboardList], ['Secure checkout', 'Clear pricing before payment', Gift], ['Drago AI support', 'Help with booking and service questions', Sparkles]].map(([title, subtitle, Icon]) => <div key={title as string} className="rounded-2xl bg-white lg:bg-[#0c1933] border border-zinc-200 lg:border-zinc-800 p-4"><Icon className="w-4 h-4 text-[#c5a059]" /><div className="mt-2 text-xs font-black text-zinc-900 lg:text-white">{title as string}</div><div className="mt-1 text-[9px] text-zinc-500 lg:text-zinc-400">{subtitle as string}</div></div>)}</div></section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 lg:pb-12"><button onClick={() => setShowReferral((v) => !v)} className="w-full rounded-3xl bg-gradient-to-r from-[#edf3ff] to-white lg:from-[#101f3d] lg:to-[#0c1933] border border-zinc-200 lg:border-[#c5a059]/20 p-5 text-left flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-[#c5a059]/12 text-[#8b5e16] lg:text-[#e9c176] flex items-center justify-center"><Gift className="w-6 h-6" /></div><div className="flex-1 min-w-0"><div className="text-[9px] uppercase tracking-wider font-extrabold text-[#8b5e16] lg:text-[#e9c176]">Refer & Earn</div><div className="mt-1 text-base font-black text-zinc-900 lg:text-white">Invite friends to discover PunchX</div><div className="text-[10px] text-zinc-500 lg:text-zinc-400 mt-1">Share a referral link. Reward rules can be configured from your admin portal.</div></div><ChevronRight className="w-5 h-5 text-zinc-400" /></button><AnimatePresence>{showReferral && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-2 rounded-2xl bg-white lg:bg-[#0b1730] border border-zinc-200 lg:border-[#c5a059]/20 p-4"><div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">Your share link</div><div className="mt-2 rounded-xl bg-zinc-50 lg:bg-[#07122a] border border-zinc-200 lg:border-zinc-800 p-3 text-[10px] break-all text-zinc-700 lg:text-zinc-300">{referralLink}</div><div className="mt-3 flex flex-wrap gap-2"><button onClick={(e) => { e.stopPropagation(); shareReferral(); }} className="px-4 py-2 rounded-xl bg-[#07122a] lg:bg-[#c5a059] text-white lg:text-black text-[10px] font-extrabold">Copy link</button><a href={'https://wa.me/?text=' + encodeURIComponent('Try PunchX services: ' + referralLink)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 rounded-xl border border-zinc-200 lg:border-zinc-700 text-[10px] font-extrabold text-zinc-800 lg:text-white">WhatsApp</a></div></div></motion.div>}</AnimatePresence></section>
      </main>

      <footer className="hidden lg:block border-t border-[#c5a059]/20 bg-[#050d1d]"><div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-3 gap-8"><div><div className="text-lg font-black text-white">PUNCH<span className="text-[#c5a059]">X</span></div><p className="mt-2 text-xs text-zinc-400 max-w-sm">Citizen-first marketplace connecting users with verified independent professionals.</p></div><div><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">Quick access</div><div className="mt-3 space-y-2 text-xs text-zinc-400"><button onClick={() => setIsCategoryModalOpen(true)}>Browse 50 services</button><button onClick={() => onTransition('providers')}>Find specialists</button><button onClick={() => onTransition('tracking')}>Live tracking</button></div></div><div><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">Support</div><div className="mt-3 space-y-2 text-xs text-zinc-400"><div>24/7 priority support</div><div>Transparent starting prices</div><div>Verified service marketplace</div></div></div></div></footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-zinc-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}><div className="grid grid-cols-5 gap-1 max-w-2xl mx-auto">{[['home', Home, 'Home'], ['services', Grid2X2, 'Services'], ['tracking', Navigation, 'Track'], ['bookings', ClipboardList, 'Bookings'], ['profile', User, 'Profile']].map(([key, Icon, label]) => <button key={key as string} onClick={() => openTab(key as typeof activeTab)} className="flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-bold"><div className={'w-8 h-8 rounded-xl flex items-center justify-center ' + (activeTab === key ? 'bg-[#07122a] text-[#e9c176]' : 'text-zinc-400')}><Icon className="w-4 h-4" /></div><span className={activeTab === key ? 'text-[#07122a]' : 'text-zinc-400'}>{label as string}</span></button>)}</div></nav>

      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="citizen"
        selectedCategory=""
        onSelectCategory={(categoryName) => { onSelectCategory(categoryName); setIsCategoryModalOpen(false); onTransition('providers'); }}
      />
    </div>
  );
}
