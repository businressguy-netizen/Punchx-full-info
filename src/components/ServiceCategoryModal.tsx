import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, X, Check, ArrowRight, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, ChevronDown, ShieldCheck, UsersRound } from 'lucide-react';
import { PUNCHX_50_CATEGORIES, filterCategories } from '../data/categories';
import { serviceCategories, ServiceCategory, ServiceItem } from '../data/serviceCatalogs';
import { db } from '../lib/firebase';

export interface ServiceCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'citizen' | 'worker';
  selectedCategory?: string;
  selectedCategories?: string[];
  onSelectCategory?: (categoryName: string) => void;
  onSaveWorkerCategories?: (categories: string[], customSkill?: string) => void;
  titleOverride?: string;
}

const QUICK_FILTERS = [
  { id: 'all', label: 'All (10)' },
  { id: 'repairs', label: 'Home Repairs', keywords: ['electrician', 'plumber', 'carpenter', 'painter'] },
  { id: 'appliances', label: 'Appliances', keywords: ['ac-technician'] },
  { id: 'cleaning', label: 'Cleaning & Safety', keywords: ['cleaner-housekeeper', 'pest-control-worker'] },
  { id: 'lifestyle', label: 'Lifestyle & Care', keywords: ['beautician', 'cook', 'home-care-physiotherapy'] },
];

const normalize = (value: string) => value.trim().toLowerCase();

const findCatalogCategory = (name: string): ServiceCategory | undefined => {
  const target = normalize(name);
  return serviceCategories.find((category) => {
    const categoryName = normalize(category.name);
    const categoryId = normalize(category.id);
    return categoryName === target || categoryId === target || categoryName.includes(target) || target.includes(categoryName);
  });
};

