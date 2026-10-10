import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, MapPin, Search, ShieldCheck, ShoppingCart, Star, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES, isCategoryMatching } from '../data/categories';
import { getCatalogCategory, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';
import { DEMO_PROFESSIONALS } from '../data/demoProfessionals';
import { calculateDistanceKm, getServiceRadiusKm, isSameServiceCity } from '../lib/location';
import { fetchApprovedProfessionals } from '../services/professionalDirectory';

interface ProvidersListProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker: (worker: Worker) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  citizenName: string;
  setCitizenName: (name: string) => void;
  citizenAddress: string;
  setCitizenAddress: (addr: string) => void;
}

type CartItem = { id: string; serviceId: string; serviceName: string; category: string; subcategory: string; description: string; price: number; duration?: string; image?: string; bookingTiming?: 'instant'|'later' };
const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PROFESSIONALS === 'true';
const norm = (value?: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const readCart = (): CartItem[] => { try { const v = JSON.parse(localStorage.getItem('punchx_cart') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

export default function ProvidersList({ onTransition, selectedCategory, onSelectCategory, onSelectWorker, showNotification }: ProvidersListProps) {
  const initial = getCatalogCategory(selectedCategory || '');
  const [step, setStep] = useState<'categories' | 'subcategories' | 'services'>(initial ? 'subcategories' : 'categories');
  const [category, setCategory] = useState<ServiceCategory | null>(initial || null);
  const [subcategory, setSubcategory] = useState<ServicesSubcategory | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [matchingWorkers, setMatchingWorkers] = useState<Worker[]>([]);
  const [checking, setChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [available, setAvailable] = useState(false);
  const [bookingTiming, setBookingTiming] = useState<'instant'|'later'>('instant');
  const [geo] = useState<{lat:number;lng:number;area?:string;city?:string}|null>(() => { try { const v=JSON.parse(localStorage.getItem('punchx_user_location')||'null'); return v&&typeof v.lat==='number'&&typeof v.lng==='number'?v:null; } catch { return null; } });
  const serviceRadiusKm = getServiceRadiusKm(geo?.city || geo?.area);

  useEffect(() => {
    let active = true;
    void fetchApprovedProfessionals().then(approved => {
      if (!active) return;
      setWorkers(DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...approved] : approved);
    }).catch(() => {
      if (active) setWorkers(DEMO_ENABLED ? DEMO_PROFESSIONALS : []);
    });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => { const q=norm(search); return PUNCHX_50_CATEGORIES.filter(c => !q || norm(`${c.name} ${c.shortDesc} ${c.keywords.join(' ')}`).includes(q)); }, [search]);
  const subs = useMemo(() => { if(!category)return[]; const q=norm(search); return category.subcategories.filter(s => !q || norm(`${s.name} ${s.description} ${s.items.map(i=>i.name).join(' ')}`).includes(q)); }, [category,search]);
  const services = useMemo(() => { if(!subcategory)return[]; const q=norm(search); return subcategory.items.filter(i => !q || norm(`${i.name} ${i.description}`).includes(q)); }, [subcategory,search]);

  const chooseCategory = (value: ServiceCategory) => { setCategory(value); setSubcategory(null); setSelectedService(null); setAvailable(false); setMatchingWorkers([]); setAvailabilityMessage(''); setSearch(''); setStep('subcategories'); onSelectCategory?.(value.name); };
  const chooseSubcategory = (value: ServicesSubcategory) => { setSubcategory(value); setSelectedService(null); setAvailable(false); setMatchingWorkers([]); setAvailabilityMessage(''); setSearch(''); setStep('services'); };

  const checkAvailability = async (service: ServiceItem) => {
    setSelectedService(service); setChecking(true); setAvailable(false); setMatchingWorkers([]); setAvailabilityMessage('Checking verified professionals in your service area…');
    try {
      const freshWorkers = await fetchApprovedProfessionals();
      setWorkers(DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...freshWorkers] : freshWorkers);
      const sourceWorkers = DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...freshWorkers] : freshWorkers;
      const found = sourceWorkers.filter(worker => {
        if (worker.available === false || !category) return false;
        if (!isCategoryMatching(worker.categories || worker.category, category.name) && !isCategoryMatching(worker.categories || worker.category, category.id)) return false;
        if (bookingTiming === 'instant' && worker.isOnline !== true) return false;
        if (geo && worker.location) return calculateDistanceKm(geo.lat, geo.lng, worker.location.lat, worker.location.lng) <= serviceRadiusKm;
        if (typeof worker.distanceKm === 'number') return worker.distanceKm <= serviceRadiusKm;
        const workerCity = String((worker as any).city || worker.address || worker.area || worker.sector || '');
        return Boolean(geo?.city && isSameServiceCity(geo.city, workerCity));
      });
      setMatchingWorkers(found); setAvailable(found.length > 0); setAvailabilityMessage(found.length ? `${found.length} verified professional${found.length===1?'':'s'} available` : 'No registered professional is currently available in your service zone.');
    } catch (error) {
      setAvailabilityMessage('Professional availability could not be verified right now.');
    } finally {
      setChecking(false);
    }
  };

  const addToCart = () => {
    if (!category || !subcategory || !selectedService || !available) return;
    const item: CartItem = { id:`${selectedService.id}-${Date.now()}`, serviceId:selectedService.id, serviceName:selectedService.name, category:category.name, subcategory:subcategory.name, description:selectedService.description, price:selectedService.price, duration:selectedService.duration, image:selectedService.image, bookingTiming };
    const next=[...cart,item]; setCart(next); localStorage.setItem('punchx_cart',JSON.stringify(next)); showNotification(`✓ ${selectedService.name} added to cart.`);
  };

  const back = () => { if(step==='categories') onTransition('home'); else if(step==='subcategories'){setStep('categories');setCategory(null);} else {setStep('subcategories');setSubcategory(null);setSelectedService(null);setAvailable(false);setMatchingWorkers([]);} setSearch(''); };

  return <div id="providers-list-root" className="min-h-screen bg-[#f7faff] pb-32 text-[#0f172a]">
    <header className="sticky top-0 z-40 border-b border-[#dbeafe] bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-6"><button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe] bg-white"><ArrowLeft className="h-5 w-5"/></button><div className="min-w-0 flex-1"><div className="truncate text-lg font-black">{category?.name||'PUNCHX Services'}</div><div className="flex items-center gap-1 text-[10px] text-[#64748b]"><MapPin className="h-3 w-3 text-[#2563eb]"/>{geo?.area||'Service area'} · {serviceRadiusKm} km service zone</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe] bg-[#eef6ff]"><Search className="h-4 w-4 text-[#2563eb]"/></div></div></header>
    <main className="punchx-citizen-main mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5"><div className="mb-3 flex items-center gap-2 rounded-2xl border border-[#dbeafe] bg-white px-3 py-3 shadow-sm"><Search className="h-4 w-4 text-[#64748b]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={step==='categories'?'Search all 50 services':`Search ${category?.name||'services'}`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/>{search&&<button onClick={()=>setSearch('')}><X className="h-4 w-4"/></button>}</div>
      {step==='categories'&&<><div className="mb-4 rounded-3xl bg-gradient-to-br from-[#0f2b55] via-[#173e78] to-[#2563eb] p-5 text-white shadow-xl"><div className="text-[10px] font-black uppercase tracking-[.18em] text-[#bfdbfe]">Complete catalogue</div><h1 className="mt-1 text-3xl font-black">All 50 services</h1><p className="mt-1 text-xs text-white/75">Main service → facility → exact work → availability → cart.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{categories.map(cat=>{const c=getCatalogCategory(cat.id);return <motion.button key={cat.id} onClick={()=>c&&chooseCategory(c)} whileHover={{y:-3}} className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-white text-left shadow-sm"><img src={c?.image} alt={cat.name} className="h-28 w-full object-cover bg-[#eef6ff]"/><div className="p-3"><div className="text-sm font-black">{cat.name}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#64748b]">{cat.shortDesc}</div><div className="mt-2 text-[10px] font-black text-[#2563eb]">Open services <ArrowRight className="inline h-3 w-3"/></div></div></motion.button>})}</div></>}
      {step==='subcategories'&&category&&<><div className="mb-3 rounded-3xl bg-white p-5 ring-1 ring-[#dbeafe] shadow-sm"><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563eb]">{category.name}</div><h1 className="mt-1 text-2xl font-black">Choose the facility</h1><p className="mt-1 text-xs text-[#64748b]">Fan, bulb, doorbell, switch & socket and every other facility available for this category.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subs.map(sub=><motion.button key={sub.id} onClick={()=>chooseSubcategory(sub)} whileHover={{y:-2}} className="flex gap-3 rounded-2xl border border-[#dbeafe] bg-white p-3 text-left shadow-sm"><img src={sub.image} alt={sub.name} className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#eef6ff]"/><div className="min-w-0"><div className="font-black">{sub.name}</div><div className="mt-1 text-[11px] leading-4 text-[#64748b]">{sub.description}</div><div className="mt-2 text-[10px] font-black text-[#2563eb]">{sub.items.length} works <ChevronRight className="inline h-3 w-3"/></div></div></motion.button>)}</div></>}
      {step==='services'&&category&&subcategory&&<>
        <section className="mb-3 rounded-2xl border border-[#dbeafe] bg-white p-3 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563eb]">Booking type</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>{setBookingTiming('instant');setMatchingWorkers([]);setAvailable(false);}} className={`rounded-xl border p-3 text-left ${bookingTiming==='instant'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe] bg-white'}`}>
              <div className="text-xs font-black">Instant / SOS</div>
              <div className="mt-1 text-[10px] text-[#64748b]">Show only professionals who are online now.</div>
            </button>
            <button type="button" onClick={()=>{setBookingTiming('later');setMatchingWorkers([]);setAvailable(false);}} className={`rounded-xl border p-3 text-left ${bookingTiming==='later'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe] bg-white'}`}>
              <div className="text-xs font-black">Book for later</div>
              <div className="mt-1 text-[10px] text-[#64748b]">Show registered professionals inside your service zone.</div>
            </button>
          </div>
        </section>
        <div className="mb-3 flex items-center gap-1 text-xs text-[#64748b]"><span>{category.name}</span><ChevronRight className="h-3 w-3"/><span className="font-black text-[#0f172a]">{subcategory.name}</span></div><section className="mb-3 rounded-3xl bg-white p-4 ring-1 ring-[#dbeafe] shadow-sm"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black">{category.name}</h1></div><div className="rounded-xl bg-[#eaf3ff] px-3 py-2 text-right"><div className="text-[9px] font-black text-[#2563eb]">EARLIEST</div><div className="text-xs font-black">Wed, 8:00 AM</div></div></div><div className="mt-3 flex items-center gap-2 rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3"><ShieldCheck className="h-5 w-5 text-[#2563eb]"/><div><div className="text-xs font-black">Verified PUNCHX professionals</div><div className="text-[10px] text-[#64748b]">Availability is checked only after an exact work is selected.</div></div></div></section><div className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-white">{services.map(item=><article key={item.id} className="border-b border-[#e5eefb] p-4 last:border-b-0"><div className="flex gap-4"><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><h3 className="text-base font-black leading-5">{item.name}</h3>{item.popular&&<span className="rounded-full bg-[#eaf3ff] px-2 py-1 text-[9px] font-black text-[#2563eb]">Popular</span>}</div><div className="mt-1 text-sm font-black">₹{item.price.toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-[#64748b]">{item.duration}</div><p className="mt-2 text-[11px] leading-5 text-[#64748b]">{item.description}</p><button onClick={()=>checkAvailability(item)} className="mt-3 rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs font-black text-white">{selectedService?.id===item.id&&checking?'Checking…':'Select work'}</button></div></div>{selectedService?.id===item.id&&<div className="mt-4 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-3">{checking?<div className="flex items-center gap-2 text-sm font-bold text-[#2563eb]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#93c5fd] border-t-[#2563eb]"/>Checking nearby professionals…</div>:available?<><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black text-[#0f7a4a]">{availabilityMessage}</div><div className="text-[10px] text-[#64748b]">Instant shows online professionals; later bookings can use any registered professional in the service zone.</div></div><CheckCircle2 className="h-6 w-6 text-[#16a34a]"/></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{matchingWorkers.slice(0,4).map(worker=><button key={worker.id} onClick={()=>{onSelectWorker(worker);localStorage.setItem('punchx_cart_selected_worker',JSON.stringify(worker));}} className="min-w-[155px] rounded-xl border border-[#dbeafe] bg-white p-2 text-left"><div className="flex items-center gap-2"><img src={worker.avatar||'/placeholder.svg'} alt="" className="h-9 w-9 rounded-full object-cover bg-[#eef6ff]"/><div className="min-w-0"><div className="truncate text-xs font-black">{worker.name}</div><div className="text-[9px] text-[#64748b]">★ {worker.rating.toFixed(1)} · {bookingTiming==='instant'?'Online now':'Registered in zone'}</div></div></div></button>)}</div><button onClick={addToCart} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-xs font-black text-white"><ShoppingCart className="h-4 w-4"/> Add to cart · ₹{item.price.toLocaleString('en-IN')}</button></>:<div className="rounded-xl bg-[#fff7ed] p-3 text-sm font-black text-[#c2410c]">{availabilityMessage}</div>}</div>}</article>)}</div></>}
    </main>
    {cart.length>0&&<div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#dbeafe] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(37,99,235,.12)] backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf3ff] text-[#2563eb]"><ShoppingCart className="h-5 w-5"/></div><div className="min-w-0"><div className="truncate text-sm font-black">{cart.length} booking{cart.length===1?'':'s'} in cart</div><div className="truncate text-[10px] text-[#64748b]">₹{cart.reduce((sum,item)=>sum+item.price,0).toLocaleString('en-IN')} service value</div></div></div><button onClick={()=>onTransition('booking')} className="rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-black text-white">View cart <ArrowRight className="ml-1 inline h-4 w-4"/></button></div></div>}
  </div>;
}
