import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, Search, ShieldCheck, UsersRound, Wrench, X, AlertTriangle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { AppScreen } from '../types';
import { isCategoryMatching } from '../data/categories';
import { DEMO_PROFESSIONALS } from '../data/demoProfessionals';
import { calculateDistanceKm, getAccurateCurrentPosition, getCoordinatesForAddressOrSector, reverseGeocodeCoords, getServiceRadiusKm } from '../lib/location';

type Service = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price?: number;
  duration?: string;
  rating?: number;
  reviewsCount?: number;
  image?: string;
  faqs?: string[];
  active?: boolean;
  optionsCount?: number;
};

type Professional = {
  id: string;
  name: string;
  category: string;
  categories?: string[];
  rating: number;
  available: boolean;
  address?: string;
  area?: string;
  sector?: string;
  location?: { lat: number; lng: number };
  isDemo?: boolean;
};

type ServiceArea = { lat: number; lng: number; address: string; area: string; city: string; sector: string };
type AddressParts = { house: string; street: string; locality: string; pin: string; landmark: string };

interface Props {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker?: (worker: any) => void;
  showNotification: (message: string) => void;
  citizenAddress: string;
  setCitizenAddress: (address: string) => void;
}

const DEMO_PROFESSIONALS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PROFESSIONALS === 'true';
const STEPS = ['services', 'details', 'location', 'datetime', 'summary'] as const;
type Step = typeof STEPS[number];

function normalizeService(id: string, data: any): Service | null {
  const name = String(data.name || data.title || '').trim();
  const category = String(data.category || data.serviceCategory || '').trim();
  if (!name || !category) return null;
  const rawPrice = data.price ?? data.startingPrice ?? data.basePrice;
  const price = Number(rawPrice);
  return {
    id,
    name,
    category,
    subcategory: String(data.subcategory || data.serviceGroup || data.group || 'Services'),
    description: String(data.description || data.shortDescription || 'PUNCHX service'),
    price: Number.isFinite(price) ? price : undefined,
    duration: typeof data.duration === 'string' ? data.duration : undefined,
    rating: typeof data.rating === 'number' ? data.rating : undefined,
    reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : undefined,
    image: typeof data.image === 'string' ? data.image : undefined,
    faqs: Array.isArray(data.faqs) ? data.faqs.map(String) : undefined,
    active: data.active !== false,
    optionsCount: Number.isFinite(Number(data.optionsCount)) ? Number(data.optionsCount) : undefined,
  };
}

function normalizeProfessional(id: string, data: any): Professional {
  return {
    id,
    name: String(data.legalName || data.name || 'Verified Professional'),
    category: String(data.skill || data.category || 'Professional'),
    categories: Array.isArray(data.categories) ? data.categories.map(String) : undefined,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    available: data.available !== false,
    address: String(data.address || ''),
    area: String(data.area || ''),
    sector: String(data.sector || ''),
    location: data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number' ? data.location : undefined,
    isDemo: false,
  };
}

function workerToSelection(worker: Professional) {
  return {
    id: worker.id,
    name: worker.name,
    category: worker.category,
    categories: worker.categories,
    rating: worker.rating,
    reviewsCount: 0,
    avatar: '',
    proBadge: 'AUTHORIZED' as const,
    price: 0,
    available: worker.available,
    address: worker.address,
    area: worker.area,
    sector: worker.sector,
    location: worker.location,
  };
}

