import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Search, X, MapPin, Home, Clock3, ShieldCheck, Wrench, Zap, Sparkles, Package, Droplet } from 'lucide-react';
import { PUNCHX_50_CATEGORIES, ServiceCategoryItem } from '../data/categories';
import { PunchXLeafService, PunchXServiceBranch, PunchXSubcategory, getPunchXServiceBranch } from '../data/serviceHierarchy';
import { serviceImage, serviceImageFallback } from '../data/serviceVisuals';
import { serviceCategories } from '../data/serviceCatalogs';
import { getProductsForCategory } from '../data/expandedPriceCatalogue';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  onTransition: (target: any) => void;
  citizenAddress: string;
}

type Level = 'categories' | 'subcategories' | 'services';
const ELECTRICIAN_GROUP_COPY: Record<string, { description: string; image: string; tag: string }> = {
  'switch & socket': {
    description: 'Loose switches, damaged sockets, plug points and smart-switch installs.',
    image: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1000&q=85',
    tag: 'Switches & plugs',
  },
  fan: {
    description: 'Fan repair, installation, replacement, regulator and BLDC fan help.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Fans & regulators',
  },
  light: {
    description: 'Bulbs, LED battens, ceiling lights and decorative fixture installation.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=1000&q=85',
    tag: 'Lights & fixtures',
  },
  'wiring & power': {
    description: 'Power faults, wiring checks, MCB trips and fuse replacement.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Wiring & safety',
  },
  'doorbell & security': {
    description: 'Doorbells, video doorbells and basic electrical security-device fitting.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1000&q=85',
    tag: 'Home security',
  },
  appliances: {
    description: 'Electrical connections for geysers, exhaust fans and home appliances.',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1000&q=85',
    tag: 'Appliance connections',
  },
};

const electricianGroupVisual = (name: string) => {
  const key = name.toLowerCase();
  const entry = Object.entries(ELECTRICIAN_GROUP_COPY).find(([match]) =>
    key.includes(match) || match.includes(key)
  );
  return entry?.[1] || {
    description: 'Get help with a household electrical repair, installation or replacement.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Electrical service',
  };
};

