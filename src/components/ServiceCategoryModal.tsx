import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, X, Check, ArrowRight, Sparkles, CheckCircle2, Plus, AlertCircle, ArrowLeft, ChevronDown, ShieldCheck, UsersRound } from 'lucide-react';
import { PUNCHX_50_CATEGORIES, filterCategories } from '../data/categories';
import { serviceCategories, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';
import CategoryIcon from './CategoryIcon';
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
  { id: 'all', label: 'All (50)' },
  { id: 'repairs', label: 'Home Repairs', keywords: ['electrician', 'plumber', 'carpenter', 'painter', 'mason', 'locksmith', 'handyman'] },
  { id: 'tech', label: 'Tech & Appliances', keywords: ['ac', 'refrigerator', 'washing', 'mobile', 'computer', 'laptop', 'electronics', 'cctv', 'solar', 'ro', 'appliance', 'wifi'] },
  { id: 'personal', label: 'Personal & Care', keywords: ['barber', 'hair', 'beautician', 'makeup', 'mehendi', 'tailor', 'cleaner', 'tutor'] },
  { id: 'transport', label: 'Vehicles & Logistics', keywords: ['bike', 'car', 'delivery', 'driver', 'tractor'] },
  { id: 'food', label: 'Food & Events', keywords: ['cook', 'baker', 'caterer', 'tiffin', 'photographer', 'videographer', 'event'] },
  { id: 'rural', label: 'Agri & Construction', keywords: ['construction', 'agricultural', 'tractor', 'pump', 'welder', 'shoe'] }
];

const normalize = (value: string) => value.trim().toLowerCase();

const findCatalogCategory = (name: string): ServiceCategory | undefined => {
  const target = normalize(name);
  return serviceCategories.find((category) => normalize(category.name) === target || normalize(category.id) === target || normalize(category.name).includes(target) || target.includes(normalize(category.name)));
};