export default function PdfServiceFlow({ onTransition, selectedCategory, onSelectCategory, onSelectWorker, showNotification, citizenAddress, setCitizenAddress }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('services');
  const [selected, setSelected] = useState<Service | null>(null);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [checking, setChecking] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [area, setArea] = useState<ServiceArea | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressParts, setAddressParts] = useState<AddressParts>({ house: '', street: '', locality: '', pin: '', landmark: '' });
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [addressValidating, setAddressValidating] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [matchingCount, setMatchingCount] = useState(0);

  const fullAddress = useMemo(() => [addressParts.house, addressParts.street, addressParts.locality, addressParts.pin, addressParts.landmark ? `Landmark: ${addressParts.landmark}` : ''].map(value => value.trim()).filter(Boolean).join(', '), [addressParts]);
  const category = selectedCategory || 'All Services';
  const visible = useMemo(() => services.filter(service => {
    const categoryMatch = category.toLowerCase() === 'all services' || category.toLowerCase() === 'all' || service.category.toLowerCase() === category.toLowerCase() || isCategoryMatching(service.category, category);
    const textMatch = `${service.name} ${service.description} ${service.subcategory}`.toLowerCase().includes(query.toLowerCase().trim());
    return categoryMatch && textMatch && service.active !== false;
  }), [services, category, query]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), snapshot => {
      setServices(snapshot.docs.map(doc => normalizeService(doc.id, doc.data())).filter(Boolean) as Service[]);
      setLoading(false);
    }, error => { console.warn('PUNCHX service catalogue:', error); setServices([]); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workerApplications'), snapshot => {
      const next = snapshot.docs.filter(doc => doc.data().status === 'APPROVED').map(doc => normalizeProfessional(doc.id, doc.data()));
      const demos = DEMO_PROFESSIONALS.map((worker: any) => ({ id: worker.id, name: worker.name, category: worker.category, categories: worker.categories, rating: worker.rating || 0, available: worker.available !== false, address: worker.address, area: worker.area, sector: worker.sector, location: worker.location, isDemo: true }));
      setProfessionals(DEMO_PROFESSIONALS_ENABLED ? [...demos, ...next] : next);
    }, error => {
      console.warn('PUNCHX professional catalogue:', error);
      setProfessionals(DEMO_PROFESSIONALS_ENABLED ? DEMO_PROFESSIONALS.map((worker: any) => ({ ...worker, isDemo: true })) : []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshLocation = async () => {
      if (!navigator.geolocation) return;
      setLocationLoading(true);
      try {
        const coords = await getAccurateCurrentPosition(true);
        const resolved = await reverseGeocodeCoords(coords.lat, coords.lng);
        if (cancelled) return;
        const nextArea = { lat: coords.lat, lng: coords.lng, address: resolved.address, area: resolved.area || resolved.city || 'Local Area', city: resolved.city, sector: resolved.sector };
        setArea(nextArea);
        localStorage.setItem('punchx_user_location', JSON.stringify({ ...nextArea, timestamp: new Date().toISOString() }));
      } catch {
        try {
          const cached = JSON.parse(localStorage.getItem('punchx_user_location') || '{}');
          if (!cancelled && typeof cached.lat === 'number' && typeof cached.lng === 'number') setArea(cached);
        } catch {}
      } finally { if (!cancelled) setLocationLoading(false); }
    };
    refreshLocation();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!citizenAddress) return;
    const parts = citizenAddress.split(',').map(v => v.trim()).filter(Boolean);
    setAddressParts(prev => prev.house ? prev : { house: parts[0] || '', street: parts[1] || '', locality: parts[2] || '', pin: parts.find(part => /\b\d{6}\b/.test(part))?.match(/\b\d{6}\b/)?.[0] || '', landmark: '' });
  }, [citizenAddress]);

  const getMatchingProfessionals = (service: Service, coords: { lat: number; lng: number } | null = area) => {
    if (!coords) return [];
    return professionals.filter(pro => {
      if (!pro.available) return false;
      const skillMatch = isCategoryMatching(pro.categories || pro.category, service.category) || pro.category.toLowerCase() === service.category.toLowerCase();
      if (!skillMatch) return false;
      const proCoords = pro.location || getCoordinatesForAddressOrSector(pro.address, pro.area, pro.sector);
      return calculateDistanceKm(coords.lat, coords.lng, proCoords.lat, proCoords.lng) <= getServiceRadiusKm(area?.city || area?.area);
    }).sort((a, b) => b.rating - a.rating);
  };

  const checkServiceability = async (service: Service, coords: { lat: number; lng: number } | null = area) => {
    setChecking(true); setUnavailableReason('');
    try {
      if (!coords) { setUnavailableReason('We could not determine your service area. Choose a location and try again.'); return false; }
      const matches = getMatchingProfessionals(service, coords);
      setMatchingCount(matches.length);
      if (matches.length === 0) {
        setUnavailableReason(`No eligible ${service.category.toLowerCase()} professional is currently available within the ${getServiceRadiusKm(area?.city || area?.area)} km PUNCHX service range.`);
        return false;
      }
      return true;
    } finally { setChecking(false); }
  };

  const selectService = async (service: Service) => {
    const available = await checkServiceability(service);
    if (!available) { setSelected(null); return; }
    setSelected(service); setStep('details');
  };

  const validateResidentialAddress = async () => {
    if (!fullAddress.trim()) { setAddressError('Enter the residential/service address where the professional must visit.'); return false; }
    if (addressParts.pin && !/^\d{6}$/.test(addressParts.pin.trim())) { setAddressError('Enter a valid 6-digit PIN code.'); return false; }
    setAddressValidating(true); setAddressError('');
    try {
      let coords: { lat: number; lng: number } | null = null;
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      try {
        const response = await fetch('/api/maps/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ address: fullAddress, landmark: addressParts.landmark, area: addressParts.locality }) });
        if (response.ok) { const data = await response.json(); if (typeof data.lat === 'number' && typeof data.lng === 'number') coords = { lat: data.lat, lng: data.lng }; }
      } catch (error) { console.warn('PUNCHX address geocode fallback:', error); }
      if (!coords) coords = getCoordinatesForAddressOrSector(fullAddress, addressParts.locality);
      setAddressCoordinates(coords);
      const serviceCenter = area || coords;
      if (!serviceCenter) { setAddressError('Choose a service area before confirming the visit address.'); return false; }
      const centerDistance = calculateDistanceKm(serviceCenter.lat, serviceCenter.lng, coords.lat, coords.lng);
      const serviceRadiusKm = getServiceRadiusKm(area?.city || area?.area);
      if (centerDistance > serviceRadiusKm) { setAddressError(`This residential address is ${centerDistance.toFixed(1)} km from the detected service area and is outside the ${serviceRadiusKm} km PUNCHX range.`); return false; }
      if (selected) {
        const matches = getMatchingProfessionals(selected, coords); setMatchingCount(matches.length);
        if (matches.length === 0) { setAddressError('This exact address is not currently serviceable for the selected service. Please change the address or choose another service.'); return false; }
      }
      setAddressConfirmed(true); setCitizenAddress(fullAddress);
      localStorage.setItem('punchx_service_address', JSON.stringify({ ...addressParts, fullAddress, lat: coords.lat, lng: coords.lng, area: area?.area || addressParts.locality, updatedAt: new Date().toISOString() }));
      return true;
    } finally { setAddressValidating(false); }
  };

  const next = async () => {
    if (step === 'services') {
      if (selected) setStep('details'); else showNotification('Select a service to continue.');
    } else if (step === 'details') {
      if (!selected) return;
      const available = await checkServiceability(selected, area);
      if (!available) { setStep('services'); return; }
      setStep('location');
    } else if (step === 'location') {
      if (await validateResidentialAddress()) setStep('datetime');
    } else if (step === 'datetime') {
      if (!date || !time) { showNotification('Choose a date and time.'); return; }
      if (selected && !getMatchingProfessionals(selected, addressCoordinates || area).length) { setAddressError('No eligible professional is available for this visit location. Please change the address or choose another service.'); setStep('location'); return; }
      setStep('summary');
    } else if (step === 'summary' && selected) {
      const matches = getMatchingProfessionals(selected, addressCoordinates || area);
      if (!matches.length) { setUnavailableReason('Availability changed. No eligible professional is currently available for this address.'); setStep('location'); return; }
      const selectedWorker = matches[0];
      try {
        localStorage.setItem('punchx_pending_booking', JSON.stringify({ serviceId: selected.id, serviceName: selected.name, category: selected.category, description: selected.description, price: selected.price ?? null, address: fullAddress, residentialAddress: fullAddress, addressCoordinates: addressCoordinates || area, geofenceArea: area?.area || addressParts.locality || 'Local Area', geofenceCity: area?.city || '', date, time, matchingProfessionalId: selectedWorker.id, matchingProfessionalName: selectedWorker.name, matchingProfessionalIsDemo: Boolean(selectedWorker.isDemo), createdAt: new Date().toISOString() }));
      } catch {}
      onSelectCategory?.(selected.category);
      if (onSelectWorker) onSelectWorker(workerToSelection(selectedWorker));
      onTransition('booking');
    }
  };

  const back = () => {
    if (step === 'services') onTransition('home');
    else if (step === 'details') { setSelected(null); setStep('services'); }
    else if (step === 'location') setStep('details');
    else if (step === 'datetime') setStep('location');
    else setStep('datetime');
  };

  const stepIndex = STEPS.indexOf(step);
  const areaLabel = area?.area || 'Detecting service area…';

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-24 text-[#17191d]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f5f7]" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8b9098]"><MapPin className="h-3.5 w-3.5 text-[#7358d7]" /> Serving in {areaLabel}</div><h1 className="truncate text-lg font-black">{step === 'services' ? category : step === 'details' ? 'Service details' : step === 'location' ? 'Residential visit address' : step === 'datetime' ? 'Choose date & time' : 'Review booking'}</h1></div>
            <span className="text-[10px] font-bold text-[#858a93]">{stepIndex + 1}/{STEPS.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1">{STEPS.map((item, i) => <div key={item} className={`h-1.5 rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-[#7358d7]' : 'bg-[#e5e6ea]'}`} />)}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        {step === 'services' && <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-[#f6f7f9] px-3 py-2.5"><Search className="h-4 w-4 text-[#858a93]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${category} services`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{query && <button onClick={() => setQuery('')}><X className="h-4 w-4" /></button>}</div>
          <div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-[#7358d7]">{category}</div><h2 className="mt-1 text-xl font-black">Available services</h2></div>{locationLoading && <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#7358d7]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating area</div>}</div>
          {loading ? <div className="rounded-2xl bg-[#f6f7f9] p-6 text-sm text-[#777c85]">Loading published PUNCHX services…</div> : visible.length ? <div className="divide-y divide-black/5">{visible.map(service => <div key={service.id} className="flex gap-3 py-5 first:pt-1 last:pb-1">
            <div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-[#858a93]">{service.subcategory}</div><h3 className="mt-1 text-sm font-black leading-5">{service.name}</h3><div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#666b74]">{service.rating ? <><span>★ {service.rating.toFixed(1)}</span>{service.reviewsCount ? <span>({service.reviewsCount.toLocaleString('en-IN')} reviews)</span> : null}</> : <span>Verified PUNCHX service</span>}</div><div className="mt-2 text-xs font-black">{typeof service.price === 'number' ? `₹${service.price.toLocaleString('en-IN')}` : 'Price shown after service selection'}</div><p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#777c85]">{service.description}</p><button onClick={() => { setSelected(service); setStep('details'); }} className="mt-2 text-xs font-black text-[#7358d7]">View details</button></div>
            <div className="w-28 shrink-0"><div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-[#f1f2f5]">{service.image ? <img src={service.image} alt="" className="h-full w-full object-cover" /> : <Wrench className="h-8 w-8 text-[#9da2aa]" />}</div><button onClick={() => selectService(service)} disabled={checking} className="relative z-10 mx-auto -mt-3 block rounded-lg border border-[#7358d7] bg-white px-5 py-1.5 text-xs font-black text-[#7358d7] shadow-sm disabled:opacity-50">{checking ? 'Checking…' : 'Add'}</button><div className="mt-2 text-center text-[9px] font-semibold text-[#858a93]">{service.optionsCount && service.optionsCount > 1 ? `${service.optionsCount} options` : service.duration || 'Service'}</div></div>
          </div>)}</div> : <div className="rounded-2xl border border-dashed border-black/10 p-7 text-center"><Wrench className="mx-auto h-8 w-8 text-[#9da2aa]" /><p className="mt-3 font-black">No published services found</p><p className="mt-1 text-sm text-[#777c85]">No unavailable or fake service is shown.</p></div>}

          {unavailableReason && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /><div><div className="font-black text-red-900">Service unavailable here</div><p className="mt-1 text-xs leading-5 text-red-800">{unavailableReason}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => onTransition('customer-setup')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200">Change location</button><button onClick={() => { setUnavailableReason(''); setQuery(''); }} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">Browse another service</button></div></div></div></div>}
        </section>}

        {step === 'details' && selected && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="flex items-start gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f1f2f5]">{selected.image ? <img src={selected.image} alt="" className="h-full w-full object-cover" /> : <Wrench className="h-7 w-7 text-[#7358d7]" />}</div><div><div className="text-xs font-bold uppercase tracking-wider text-[#8b9098]">Service details</div><h2 className="mt-1 text-2xl font-black">{selected.name}</h2><div className="mt-1 text-xs font-semibold text-[#777c85]">{selected.rating ? `★ ${selected.rating.toFixed(1)} · ${selected.reviewsCount || 0} reviews` : 'PUNCHX service'}</div></div></div>
          <p className="mt-5 text-sm leading-6 text-[#666b74]">{selected.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f6f7f9] p-4"><div className="text-xs text-[#8a8f98]">Starting price</div><div className="mt-1 font-black">{typeof selected.price === 'number' ? `₹${selected.price.toLocaleString('en-IN')}` : 'Backend quote'}</div></div><div className="rounded-2xl bg-[#f6f7f9] p-4"><div className="text-xs text-[#8a8f98]">Professional supply</div><div className="mt-1 font-black">{matchingCount || getMatchingProfessionals(selected).length} nearby</div></div></div>
          <div className="mt-5 rounded-2xl bg-[#eff6ff] p-4 text-xs leading-5 text-[#31537e]"><ShieldCheck className="mr-1 inline h-4 w-4" /> PUNCHX will check the selected service again for your area before you enter the final booking steps.</div>
          <div className="mt-5 flex gap-3"><button onClick={() => { setSelected(null); setStep('services'); }} className="flex-1 rounded-2xl bg-[#f4f5f7] px-5 py-3 text-sm font-black">Change service</button><button onClick={next} disabled={checking} className="flex-1 rounded-2xl bg-[#7358d7] px-5 py-3 text-sm font-black text-white">{checking ? 'Checking…' : 'Continue'}</button></div>
        </section>}

        {step === 'location' && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="flex items-start gap-3"><MapPin className="mt-1 h-6 w-6 shrink-0 text-[#7358d7]" /><div><h2 className="text-xl font-black">Where should we visit?</h2><p className="mt-1 text-sm text-[#777c85]">Enter the residential/service address where the professional will physically visit.</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">House / Flat / Building *</span><input value={addressParts.house} onChange={e => setAddressParts(p => ({ ...p, house: e.target.value }))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" placeholder="Flat 3B, House 24" /></label><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Street / Road *</span><input value={addressParts.street} onChange={e => setAddressParts(p => ({ ...p, street: e.target.value }))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" placeholder="Main Road" /></label><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Locality / Area *</span><input value={addressParts.locality} onChange={e => setAddressParts(p => ({ ...p, locality: e.target.value }))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" placeholder={area?.area || 'Your area'} /></label><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">PIN code *</span><input inputMode="numeric" maxLength={6} value={addressParts.pin} onChange={e => setAddressParts(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" placeholder="700001" /></label></div>
          <label className="mt-3 block rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Landmark / directions for the professional</span><input value={addressParts.landmark} onChange={e => setAddressParts(p => ({ ...p, landmark: e.target.value }))} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" placeholder="Near gate / building entrance / landmark" /></label>
          <div className="mt-5 rounded-2xl border border-[#7358d7]/15 bg-[#f3f0ff] p-4"><div className="flex items-center gap-2 text-xs font-black text-[#5f4aaa]"><MapPin className="h-4 w-4" /> Detected browsing area: {areaLabel}</div><p className="mt-1 text-[11px] leading-5 text-[#6f6888]">The exact residential address is used for the professional's visit. The device's current location is only the starting service-area signal.</p></div>
          {addressError && <div className="mt-4 flex gap-2 rounded-2xl bg-red-50 p-4 text-xs font-semibold leading-5 text-red-800"><AlertTriangle className="h-4 w-4 shrink-0" />{addressError}</div>}
          {addressConfirmed && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-green-50 p-4 text-xs font-black text-green-800"><CheckCircle2 className="h-4 w-4" /> Address verified for this service area.</div>}
          <button onClick={next} disabled={addressValidating} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] px-5 py-4 text-sm font-black text-white disabled:opacity-50">{addressValidating ? <><Loader2 className="h-5 w-5 animate-spin" /> Checking address…</> : <>Confirm visit address <ArrowRight className="h-4 w-4" /></>}</button>
        </section>}

        {step === 'datetime' && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-[#7358d7]" /><div><h2 className="text-xl font-black">Choose a convenient time</h2><p className="text-sm text-[#777c85]">Slots are shown only after the service and visit address pass the availability check.</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Date *</span><input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e => setDate(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" /></label><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Time *</span><input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" /></label></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#f6f7f9] p-4"><Clock3 className="h-4 w-4 text-[#7358d7]" /><div className="mt-2 text-xs font-black">Service duration</div><div className="mt-1 text-[11px] text-[#777c85]">{selected?.duration || 'As listed by service'}</div></div><div className="rounded-2xl bg-[#f6f7f9] p-4"><UsersRound className="h-4 w-4 text-[#7358d7]" /><div className="mt-2 text-xs font-black">Nearby supply</div><div className="mt-1 text-[11px] text-[#777c85]">{matchingCount} eligible professional(s)</div></div><div className="rounded-2xl bg-[#f6f7f9] p-4"><MapPin className="h-4 w-4 text-[#7358d7]" /><div className="mt-2 text-xs font-black">Visit area</div><div className="mt-1 truncate text-[11px] text-[#777c85]">{addressParts.locality || areaLabel}</div></div></div>
          <button onClick={next} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] px-5 py-4 text-sm font-black text-white">Continue to review <ArrowRight className="h-4 w-4" /></button>
        </section>}

        {step === 'summary' && selected && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7358d7]"><ShieldCheck className="h-4 w-4" /> Final review</div><h2 className="mt-3 text-2xl font-black">Ready to book?</h2>
          <div className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-[#777c85]">Service</span><span className="text-right font-black">{selected.name}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Visit address</span><span className="max-w-[62%] text-right font-bold">{fullAddress}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Service area</span><span className="font-bold">{areaLabel}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Date</span><span className="font-bold">{date}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Time</span><span className="font-bold">{time}</span></div><div className="flex justify-between gap-4 border-t border-black/5 pt-4"><span className="font-black">Starting service price</span><span className="font-black">{typeof selected.price === 'number' ? `₹${selected.price.toLocaleString('en-IN')}` : 'Calculated by backend'}</span></div></div>
          <div className="mt-5 rounded-2xl bg-[#f0ecff] p-4 text-xs leading-5 text-[#5f5873]">After confirmation, the selected professional is matched from the eligible PUNCHX supply for this service and visit location. The confirmed residential address is included in the booking so the professional can navigate to the visit.</div>
          <button onClick={next} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] px-5 py-4 text-sm font-black text-white">Place booking <ArrowRight className="h-4 w-4" /></button>
        </section>}
      </main>

      {step !== 'summary' && step !== 'services' && selected && <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 p-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="hidden min-w-0 flex-1 sm:block"><div className="truncate text-xs font-black">{selected.name}</div><div className="text-[10px] text-[#858a93]">{step === 'location' ? 'Residential visit address' : step === 'datetime' ? 'Date & time' : 'Service details'}</div></div><button onClick={next} disabled={checking || addressValidating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7358d7] px-5 py-3 text-sm font-black text-white disabled:opacity-40">{checking || addressValidating ? 'Checking…' : 'Continue'} <ArrowRight className="h-4 w-4" /></button></div></div>}
    </div>
  );
}
