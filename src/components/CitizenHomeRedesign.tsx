import React, { useMemo, useState } from 'react';
import {
  ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, Copy,
  Gift, Grid2X2, MapPin, Menu, Navigation2, Search, ShieldCheck,
  Sparkles, Star, Tag, UserRound, Wrench, X, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import PUNCHX_LOGO from '../assets/logo';

interface CitizenHomeRedesignProps {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: Worker) => void;
  onSelectCategory: (category: string) => void;
  citizenName: string;
  citizenAddress: string;
  showNotification: (message: string) => void;
  onOpenNotificationCenter?: () => void;
  onOpenProfile?: () => void;
}

const serviceImages: Record<string, string> = {
  Electrician:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=85',
  Plumber:'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=85',
  Carpenter:'https://images.unsplash.com/photo-1601058268499-e52658b5b3e5?auto=format&fit=crop&w=900&q=85',
  Painter:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=85',
  Mason:'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85',
  Welder:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=900&q=85',
  Barber:'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85',
  'Hair Stylist':'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85',
  Beautician:'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85',
  Tailor:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=85',
  Mechanic:'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=900&q=85',
  'Bike Mechanic':'https://images.unsplash.com/photo-1530046339918-7e7c4ea7f4ad?auto=format&fit=crop&w=900&q=85',
  'Car Mechanic':'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=900&q=85',
  'AC Technician':'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=85',
  'Refrigerator Technician':'https://images.unsplash.com/photo-1571175443880-49e1dca6f7e4?auto=format&fit=crop&w=900&q=85',
  'Washing Machine Technician':'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=85',
  'Mobile Repair Technician':'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85',
  'Computer/Laptop Technician':'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
  'Electronics Repair Technician':'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
  'CCTV Technician':'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=900&q=85',
  'Solar Technician':'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=900&q=85',
  'RO/Water Purifier Technician':'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=85',
  'Cleaner/Housekeeper':'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85',
  'Pest Control Worker':'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=900&q=85',
  Gardener:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=85',
  Cook:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=85',
  Baker:'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=900&q=85',
  Caterer:'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=85',
  'Tiffin/Home Food Provider':'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
  'Laundry/Dry Cleaner':'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=85',
  'Ironing Worker':'https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=900&q=85',
  'Packer & Mover':'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=900&q=85',
  'Delivery Driver':'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=85',
  'Security Guard':'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=85',
  'House Painter':'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=85',
  'POP/False Ceiling Worker':'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85',
  'Glass/Glazier Worker':'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85',
  'Tile/Marble Installer':'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85',
  'Waterproofing Specialist':'https://images.unsplash.com/photo-1628744448840-55bdb2497e1f?auto=format&fit=crop&w=900&q=85',
  Fabricator:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=900&q=85',
  'Upholstery/Sofa Cleaner':'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85',
  'Interior Decorator':'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=900&q=85',
  'Event Decorator':'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85',
  Photographer:'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=85',
  Videographer:'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=85',
  'DJ/Sound Technician':'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=85',
  'Orchestra Team':'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=85'
};

const proImages = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=85',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=85',
  'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=500&q=85'
];
const fallbackServiceImage='https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=85';
const money=(value:number)=>`₹${value.toLocaleString('en-IN')}`;

