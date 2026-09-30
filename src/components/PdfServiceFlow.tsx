import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, MapPin, Search, ShieldCheck, Wrench, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { AppScreen, Worker } from '../types';
import { isCategoryMatching } from '../data/categories';

type Service = { id: string; name: string; category: string; subcategory: string; description: string; price?: number; duration?: string; rating?: number; reviewsCount?: number; image?: string; faqs?: string[] };

interface Props {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker: (worker: Worker) => void;
  showNotification: (message: string) => void;
  citizenAddress: string;
  setCitizenAddress: (address: string) => void;
}

function normalize(id: string, data: any): Service | null {
  const name = String(data.name || data.title || '').trim();
  const category = String(data.category || data.serviceCategory || '').trim();
  if (!name || !category) return null;
  const rawPrice = data.price ?? data.startingPrice ?? data.basePrice;
  const price = Number(rawPrice);
  return { id, name, category, subcategory: String(data.subcategory || data.serviceGroup || data.group || 'Services'), description: String(data.description || data.shortDescription || 'PUNCHX service'), price: Number.isFinite(price) ? price : undefined, duration: typeof data.duration === 'string' ? data.duration : undefined, rating: typeof data.rating === 'number' ? data.rating : undefined, reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : undefined, image: typeof data.image === 'string' ? data.image : undefined, faqs: Array.isArray(data.faqs) ? data.faqs.map(String) : undefined };
}

