import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Loader2, MapPin, Search, ShieldCheck, UserRound } from 'lucide-react';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import { serviceCategories } from '../data/serviceCatalogs';
import PUNCHX_LOGO from '../assets/logo';
import { getAccurateCurrentPosition, reverseGeocodeCoords } from '../lib/location';

interface Props {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: Worker) => void;
  onSelectCategory: (category: string) => void;
  citizenName: string;
  citizenAddress: string;
  onOpenProfile?: () => void;
}

const LOCATION_STORAGE_KEY = 'punchx_user_location';

export default function SimpleCustomerHome({ onTransition, onSelectCategory, citizenName, citizenAddress, onOpenProfile }: Props) {
  const [query, setQuery] = useState('');
  const [areaName, setAreaName] = useState('Choose your location');
  const [areaAddress, setAreaAddress] = useState(citizenAddress || '');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const categories = useMemo(() => PUNCHX_50_CATEGORIES.filter(item =>
    `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())
  ), [query]);

  useEffect(() => {
    let cancelled = false;
    const refreshLocation = async () => {
      if (!navigator.geolocation) return;
      setLocationLoading(true);
      setLocationMessage('Updating service area…');
      try {
        const coords = await getAccurateCurrentPosition(true);
        const resolved = await reverseGeocodeCoords(coords.lat, coords.lng);
        if (cancelled) return;
        const nextArea = resolved.area || resolved.city || 'Local Area';
        setAreaName(nextArea);
        setAreaAddress(resolved.address || citizenAddress || '');
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: coords.lat, lng: coords.lng, area: nextArea, address: resolved.address, city: resolved.city, sector: resolved.sector, timestamp: new Date().toISOString() }));
        setLocationMessage('Service area updated');
      } catch {
        if (cancelled) return;
        try {
          const cached = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || '{}');
          if (cached.area) setAreaName(String(cached.area));
          if (cached.address) setAreaAddress(String(cached.address));
        } catch {}
        setLocationMessage('Choose your service location to continue.');
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    };
    refreshLocation();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshLocation(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [citizenAddress]);

  const openCategory = (name: string) => {
    onSelectCategory(name);
    onTransition('providers');
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-24 text-[#0f172a]">
      <header className="sticky top-0 z-40 border-b border-[#dbe6f7] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
          <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-xl font-black tracking-tight">PUNCHX</span>
          <button type="button" onClick={() => onTransition('customer-setup')} className="ml-1 flex min-w-0 max-w-[55%] items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-[#eef4ff]">
            <MapPin className="h-4 w-4 shrink-0 text-[#2563eb]" />
            <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Service area</span><span className="block truncate text-xs font-black">{areaName}</span></span>
            {locationLoading && <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />}
          </button>
          <button onClick={onOpenProfile} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-[#eef4ff] px-3" aria-label="Profile"><UserRound className="h-4 w-4 text-[#213145]" /><span className="hidden max-w-28 truncate text-xs font-bold sm:block">{citizenName || 'Profile'}</span></button>
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-2 border-t border-[#edf2f8] px-4 py-2 sm:px-6"><MapPin className="h-3.5 w-3.5 text-[#2563eb]" /><span className="truncate text-[11px] font-semibold text-[#64748b]">{areaAddress || citizenAddress || 'Location is used for service-area matching.'}</span><span className="ml-auto text-[10px] font-bold text-[#2563eb]">{locationMessage}</span></div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="pt-5">
          <div className="rounded-[28px] bg-[#213145] p-6 text-white shadow-lg sm:p-9">
            <div className="flex items-center gap-2 text-xs font-bold text-white/75"><ShieldCheck className="h-4 w-4 text-[#38bdf8]" /> Local service professionals</div>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Find local help for everyday home services.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Explore service categories and review the details available before booking.</p>
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white p-2"><Search className="ml-2 h-5 w-5 text-[#64748b]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search AC repair, fan, tap, cleaning..." className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-semibold text-[#0f172a] outline-none" /><button onClick={() => onTransition('providers')} className="rounded-xl bg-[#2563eb] px-4 py-3 text-xs font-black text-white">Browse</button></div>
          </div>
        </section>

        <section className="pt-7">
          <div className="flex items-end justify-between"><div><div className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2563eb]">Complete catalogue</div><h2 className="mt-1 text-2xl font-black">All 50 services</h2><p className="mt-1 text-xs text-[#64748b]">Main service → facility → exact work → available professional</p></div><span className="text-xs font-bold text-[#2563eb]">{categories.length} shown</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map(category => {
              const catalog = serviceCategories.find(item => item.id === category.id);
              return (
                <button key={category.id} type="button" onClick={() => openCategory(category.name)} className="group overflow-hidden rounded-2xl border border-[#dbe6f7] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563eb]/40 hover:shadow-lg">
                  <div className="relative h-32 overflow-hidden bg-[#eaf2ff] sm:h-36"><img src={catalog?.image} alt={`${category.name} service`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f172a]/85 to-transparent p-3 pt-10"><span className="text-[9px] font-bold uppercase tracking-wider text-[#bfdbfe]">PUNCHX SERVICE</span></div></div>
                  <div className="p-3"><div className="text-sm font-black">{category.name}</div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#64748b]">{category.shortDesc}</p><div className="mt-3 flex items-center justify-between text-[10px] font-extrabold text-[#2563eb]"><span>Open services</span><ArrowRight className="h-3.5 w-3.5" /></div></div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="py-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f7]"><ShieldCheck className="h-5 w-5 text-[#2563eb]" /><h3 className="mt-3 font-black">Visual service catalogue</h3><p className="mt-1 text-xs leading-5 text-[#64748b]">Main categories, facilities and exact work use relevant service imagery.</p></div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f7]"><CalendarDays className="h-5 w-5 text-[#2563eb]" /><h3 className="mt-3 font-black">Availability after exact work</h3><p className="mt-1 text-xs leading-5 text-[#64748b]">PUNCHX checks professional availability only after the customer chooses the exact service.</p></div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f7]"><CheckCircle2 className="h-5 w-5 text-[#2563eb]" /><h3 className="mt-3 font-black">Clear booking path</h3><p className="mt-1 text-xs leading-5 text-[#64748b]">Exact service → professionals → date/time → residential address → payment.</p></div>
        </section>
      </main>
    </div>
  );
}