export default function CitizenHomeRedesign({onTransition,onSelectWorker,onSelectCategory,citizenName,citizenAddress,showNotification,onOpenNotificationCenter,onOpenProfile}:CitizenHomeRedesignProps){
  const [query,setQuery]=useState('');
  const [showAllCategories,setShowAllCategories]=useState(false);
  const [referralOpen,setReferralOpen]=useState(false);
  const categories=useMemo(()=>PUNCHX_50_CATEGORIES.filter(item=>`${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())),[query]);
  const popular=PUNCHX_50_CATEGORIES.slice(0,8);
  const bookCategory=(name:string)=>{onSelectCategory(name);onTransition('providers');};
  const handleCopyReferral=async()=>{const code='PUNCHXFRIEND';try{await navigator.clipboard?.writeText(code);showNotification(`✓ Referral code ${code} copied.`);}catch{showNotification(`Referral code: ${code}`);}};
  const shareReferral=()=>{const text='Try PunchX for trusted local professionals. Use referral code PUNCHXFRIEND.';if(navigator.share)navigator.share({title:'PunchX Referral',text}).catch(()=>undefined);else handleCopyReferral();};

  return <div className="punchx-citizen-shell min-h-screen bg-[#f7f8fa] text-[#17191d] pb-24 md:pb-8">
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:h-[76px] lg:px-8">
        <button onClick={()=>setShowAllCategories(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-[#f6f7f9] lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5"/></button>
        <button onClick={()=>onTransition('home')} className="flex items-center gap-2.5" aria-label="PunchX home"><img src={PUNCHX_LOGO} alt="PunchX" className="h-9 w-9 rounded-xl object-contain"/><span className="hidden text-xl font-black tracking-tight sm:block">PunchX</span></button>
        <button onClick={()=>onTransition('customer-setup')} className="ml-auto hidden min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-[#f6f7f9] md:flex"><MapPin className="h-4 w-4 shrink-0 text-[#7358d7]"/><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">Service location</span><span className="block max-w-[250px] truncate text-sm font-bold">{citizenAddress||'Choose your location'}</span></span><ChevronRight className="h-4 w-4 text-[#9ca1aa]"/></button>
        <div className="ml-auto flex items-center gap-1.5 md:ml-2"><button onClick={onOpenNotificationCenter} className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#f6f7f9]" aria-label="Notifications"><Bell className="h-5 w-5"/><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#7358d7]"/></button><button onClick={onOpenProfile} className="flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-[#f7f7f8] px-2.5 sm:px-3"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#191b20] text-white"><UserRound className="h-4 w-4"/></div><span className="hidden max-w-28 truncate text-sm font-bold sm:block">{citizenName||'Citizen'}</span></button></div>
      </div>
      <div className="mx-auto block max-w-[1440px] px-4 pb-3 md:hidden"><button onClick={()=>onTransition('customer-setup')} className="flex w-full items-center gap-2 rounded-xl bg-[#f5f6f8] px-3 py-2.5 text-left"><MapPin className="h-4 w-4 text-[#7358d7]"/><span className="min-w-0 flex-1 truncate text-xs font-semibold">{citizenAddress||'Set service location'}</span><ChevronRight className="h-4 w-4 text-[#9ca1aa]"/></button></div>
    </header>

    <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <section className="pt-5 md:pt-8"><div className="overflow-hidden rounded-[28px] bg-[#15161a] px-5 py-6 text-white shadow-sm md:px-9 md:py-10 lg:px-12"><div className="grid items-center gap-7 lg:grid-cols-[1.05fr_.95fr]"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80"><Sparkles className="h-3.5 w-3.5 text-[#b69cff]"/> PunchX verified network</div><h1 className="max-w-2xl text-[30px] font-black leading-[1.04] tracking-[-0.04em] sm:text-4xl lg:text-5xl">Trusted professionals.<br/>Right when you need them.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">Discover local specialists, compare service options, book securely and follow your professional live from dispatch to arrival.</p><div className="mt-6 flex max-w-2xl items-center gap-2 rounded-2xl bg-white p-2 shadow-xl"><Search className="ml-2 h-5 w-5 shrink-0 text-[#737781]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for AC repair, cleaning, electrician..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm font-semibold text-[#17191d] outline-none placeholder:text-[#989ca5]"/>{query&&<button onClick={()=>setQuery('')} className="rounded-lg p-2 text-[#777b84]"><X className="h-4 w-4"/></button>}<button onClick={()=>setShowAllCategories(true)} className="hidden rounded-xl bg-[#7358d7] px-4 py-2.5 text-sm font-extrabold text-white sm:block">Browse all</button></div></div><div className="relative hidden min-h-[250px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#5b46ae] via-[#2e2b52] to-[#17181c] md:block"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#b69cff]/25 blur-2xl"/><img src={proImages[0]} alt="PunchX professional" className="absolute bottom-0 right-6 h-[92%] w-[58%] object-cover object-top opacity-90 mix-blend-screen"/><div className="absolute bottom-5 left-5 rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-md"><div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-300"/> Verified PunchX Pro</div><div className="mt-1 text-[11px] text-white/60">Identity • skills • service history</div></div></div></div></div></section>

      <section className="pt-7"><div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">Explore</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Popular services</h2></div><button onClick={()=>setShowAllCategories(true)} className="text-sm font-extrabold text-[#7358d7]">See all</button></div><div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">{popular.map((item,index)=><button key={item.id} onClick={()=>bookCategory(item.name)} className="group min-w-[92px] snap-start text-center md:min-w-0"><div className="mx-auto flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-transform group-hover:-translate-y-0.5 sm:h-[88px] sm:w-[88px]"><img src={serviceImages[item.name]||fallbackServiceImage} alt={`${item.name} professional service`} className="h-full w-full object-cover" loading="lazy"/></div><span className="mt-2 block truncate text-xs font-bold">{item.name}</span>{index<3&&<span className="mt-0.5 block text-[10px] text-[#8d9199]">From {money(item.basePrice)}</span>}</button>)}</div></section>

      <section className="pt-7"><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[['Verified professionals','Identity & skills checked',ShieldCheck],['Live service status','Booking to arrival',Navigation2],['Transparent pricing','See price before booking',Tag],['Support when needed','Fast issue resolution',Wrench]].map(([title,sub,Icon])=><div key={String(title)} className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm"><Icon className="h-5 w-5 text-[#7358d7]"/><p className="mt-2 text-xs font-black sm:text-sm">{String(title)}</p><p className="mt-0.5 text-[10px] leading-4 text-[#858a93] sm:text-xs">{String(sub)}</p></div>)}</div></section>

      <section className="pt-8"><div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">PunchX spotlight</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Built around your service journey</h2></div><div className="grid gap-3 md:grid-cols-3"><motion.button whileTap={{scale:.99}} onClick={()=>onTransition('tracking')} className="group relative min-h-[190px] overflow-hidden rounded-3xl bg-[#101827] p-5 text-left text-white"><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7358d7]/30 blur-2xl"/><Navigation2 className="h-6 w-6 text-[#b69cff]"/><h3 className="mt-14 text-lg font-black">Live Pro Tracking</h3><p className="mt-1 max-w-xs text-xs leading-5 text-white/60">See the assigned professional, live location, ETA and route progress on one map.</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#c8b9ff]">Open live map <ArrowRight className="h-3.5 w-3.5"/></span></motion.button><div className="relative min-h-[190px] overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-black/5"><Gift className="h-6 w-6 text-[#7358d7]"/><h3 className="mt-14 text-lg font-black">Refer & earn</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[#777c85]">Invite friends with a shareable PunchX referral code and keep rewards in one place.</p><button onClick={()=>setReferralOpen(true)} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#7358d7]">View rewards <ArrowRight className="h-3.5 w-3.5"/></button></div><div className="relative min-h-[190px] overflow-hidden rounded-3xl bg-[#eee9ff] p-5 ring-1 ring-[#7358d7]/10"><CalendarDays className="h-6 w-6 text-[#7358d7]"/><h3 className="mt-14 text-lg font-black">Instant or scheduled</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[#5d5a68]">Choose the timing that fits your day, then follow the booking status without leaving PunchX.</p><button onClick={()=>onTransition('providers')} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#7358d7]">Find a service <ArrowRight className="h-3.5 w-3.5"/></button></div></div></section>

      <section className="pt-8"><div className="mb-3 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">Discover</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Popular with PunchX citizens</h2></div><button onClick={()=>setShowAllCategories(true)} className="text-sm font-extrabold text-[#7358d7]">All services</button></div><div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible">{PUNCHX_50_CATEGORIES.slice(0,8).map((item,index)=><button key={item.id} onClick={()=>bookCategory(item.name)} className="min-w-[230px] snap-start overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5"><div className="relative h-36 overflow-hidden"><img src={serviceImages[item.name]||fallbackServiceImage} alt={`${item.name} service`} className="h-full w-full object-cover" loading="lazy"/><span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black shadow-sm">{index<3?'Popular':'Verified'}</span></div><div className="p-3.5"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-black">{item.name}</h3><span className="flex items-center gap-1 text-[11px] font-bold"><Star className="h-3.5 w-3.5 fill-[#f2b94b] text-[#f2b94b]"/>4.8</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#81858d]">{item.shortDesc}</p><div className="mt-3 flex items-center justify-between"><span className="text-xs font-bold text-[#81858d]">Starts at</span><span className="text-sm font-black">{money(item.basePrice)}</span></div></div></button>)}</div></section>

      <section className="pt-8"><div className="mb-3"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">Meet the network</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Professionals with a PunchX identity</h2></div><div className="grid gap-3 sm:grid-cols-3">{proImages.map((image,index)=>{const names=['Amit • AC Specialist','Rahul • Electrical Pro','Sourav • Home Care Pro'];const categories=['AC & Appliance','Electrical & Repairs','Cleaning & Maintenance'];const worker:Worker={id:`punchx-demo-${index+1}`,name:names[index],category:categories[index],rating:4.8,reviewsCount:120+index*47,avatar:image,proBadge:'PUNCHX PRO',price:199,visitingFee:199,available:true,address:citizenAddress||'Your service area',area:'Local service area',sector:'Dispatch zone',phone:''} as Worker;return <button key={image} onClick={()=>{onSelectWorker(worker);onTransition('provider-details');}} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-black/5"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#eee9ff]"><img src={image} alt="PunchX professional" className="h-full w-full object-cover" loading="lazy"/><span className="absolute bottom-1 left-1 rounded-md bg-[#7358d7] px-1.5 py-0.5 text-[8px] font-black text-white">PX</span></div><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><h3 className="truncate text-sm font-black">{names[index]}</h3><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500"/></div><p className="mt-0.5 text-[11px] text-[#81858d]">{categories[index]}</p><div className="mt-1 flex items-center gap-1 text-[10px] font-bold"><Star className="h-3 w-3 fill-[#f2b94b] text-[#f2b94b]"/>4.8 • Verified</div></div><ChevronRight className="h-5 w-5 text-[#a0a4ab]"/></button>})}</div></section>

      <section className="py-8"><div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#eee9ff] to-white p-5 ring-1 ring-[#7358d7]/10 sm:p-7"><div className="grid items-center gap-6 md:grid-cols-[1fr_auto]"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#7358d7] ring-1 ring-[#7358d7]/10"><Gift className="h-3.5 w-3.5"/> REWARDS</span><h2 className="mt-3 text-2xl font-black tracking-tight">Refer friends. Unlock PunchX rewards.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#737781]">A dedicated referral flow makes sharing simple without cluttering the booking journey.</p></div><button onClick={()=>setReferralOpen(true)} className="rounded-2xl bg-[#17191d] px-5 py-3 text-sm font-black text-white shadow-lg">Refer & earn</button></div></div></section>
    </main>

    <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-[68px] grid-cols-4 border-t border-black/5 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">{[['Home',HomeIcon,()=>onTransition('home')],['Services',Grid2X2,()=>setShowAllCategories(true)],['Bookings',Clock3,()=>onTransition('tracking')],['Profile',UserRound,onOpenProfile||(()=>undefined)]].map(([label,Icon,action])=><button key={String(label)} onClick={action as()=>void} className="flex flex-col items-center justify-center gap-1 text-[#777c85] active:scale-95"><Icon className="h-5 w-5"/><span className="text-[10px] font-bold">{String(label)}</span></button>)}</nav>

    {showAllCategories&&<div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full overflow-hidden rounded-t-[28px] bg-white sm:max-w-4xl sm:rounded-[28px]"><div className="flex items-center justify-between border-b border-black/5 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">PunchX catalogue</p><h2 className="text-xl font-black">All services</h2></div><button onClick={()=>setShowAllCategories(false)} className="rounded-xl bg-[#f5f6f8] p-2"><X className="h-5 w-5"/></button></div><div className="max-h-[calc(90vh-80px)] overflow-y-auto p-4 sm:p-5"><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{categories.map(item=><button key={item.id} onClick={()=>{setShowAllCategories(false);bookCategory(item.name);}} className="rounded-2xl border border-black/5 bg-[#fafafa] p-3 text-left hover:bg-[#f2efff]"><div className="flex items-center justify-between gap-2"><span className="text-sm font-black">{item.name}</span><Zap className="h-4 w-4 shrink-0 text-[#7358d7]"/></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#858a93]">{item.shortDesc}</p><p className="mt-2 text-xs font-black">From {money(item.basePrice)}</p></button>)}</div></div></div></div>}
    {referralOpen&&<div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-t-[28px] bg-white p-5 sm:rounded-[28px] sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7358d7]">PunchX rewards</p><h2 className="text-xl font-black">Refer & earn</h2></div><button onClick={()=>setReferralOpen(false)} className="rounded-xl bg-[#f5f6f8] p-2"><X className="h-5 w-5"/></button></div><div className="mt-5 rounded-3xl bg-[#eee9ff] p-5"><Gift className="h-8 w-8 text-[#7358d7]"/><h3 className="mt-4 text-2xl font-black">Share PunchX</h3><p className="mt-2 text-sm leading-6 text-[#6f7480]">Invite friends with your referral code and keep the reward flow visible from one screen.</p><div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3"><span className="text-sm font-black tracking-widest">PUNCHXFRIEND</span><button onClick={handleCopyReferral} className="rounded-xl bg-[#17191d] p-2.5 text-white"><Copy className="h-4 w-4"/></button></div><button onClick={shareReferral} className="mt-3 w-full rounded-2xl bg-[#7358d7] py-3.5 text-sm font-black text-white">Share referral</button></div></div></div>}
  </div>;
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>;}
