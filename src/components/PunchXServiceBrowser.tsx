import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Search, X, MapPin, Home, Clock3, Wrench } from 'lucide-react';
import { PUNCHX_50_CATEGORIES, ServiceCategoryItem } from '../data/categories';
import { PunchXLeafService, PunchXServiceBranch, PunchXSubcategory, getPunchXServiceBranch } from '../data/serviceHierarchy';
import CategoryIcon from './CategoryIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  onTransition: (target: any) => void;
  citizenAddress: string;
}

type Level = 'categories' | 'subcategories' | 'services';

export default function PunchXServiceBrowser({ open, onClose, onSelectCategory, onTransition, citizenAddress }: Props) {
  const [level, setLevel] = useState<Level>('categories');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<PunchXServiceBranch | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<PunchXSubcategory | null>(null);
  const [query, setQuery] = useState('');

  const categories = useMemo(() => PUNCHX_50_CATEGORIES.filter(item => `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const subcategories = selectedBranch?.subcategories || [];
  const services = selectedSubcategory?.services || [];

  const reset = () => { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); setSelectedSubcategory(null); setQuery(''); };
  const close = () => { reset(); onClose(); };
  const openCategory = (category: ServiceCategoryItem) => {
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

  const title = level === 'categories' ? 'All PUNCHX services' : level === 'subcategories' ? selectedCategory?.name || 'Services' : selectedSubcategory?.name || 'Select a service';
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{categories.map(category=><button key={category.id} onClick={()=>openCategory(category)} className="group rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-[#7358d7]/30"><div className="flex h-16 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><CategoryIcon category={category.name} className="h-8 w-8"/></div><div className="mt-3 flex items-start justify-between gap-2"><span className="text-sm font-black leading-4">{category.name}</span><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#aaaeb6]"/></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#858a93]">{category.shortDesc}</p><p className="mt-2 text-[11px] font-black">Starts ₹{category.basePrice.toLocaleString('en-IN')}</p></button>)}</div>
        </>}

        {level === 'subcategories' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{subcategories.filter(s=>s.name.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} onClick={()=>openSubcategory(group)} className="flex min-h-[130px] flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 hover:ring-[#7358d7]/30"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-6 w-6"/></div><div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-black">{group.name}</span><ChevronRight className="h-4 w-4 text-[#aaaeb6]"/></div><p className="mt-1 text-[10px] text-[#858a93]">{group.services.length} services</p></div></button>)}</div>}

        {level === 'services' && <div className="mx-auto max-w-3xl space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="flex w-full gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-[#7358d7]/30"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-7 w-7"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black">{service.name}</h3><p className="mt-1 text-[10px] font-bold text-[#7358d7]">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-[#f3f0ff] px-2 py-1 text-xs font-black text-[#7358d7]">Starts ₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span>View details</span><span className="text-[#7358d7]">Add</span></div></div></button>)}</div>}
      </div>
      {citizenAddress && <div className="border-t border-black/5 bg-white px-4 py-3 text-xs sm:px-6"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-[#7358d7]"/><span className="font-black">Residential address:</span><span className="truncate text-[#6f747d]">{citizenAddress}</span></div></div>}
    </div>
  </div>;
}
