import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Search, ShoppingCart, ShieldCheck, X } from 'lucide-react';
import { AppScreen } from '../types';
import { PUNCHX_50_CATEGORIES } from '../data/categories';
import { getCatalogCategory, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';

interface ProvidersListProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  showNotification: (message: string) => void;
}

type CartItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  duration?: string;
  image?: string;
  bookingTiming: 'later';
};

const FEATURED_IDS = ['electrician','plumber','cleaner-housekeeper','ac-technician','pest-control-worker','beautician','carpenter','painter','cook','home-care-physiotherapy'];
const readCart = (): CartItem[] => {
  try {
    const value = JSON.parse(localStorage.getItem('punchx_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

export default function ProvidersList({ onTransition, selectedCategory, onSelectCategory, showNotification }: ProvidersListProps) {
  const initial = getCatalogCategory(selectedCategory || '');
  const [step, setStep] = useState<'categories'|'subcategories'|'services'>(initial ? 'subcategories' : 'categories');
  const [category, setCategory] = useState<ServiceCategory|null>(initial || null);
  const [subcategory, setSubcategory] = useState<ServicesSubcategory|null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PUNCHX_50_CATEGORIES.filter(item => FEATURED_IDS.includes(item.id) && (!q || `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(q)));
  }, [search]);

  const subcategories = useMemo(() => {
    if (!category) return [];
    const q = search.trim().toLowerCase();
    return category.subcategories.filter(item => !q || `${item.name} ${item.description} ${item.items.map(work=>work.name).join(' ')}`.toLowerCase().includes(q));
  }, [category, search]);

  const services = useMemo(() => {
    if (!subcategory) return [];
    const q = search.trim().toLowerCase();
    return subcategory.items.filter(item => !q || `${item.name} ${item.description}`.toLowerCase().includes(q));
  }, [subcategory, search]);

  const chooseCategory = (value: ServiceCategory) => {
    setCategory(value); setSubcategory(null); setSearch(''); setStep('subcategories');
    onSelectCategory?.(value.name);
  };

  const chooseSubcategory = (value: ServicesSubcategory) => {
    setSubcategory(value); setSearch(''); setStep('services');
  };

  const addToRequest = (service: ServiceItem) => {
    if (!category || !subcategory) return;
    const item: CartItem = {
      id: `${service.id}-${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      category: category.name,
      subcategory: subcategory.name,
      description: service.description,
      price: 0,
      duration: service.duration,
      image: service.image,
      bookingTiming: 'later'
    };
    const next = [...cart, item];
    try {
      localStorage.setItem('punchx_cart', JSON.stringify(next));
      setCart(next);
      setAddedServiceIds(current => [...current, service.id]);
      showNotification(`${service.name} added to your request.`);
    } catch {
      showNotification('Could not save this service. Please check device storage and try again.');
    }
  };

  const back = () => {
    if (step === 'services') { setStep('subcategories'); setSearch(''); return; }
    if (step === 'subcategories') { setStep('categories'); setCategory(null); setSearch(''); return; }
    if (window.history.state?.screen === 'providers' && window.history.length > 1) window.history.back();
    else onTransition('landing');
  };

  return <div id="punchx-service-discovery" className="min-h-screen bg-[#f8f7f3] pb-32 text-[#191814]">
    <header className="sticky top-0 z-40 border-b border-[#e8e1d4] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-7">
        <button type="button" onClick={back} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e1d4] bg-white hover:border-[#c5a66a]"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1"><div className="truncate text-base font-black">{category?.name || 'Explore services'}</div><div className="text-[10px] font-semibold text-[#8b8579]">Choose the work you need. PUNCHX reviews every request.</div></div>
        <span className="hidden items-center gap-1 rounded-full border border-[#e8e1d4] bg-[#fbfaf6] px-3 py-2 text-[10px] font-bold text-[#716b60] sm:inline-flex"><ShieldCheck className="h-3.5 w-3.5 text-[#94703a]"/> Admin-reviewed requests</span>
      </div>
    </header>

    <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#94703a]">{step==='categories'?'PUNCHX catalogue':step==='subcategories'?'Choose a service area':'Select exact work'}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{step==='categories'?'What do you need help with?':step==='subcategories'?'Choose the type of work.':'Tell us what needs to be done.'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77736b]">No public service rates or professional directory. Describe your requirement and our team will review serviceability and coordinate the next step.</p>
        </div>
        <div className="rounded-2xl border border-[#e8e1d4] bg-white px-4 py-3 text-xs font-bold text-[#716b60]">{cart.length} item{cart.length===1?'':'s'} in your request</div>
      </div>

      <label className="mb-6 flex items-center gap-3 rounded-2xl border border-[#e8e1d4] bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 shrink-0 text-[#94703a]"/>
        <span className="sr-only">Search services</span>
        <input value={search} onChange={event=>setSearch(event.target.value)} placeholder={step==='categories'?'Search service categories':step==='subcategories'? `Search ${category?.name||'services'}`:'Search exact work'} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#aaa397]"/>
        {search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear search"><X className="h-4 w-4 text-[#77736b]"/></button>}
      </label>

      {step==='categories'&&<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {categories.map(item=>{const value=getCatalogCategory(item.id);return value?<button key={item.id} type="button" onClick={()=>chooseCategory(value)} className="group overflow-hidden rounded-2xl border border-[#e8e1d4] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[#c5a66a] hover:shadow-lg">
          <img src={item.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"/>
          <div className="p-4"><h2 className="text-sm font-black">{item.name}</h2><p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#77736b]">{item.shortDesc}</p><span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#94703a]">Explore <ArrowRight className="h-3.5 w-3.5"/></span></div>
        </button>:null;})}
      </div>}

      {step==='subcategories'&&category&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subcategories.map(item=><button key={item.id} type="button" onClick={()=>chooseSubcategory(item)} className="flex items-center gap-4 rounded-2xl border border-[#e8e1d4] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5a66a] hover:shadow-md">
          <img src={item.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#f1ede4]"/>
          <span className="min-w-0 flex-1"><span className="block text-sm font-black">{item.name}</span><span className="mt-1 block text-xs leading-5 text-[#77736b]">{item.description}</span><span className="mt-2 block text-[10px] font-black text-[#94703a]">{item.items.length} work options</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#94703a]"/>
        </button>)}
      </div>}

      {step==='services'&&category&&subcategory&&<div className="overflow-hidden rounded-2xl border border-[#e8e1d4] bg-white shadow-sm">
        <div className="border-b border-[#eee8dc] bg-[#fbfaf6] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#94703a]">{category.name}</p><h2 className="mt-1 text-lg font-black">{subcategory.name}</h2><p className="mt-1 text-xs text-[#77736b]">Select one or more work items to include in your request.</p></div>
        {services.map(service=><article key={service.id} className="flex flex-col gap-4 border-b border-[#eee8dc] p-4 last:border-b-0 sm:flex-row sm:items-center">
          <img src={service.image} alt="" loading="lazy" className="h-20 w-20 rounded-xl object-cover bg-[#f1ede4]"/>
          <div className="min-w-0 flex-1"><div className="font-black">{service.name}</div><p className="mt-1 text-xs leading-5 text-[#77736b]">{service.description}</p><p className="mt-2 text-[10px] font-semibold text-[#8b8579]">Estimated duration: {service.duration || 'Confirmed after review'}</p></div>
          <button type="button" onClick={()=>addToRequest(service)} className={`shrink-0 rounded-xl px-4 py-3 text-xs font-black transition ${addedServiceIds.includes(service.id)?'border border-[#c5a66a] bg-[#f6f0e4] text-[#75572c]':'bg-[#171714] text-white hover:bg-[#343128]'}`}>{addedServiceIds.includes(service.id)?'Add another':'Add to request'} <ArrowRight className="ml-1 inline h-4 w-4 text-[#d7bd82]"/></button>
        </article>)}
      </div>}

      {((step==='categories'&&!categories.length)||(step==='subcategories'&&!subcategories.length)||(step==='services'&&!services.length))&&<div className="rounded-2xl border border-dashed border-[#d8cfbd] bg-white p-8 text-center text-sm text-[#77736b]">No matching options found. Try a broader search.</div>}
    </main>

    {cart.length>0&&<div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e8e1d4] bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(30,27,19,.08)] backdrop-blur-xl"><div className="mx-auto flex max-w-4xl items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f0e4] text-[#94703a]"><ShoppingCart className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="text-sm font-black">{cart.length} request item{cart.length===1?'':'s'}</div><div className="text-[10px] text-[#77736b]">Quotation is shared after review</div></div><button type="button" onClick={()=>onTransition('booking')} className="rounded-xl bg-[#c5a66a] px-5 py-3 text-xs font-black text-[#171510] hover:bg-[#dfc58b]">Review request <ArrowRight className="ml-1 inline h-4 w-4"/></button></div></div>}
  </div>;
}
