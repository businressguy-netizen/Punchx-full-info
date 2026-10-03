import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Home as HomeIcon, Loader2, MapPin, Search, ShieldCheck, UserRound, Wrench, X } from 'lucide-react';
import { motion } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import { getCatalogCategory } from '../data/serviceCatalogs';
import PUNCHX_LOGO from '../assets/logo';
import { getAccurateCurrentPosition, reverseGeocodeCoords } from '../lib/location';

interface Props { onTransition:(target:AppScreen)=>void; onSelectWorker:(worker:Worker)=>void; onSelectCategory:(category:string)=>void; citizenName:string; citizenAddress:string; onOpenProfile?:()=>void; }

const FEATURED=['Electrician','Plumber','Carpenter','AC Technician','Cleaner/Housekeeper','Painter','Locksmith','Computer/Laptop Technician'];
const QUICK=['Home Cleaning','Electrician','Plumber','AC Technician','Carpenter','Pest Control Worker','Painter','Beauty'];

export default function CitizenHomeCatalog({onTransition,onSelectCategory,citizenName,citizenAddress,onOpenProfile}:Props){
  const [query,setQuery]=useState('');
  const [area,setArea]=useState('Kolkata');
  const [areaAddress,setAreaAddress]=useState(citizenAddress||'');
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [slide,setSlide]=useState(0);

  const matches=useMemo(()=>{const q=query.trim().toLowerCase();return PUNCHX_50_CATEGORIES.filter(c=>!q||`${c.name} ${c.shortDesc} ${c.keywords.join(' ')}`.toLowerCase().includes(q));},[query]);

  useEffect(()=>{try{const saved=localStorage.getItem('punchx_user_location');if(saved){const data=JSON.parse(saved);setArea(data.area||data.city||'Kolkata');setAreaAddress(data.address||citizenAddress||'');}}catch{}},[citizenAddress]);
  useEffect(()=>{const timer=window.setInterval(()=>setSlide(s=>s===2?0:s+1),5000);return()=>window.clearInterval(timer);},[]);

  const refreshLocation=async()=>{
    if(!navigator.geolocation){setMessage('Location is not supported on this device.');return;}
    setLoading(true);setMessage('');
    try{const p=await getAccurateCurrentPosition(true);const r=await reverseGeocodeCoords(p.lat,p.lng);const next=r.city||r.area||'Kolkata';setArea(next);setAreaAddress(r.address||'');localStorage.setItem('punchx_user_location',JSON.stringify({lat:p.lat,lng:p.lng,area:next,address:r.address,city:r.city,timestamp:new Date().toISOString()}));setMessage('Location updated');}
    catch{setMessage('Please choose your service location.');}
    finally{setLoading(false);}
  };

  const openCategory=(name:string)=>{setSearchOpen(false);setQuery('');onSelectCategory(name);onTransition('providers');};
  const findCategory=(name:string)=>PUNCHX_50_CATEGORIES.find(c=>c.name.toLowerCase()===name.toLowerCase())||PUNCHX_50_CATEGORIES.find(c=>c.name.toLowerCase().includes(name.toLowerCase()));
  const bannerCategory=findCategory(FEATURED[slide])||PUNCHX_50_CATEGORIES[0];
  const bannerCatalog=bannerCategory?getCatalogCategory(bannerCategory.id):undefined;

  return <div className="punchx-citizen-shell min-h-screen bg-[#f7f7f8] pb-24 text-[#171717]">
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <img src={PUNCHX_LOGO} alt="PUNCHX" className="h-10 w-10 rounded-full border border-[#dbeafe] object-cover"/>
        <button onClick={()=>onTransition('customer-setup')} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#737373]"><MapPin className="h-3.5 w-3.5 text-[#2563eb]"/> Delivering to</span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-sm font-extrabold">{area}<ChevronDown className="h-4 w-4 shrink-0 text-[#737373]"/></span>
          <span className="block truncate text-[10px] text-[#737373]">{areaAddress||'Choose your service location'}</span>
        </button>
        {loading&&<Loader2 className="h-5 w-5 animate-spin text-[#2563eb]"/>}
        <button aria-label="Notifications" onClick={()=>onTransition('notifications')} className="hidden h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white sm:flex"><Bell className="h-5 w-5"/></button>
        <button aria-label="Profile" onClick={onOpenProfile} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f5f9]"><UserRound className="h-5 w-5"/></button>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6"><button onClick={()=>{setSearchOpen(true);setQuery('');}} className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f6] px-4 py-3.5 text-left shadow-sm"><Search className="h-5 w-5 text-[#525252]"/><span className="text-sm text-[#737373]">Search for a service, e.g. electrician or AC repair</span></button></div>
    </header>

    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="pt-4">
        <div className="relative min-h-[190px] overflow-hidden rounded-[26px] bg-gradient-to-r from-[#edf4ff] via-[#dbeafe] to-[#eff6ff] shadow-sm sm:min-h-[230px]">
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/45 to-transparent"/>
          <div className="relative z-10 max-w-[72%] p-5 sm:max-w-[58%] sm:p-8">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#2563eb]"><ShieldCheck className="h-3.5 w-3.5"/> Trusted local service</span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">Reliable help at your doorstep.</h1>
            <p className="mt-2 text-xs leading-5 text-[#525252] sm:text-sm">Book verified professionals for home services, repairs and everyday needs.</p>
            <button onClick={()=>openCategory(bannerCategory?.name||'Electrician')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-200">Book now <ArrowRight className="h-4 w-4"/></button>
          </div>
          {bannerCatalog?.image&&<motion.img key={bannerCategory?.id} src={bannerCatalog.image} alt={bannerCategory?.name||'PunchX service'} className="absolute bottom-0 right-0 h-[94%] w-[42%] object-cover object-center mix-blend-multiply opacity-90 sm:w-[38%]" initial={{opacity:0,x:25}} animate={{opacity:.9,x:0}} transition={{duration:.4}}/>}
          <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5"><button aria-label="Previous banner" onClick={()=>setSlide(s=>s===0?2:s-1)} className="hidden h-7 w-7 items-center justify-center rounded-full bg-white/80 sm:flex"><ChevronLeft className="h-4 w-4"/></button>{[0,1,2].map(i=><button key={i} aria-label={`Banner ${i+1}`} onClick={()=>setSlide(i)} className={`h-1.5 rounded-full transition-all ${i===slide?'w-6 bg-[#2563eb]':'w-1.5 bg-white/80'}`}/>) }<button aria-label="Next banner" onClick={()=>setSlide(s=>s===2?0:s+1)} className="hidden h-7 w-7 items-center justify-center rounded-full bg-white/80 sm:flex"><ChevronRight className="h-4 w-4"/></button></div>
        </div>
      </section>

      <section className="pt-7">
        <div className="flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#737373]">Explore</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Services you may need</h2></div><button onClick={()=>{setSearchOpen(true);setQuery('');}} className="text-xs font-extrabold text-[#2563eb]">See all</button></div>
        <div className="mt-4 grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">{FEATURED.map((name,index)=>{const c=findCategory(name);const catalog=c?getCatalogCategory(c.id):undefined;return <motion.button key={name} onClick={()=>openCategory(c?.name||name)} whileTap={{scale:.97}} className="group min-w-0 text-center"><div className="mx-auto aspect-square max-w-[92px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"><img src={catalog?.image} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading={index<4?'eager':'lazy'}/></div><div className="mt-2 line-clamp-2 text-[11px] font-bold leading-4 sm:text-xs">{name}</div></motion.button>})}</div>
      </section>

      <section className="pt-8">
        <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff]"><MapPin className="h-5 w-5 text-[#2563eb]"/></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">Service location</p><p className="truncate text-sm font-black">{areaAddress||area}</p></div><button onClick={refreshLocation} className="rounded-xl bg-[#f1f5f9] px-3 py-2 text-[10px] font-black">Use current</button></div>{message&&<p className="mt-2 text-[10px] font-semibold text-[#2563eb]">{message}</p>}</div>
      </section>

      <section className="pt-8">
        <div className="flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#737373]">Popular near you</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Book a professional</h2></div><button onClick={()=>{setQuery('');setSearchOpen(true);}} className="text-xs font-extrabold text-[#2563eb]">Browse all</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{QUICK.slice(0,4).map(name=>{const c=findCategory(name);const catalog=c?getCatalogCategory(c.id):undefined;return <button key={name} onClick={()=>openCategory(c?.name||name)} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f5]"><img src={catalog?.image} alt={name} className="h-full w-full object-cover"/></div><div className="min-w-0"><p className="truncate text-sm font-black">{name}</p><p className="mt-1 text-[10px] text-[#737373]">Verified professionals</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#2563eb]">Book <ArrowRight className="h-3 w-3"/></span></div></button>})}</div>
      </section>

      <section className="py-8"><div className="flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#737373]">Why PunchX</p><h2 className="mt-1 text-xl font-black">Built for a safer booking</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"><ShieldCheck className="h-5 w-5 text-[#2563eb]"/><h3 className="mt-3 text-sm font-black">Verified professionals</h3><p className="mt-1 text-xs leading-5 text-[#737373]">Professional profiles and verification are part of the marketplace flow.</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"><CalendarDays className="h-5 w-5 text-[#2563eb]"/><h3 className="mt-3 text-sm font-black">Choose when it works</h3><p className="mt-1 text-xs leading-5 text-[#737373]">Select the exact service and available time before confirming.</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"><Wrench className="h-5 w-5 text-[#2563eb]"/><h3 className="mt-3 text-sm font-black">One place for local help</h3><p className="mt-1 text-xs leading-5 text-[#737373]">Repairs, cleaning, maintenance and everyday professional services.</p></div></div></section>
    </main>

    {searchOpen&&<div className="fixed inset-0 z-[130] bg-[#0f172a]/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e=>{if(e.currentTarget===e.target)setSearchOpen(false)}}><div className="mx-auto mt-8 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl sm:mt-12"><div className="flex items-center gap-3 border-b border-black/5 p-4 sm:p-5"><Search className="h-5 w-5 text-[#2563eb]"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for a service..." className="min-w-0 flex-1 text-sm font-semibold outline-none"/><span className="hidden rounded-full bg-[#eff6ff] px-3 py-1 text-[10px] font-black text-[#2563eb] sm:block">{matches.length} results</span><button aria-label="Close search" onClick={()=>setSearchOpen(false)} className="rounded-full bg-[#f1f5f9] p-2"><X className="h-5 w-5"/></button></div><div className="overflow-y-auto p-4 sm:p-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{matches.map(cat=>{const c=getCatalogCategory(cat.id);return <button key={cat.id} onClick={()=>openCategory(cat.name)} className="overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><img src={c?.image} alt={cat.name} className="h-24 w-full bg-[#f5f5f5] object-cover" loading="lazy"/><div className="p-3"><div className="text-sm font-black">{cat.name}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#737373]">{cat.shortDesc}</div><div className="mt-2 flex items-center gap-1 text-[10px] font-black text-[#2563eb]">View services <ArrowRight className="h-3 w-3"/></div></div></button>})}</div>{!matches.length&&<div className="py-16 text-center text-sm font-semibold text-[#737373]">No service found. Try electrician, plumber, cleaning or AC.</div>}</div></div></div>}
  </div>;
}