export default function ServiceCategoryModal({
  isOpen,
  onClose,
  mode = 'citizen',
  selectedCategory = '',
  selectedCategories,
  onSelectCategory,
  onSaveWorkerCategories,
  titleOverride,
}: ServiceCategoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [workerSelectedList, setWorkerSelectedList] = useState<string[]>([]);
  const [catalogCategory, setCatalogCategory] = useState<ServiceCategory | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [availableProfessionals, setAvailableProfessionals] = useState(0);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (selectedCategories?.length) setWorkerSelectedList(selectedCategories);
    else if (selectedCategory) setWorkerSelectedList([selectedCategory]);
    else setWorkerSelectedList([]);
  }, [isOpen, selectedCategory, selectedCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setActiveFilterTab('all');
    setCatalogCategory(null);
    setExpandedSubcategory(null);
    setCatalogSearch('');
    setAvailableProfessionals(0);
    setAvailabilityMessage('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'citizen' || !catalogCategory) return;
    setAvailabilityMessage('Checking professionals for this service…');
    const unsubscribe = onSnapshot(
      collection(db, 'workerApplications'),
      (snapshot) => {
        const target = normalize(catalogCategory.name);
        const count = snapshot.docs.filter((doc) => {
          const data = doc.data();
          if (String(data.status || '').toUpperCase() !== 'APPROVED' || data.available === false) return false;
          const categories = Array.isArray(data.categories) ? data.categories.map(String) : [];
          const skill = String(data.skill || data.category || '');
          return categories.some((value) => {
            const current = normalize(value);
            return current === target || current.includes(target) || target.includes(current);
          }) || normalize(skill) === target || normalize(skill).includes(target) || target.includes(normalize(skill));
        }).length;
        setAvailableProfessionals(count);
        setAvailabilityMessage(count > 0 ? `${count} verified professional${count === 1 ? '' : 's'} available` : '');
      },
      () => {
        setAvailableProfessionals(0);
        setAvailabilityMessage('');
      },
    );
    return () => unsubscribe();
  }, [isOpen, mode, catalogCategory]);

  const filteredList = useMemo(() => {
    let list = filterCategories(searchQuery);
    if (activeFilterTab !== 'all' && !searchQuery.trim()) {
      const current = QUICK_FILTERS.find((item) => item.id === activeFilterTab);
      if (current?.keywords) {
        list = list.filter((item) => current.keywords!.some((keyword) => item.id.includes(keyword) || item.name.toLowerCase().includes(keyword)));
      }
    }
    return list;
  }, [searchQuery, activeFilterTab]);

  const filteredSubcategories = useMemo(() => {
    if (!catalogCategory) return [];
    const query = normalize(catalogSearch);
    if (!query) return catalogCategory.subcategories;
    return catalogCategory.subcategories
      .map((subcategory) => {
        const subMatches = normalize(subcategory.name).includes(query) || normalize(subcategory.description).includes(query);
        const items = subcategory.items.filter((item) => normalize(item.name).includes(query) || normalize(item.description).includes(query));
        return subMatches ? subcategory : { ...subcategory, items };
      })
      .filter((subcategory) => subcategory.items.length > 0 || normalize(subcategory.name).includes(query));
  }, [catalogCategory, catalogSearch]);

  const handleCitizenSelect = (name: string) => {
    const category = findCatalogCategory(name);
    if (!category) {
      onSelectCategory?.(name);
      onClose();
      return;
    }
    setCatalogCategory(category);
    setCatalogSearch('');
    setExpandedSubcategory(null);
    setAvailableProfessionals(0);
    setAvailabilityMessage('');
  };

  const handleBookService = (item: ServiceItem) => {
    if (!catalogCategory) return;
    if (availableProfessionals <= 0) {
      setAvailabilityMessage('Service is not available in your area.');
      return;
    }
    try {
      localStorage.setItem(
        'punchx_selected_service',
        JSON.stringify({
          categoryId: catalogCategory.id,
          categoryName: catalogCategory.name,
          serviceId: item.id,
          serviceName: item.name,
          description: item.description,
          price: item.price,
          unit: item.unit || 'job',
          serviceType: item.serviceType || 'service',
          material: item.material || null,
        }),
      );
    } catch {
      // Storage is optional; the booking callback remains authoritative.
    }
    onSelectCategory?.(catalogCategory.name);
    onClose();
  };

  const handleFindSpecialists = () => {
    if (!catalogCategory) return;
    if (availableProfessionals <= 0) {
      setAvailabilityMessage('Service is not available in your area.');
      return;
    }
    onSelectCategory?.(catalogCategory.name);
    onClose();
  };

  const toggleWorkerCategory = (name: string) => {
    setWorkerSelectedList((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  };

  const saveWorkerCategories = () => {
    if (!workerSelectedList.length) return;
    onSaveWorkerCategories?.(workerSelectedList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#c5a059]/40 bg-[#0b1428] shadow-2xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-[#070e1d] p-4 sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-[#e9c176]">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#c5a059]" />
                {catalogCategory ? 'PUNCHX SERVICE CATALOGUE' : mode === 'worker' ? 'WORKER SERVICE SELECTION' : 'CITIZEN INSTANT BOOKING'}
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-zinc-400">{PUNCHX_50_CATEGORIES.length} Categories</span>
              </div>
              <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
                {catalogCategory ? catalogCategory.name : titleOverride || (mode === 'worker' ? 'What service do you provide?' : 'What service do you need?')}
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                {catalogCategory ? catalogCategory.description : 'Select a main service to open its sub-services and exact work options.'}
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white" aria-label="Close service catalogue">
              <X className="h-5 w-5" />
            </button>
          </header>

          {catalogCategory && mode === 'citizen' ? (
            <>
              <div className="flex flex-col gap-3 border-b border-zinc-800 bg-[#091122] p-4 sm:flex-row sm:px-6">
                <button onClick={() => { setCatalogCategory(null); setCatalogSearch(''); setExpandedSubcategory(null); setAvailabilityMessage(''); }} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0f1d38] px-3 py-2 text-xs font-bold text-zinc-200">
                  <ArrowLeft className="h-4 w-4" /> All Categories
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e9c176]" />
                  <input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder={`Search ${catalogCategory.name} services...`} className="w-full rounded-xl border border-[#c5a059]/40 bg-[#070e1d] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#c5a059]" />
                </div>
                <button onClick={handleFindSpecialists} className="rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e9c176] px-4 py-2 text-xs font-extrabold text-black">Find Specialists</button>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-800 bg-[#081020] px-4 py-2 text-[11px] font-mono sm:px-6">
                <span className="text-zinc-400">Choose the exact work before availability is checked.</span>
                {availabilityMessage && <span className={availableProfessionals > 0 ? 'font-bold text-emerald-400' : 'font-bold text-amber-300'}>{availableProfessionals > 0 && <UsersRound className="mr-1 inline h-3.5 w-3.5" />}{availabilityMessage}</span>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#e9c176]"><ShieldCheck className="h-4 w-4" /> Main service → sub-service → exact work</div>
                <div className="space-y-3">
                  {filteredSubcategories.map((subcategory) => {
                    const open = expandedSubcategory === subcategory.id;
                    return (
                      <section key={subcategory.id} className="overflow-hidden rounded-2xl border border-[#c5a059]/20 bg-[#0e1933]/80">
                        <button onClick={() => setExpandedSubcategory(open ? null : subcategory.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-[#c5a059]/5">
                          <img src={subcategory.image} alt="" className="h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16" loading="lazy" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-white sm:text-base">{subcategory.name}</h3><span className="rounded-full bg-[#c5a059]/10 px-2 py-0.5 text-[8px] font-mono uppercase text-[#e9c176]">{subcategory.items.length} services</span></div>
                            <p className="mt-1 text-xs text-zinc-400">{subcategory.description}</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 text-[#c5a059] transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <div className="grid grid-cols-1 gap-3 border-t border-[#c5a059]/15 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                            {subcategory.items.map((item: ServiceItem) => (
                              <article key={item.id} className="flex flex-col rounded-xl border border-zinc-800 bg-[#07122a] p-3">
                                <img src={item.image} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" loading="lazy" />
                                <div className="flex items-start justify-between gap-2"><h4 className="text-xs font-bold text-white sm:text-sm">{item.name}</h4>{item.popular && <span className="rounded-full bg-[#c5a059]/15 px-1.5 py-1 text-[7px] font-bold uppercase text-[#e9c176]">Popular</span>}</div>
                                <p className="mt-2 flex-1 text-[11px] leading-relaxed text-zinc-400">{item.description}</p>
                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3"><div><div className="text-[8px] uppercase text-zinc-500">Starting from</div><div className="text-sm font-extrabold text-[#e9c176]">₹{item.price.toLocaleString('en-IN')}</div></div><button onClick={() => handleBookService(item)} className="rounded-lg bg-[#c5a059] px-3 py-2 text-[9px] font-extrabold uppercase text-black hover:bg-[#e9c176]">{availableProfessionals > 0 ? 'Book Service' : 'Check availability'}</button></div>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
                {filteredSubcategories.length === 0 && <div className="py-12 text-center text-sm text-zinc-400">No service matches your search.</div>}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3 border-b border-zinc-800 bg-[#091122] p-4 sm:px-6 sm:py-4">
                <div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#e9c176]" /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search for a service or worker..." className="w-full rounded-2xl border-2 border-[#c5a059]/50 bg-[#070e1d] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#c5a059]" /></div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  {QUICK_FILTERS.map((filter) => <button key={filter.id} onClick={() => setActiveFilterTab(filter.id)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold ${activeFilterTab === filter.id ? 'bg-[#c5a059] text-black' : 'border border-zinc-800 bg-[#0f1d38] text-zinc-300'}`}>{filter.label}</button>)}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {filteredList.length === 0 ? (
                  <div className="space-y-3 py-12 text-center"><AlertCircle className="mx-auto h-10 w-10 text-[#c5a059]" /><p className="text-sm text-zinc-300">No category found matching “{searchQuery}”.</p><p className="text-xs text-zinc-500">Choose from the ten available categories or try another search.</p></div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {filteredList.map((category, index) => {
                      const selected = mode === 'worker' ? workerSelectedList.includes(category.name) : false;
                      return <motion.button key={category.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => mode === 'worker' ? toggleWorkerCategory(category.name) : handleCitizenSelect(category.name)} className={`relative flex items-start gap-3 rounded-2xl border p-3.5 text-left ${selected ? 'border-[#c5a059] bg-[#152342]' : 'border-zinc-800 bg-[#0e1933]/70 hover:border-[#c5a059]/40'}`}><div className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border ${selected ? 'border-[#ffdea5]' : 'border-zinc-700'} bg-[#070e1d]`}><img src={category.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div><div className="min-w-0 flex-1 pr-4"><div className="flex items-center gap-1.5"><span className="font-mono text-[10px] text-zinc-400">#{index + 1}</span><h3 className="truncate text-sm font-bold text-white">{category.name}</h3></div><p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">{category.shortDesc}</p></div><div className="absolute right-3 top-3.5">{mode === 'worker' ? <div className={`flex h-5 w-5 items-center justify-center rounded-lg border ${selected ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-zinc-700 bg-[#070e1d] text-transparent'}`}><Check className="h-3.5 w-3.5" /></div> : <ArrowRight className="h-4 w-4 text-zinc-600" />}</div></motion.button>;
                    })}
                  </div>
                )}
              </div>
              
              <footer className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 bg-[#070e1d] p-4 sm:flex-row sm:p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><Sparkles className="h-4 w-4 text-[#c5a059]" />{mode === 'worker' ? `${workerSelectedList.length} categories selected` : 'Select a main service to open its full catalogue.'}</div><div className="flex w-full gap-2 sm:w-auto"><button onClick={onClose} className="w-1/2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-300 sm:w-auto">Cancel</button>{mode === 'worker' && <button disabled={!workerSelectedList.length} onClick={saveWorkerCategories} className="flex w-1/2 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e9c176] px-6 py-2.5 text-xs font-extrabold uppercase text-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><CheckCircle2 className="h-4 w-4" /> Save Services</button>}</div></footer>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
