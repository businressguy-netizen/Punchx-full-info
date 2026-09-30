import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Home, MapPin, Search, Share2, ShieldCheck, Star, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES, isCategoryMatching } from '../data/categories';
import { getCatalogCategory, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';
import { DEMO_PROFESSIONALS } from '../data/demoProfessionals';
import { calculateDistanceKm } from '../lib/location';

interface Props {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker: (worker: Worker) => void;
  showNotification: (msg: string) => void;
  citizenAddress: string;
  setCitizenAddress: (address: string) => void;
}

type Step = 'categories' | 'subcategories' | 'services' | 'booking';
type ResidentialAddress = { house: string; street: string; landmark: string; villageArea: string; city: string; district: string; state: string; pinCode: string };

const EMPTY_ADDRESS: ResidentialAddress = { house: '', street: '', landmark: '', villageArea: '', city: '', district: '', state: '', pinCode: '' };
const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PROFESSIONALS === 'true';
const GEOFENCE_RADIUS_KM = 15;

const serializeAddress = (a: ResidentialAddress) => [a.house, a.street, a.villageArea, a.landmark, a.city, a.district, a.state, a.pinCode].filter(Boolean).join(', ');

const loadSavedAddress = (): ResidentialAddress => {
  try {
    const raw = localStorage.getItem('punchx_residential_address');
    return raw ? { ...EMPTY_ADDRESS, ...JSON.parse(raw) } : EMPTY_ADDRESS;
  } catch { return EMPTY_ADDRESS; }
};

const readGeofenceLocation = (): { lat: number; lng: number; area?: string; city?: string } | null => {
  try {
    const raw = localStorage.getItem('punchx_user_location');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return { lat: parsed.lat, lng: parsed.lng, area: parsed.area, city: parsed.city };
  } catch { return null; }
};

const normalise = (value?: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export default function CitizenServiceCatalogFlow({
  onTransition, selectedCategory, onSelectCategory, onSelectWorker, showNotification, citizenAddress, setCitizenAddress
}: Props) {
  const initialCategory = getCatalogCategory(selectedCategory || '');
  const [step, setStep] = useState<Step>(initialCategory ? 'subcategories' : 'categories');
  const [category, setCategory] = useState<ServiceCategory | null>(initialCategory || null);
  const [subcategory, setSubcategory] = useState<ServicesSubcategory | null>(null);
  const [service, setService] = useState<ServiceItem | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [address, setAddress] = useState<ResidentialAddress>(() => loadSavedAddress());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [geofence, setGeofence] = useState(readGeofenceLocation());

  useEffect(() => {
    const refresh = () => setGeofence(readGeofenceLocation());
    refresh();
    window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('storage', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workerApplications'), snapshot => {
      const approved = snapshot.docs.filter(doc => String(doc.data().status || '').toUpperCase() === 'APPROVED').map(doc => {
        const d = doc.data();
        const rawLocation = d.location && typeof d.location.lat === 'number' && typeof d.location.lng === 'number' ? d.location :
          typeof d.lat === 'number' && typeof d.lng === 'number' ? { lat: d.lat, lng: d.lng } : undefined;
        return {
          id: doc.id,
          name: String(d.legalName || 'Verified Professional'),
          category: String(d.skill || d.category || 'Professional'),
          categories: Array.isArray(d.categories) ? d.categories : undefined,
          rating: Number(d.rating || 0), reviewsCount: Number(d.reviewsCount || 0), avatar: String(d.photoURL || d.avatar || ''),
          proBadge: 'AUTHORIZED', price: Number(d.visitingFee || d.price || 0), visitingFee: Number(d.visitingFee || 0),
          available: d.available !== false, phone: String(d.phone || ''), address: String(d.address || ''), area: String(d.area || ''), sector: String(d.sector || ''),
          location: rawLocation, completedJobs: Number(d.completedJobs || 0), jobsCompletedCount: Number(d.completedJobs || 0)
        } as Worker;
      });
      setWorkers(DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...approved] : approved);
    }, () => setWorkers(DEMO_ENABLED ? DEMO_PROFESSIONALS : []));
    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? PUNCHX_50_CATEGORIES : PUNCHX_50_CATEGORIES.filter(c => `${c.name} ${c.shortDesc} ${c.keywords.join(' ')}`.toLowerCase().includes(q));
  }, [search]);

  const subcategories = useMemo(() => {
    if (!category) return [];
    const q = search.trim().toLowerCase();
    return !q ? category.subcategories : category.subcategories.filter(s => `${s.name} ${s.description} ${s.items.map(i => i.name).join(' ')}`.toLowerCase().includes(q));
  }, [category, search]);

  const services = useMemo(() => {
    if (!subcategory) return [];
    const q = search.trim().toLowerCase();
    return !q ? subcategory.items : subcategory.items.filter(i => `${i.name} ${i.description}`.toLowerCase().includes(q));
  }, [subcategory, search]);

  const checkAvailability = (selected: ServiceItem) => {
    if (!category) return false;
    if (!geofence) {
      setAvailabilityChecked(true);
      setAvailable(false);
      setAvailabilityMessage('Allow location access to check service availability in your area.');
      return false;
    }

    const customerArea = normalise(geofence.area);
    const matching = workers.filter(worker => {
      if (worker.available === false) return false;
      const categoryMatch = isCategoryMatching(worker.categories || worker.category, category.name) || isCategoryMatching(worker.categories || worker.category, category.id);
      if (!categoryMatch) return false;
      if (DEMO_ENABLED && worker.id.startsWith('demo-')) return true;

      if (worker.location) return calculateDistanceKm(geofence.lat, geofence.lng, worker.location.lat, worker.location.lng) <= GEOFENCE_RADIUS_KM;
      if (typeof worker.distanceKm === 'number') return worker.distanceKm <= GEOFENCE_RADIUS_KM;

      const workerArea = normalise(`${worker.area || ''} ${worker.sector || ''} ${worker.address || ''}`);
      return Boolean(customerArea && workerArea && (workerArea.includes(customerArea) || customerArea.includes(workerArea)));
    });

    const ok = matching.length > 0;
    setAvailabilityChecked(true);
    setAvailable(ok);
    setAvailabilityMessage(ok ? `${matching.length} verified professional${matching.length === 1 ? '' : 's'} available within your service area.` : 'Service is not available on your area.');
    return ok;
  };

  const selectService = (selected: ServiceItem) => {
    setService(selected);
    setExpandedService(null);
    setAvailabilityChecked(false);
    setAvailable(false);
    setAvailabilityMessage('');
  };

  const continueFromService = () => {
    if (!service) return;
    const ok = checkAvailability(service);
    if (ok) setStep('booking');
  };

  const goBack = () => {
    if (step === 'categories') onTransition('home');
    else if (step === 'subcategories') { setStep('categories'); setCategory(null); setSearch(''); }
    else if (step === 'services') { setStep('subcategories'); setSubcategory(null); setSearch(''); setService(null); }
    else { setStep('services'); setAvailabilityChecked(false); }
  };

  const chooseCategory = (cat: ServiceCategory) => { setCategory(cat); setSubcategory(null); setService(null); setSearch(''); setStep('subcategories'); onSelectCategory?.(cat.name); };
  const chooseSubcategory = (sub: ServicesSubcategory) => { setSubcategory(sub); setService(null); setSearch(''); setStep('services'); };

  const validateAndContinue = () => {
    if (!service || !category || !date || !time) { showNotification('Please choose a date and time.'); return; }
    const required = ['house', 'street', 'villageArea', 'city', 'district', 'state', 'pinCode'] as const;
    if (required.some(k => !address[k].trim())) { showNotification('Please complete the residential address, including village/area, city, district and PIN code.'); return; }
    const formatted = serializeAddress(address);
    setSaving(true);
    try {
      localStorage.setItem('punchx_residential_address', JSON.stringify(address));
      localStorage.setItem('punchx_residential_address_label', formatted);
      localStorage.setItem('punchx_pending_booking', JSON.stringify({
        serviceId: service.id, serviceName: service.name, category: category.name, subcategory: subcategory?.name || '', description: service.description,
        price: service.price, address: formatted, residentialAddress: address, date, time, dispatchMode: 'AUTO_MATCH',
        serviceAvailabilityChecked: true, serviceAvailable: true, geofenceArea: geofence?.area || '', geofenceCity: geofence?.city || '', geofenceRadiusKm: GEOFENCE_RADIUS_KM,
        createdAt: new Date().toISOString()
      }));
      setCitizenAddress(formatted);
      onSelectCategory?.(category.name);
      onTransition('payment');
    } finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-[#f7f7f8] pb-24 text-[#17191d]">
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:px-6">
        <button onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><div className="truncate text-lg font-black">{category?.name || 'PUNCHX Services'}</div><div className="flex items-center gap-1 text-[10px] text-[#777c85]"><MapPin className="h-3 w-3" />{geofence?.area || 'Service area not detected'} · {GEOFENCE_RADIUS_KM} km service zone</div></div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"><Search className="h-5 w-5" /></button>
        <button className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white sm:flex"><Share2 className="h-4 w-4" /></button>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5">
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5"><Search className="h-4 w-4 text-[#777c85]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={step==='categories'?'Search all 50 services':`Search ${category?.name || 'services'}`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/>{search&&<button onClick={()=>setSearch('')}><X className="h-4 w-4 text-[#777c85]"/></button>}</div>

      {step==='categories' && <><div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-[10px] font-bold uppercase tracking-wider text-[#7358d7]">PUNCHX Home Services</div><h1 className="mt-1 text-2xl font-black">All 50 services</h1><p className="mt-1 text-xs text-[#777c85]">Choose the main branch first, then the facility, then the exact work.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map(cat=>{const c=getCatalogCategory(cat.id);return <button key={cat.id} onClick={()=>c&&chooseCategory(c)} className="overflow-hidden rounded-2xl border border-black/5 bg-white p-2 text-left shadow-sm hover:ring-2 hover:ring-[#7358d7]/20"><img src={c?.image} alt="" className="h-24 w-full rounded-xl object-cover bg-[#f1f2f4]" loading="lazy"/><div className="px-1 pt-2 text-sm font-black">{cat.name}</div><div className="px-1 pt-1 line-clamp-2 text-[10px] leading-4 text-[#777c85]">{cat.shortDesc}</div></button>})}</div></>}

      {step==='subcategories' && category && <><div className="mb-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-[10px] font-bold uppercase tracking-wider text-[#858992]">{category.name}</div><h1 className="mt-1 text-2xl font-black">Choose a service type</h1><p className="mt-1 text-xs text-[#777c85]">Fan, bulb, switch, doorbell and all available facilities are grouped here.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{subcategories.map(sub=><button key={sub.id} onClick={()=>chooseSubcategory(sub)} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm"><img src={sub.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#f1f2f4]" loading="lazy"/><div className="min-w-0"><div className="font-black">{sub.name}</div><div className="mt-1 text-[11px] leading-4 text-[#777c85]">{sub.description}</div><div className="mt-2 text-[10px] font-black text-[#7358d7]">{sub.items.length} exact services <ChevronRight className="inline h-3 w-3"/></div></div></button>)}</div></>}

      {step==='services' && category && subcategory && <>
        <div className="mb-2 flex items-center gap-1 text-xs text-[#777c85]"><span>{category.name}</span><ChevronRight className="h-3 w-3"/><span className="font-black text-[#17191d]">{subcategory.name}</span></div>
        <div className="mb-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black">{category.name}</h1><div className="mt-1 flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-current"/>4.8 <span className="text-[#777c85]">(Verified bookings)</span></div></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right"><div className="text-[9px] font-black text-emerald-700">EARLIEST</div><div className="text-xs font-black">Wed, 8:00 AM</div></div></div><div className="mt-3 flex items-center gap-2 rounded-xl border border-black/5 bg-[#fbfbfc] p-3"><ShieldCheck className="h-5 w-5 text-[#15945a]"/><div><div className="text-xs font-black">Get visitation fee off</div><div className="text-[10px] text-[#777c85]">On eligible orders above ₹499</div></div></div></div>
        <div className="border-t border-black/5 pt-3"><h2 className="mb-2 text-lg font-black">{subcategory.name}</h2>{services.map(item=><article key={item.id} className="border-b border-black/10 bg-white py-4 first:rounded-t-2xl last:rounded-b-2xl"><div className="flex gap-3 px-3 sm:px-4"><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><h3 className="text-base font-black leading-5">{item.name}</h3>{item.popular&&<span className="rounded-full bg-[#f0ecff] px-2 py-1 text-[9px] font-black text-[#7358d7]">Popular</span>}</div><div className="mt-1 flex items-center gap-1 text-[11px] text-[#666b74]"><Star className="h-3 w-3 fill-current"/> {item.rating?.toFixed(2)} ({item.reviews} reviews)</div><div className="mt-1 text-xs font-black">Starts at ₹{item.price.toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] text-[#777c85]">{item.duration}</div>{expandedService===item.id&&<p className="mt-2 text-[11px] leading-5 text-[#555a63]">{item.description}</p>}<div className="mt-3 flex items-center gap-3"><button onClick={()=>selectService(item)} className={`rounded-lg px-5 py-2 text-xs font-black ${service?.id===item.id?'bg-[#7358d7] text-white':'border border-[#7358d7] bg-white text-[#7358d7]'}`}>{service?.id===item.id?'Selected':'Add'}</button><button onClick={()=>setExpandedService(expandedService===item.id?null:item.id)} className="text-xs font-bold text-[#7358d7]">{expandedService===item.id?'Hide details':'View details'}</button></div></div><img src={item.image} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover bg-[#f1f2f4] sm:h-32 sm:w-32" loading="lazy"/></div></article>)}</div>
        {service&&<div className="sticky bottom-3 z-30 mt-3 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/10"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-[10px] font-bold text-[#777c85]">Selected service</div><div className="truncate text-sm font-black">{service.name}</div></div><div className="text-sm font-black">₹{service.price.toLocaleString('en-IN')}</div></div>{availabilityChecked&&!available&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-black text-red-700">{availabilityMessage}</div>}{availabilityChecked&&available&&<div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-700"><Check className="mr-1 inline h-4 w-4"/>{availabilityMessage}</div>}<button onClick={continueFromService} className="mt-3 w-full rounded-xl bg-[#7358d7] py-3 text-sm font-black text-white">Check availability & continue</button></div>}
      </>}

      {step==='booking'&&service&&category&&<>
        <div className="mb-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-[10px] font-bold uppercase tracking-wider text-[#7358d7]">Booking {category.name}</div><h1 className="mt-1 text-xl font-black">{service.name}</h1><div className="mt-1 text-xs text-[#777c85]">Availability confirmed for your current device service area.</div></div>
        <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-5 w-5 text-[#7358d7]"/>1. Select date & time</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none"/><select value={time} onChange={e=>setTime(e.target.value)} className="rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none"><option value="">Select time slot</option><option>8:00 AM – 9:00 AM</option><option>10:00 AM – 11:00 AM</option><option>12:00 PM – 1:00 PM</option><option>2:00 PM – 3:00 PM</option><option>4:00 PM – 5:00 PM</option><option>6:00 PM – 7:00 PM</option></select></div></section>
        <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center gap-2 text-sm font-black"><Home className="h-5 w-5 text-[#7358d7]"/>2. Residential address</div><p className="mt-1 text-[10px] leading-4 text-[#777c85]">The professional will see and visit this address. This address is never used to calculate the device geofence.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{([['house','House / Flat / Building'],['street','Street / Road'],['landmark','Landmark / Directions'],['villageArea','Village / Area name'],['city','City'],['district','District'],['state','State'],['pinCode','PIN code']] as const).map(([key,label])=><label key={key} className="text-xs font-bold text-[#555a63]">{label}<input value={address[key]} onChange={e=>setAddress(prev=>({...prev,[key]:e.target.value}))} placeholder={label} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none focus:border-[#7358d7]"/></label>)}</div><div className="mt-3 rounded-xl bg-[#f7f7f8] p-3"><div className="flex items-center gap-2 text-xs font-black"><MapPin className="h-4 w-4 text-[#7358d7]"/>Residential address</div><div className="mt-1 text-xs leading-5 text-[#777c85]">{serializeAddress(address)||'Complete the address above.'}</div></div></section>
        <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-[10px] font-bold uppercase tracking-wider text-[#858992]">3. Review before payment</div><div className="mt-2 flex items-start justify-between gap-3"><div><div className="font-black">{service.name}</div><div className="text-xs text-[#777c85]">{category.name} · {subcategory?.name}</div><div className="mt-2 text-xs text-[#777c85]">{date||'Date not selected'} · {time||'Time not selected'}</div><div className="mt-1 text-xs text-[#777c85]">Visit: {serializeAddress(address)||'Address not completed'}</div></div><div className="font-black">₹{service.price.toLocaleString('en-IN')}</div></div></section>
        <button disabled={saving} onClick={validateAndContinue} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] py-4 text-sm font-black text-white disabled:opacity-50">Continue to payment <ChevronRight className="h-4 w-4"/></button>
      </>}
    </main>
  </div>;
}