export default function ServiceCategoryModal({ isOpen, onClose, mode = 'citizen', selectedCategory = '', selectedCategories, onSelectCategory, onSaveWorkerCategories, titleOverride }: ServiceCategoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [workerSelectedList, setWorkerSelectedList] = useState<string[]>([]);
  const [customSkillText, setCustomSkillText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<ServiceCategory | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [availableProfessionals, setAvailableProfessionals] = useState(0);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  const serializedSelectedCategories = (selectedCategories || []).join(',');

  useEffect(() => {
    if (!isOpen) return;
    if (selectedCategories && selectedCategories.length > 0) setWorkerSelectedList(selectedCategories);
    else if (selectedCategory) setWorkerSelectedList([selectedCategory]);
    else setWorkerSelectedList([]);
  }, [isOpen, selectedCategory, serializedSelectedCategories]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(''); setActiveFilterTab('all'); setShowCustomInput(false); setCatalogCategory(null);
      setExpandedSubcategory(null); setCatalogSearch(''); setAvailableProfessionals(0); setAvailabilityMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'citizen' || !catalogCategory) return;
    setAvailabilityMessage('Checking professionals for this service area…');
    const unsub = onSnapshot(collection(db, 'workerApplications'), snapshot => {
      const target = normalize(catalogCategory.name);
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (String(data.status || '').toUpperCase() !== 'APPROVED' || data.available === false) return false;
        const categories = Array.isArray(data.categories) ? data.categories.map(String) : [];
        const skill = String(data.skill || data.category || '');
        return categories.some(c => normalize(c) === target || normalize(c).includes(target) || target.includes(normalize(c))) || normalize(skill) === target || normalize(skill).includes(target) || target.includes(normalize(skill));
      }).length;
      setAvailableProfessionals(count);
      setAvailabilityMessage(count > 0 ? `${count} verified professional${count === 1 ? '' : 's'} available` : '');
    }, () => {
      setAvailableProfessionals(0);
      setAvailabilityMessage('');
    });
    return () => unsub();
  }, [isOpen, mode, catalogCategory]);

  const filteredList = useMemo(() => {
    let list = filterCategories(searchQuery);
    if (activeFilterTab !== 'all' && !searchQuery.trim()) {
      const currentTab = QUICK_FILTERS.find(f => f.id === activeFilterTab);
      if (currentTab?.keywords) list = list.filter(item => currentTab.keywords!.some(k => item.id.includes(k) || item.name.toLowerCase().includes(k)));
    }
    return list;
  }, [searchQuery, activeFilterTab]);

  const filteredSubcategories = useMemo(() => {
    if (!catalogCategory) return [];
    const query = normalize(catalogSearch);
    if (!query) return catalogCategory.subcategories;
    return catalogCategory.subcategories.map(subcategory => {
      const subMatches = normalize(subcategory.name).includes(query) || normalize(subcategory.description).includes(query);
      const items = subcategory.items.filter(item => normalize(item.name).includes(query) || normalize(item.description).includes(query));
      return subMatches ? subcategory : { ...subcategory, items };
    }).filter(subcategory => subcategory.items.length > 0 || normalize(subcategory.name).includes(query) || normalize(subcategory.description).includes(query));
  }, [catalogCategory, catalogSearch]);

  const handleToggleWorkerCategory = (catName: string) => {
    if (catName === 'Other Service') setShowCustomInput(!showCustomInput);
    setWorkerSelectedList(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const handleCitizenSelect = (catName: string) => {
    if (catName === 'Other Service') { setShowCustomInput(true); return; }
    const category = findCatalogCategory(catName);
    if (category) {
      setCatalogCategory(category); setCatalogSearch(''); setAvailabilityMessage(''); setExpandedSubcategory(category.subcategories[0]?.id || null); return;
    }
    onSelectCategory?.(catName); onClose();
  };

  const handleBookService = (item: ServiceItem) => {
    if (!catalogCategory) return;
    if (availableProfessionals <= 0) {
      setAvailabilityMessage('Service is not available in your area. No verified professional is currently available for this service.');
      return;
    }
    try {
      localStorage.setItem('punchx_selected_service', JSON.stringify({ categoryId: catalogCategory.id, categoryName: catalogCategory.name, serviceId: item.id, serviceName: item.name, description: item.description, price: item.price, unit: item.unit || 'job', serviceType: item.serviceType || 'service', material: item.material || null }));
    } catch {}
    onSelectCategory?.(catalogCategory.name);
    onClose();
  };

  const handleFindSpecialists = () => {
    if (!catalogCategory) return;
    if (availableProfessionals <= 0) { setAvailabilityMessage('Service is not available in your area. No verified professional is currently available for this service.'); return; }
    onSelectCategory?.(catalogCategory.name); onClose();
  };

  const handleSaveCustomSkill = () => {
    if (!customSkillText.trim()) return;
    const finalName = customSkillText.trim();
    if (mode === 'citizen') { onSelectCategory?.(finalName); onClose(); }
    else { const updated = Array.from(new Set([...workerSelectedList, finalName])); setWorkerSelectedList(updated); onSaveWorkerCategories?.(updated, finalName); onClose(); }
  };

  const handleConfirmWorkerCategories = () => { onSaveWorkerCategories?.(workerSelectedList.length > 0 ? workerSelectedList : ['Handyman'], customSkillText.trim() || undefined); onClose(); };

  if (!isOpen) return null;

  return <AnimatePresence><div id="service-category-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden"><motion.div id="service-category-modal-container" initial={{opacity:0,scale:0.95,y:15}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:15}} transition={{duration:0.2}} className="bg-[#0b1428] border border-[#c5a059]/40 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden">
    <div className="p-4 sm:p-6 pb-3 border-b border-zinc-800 bg-[#070e1d]/95 flex items-center justify-between gap-3"><div className="space-y-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="w-2.5 h-2.5 rounded-full bg-[#c5a059] animate-pulse"/><span className="text-[10px] font-mono uppercase tracking-widest text-[#e9c176] font-extrabold">{catalogCategory?'PUNCHX SERVICE CATALOGUE':mode==='worker'?'WORKER SERVICE SELECTION':'CITIZEN INSTANT BOOKING'}</span><span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">50 Services Available</span></div><h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{catalogCategory?catalogCategory.name:titleOverride||(mode==='worker'?'What service do you provide?':'What service do you need?')}</h2><p className="text-xs text-zinc-400">{catalogCategory?catalogCategory.description:mode==='worker'?'Select all the trade categories you are certified and equipped to perform.':'Select a main service to open its sub-services and exact work options.'}</p></div><button id="close-category-modal-btn" onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors flex-shrink-0"><X className="w-5 h-5"/></button></div>
    {catalogCategory&&mode==='citizen'?<><div className="px-4 sm:px-6 py-3 bg-[#091122] border-b border-zinc-800 flex flex-col sm:flex-row gap-3"><button onClick={()=>{setCatalogCategory(null);setExpandedSubcategory(null);setCatalogSearch('');setAvailabilityMessage('');}} className="px-3 py-2 rounded-xl bg-[#0f1d38] border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4"/> All Categories</button><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e9c176]"/><input value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder={`Search ${catalogCategory.name} services...`} className="w-full bg-[#070e1d] border border-[#c5a059]/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#c5a059]"/></div><button onClick={handleFindSpecialists} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-extrabold text-xs whitespace-nowrap">Find Specialists</button></div>
      <div className="px-4 sm:px-6 py-2 bg-[#081020] border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono"><span className="text-zinc-400">Choose the exact work before availability is checked.</span>{availabilityMessage&&<span className={`font-bold ${availableProfessionals>0?'text-emerald-400':'text-amber-300'}`}>{availableProfessionals>0?<><UsersRound className="inline w-3.5 h-3.5 mr-1"/>{availabilityMessage}</>:availabilityMessage}</span>}</div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#e9c176] font-bold mb-4"><ShieldCheck className="w-4 h-4"/> Main service → sub-service → exact work</div><div className="space-y-3">{filteredSubcategories.map((subcategory: ServicesSubcategory)=>{const isOpenSub=expandedSubcategory===subcategory.id;return <section key={subcategory.id} className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1933]/80 overflow-hidden"><button onClick={()=>setExpandedSubcategory(isOpenSub?null:subcategory.id)} className="w-full p-4 text-left flex items-center gap-3 hover:bg-[#c5a059]/5"><img src={subcategory.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[#c5a059]/20" loading="lazy"/><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-white text-sm sm:text-base">{subcategory.name}</h3><span className="text-[8px] uppercase font-mono text-[#e9c176] bg-[#c5a059]/10 px-2 py-0.5 rounded-full">{subcategory.items.length} services</span></div><p className="text-xs text-zinc-400 mt-1">{subcategory.description}</p></div><ChevronDown className={`w-5 h-5 text-[#c5a059] transition-transform ${isOpenSub?'rotate-180':''}`}/></button>{isOpenSub&&<div className="border-t border-[#c5a059]/15 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{subcategory.items.map((item:ServiceItem)=><article key={item.id} className="rounded-xl border border-zinc-800 bg-[#07122a] p-3 flex flex-col"><img src={item.image} alt="" className="w-full h-28 rounded-lg object-cover mb-3" loading="lazy"/><div className="flex items-start justify-between gap-2"><h4 className="font-bold text-white text-xs sm:text-sm">{item.name}</h4>{item.popular&&<span className="text-[7px] uppercase bg-[#c5a059]/15 text-[#e9c176] px-1.5 py-1 rounded-full font-bold">Popular</span>}</div><p className="text-[11px] text-zinc-400 leading-relaxed mt-2 flex-1">{item.description}</p><div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2"><div><div className="text-[8px] uppercase text-zinc-500">Starting from</div><div className="text-sm font-extrabold text-[#e9c176]">₹{item.price.toLocaleString('en-IN')}</div></div><button onClick={()=>handleBookService(item)} className="px-3 py-2 rounded-lg bg-[#c5a059] text-black font-extrabold text-[9px] uppercase hover:bg-[#e9c176]">{availableProfessionals>0?'Book Service':'Check availability'}</button></div></article>)}</div>}</section>})}</div>{filteredSubcategories.length===0&&<div className="py-12 text-center text-sm text-zinc-400">No service or product matches your search.</div>}
        {availableProfessionals===0&&catalogCategory&&<div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center"><div className="text-sm font-black text-amber-200">Service availability is checked after the exact work is selected.</div><div className="mt-1 text-xs text-zinc-400">If no approved professional is available, PUNCHX will show “Service is not available in your area” and stop the booking.</div></div>}</div>
      <div className="p-4 border-t border-zinc-800 bg-[#070e1d] flex items-center justify-between gap-3"><div className="text-[10px] text-zinc-400 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#c5a059]"/> Select an exact work option first.</div><button onClick={handleFindSpecialists} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black text-xs font-extrabold uppercase">Find {catalogCategory.name} Specialists</button></div></>
    :<><div className="p-4 sm:px-6 sm:py-4 bg-[#091122] border-b border-zinc-800/80 space-y-3"><div className="relative"><div className="relative bg-[#070e1d] border-2 border-[#c5a059]/50 focus-within:border-[#c5a059] rounded-2xl flex items-center px-4 py-3"><Search className="w-5 h-5 text-[#e9c176] flex-shrink-0 mr-3"/><input id="category-search-input" type="text" autoFocus placeholder={mode==='worker'?'🔍 Search for your service...':'🔍 Search for a service or worker...'} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full bg-transparent text-sm text-white placeholder-zinc-400 focus:outline-none font-medium"/>{searchQuery&&<button onClick={()=>setSearchQuery('')} className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 text-xs ml-2">Clear</button>}</div></div>{!searchQuery&&<div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">{QUICK_FILTERS.map(filter=><button key={filter.id} onClick={()=>setActiveFilterTab(filter.id)} className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${activeFilterTab===filter.id?'bg-[#c5a059] text-black':'bg-[#0f1d38] text-zinc-300 border border-zinc-800'}`}>{filter.label}</button>)}</div>}</div><AnimatePresence>{showCustomInput&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="bg-[#111f3d] border-b border-[#c5a059]/40 p-4 px-6 flex flex-col sm:flex-row items-center gap-3"><input type="text" placeholder="e.g. Solar Inverter PCB Repair..." value={customSkillText} onChange={e=>setCustomSkillText(e.target.value)} className="flex-1 w-full bg-[#070e1d] border border-zinc-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#c5a059]"/><button type="button" onClick={handleSaveCustomSkill} className="w-full sm:w-auto px-5 py-2.5 bg-[#c5a059] text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"><Plus className="w-4 h-4"/>Use This Custom Service</button></motion.div>}</AnimatePresence><div className="px-6 py-2 bg-[#081020] border-b border-zinc-800 flex justify-between items-center text-[11px] font-mono text-zinc-400"><span>Showing <strong className="text-white">{filteredList.length}</strong> of 50 Categories{searchQuery&&<span> matching "{searchQuery}"</span>}</span>{mode==='worker'&&<span className="text-[#e9c176] font-bold">{workerSelectedList.length} Selected</span>}</div><div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">{filteredList.length===0?<div className="py-12 text-center space-y-3"><AlertCircle className="w-10 h-10 text-[#c5a059] mx-auto"/><p className="text-sm text-zinc-300">No category found matching "{searchQuery}".</p><button onClick={()=>{setShowCustomInput(true);setCustomSkillText(searchQuery)}} className="px-4 py-2 bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40 rounded-xl text-xs font-bold">+ Add Custom Service</button></div>:<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">{filteredList.map((cat,index)=>{const isWorkerSelected=workerSelectedList.includes(cat.name);const isCitizenActive=selectedCategory.toLowerCase()===cat.name.toLowerCase();const isSelected=mode==='worker'?isWorkerSelected:isCitizenActive;return <motion.div key={cat.id} whileHover={{scale:1.015}} whileTap={{scale:0.985}} onClick={()=>mode==='worker'?handleToggleWorkerCategory(cat.name):handleCitizenSelect(cat.name)} className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative select-none ${isSelected?'bg-[#152342] border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.25)] ring-1 ring-[#c5a059]':'bg-[#0e1933]/70 border-zinc-800 hover:border-[#c5a059]/40'}`}><div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${isSelected?'bg-[#c5a059] text-black border-white':'bg-[#070e1d] text-[#e9c176] border-zinc-700'}`}><CategoryIcon category={cat.name} className="w-5 h-5"/></div><div className="flex-1 min-w-0 pr-6"><div className="flex items-center gap-1.5"><span className="text-[10px] font-mono text-zinc-400">#{index+1}</span><h3 className={`text-xs sm:text-sm font-bold truncate ${isSelected?'text-[#e9c176]':'text-white'}`}>{cat.name}</h3></div><p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{cat.shortDesc}</p></div><div className="absolute top-3.5 right-3">{mode==='worker'?<div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isWorkerSelected?'bg-emerald-500 border-emerald-400 text-black':'bg-[#070e1d] border-zinc-700 text-transparent'}`}><Check className="w-3.5 h-3.5"/></div>:<div className="p-1 text-zinc-600"><ArrowRight className="w-4 h-4"/></div>}</div>})}</div>}</div><div className="p-4 sm:p-5 border-t border-zinc-800 bg-[#070e1d] flex flex-col sm:flex-row items-center justify-between gap-3"><div className="text-xs text-zinc-400 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#c5a059]"/><span>{mode==='worker'?'All selected trade services will be registered in your verified technician badge.':'Select a main service to open its full subcategory and exact service catalogue.'}</span></div><div className="flex items-center gap-2.5 w-full sm:w-auto"><button type="button" onClick={onClose} className="w-1/2 sm:w-auto px-4 py-2.5 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold">Cancel</button>{mode==='worker'&&<button type="button" onClick={handleConfirmWorkerCategories} className="w-1/2 sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black rounded-xl text-xs font-extrabold uppercase flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/>Save Provided Services ({workerSelectedList.length})</button>}</div></div></>}
  </motion.div></div></AnimatePresence>;
}
