import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Home, MapPin, Search, ShieldCheck, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { AppScreen, Worker } from '../types';
import { PUNCHX_50_CATEGORIES, isCategoryMatching } from '../data/categories';
import { getCatalogCategory, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';
import { DEMO_PROFESSIONALS } from '../data/demoProfessionals';

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

type ResidentialAddress = {
  house: string;
  street: string;
  landmark: string;
  villageArea: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
};

const EMPTY_ADDRESS: ResidentialAddress = { house: '', street: '', landmark: '', villageArea: '', city: '', district: '', state: '', pinCode: '' };
const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PROFESSIONALS === 'true';

const serializeAddress = (a: ResidentialAddress) =>
  [a.house, a.street, a.villageArea, a.landmark, a.city, a.district, a.state, a.pinCode].filter(Boolean).join(', ');

const loadSavedAddress = (): ResidentialAddress => {
  try {
    const raw = localStorage.getItem('punchx_residential_address');
    return raw ? { ...EMPTY_ADDRESS, ...JSON.parse(raw) } : EMPTY_ADDRESS;
  } catch { return EMPTY_ADDRESS; }
};

export default function CitizenServiceCatalogFlow({
  onTransition, selectedCategory, onSelectCategory, onSelectWorker, showNotification, citizenAddress, setCitizenAddress
}: Props) {
  const initialCategory = getCatalogCategory(selectedCategory || '');
  const [step, setStep] = useState<Step>(initialCategory ? 'subcategories' : 'categories');
  const [category, setCategory] = useState<ServiceCategory | null>(initialCategory || null);
  const [subcategory, setSubcategory] = useState<ServicesSubcategory | null>(null);
  const [service, setService] = useState<ServiceItem | null>(null);
  const [search, setSearch] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [available, setAvailable] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [address, setAddress] = useState<ResidentialAddress>(() => loadSavedAddress());
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workerApplications'), snapshot => {
      const approved = snapshot.docs
        .filter(doc => String(doc.data().status || '').toUpperCase() === 'APPROVED')
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: String(d.legalName || 'Verified Professional'),
            category: String(d.skill || d.category || 'Professional'),
            categories: Array.isArray(d.categories) ? d.categories : undefined,
            rating: Number(d.rating || 0),
            reviewsCount: Number(d.reviewsCount || 0),
            avatar: String(d.photoURL || d.avatar || ''),
            proBadge: 'AUTHORIZED',
            price: Number(d.visitingFee || d.price || 0),
            visitingFee: Number(d.visitingFee || 0),
            available: d.available !== false,
            phone: String(d.phone || ''),
            address: String(d.address || ''),
            area: String(d.area || ''),
            sector: String(d.sector || ''),
            completedJobs: Number(d.completedJobs || 0),
            jobsCompletedCount: Number(d.completedJobs || 0),
          } as Worker;
        });
      setWorkers(DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...approved] : approved);
    }, () => setWorkers(DEMO_ENABLED ? DEMO_PROFESSIONALS : []));
    return () => unsub();
  }, []);

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PUNCHX_50_CATEGORIES;
    return PUNCHX_50_CATEGORIES.filter(c => `${c.name} ${c.shortDesc} ${c.keywords.join(' ')}`.toLowerCase().includes(q));
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
    const matching = workers.filter(w => w.available !== false && (isCategoryMatching(w.categories || w.category, category.name) || isCategoryMatching(w.categories || w.category, category.id)));
    const ok = matching.length > 0;
    setAvailabilityChecked(true);
    setAvailable(ok);
    setAvailabilityMessage(ok ? `${matching.length} eligible professional${matching.length === 1 ? '' : 's'} available for this service area.` : 'Service is not available on your area.');
    return ok;
  };

  const selectService = (selected: ServiceItem) => {
    setService(selected);
    setAvailabilityChecked(false);
    setAvailable(false);
    setAvailabilityMessage('');
    // Availability is intentionally checked after the exact sub-sub-service is selected.
    checkAvailability(selected);
  };

  const goBack = () => {
    if (step === 'categories') onTransition('home');
    else if (step === 'subcategories') { setStep('categories'); setCategory(null); setSearch(''); }
    else if (step === 'services') { setStep('subcategories'); setSubcategory(null); setSearch(''); }
    else { setStep('services'); setService(null); setAvailabilityChecked(false); }
  };

  const chooseCategory = (cat: ServiceCategory) => {
    setCategory(cat);
    setSubcategory(null);
    setService(null);
    setSearch('');
    setStep('subcategories');
    onSelectCategory?.(cat.name);
  };

  const chooseSubcategory = (sub: ServicesSubcategory) => {
    setSubcategory(sub);
    setService(null);
    setSearch('');
    setStep('services');
  };

  const continueFromService = () => {
    if (!service || !category || !availabilityChecked) return;
    if (!available) return;
    setStep('booking');
  };

  const validateAndContinue = () => {
    if (!service || !category || !date || !time) {
      showNotification('Please choose a date and time.');
      return;
    }
    const required = ['house', 'street', 'villageArea', 'city', 'district', 'state', 'pinCode'] as const;
    if (required.some(k => !address[k].trim())) {
      showNotification('Please complete the residential address, including village/area, city, district and PIN code.');
      return;
    }
    const formatted = serializeAddress(address);
    setSaving(true);
    try {
      localStorage.setItem('punchx_residential_address', JSON.stringify(address));
      localStorage.setItem('punchx_residential_address_label', formatted);
      localStorage.setItem('punchx_pending_booking', JSON.stringify({
        serviceId: service.id,
        serviceName: service.name,
        category: category.name,
        subcategory: subcategory?.name || '',
        description: service.description,
        price: service.price,
        address: formatted,
        residentialAddress: address,
        date,
        time,
        dispatchMode: 'AUTO_MATCH',
        serviceAvailabilityChecked: true,
        serviceAvailable: available,
        createdAt: new Date().toISOString(),
      }));
      setCitizenAddress(formatted);
      onSelectCategory?.(category.name);
      onTransition('payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-24 text-[#17191d]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#858992]">PUNCHX services</div><h1 className="truncate text-lg font-black">{category?.name || 'All services'}</h1></div>
          {category && <button onClick={() => { setCategory(null); setSubcategory(null); setService(null); setStep('categories'); }} className="text-xs font-extrabold text-[#7358d7]">All 50</button>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2.5">
          <Search className="h-4 w-4 text-[#777c85]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={step === 'categories' ? 'Search all 50 services' : `Search ${category?.name || 'services'}`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          {search && <button onClick={() => setSearch('')}><X className="h-4 w-4 text-[#777c85]" /></button>}
        </div>

        {step === 'categories' && <>
          <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#7358d7]" /><div><div className="text-sm font-black">All 50 PUNCHX service categories</div><div className="text-xs text-[#777c85]">Choose the main branch first, just like a modern home-service catalogue.</div></div></div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(cat => <button key={cat.id} onClick={() => chooseCategory(getCatalogCategory(cat.id)!)} className="group rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[#7358d7]/20">
              <img src={getCatalogCategory(cat.id)?.image} alt="" className="h-24 w-full rounded-xl object-cover bg-[#f1f2f4]" loading="lazy" />
              <div className="mt-3 text-sm font-black">{cat.name}</div><div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#777c85]">{cat.shortDesc}</div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold text-[#7358d7]"><span>Explore services</span><ChevronRight className="h-3.5 w-3.5" /></div>
            </button>)}
          </div>
        </>}

        {step === 'subcategories' && category && <>
          <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-[10px] font-bold uppercase tracking-wider text-[#858992]">Main service</div><div className="mt-1 text-2xl font-black">{category.name}</div><div className="mt-1 text-sm text-[#777c85]">Select the type of work you need.</div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subcategories.map(sub => <button key={sub.id} onClick={() => chooseSubcategory(sub)} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left shadow-sm transition hover:ring-2 hover:ring-[#7358d7]/20">
              <img src={sub.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#f1f2f4]" loading="lazy" /><div className="min-w-0 flex-1"><div className="font-black">{sub.name}</div><div className="mt-1 text-[11px] leading-4 text-[#777c85]">{sub.description}</div><div className="mt-2 text-[10px] font-extrabold text-[#7358d7]">{sub.items.length} services <ChevronRight className="inline h-3 w-3" /></div></div>
            </button>)}
          </div>
        </>}

        {step === 'services' && category && subcategory && <>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#777c85]"><span>{category.name}</span><ChevronRight className="h-3 w-3" /><span className="font-black text-[#17191d]">{subcategory.name}</span></div>
          <div className="space-y-2 rounded-2xl bg-white ring-1 ring-black/5">
            {services.map(item => <article key={item.id} className={`flex gap-3 border-b border-black/5 p-3 last:border-0 ${service?.id === item.id ? 'bg-[#f7f4ff]' : ''}`}>
              <img src={item.image} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover bg-[#f1f2f4]" loading="lazy" />
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="text-sm font-black leading-5">{item.name}</h2>{item.popular && <span className="shrink-0 rounded-full bg-[#f0ecff] px-2 py-1 text-[9px] font-black text-[#7358d7]">Popular</span>}</div><div className="mt-1 text-[11px] text-[#777c85]">★ {item.rating?.toFixed(2)} ({item.reviews} reviews) · {item.duration}</div><div className="mt-1 font-black">Starts at ₹{item.price.toLocaleString('en-IN')}</div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#777c85]">{item.description}</p><button onClick={() => selectService(item)} className={`mt-2 rounded-lg px-4 py-1.5 text-[10px] font-black ${service?.id === item.id ? 'bg-[#7358d7] text-white' : 'border border-[#7358d7] text-[#7358d7]'}`}>{service?.id === item.id ? 'Selected' : 'Add'}</button></div>
            </article>)}
          </div>
          {service && <div className="sticky bottom-3 mt-4 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/10">
            {availabilityChecked && <div className={`mb-2 rounded-xl p-3 text-xs font-bold ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{available ? <Check className="mr-1 inline h-4 w-4" /> : null}{availabilityMessage}</div>}
            {!availabilityChecked && <div className="mb-2 text-xs text-[#777c85]">Checking service availability…</div>}
            {availabilityChecked && !available && <div className="mb-2 text-xs text-[#777c85]">Try another service or choose another service area. Your booking does not continue to address/payment.</div>}
            <button disabled={!available} onClick={continueFromService} className="w-full rounded-xl bg-[#7358d7] py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Continue with {service.name}</button>
          </div>}
        </>}

        {step === 'booking' && service && category && <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center gap-2 text-xs font-bold text-[#7358d7]"><CalendarDays className="h-4 w-4" /> 1. Choose date & time</div><div className="mt-3 grid grid-cols-2 gap-2"><input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none"/><select value={time} onChange={e => setTime(e.target.value)} className="rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none"><option value="">Select slot</option><option>8:00 AM – 9:00 AM</option><option>10:00 AM – 11:00 AM</option><option>12:00 PM – 1:00 PM</option><option>2:00 PM – 3:00 PM</option><option>4:00 PM – 5:00 PM</option><option>6:00 PM – 7:00 PM</option></select></div></section>
            <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="flex items-center gap-2 text-xs font-bold text-[#7358d7]"><Home className="h-4 w-4" /> 2. Residential address</div><p className="mt-1 text-[10px] text-[#777c85]">This is the visit destination for the professional. It is stored separately from device-location geofencing.</p></section>
          </div>
          <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="grid gap-3 sm:grid-cols-2">
              {([['house','House / Flat / Building'],['street','Street / Road'],['villageArea','Village / Area name'],['landmark','Landmark / Directions'],['city','City'],['district','District'],['state','State'],['pinCode','PIN code']] as const).map(([key,label]) => <label key={key} className="text-xs font-bold text-[#555a63]">{label}<input value={address[key]} onChange={e => setAddress(prev => ({...prev, [key]: e.target.value}))} placeholder={label} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-3 text-sm font-semibold outline-none focus:border-[#7358d7]" /></label>)}
            </div>
            <div className="mt-4 rounded-xl bg-[#f7f7f8] p-3"><div className="flex items-center gap-2 text-xs font-black"><MapPin className="h-4 w-4 text-[#7358d7]" /> Residential address</div><div className="mt-1 text-xs leading-5 text-[#777c85]">{serializeAddress(address) || 'Complete the address above.'}</div></div>
          </section>
          <section className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><div className="text-xs font-bold uppercase tracking-wider text-[#858992]">3. Booking review</div><div className="mt-2 flex items-center justify-between"><div><div className="font-black">{service.name}</div><div className="text-xs text-[#777c85]">{category.name} · {subcategory?.name}</div></div><div className="font-black">₹{service.price.toLocaleString('en-IN')}</div></div><div className="mt-3 text-xs text-[#777c85]">Date: {date || 'Not selected'} · Time: {time || 'Not selected'}</div><div className="mt-1 text-xs text-[#777c85]">Visit: {serializeAddress(address) || 'Not completed'}</div></section>
          <button disabled={saving} onClick={validateAndContinue} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] py-4 text-sm font-black text-white disabled:opacity-50">Continue to secure payment <ChevronRight className="h-4 w-4" /></button>
        </>}
      </main>
    </div>
  );
}