const BEAUTICIAN_SERVICE_GROUPS = [
  { id: 'facial', name: 'Facial & Skin Care', description: 'Clean-up, facial and skin treatments', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85' },
  { id: 'waxing', name: 'Waxing', description: 'Face, arms, legs and underarms', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85' },
  { id: 'threading', name: 'Threading', description: 'Eyebrows, upper lip and full face', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hands-feet', name: 'Manicure & Pedicure', description: 'Nail care, hand and foot spa', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hair-care', name: 'Hair Spa & Treatments', description: 'Hair spa, conditioning and care', image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hair-styling', name: 'Hair Studio & Styling', description: 'Blow-dry, straightening and styling', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1000&q=85' },
  { id: 'makeup-saree', name: 'Makeup & Saree Styling', description: 'Makeup, draping and occasion looks', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85' },
];
const PLUMBING_SERVICE_GROUPS = [
  { id: 'tap-mixer', name: 'Taps & Mixers', description: 'Tap leaks, mixer repairs, new taps and fittings', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1000&q=85' },
  { id: 'toilet-flush', name: 'Toilet & Flush', description: 'Flush tanks, jet sprays, toilet seats and blockages', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=85' },
  { id: 'bath-shower', name: 'Bath & Shower', description: 'Shower repairs, fittings and bathroom accessories', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1000&q=85' },
  { id: 'basin-sink', name: 'Basin & Kitchen Sink', description: 'Basin installation, sink leaks and waste pipes', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85' },
  { id: 'drainage', name: 'Drainage & Leakage', description: 'Blocked drains, pipe leaks and water-flow issues', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1000&q=85' },
  { id: 'tank-motor', name: 'Water Tank & Motor', description: 'Water tanks, pumps, motors and water connections', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1000&q=85' },
];
const matchesPlumbingGroup = (groupId: string, text: string) => {
  const value = text.toLowerCase();
  if (groupId === 'tap-mixer') return /tap|mixer|angle cock|faucet/.test(value);
  if (groupId === 'toilet-flush') return /toilet|flush|jet spray|health faucet|pot blockage|cistern/.test(value);
  if (groupId === 'bath-shower') return /shower|bath|health faucet|bathroom accessory/.test(value);
  if (groupId === 'basin-sink') return /basin|sink|waste pipe|waste coupling/.test(value);
  if (groupId === 'drainage') return /drain|blockage|leak|pipe/.test(value);
  return /water tank|overhead tank|tank cleaning|water pump|water motor|water meter|motor connection/.test(value);
};
const plumbingProductMatches = (groupId: string, text: string) => {
  const value = text.toLowerCase();
  if (groupId === 'tap-mixer') return /tap|mixer|faucet|angle cock/.test(value);
  if (groupId === 'toilet-flush') return /flush|toilet|cistern|jet spray/.test(value);
  if (groupId === 'bath-shower') return /shower|bath|faucet|health/.test(value);
  if (groupId === 'basin-sink') return /basin|sink|waste pipe|waste coupling/.test(value);
  if (groupId === 'drainage') return /pipe|swr|cpvc|upvc|gi |drain|leak/.test(value);
  return /tank|pump|motor|water meter/.test(value);
};
const plumbingPriceRange = (price: number, serviceName: string) => {
  const name = serviceName.toLowerCase();
  let minimumFactor = 0.8;
  let maximumFactor = 1.45;
  if (/tap repair|minor|jet spray|faucet repair|flush tank repair/.test(name)) { minimumFactor = 0.9; maximumFactor = 1.35; }
  if (/installation|replacement|toilet|blockage|overhead tank|tank cleaning|water pump|pipeline/.test(name)) { minimumFactor = 0.8; maximumFactor = 1.8; }
  const minimum = Math.max(49, Math.floor((price * minimumFactor) / 10) * 10);
  const maximum = Math.max(minimum + 20, Math.ceil((price * maximumFactor) / 10) * 10);
  return { minimum, maximum };
};
const PLUMBING_QUICK_TASKS = [
  { label: 'Leaking tap', group: 'tap-mixer', detail: 'Repair or replace' },
  { label: 'Toilet / flush issue', group: 'toilet-flush', detail: 'Flush and fittings' },
  { label: 'Blocked drain', group: 'drainage', detail: 'Drain and pipe checks' },
  { label: 'Low water flow', group: 'tank-motor', detail: 'Pump and connections' },
];
const ELECTRICIAN_QUICK_TASKS = [
  { label: 'Fan not working', group: 'Fan', detail: 'Repair or replace' },
  { label: 'Lights out', group: 'Light', detail: 'Bulb or fixture' },
  { label: 'Socket problem', group: 'Switch & socket', detail: 'Switches and plugs' },
  { label: 'Power keeps tripping', group: 'Wiring & power', detail: 'MCB and wiring checks' },
];

export default function PunchXServiceBrowser({ open, onClose, onSelectCategory, onTransition, citizenAddress }: Props) {
  const [level, setLevel] = useState<Level>('categories');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<PunchXServiceBranch | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<PunchXSubcategory | null>(null);
  const [query, setQuery] = useState('');
  const [detailTab, setBeauticianTab] = useState<'services' | 'products'>('services');

  const categories = useMemo(() => PUNCHX_50_CATEGORIES.filter(item => `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const subcategories = selectedBranch?.subcategories || [];
  const services = selectedSubcategory?.services || [];

  const reset = () => { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); setSelectedSubcategory(null); setQuery(''); };
  const close = () => { reset(); onClose(); };
  const openCategory = (category: ServiceCategoryItem) => {
    setDetailTab('services');
    setSelectedCategory(category);
    setSelectedBranch(getPunchXServiceBranch(category));
    setSelectedSubcategory(null);
    setLevel('subcategories');
    setQuery('');
  };
  const openSubcategory = (group: PunchXSubcategory) => {
    setSelectedSubcategory(group);
    setLevel('services');
    setQuery('');
  };
  const selectLeaf = (service: PunchXLeafService) => {
    localStorage.setItem('punchx_selected_leaf_service', JSON.stringify(service));
    localStorage.setItem('punchx_selected_service_path', JSON.stringify({ category: service.category, subcategory: service.subcategory, service: service.name }));
    onSelectCategory(service.category);
    close();
    onTransition('providers');
  };
  if (!open) return null;

  const title = level === 'categories' ? 'All 10 PUNCHX service categories' : level === 'subcategories' ? selectedCategory?.name || 'Services' : selectedSubcategory?.name || 'Select a service';
  const countText = level === 'categories' ? `${PUNCHX_50_CATEGORIES.length} main categories` : level === 'subcategories' ? `${subcategories.length} service groups` : `${services.length} service options`;

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true">
    <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white text-[#17191d] sm:max-w-5xl sm:rounded-[28px]">
      <header className="border-b border-black/5 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {level !== 'categories' && <button onClick={() => { if (level === 'services') { setSelectedSubcategory(null); setLevel('subcategories'); } else { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); } }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8]"><ArrowLeft className="h-5 w-5"/></button>}
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7358d7]">PUNCHX catalogue</p><h2 className="truncate text-xl font-black">{title}</h2><p className="text-[11px] text-[#858a93]">{countText}</p></div>
          <button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8]"><X className="h-5 w-5"/></button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#f5f6f8] px-3 py-2.5"><Search className="h-4 w-4 text-[#858a93]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={level === 'categories' ? 'Search electrician, plumbing, cleaning...' : 'Search this level...'} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/></div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6">
        {level === 'categories' && <>
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#7358d7]/10 bg-[#f0ecff] p-3 text-xs"><MapPin className="h-4 w-4 text-[#7358d7]"/><span className="font-bold">Geofence/service area controls availability. The residential address is collected later only as the professional's visit destination.</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{categories.map(category=><button key={category.id} onClick={()=>openCategory(category)} className="group rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-[#7358d7]/30"><div className="relative mb-3 h-24 overflow-hidden rounded-xl bg-[#f1effa]"><img src={category.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"/></div><div className="mt-3 flex items-start justify-between gap-2"><span className="text-sm font-black leading-4">{category.name}</span><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#aaaeb6]"/></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#858a93]">{category.shortDesc}</p><p className="mt-2 text-[11px] font-black">Starts ₹{category.basePrice.toLocaleString('en-IN')}</p></button>)}</div>
        </>}

        {level === 'subcategories' && selectedCategory?.id === 'beautician' && <div className="space-y-6">
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#2a1724] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('Beauty & Salon at Home')} alt="At-home beauty and salon care" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Beauty & Salon at Home', 'At-home beauty and personal care'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#26131f] via-[#26131f]/85 to-[#26131f]/20"/>
            <div className="relative max-w-2xl p-5 sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-200"><Sparkles className="h-3.5 w-3.5"/> PUNCHX beauty at home</span><h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Your beauty routine, <span className="text-rose-300">your space.</span></h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Choose a beauty category first, then explore services and related products with clear price ranges.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">At-home convenience</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Services + products</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Transparent price ranges</span></div></div>
          </section>
          <section><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-600">Choose your beauty category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What would you like to book?</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BEAUTICIAN_SERVICE_GROUPS.filter(group => `${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group => <button key={group.id} type="button" onClick={() => { const matches = services.filter(service => { const t = `${service.name} ${service.subcategory}`.toLowerCase(); return group.id === 'facial' ? /facial|cleanup|de-tan|skin polishing/.test(t) : group.id === 'waxing' ? /wax/.test(t) : group.id === 'threading' ? /thread/.test(t) : group.id === 'hands-feet' ? /manicure|pedicure|nail|hand\/foot spa/.test(t) : group.id === 'hair-care' ? /hair spa|conditioning|keratin|scalp treatment/.test(t) : group.id === 'hair-styling' ? /haircut|blow dry|straightening|curl styling|hairstyle|hair color|highlights/.test(t) : /makeup|saree|draping|bridal|styling/.test(t); }); setSelectedSubcategory({ id: group.id, name: group.name, services: matches.length ? matches : services }); setLevel('services'); setQuery(''); }} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-rose-300 hover:shadow-md"><div className="relative h-28 overflow-hidden bg-rose-50 sm:h-36"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(group.name, group.description); }}/><div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"/></div><div className="p-3 sm:p-4"><h4 className="text-sm font-black text-[#17191d]">{group.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{group.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-rose-700">Explore options <ArrowRight className="h-3 w-3"/></span></div></button>)}
            </div>
          </section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'plumber' && <div className="space-y-6">
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#102a36] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('plumbing')} alt="Professional plumber repairing household pipework" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Plumbing Services', 'Taps, pipes and bathroom repairs'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#102a36] via-[#102a36]/85 to-[#102a36]/20"/>
            <div className="relative max-w-2xl p-5 sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200"><Droplet className="h-3.5 w-3.5"/> PUNCHX plumbing care</span><h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Leaks, blockages or low pressure? <span className="text-cyan-300">Start here.</span></h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Pick the plumbing issue, explore the relevant service options, and check product price ranges before confirming work.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Problem-first booking</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Service + materials</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Clear price ranges</span></div></div>
          </section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Start with the issue</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What needs fixing?</h3></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{PLUMBING_QUICK_TASKS.map(task=><button key={task.label} type="button" onClick={()=>{const matches=subcategories.flatMap(group=>group.services).filter(service=>matchesPlumbingGroup(task.group,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:task.group,name:task.label,services:matches.length?matches:subcategories.flatMap(group=>group.services)});setLevel('services');setDetailTab('services');setQuery('');}} className="group flex min-h-[100px] flex-col justify-between rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"><span className="text-sm font-black leading-5 text-[#17313a]">{task.label}</span><span className="mt-3 flex items-center justify-between gap-1 text-[10px] font-bold text-cyan-800"><span>{task.detail}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span></button>)}</div></section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Browse by category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Plumbing for every part of your home</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#737780]">Every category opens its own service list and a separate products tab.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLUMBING_SERVICE_GROUPS.filter(group=>`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=>{const count=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`)).length;return <button key={group.id} type="button" onClick={()=>{const matches=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:group.id,name:group.name,services:matches});setLevel('services');setDetailTab('services');setQuery('');}} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-cyan-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-cyan-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.name}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-cyan-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h4 className="text-base font-black text-[#17191d]">{group.name}</h4><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"/></div><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#737780]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#737780]">{count} service options</span><span className="text-[10px] font-black text-cyan-800">Services & products</span></div></div></button>;})}
          </div></section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'electrician' && <div className="space-y-6">
          <section className="relative isolate min-h-[270px] overflow-hidden rounded-[28px] bg-[#17191d] text-white shadow-lg sm:min-h-[300px]">
            <img src={selectedCategory.imageUrl || serviceImage('electrician')} alt="Electrician carrying out a household electrical repair" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Electrician services', 'Home electrical repairs and installation'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#17191d] via-[#17191d]/90 to-[#17191d]/30"/>
            <div className="relative max-w-2xl p-5 sm:p-8 lg:p-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200"><Zap className="h-3.5 w-3.5"/> PUNCHX electrical care</span>
              <h3 className="mt-4 max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">Power problems? <span className="text-orange-400">Let’s fix them smartly.</span></h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">Choose the issue, compare clear starting prices and find the right electrical service for your home.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><Check className="h-3.5 w-3.5 text-orange-300"/> Task-based selection</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-orange-300"/> Safety-first service choices</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><MapPin className="h-3.5 w-3.5 text-orange-300"/> Local availability checks</span>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">Start with the problem</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What do you need fixed?</h3></div>
              <span className="text-xs font-semibold text-[#858a93]">{subcategories.length} service groups</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {ELECTRICIAN_QUICK_TASKS.map((task) => {
                const targetGroup = subcategories.find((group) => group.name.toLowerCase() === task.group.toLowerCase());
                return <button key={task.label} type="button" disabled={!targetGroup} onClick={() => targetGroup && openSubcategory(targetGroup)} className="group flex min-h-[104px] flex-col justify-between rounded-2xl border border-orange-100 bg-orange-50/70 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50">
                  <span className="text-sm font-black leading-5 text-[#252525]">{task.label}</span>
                  <span className="mt-3 flex items-center justify-between gap-1 text-[10px] font-bold text-orange-700"><span>{task.detail}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span>
                </button>;
              })}
            </div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">Browse by category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Electrical services for every room</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#737780]">Explore repair, installation and replacement options with relevant service photos.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subcategories.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())).map((group) => {
                const visual = electricianGroupVisual(group.name);
                const startingPrice = group.services.length ? Math.min(...group.services.map((item) => item.price)) : 0;
                return <button key={group.id} type="button" onClick={() => openSubcategory(group)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:ring-orange-300 hover:shadow-md">
                  <div className="relative h-36 overflow-hidden bg-[#eee8df] sm:h-40">
                    <img src={visual.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(group.name, visual.description); }}/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/>
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{visual.tag}</span>
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-orange-600 shadow-sm transition group-hover:bg-orange-500 group-hover:text-white"><ArrowRight className="h-4 w-4"/></span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2"><h4 className="text-base font-black text-[#17191d]">{group.name}</h4><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"/></div>
                    <p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#737780]">{visual.description}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#737780]">{group.services.length} service options</span><span className="text-xs font-black text-orange-700">From ₹{startingPrice.toLocaleString('en-IN')}</span></div>
                  </div>
                </button>;
              })}
            </div>
          </section>
        </div>}
        {level === 'subcategories' && !['electrician', 'beautician', 'plumber'].includes(selectedCategory?.id || '') && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{subcategories.filter(s=>s.name.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} onClick={()=>openSubcategory(group)} className="flex min-h-[130px] flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 hover:ring-[#7358d7]/30"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-6 w-6"/></div><div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-black">{group.name}</span><ChevronRight className="h-4 w-4 text-[#aaaeb6]"/></div><p className="mt-1 text-[10px] text-[#858a93]">{group.services.length} services</p></div></button>)}</div>}

        {level === 'services' && selectedCategory?.id === 'plumber' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#102a36] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">Plumbing category selected</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">Browse service options or matching parts and materials.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#102a36]':'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#102a36]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button></div></div>
          {detailTab==='services' ? <div className="space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-cyan-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cyan-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-cyan-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-900">₹{plumbingPriceRange(service.price, service.name).minimum.toLocaleString('en-IN')}–₹{plumbingPriceRange(service.price, service.name).maximum.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-800">Choose service <ArrowRight className="h-3 w-3"/></span></div></button>)}{services.length===0&&<div className="rounded-2xl border border-dashed border-cyan-200 bg-white p-8 text-center text-sm text-[#737780]">No services have been added to this category yet.</div>}</div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(getProductsForCategory(serviceCategories.find(category=>category.id==='plumber')!).filter(product=>plumbingProductMatches(selectedSubcategory?.id||'',`${product.name} ${product.specification}`)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase())))).map(product=><article key={product.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-cyan-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-cyan-900">Product</div></div><h4 className="mt-3 text-sm font-black text-[#17191d]">{product.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{product.specification}</p><p className="mt-3 text-xs font-black text-cyan-900">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#858a93]">/ {product.unit}</span></p><p className="mt-1 text-[10px] text-[#858a93]">Indicative product price</p></article>)}
          </div>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'beautician' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#2a1724] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-200">Beauty category selected</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">Compare service prices or browse products used for this category.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={() => setBeauticianTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${beauticianTab === 'services' ? 'bg-white text-[#2a1724]' : 'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={() => setBeauticianTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${beauticianTab === 'products' ? 'bg-white text-[#2a1724]' : 'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button></div></div>
          {beauticianTab === 'services' ? <div className="space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-rose-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-rose-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(service.name, service.description); }}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-rose-700">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">Choose service <ArrowRight className="h-3 w-3"/></span></div></button>)}</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(getProductsForCategory(serviceCategories.find(category => category.id === 'beautician')!).filter(product => !query || `${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="flex h-24 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Package className="h-8 w-8"/></div><h4 className="mt-3 text-sm font-black text-[#17191d]">{product.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{product.specification}</p><p className="mt-3 text-xs font-black text-rose-700">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#858a93]">/ {product.unit}</span></p><p className="mt-1 text-[10px] text-[#858a93]">Indicative product price</p></article>)}</div>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'electrician' && <div className="mx-auto max-w-4xl space-y-3">
          <div className="rounded-2xl bg-[#17191d] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-300">Selected electrical category</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/65">Choose the exact job to view its starting price and continue.</p></div>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold sm:mt-0"><ShieldCheck className="h-4 w-4 text-orange-300"/> Safety-first task selection</span>
          </div>
          {services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-orange-300 sm:gap-4 sm:p-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f6f0e8] sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(service.name, service.description); }}/></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-orange-700">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">From ₹{service.price.toLocaleString('en-IN')}</span></div>
              <p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span className="inline-flex items-center gap-1 text-orange-700">Choose this service <ArrowRight className="h-3 w-3"/></span></div>
            </div>
          </button>)}
        </div>}
        {level === 'services' && !['electrician', 'beautician', 'plumber'].includes(selectedCategory?.id || '') && <div className="mx-auto max-w-3xl space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="flex w-full gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-[#7358d7]/30"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-7 w-7"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black">{service.name}</h3><p className="mt-1 text-[10px] font-bold text-[#7358d7]">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-[#f3f0ff] px-2 py-1 text-xs font-black text-[#7358d7]">Starts ₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span>View details</span><span className="text-[#7358d7]">Add</span></div></div></button>)}</div>}
      </div>
      {citizenAddress && <div className="border-t border-black/5 bg-white px-4 py-3 text-xs sm:px-6"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-[#7358d7]"/><span className="font-black">Residential address:</span><span className="truncate text-[#6f747d]">{citizenAddress}</span></div></div>}
    </div>
  </div>;
}