export default function PdfServiceFlow({ onTransition, selectedCategory, onSelectCategory, showNotification, citizenAddress, setCitizenAddress }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'services' | 'details' | 'location' | 'datetime' | 'summary'>('services');
  const [selected, setSelected] = useState<Service | null>(null);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState(citizenAddress || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => setAddress(citizenAddress || ''), [citizenAddress]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), snapshot => {
      setServices(snapshot.docs.map(doc => normalize(doc.id, doc.data())).filter(Boolean) as Service[]);
      setLoading(false);
    }, error => { console.warn('PUNCHX service catalogue:', error); setServices([]); setLoading(false); });
    return () => unsub();
  }, []);

  const category = selectedCategory || 'All Services';
  const visible = useMemo(() => services.filter(service => {
    const categoryMatch = category.toLowerCase() === 'all services' || category.toLowerCase() === 'all' || service.category.toLowerCase() === category.toLowerCase() || isCategoryMatching(service.category, category);
    const textMatch = `${service.name} ${service.description} ${service.subcategory}`.toLowerCase().includes(query.toLowerCase().trim());
    return categoryMatch && textMatch;
  }), [services, category, query]);

  const next = () => {
    if (step === 'services') { if (selected) setStep('details'); else showNotification('Select a service to continue.'); }
    else if (step === 'details') setStep('location');
    else if (step === 'location') { if (!address.trim()) { showNotification('Enter the service address.'); return; } setCitizenAddress(address.trim()); setStep('datetime'); }
    else if (step === 'datetime') { if (!date || !time) { showNotification('Choose a date and time.'); return; } setStep('summary'); }
    else if (step === 'summary' && selected) {
      try { localStorage.setItem('punchx_pending_booking', JSON.stringify({ serviceId: selected.id, serviceName: selected.name, category: selected.category, description: selected.description, price: selected.price ?? null, address: address.trim(), date, time, createdAt: new Date().toISOString() })); } catch {}
      onSelectCategory?.(selected.category);
      onTransition('booking');
    }
  };

  const back = () => {
    if (step === 'services') onTransition('home');
    else if (step === 'details') setStep('services');
    else if (step === 'location') setStep('details');
    else if (step === 'datetime') setStep('location');
    else setStep('datetime');
  };

  const stepIndex = ['services','details','location','datetime','summary'].indexOf(step);

  return <div className="min-h-screen bg-[#f7f8fa] pb-24 text-[#17191d]">
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f5f7]"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-wider text-[#8b9098]">PUNCHX booking</div><h1 className="truncate text-lg font-black">{step === 'services' ? category : step === 'details' ? 'Service details' : step === 'location' ? 'Location' : step === 'datetime' ? 'Date & time' : 'Booking summary'}</h1></div><span className="text-[10px] font-bold text-[#858a93]">{stepIndex + 1}/5</span></div></header>
    <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8"><div className="mb-5 grid grid-cols-5 gap-1">{[0,1,2,3,4].map(i => <div key={i} className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-[#7358d7]' : 'bg-[#e5e6ea]'}`} />)}</div>
      {step === 'services' && <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-7"><div className="flex items-center gap-2 rounded-2xl bg-[#f6f7f9] px-3 py-2.5"><Search className="h-4 w-4 text-[#858a93]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${category} services`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />{query && <button onClick={() => setQuery('')}><X className="h-4 w-4" /></button>}</div>{loading ? <p className="mt-5 rounded-2xl bg-[#f6f7f9] p-5 text-sm text-[#777c85]">Loading published services from PUNCHX backend…</p> : visible.length ? <div className="mt-5 space-y-3">{visible.map(service => <button key={service.id} onClick={() => setSelected(service)} className={`flex w-full gap-4 rounded-2xl border p-4 text-left ${selected?.id === service.id ? 'border-[#7358d7] bg-[#f3f0ff]' : 'border-black/5 bg-white'}`}><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f1f2f5]">{service.image ? <img src={service.image} alt="" className="h-full w-full object-cover" /> : <Wrench className="h-6 w-6 text-[#777c85]" />}</div><div className="min-w-0 flex-1"><div className="font-black">{service.name}</div><div className="mt-1 text-xs text-[#777c85]">{service.subcategory}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777c85]">{service.description}</p><div className="mt-2 text-sm font-black">{typeof service.price === 'number' ? `Starts at ₹${service.price.toLocaleString('en-IN')}` : 'Price from backend'}</div></div>{selected?.id === service.id && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#7358d7]" />}</button>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-black/10 p-7 text-center"><Wrench className="mx-auto h-8 w-8 text-[#9da2aa]" /><p className="mt-3 font-black">No published services found</p><p className="mt-1 text-sm text-[#777c85]">No demo service or fake price is shown.</p></div>}</section>}
      {step === 'details' && selected && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ecff]"><Wrench className="h-6 w-6 text-[#7358d7]" /></div><div><div className="text-xs font-bold uppercase tracking-wider text-[#8b9098]">Service details</div><h2 className="text-2xl font-black">{selected.name}</h2></div></div><p className="mt-5 text-sm leading-6 text-[#666b74]">{selected.description}</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#f6f7f9] p-4"><div className="text-xs text-[#8a8f98]">Price</div><div className="mt-1 font-black">{typeof selected.price === 'number' ? `₹${selected.price.toLocaleString('en-IN')}` : 'Backend quote'}</div></div><div className="rounded-2xl bg-[#f6f7f9] p-4"><div className="text-xs text-[#8a8f98]">Duration</div><div className="mt-1 font-black">{selected.duration || 'Backend data'}</div></div></div>{selected.faqs?.length ? <div className="mt-6"><h3 className="font-black">FAQs</h3><div className="mt-2 space-y-2">{selected.faqs.slice(0,4).map((faq, i) => <p key={i} className="rounded-xl bg-[#f7f8fa] p-3 text-xs leading-5 text-[#666b74]">{faq}</p>)}</div></div> : null}</section>}
      {step === 'location' && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"><div className="flex items-center gap-3"><MapPin className="h-6 w-6 text-[#7358d7]" /><div><h2 className="text-xl font-black">Where should we come?</h2><p className="text-sm text-[#777c85]">Use the service address for this booking.</p></div></div><textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter service address" className="mt-6 min-h-32 w-full resize-none rounded-2xl bg-[#f6f7f9] p-4 text-sm font-semibold outline-none" /><p className="mt-3 text-xs text-[#858a93]">Location permission should only be requested when the service flow needs it.</p></section>}
      {step === 'datetime' && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-[#7358d7]" /><div><h2 className="text-xl font-black">When should we come?</h2><p className="text-sm text-[#777c85]">Confirmed availability must come from the production backend.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" /></label><label className="rounded-2xl bg-[#f6f7f9] p-4"><span className="text-xs font-bold text-[#8a8f98]">Time</span><input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-bold outline-none" /></label></div></section>}
      {step === 'summary' && selected && <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7358d7]"><ShieldCheck className="h-4 w-4" /> Review before confirming</div><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-[#777c85]">Service</span><span className="text-right font-black">{selected.name}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Address</span><span className="max-w-[60%] text-right font-bold">{address}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Date</span><span className="font-bold">{date}</span></div><div className="flex justify-between gap-4"><span className="text-[#777c85]">Time</span><span className="font-bold">{time}</span></div><div className="flex justify-between gap-4 border-t border-black/5 pt-4"><span className="font-black">Applicable price</span><span className="font-black">{typeof selected.price === 'number' ? `₹${selected.price.toLocaleString('en-IN')}` : 'Calculated by backend'}</span></div></div><p className="mt-5 rounded-2xl bg-[#f6f7f9] p-4 text-xs leading-5 text-[#6f747d]">After confirmation, PUNCHX finds or assigns a professional from the real booking record. No demo assignment, fake ETA, fake live location or fake money is displayed.</p></section>}
    </main>
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 p-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="hidden min-w-0 flex-1 sm:block"><div className="text-xs font-black">{selected?.name || 'Select a service'}</div><div className="text-[10px] text-[#858a93]">{step === 'summary' ? `${date} · ${time}` : 'One primary action per screen'}</div></div><button onClick={next} disabled={step === 'services' && !selected} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7358d7] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{step === 'summary' ? 'Confirm booking' : 'Continue'} <ArrowRight className="h-4 w-4" /></button></div></div>
  </div>;
}
