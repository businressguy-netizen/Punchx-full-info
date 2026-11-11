import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Search, ShieldCheck, Wrench, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { AppScreen } from '../types';
import { serviceCategories, ServiceCategory, ServicesSubcategory, ServiceItem } from '../data/serviceCatalogs';

interface ServiceCategoryPageProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  showNotification: (msg: string) => void;
}

const normalize = (value: string) => value.trim().toLowerCase();
const findCategory = (name: string): ServiceCategory | undefined => {
  const target = normalize(name);
  return serviceCategories.find((category) => normalize(category.name) === target || normalize(category.id) === target || normalize(category.name).includes(target) || target.includes(normalize(category.name)));
};

export default function ServiceCategoryPage({ onTransition, selectedCategory, onSelectCategory, showNotification }: ServiceCategoryPageProps) {
  const [search, setSearch] = useState('');
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const category = useMemo(() => findCategory(selectedCategory), [selectedCategory]);

  const filteredSubcategories = useMemo(() => {
    if (!category) return [];
    const query = normalize(search);
    if (!query) return category.subcategories;
    return category.subcategories.map((subcategory) => {
      const subMatches = normalize(subcategory.name).includes(query) || normalize(subcategory.description).includes(query);
      const items = subcategory.items.filter((item) => normalize(item.name).includes(query) || normalize(item.description).includes(query) || normalize(item.material || '').includes(query));
      return subMatches ? subcategory : { ...subcategory, items };
    }).filter((subcategory) => subcategory.items.length > 0 || normalize(subcategory.name).includes(query) || normalize(subcategory.description).includes(query));
  }, [category, search]);

  const bookItem = (item: ServiceItem) => {
    if (!category) return;
    onSelectCategory(category.name);
    try {
      localStorage.setItem('punchx_selected_service', JSON.stringify({ categoryId: category.id, categoryName: category.name, serviceId: item.id, serviceName: item.name, description: item.description, price: item.price, unit: item.unit || 'job', serviceType: item.serviceType || 'service', material: item.material || null }));
    } catch { /* Optional browser storage. */ }
    showNotification(`✓ ${item.name} selected. Finding verified ${category.name} specialists.`);
    onTransition('providers');
  };

  if (!category) return <div className="min-h-screen bg-[#f7faff] text-[#0f172a] flex items-center justify-center px-6"><div className="max-w-lg w-full bg-white border border-[#bfdbfe] rounded-3xl p-8 text-center shadow-xl"><Wrench className="w-10 h-10 text-[#2563eb] mx-auto mb-4"/><h1 className="text-xl font-bold mb-2">Service category not found</h1><p className="text-sm text-[#64748b] mb-6">Choose a category from the PunchX service directory.</p><button onClick={() => onTransition('home')} className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white font-bold">Back to Home</button></div></div>;

  const categoryClass = `service-category-${category.id}`;

  return <div id="service-category-page" className={`punchx-service-page ${categoryClass} min-h-screen bg-[#f7faff] text-[#0f172a] pb-24`}>
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#dbeafe] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => onTransition('home')} className="p-2.5 rounded-xl bg-[#f1f6ff] border border-[#dbeafe] hover:border-[#93c5fd] text-[#2563eb]" aria-label="Back to home"><ArrowLeft className="w-5 h-5"/></button>
          <div className="min-w-0 flex-1"><div className="text-[9px] uppercase tracking-[0.2em] text-[#2563eb] font-bold">PUNCHX Service Catalogue</div><h1 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] truncate">{category.name}</h1></div>
          <button onClick={() => { onSelectCategory(category.name); onTransition('providers'); }} className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#38bdf8] text-white font-extrabold text-xs shadow-lg shadow-blue-200">Find Specialists <ChevronRight className="w-4 h-4"/></button>
        </div>
        <p className="text-sm text-[#64748b] max-w-3xl mb-4">{category.description}</p>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#2563eb] font-bold mb-4"><ShieldCheck className="w-4 h-4"/> Verified independent specialists · Category-specific services · Materials shown before booking</div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${category.name} services or materials...`} className="w-full bg-[#f8fbff] border border-[#dbeafe] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0f172a] outline-none focus:border-[#60a5fa] focus:ring-2 focus:ring-blue-100"/></div>
      </div>
    </header>

    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <motion.section initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.4}} className="punchx-category-hero relative mb-6 overflow-hidden rounded-3xl border border-[#bfdbfe] bg-gradient-to-br from-[#eaf3ff] via-white to-[#eefaff] p-5 sm:p-7 shadow-[0_16px_45px_rgba(37,99,235,.08)]">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#38bdf8]/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <motion.div initial={{scale:.94,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:.08,duration:.45}} className="punchx-category-hero-media relative h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-md sm:h-40 sm:w-56">
            <img src={category.subcategories[0]?.image || category.subcategories.flatMap(s=>s.items)[0]?.image} alt={`${category.name} service`} className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/35 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#2563eb] shadow-sm"><Sparkles className="h-3 w-3"/> Live service guide</div>
          </motion.div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#2563eb]">{category.name} services</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl">Choose the exact work you need</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">Explore each service group, then select the exact job. PUNCHX checks professional availability only after the final service is selected.</p>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5">
        {filteredSubcategories.map((subcategory: ServicesSubcategory, index) => {
          const isOpen = expandedSubcategory === subcategory.id;
          return <motion.section key={subcategory.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.035,duration:.3}} className="rounded-2xl border border-[#dbeafe] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button type="button" onClick={() => setExpandedSubcategory(isOpen ? null : subcategory.id)} className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-[#f8fbff] transition-colors">
              <motion.div animate={isOpen ? {scale:1.03} : {scale:1}} className="shrink-0 overflow-hidden rounded-xl border border-[#dbeafe] bg-[#f1f6ff]"><img src={subcategory.image} alt={`${subcategory.name} service`} className="w-16 h-16 sm:w-20 sm:h-20 object-cover" loading="lazy" /></motion.div>
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h2 className="text-base sm:text-lg font-bold text-[#0f172a]">{subcategory.name}</h2><span className="text-[9px] uppercase font-bold text-[#2563eb] bg-[#eaf3ff] px-2 py-0.5 rounded-full">{subcategory.items.length} services</span></div><p className="text-xs sm:text-sm text-[#64748b]">{subcategory.description}</p></div>
              <ChevronDown className={`w-5 h-5 text-[#2563eb] transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} transition={{duration:.3}} className="border-t border-[#e5efff] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {subcategory.items.map((item: ServiceItem, itemIndex) => <motion.article key={item.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:itemIndex*.025}} className="rounded-xl border border-[#dbeafe] bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="relative overflow-hidden"><motion.img whileHover={{scale:1.04}} transition={{duration:.35}} src={item.image} alt={`${item.name} for ${category.name}`} className="w-full h-40 object-cover" loading="lazy"/><div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0f172a]/45 to-transparent pointer-events-none" /></div>
                <div className="p-4 flex flex-col flex-1"><div className="flex items-start justify-between gap-2"><h3 className="font-bold text-[#0f172a] text-sm">{item.name}</h3>{item.popular && <span className="shrink-0 text-[8px] uppercase bg-[#eaf3ff] text-[#2563eb] px-2 py-1 rounded-full font-bold">Popular</span>}</div><p className="text-xs text-[#64748b] mt-2 leading-relaxed">{item.description}</p><div className="mt-3 rounded-lg border border-[#dbeafe] bg-[#f8fbff] p-3"><div className="text-[9px] uppercase tracking-wider text-[#2563eb] font-bold">Materials / items</div><div className="mt-1 text-[11px] leading-4 text-[#475569]">{item.material || 'Standard tools and consumables as applicable.'}</div></div><div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-[#e5e7eb]"><div><div className="text-base font-extrabold text-[#2563eb]"></div><div className="mt-1 text-[9px] text-[#94a3b8]">{item.duration || '30–60 min'} {item.rating ? `· ` : '· New'}</div></div><button onClick={() => bookItem(item)} className="px-3.5 py-2 rounded-lg bg-[#2563eb] text-white font-extrabold text-[10px] uppercase hover:bg-[#1d4ed8]">Book Service</button></div></div>
              </motion.article>)}
            </motion.div>}
          </motion.section>;
        })}
      </div>
      {filteredSubcategories.length === 0 && <div className="text-center py-16 text-[#64748b]">No services or materials match your search.</div>}
    </main>

    <div className="fixed bottom-0 left-0 right-0 z-20 sm:hidden bg-white/95 backdrop-blur border-t border-[#dbeafe] p-3"><button onClick={() => { onSelectCategory(category.name); onTransition('providers'); }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#38bdf8] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg">Find {category.name} Specialists</button></div>
  </div>;
}
