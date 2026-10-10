import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, Package, Wrench, MapPin, ShieldCheck, Info, ChevronDown, ShoppingBasket, ClipboardList } from 'lucide-react';
import { serviceCategories } from '../data/serviceCatalogs';
import { getProductsForCategory, PriceProduct } from '../data/expandedPriceCatalogue';
import { AppScreen } from '../types';

interface InteractivePriceCatalogueProps {
  onTransition: (target: AppScreen) => void;
  onSelectCategory: (category: string) => void;
  showNotification: (message: string) => void;
}

type CatalogueTab = 'services' | 'products';
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const normalize = (value: string) => value.trim().toLowerCase();

export default function InteractivePriceCatalogue({ onTransition, onSelectCategory, showNotification }: InteractivePriceCatalogueProps) {
  const [activeTab, setActiveTab] = useState<CatalogueTab>('services');
  const [selectedCategoryId, setSelectedCategoryId] = useState(serviceCategories[0]?.id || '');
  const [query, setQuery] = useState('');
  const [showQuoteOnly, setShowQuoteOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PriceProduct | null>(null);
  const [selectedService, setSelectedService] = useState<{id:string;name:string;price:number;description:string;categoryName:string;unit:string;material?:string} | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selectedCategory = serviceCategories.find(category => category.id === selectedCategoryId) || serviceCategories[0];
  const allServices = useMemo(() => serviceCategories.flatMap(category =>
    category.subcategories.flatMap(subcategory => subcategory.items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      unit: item.unit || 'job',
      material: item.material,
      categoryId: category.id,
      categoryName: category.name,
      subcategoryName: subcategory.name,
    })))
  ), []);
  const products = useMemo(() => selectedCategory ? getProductsForCategory(selectedCategory) : [], [selectedCategory]);
  const filteredProducts = useMemo(() => {
    const needle = normalize(query);
    return products.filter(product => (!showQuoteOnly || product.quoteRequired) &&
      (!needle || [product.name, product.specification, product.unit, selectedCategory?.name || ''].some(value => normalize(value).includes(needle))));
  }, [products, query, showQuoteOnly, selectedCategory]);
  const filteredServices = useMemo(() => {
    const needle = normalize(query);
    return allServices.filter(service => service.categoryId === selectedCategoryId &&
      (!needle || [service.name, service.description, service.subcategoryName, service.material || ''].some(value => normalize(value).includes(needle))));
  }, [allServices, selectedCategoryId, query]);

  const openBooking = (name: string, description: string, price: number, type: 'service' | 'product', id: string, unit: string) => {
    onSelectCategory(selectedCategory?.name || name);
    try {
      localStorage.setItem('punchx_selected_service', JSON.stringify({
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        serviceId: id,
        serviceName: name,
        description,
        price,
        unit,
        selectionType: type,
        estimateOnly: type === 'product',
        quoteRequired: type === 'product' ? Boolean(selectedProduct?.quoteRequired) : false,
        quantity,
        priceSource: 'PunchX indicative catalogue; confirm before booking',
      }));
    } catch { /* Booking flow remains available when browser storage is blocked. */ }
    onTransition('booking');
  };

  const requestQuote = (product: PriceProduct) => {
    setSelectedProduct(product);
    setSelectedService(null);
    onSelectCategory(selectedCategory?.name || 'General Service');
    try {
      localStorage.setItem('punchx_catalogue_quote_request', JSON.stringify({
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        minPrice: product.minPrice,
        maxPrice: product.maxPrice,
        specification: product.specification,
        quantity,
        quoteRequired: Boolean(product.quoteRequired),
        createdAt: new Date().toISOString(),
      }));
    } catch { /* Optional convenience record. */ }
    showNotification(product.quoteRequired ? 'Model/measurement-specific quote noted. Final price needs confirmation.' : 'Indicative item selected. Confirm stock and final price before purchase.');
  };

  const categoryCount = serviceCategories.length;
  const serviceCount = allServices.length;

  return (
    <div className="min-h-[75vh] bg-[#f7f8fc] text-[#171923]">
      <section className="relative overflow-hidden bg-[#101a34] px-4 py-10 text-white sm:px-8 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#8b78ff]/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <button onClick={() => onTransition('home')} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Back to PunchX
          </button>
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#f3d796]">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Interactive price catalogue
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Know the price before you book.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Explore service options, common materials and replacement parts across PunchX categories. Compare indicative ranges and request a confirmed quote when the job or model needs inspection.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4"><div className="text-2xl font-black">{categoryCount}</div><div className="mt-1 text-[10px] text-white/60 sm:text-xs">Categories</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4"><div className="text-2xl font-black">{serviceCount}+</div><div className="mt-1 text-[10px] text-white/60 sm:text-xs">Service options</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4"><div className="text-2xl font-black">₹</div><div className="mt-1 text-[10px] text-white/60 sm:text-xs">INR ranges</div></div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 lg:px-12 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-[#e4e6ef] bg-white p-4 shadow-sm lg:sticky lg:top-24">
            <label htmlFor="catalogue-category" className="text-xs font-extrabold uppercase tracking-wider text-[#74798b]">Choose a category</label>
            <div className="relative mt-2">
              <select id="catalogue-category" value={selectedCategoryId} onChange={event => { setSelectedCategoryId(event.target.value); setQuery(''); setSelectedProduct(null); setSelectedService(null); }} className="w-full appearance-none rounded-xl border border-[#e2e4ed] bg-[#fafbfe] px-3 py-3 pr-9 text-sm font-bold outline-none focus:border-[#7762df] focus:ring-2 focus:ring-[#7762df]/15">
                {serviceCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#7c8090]" />
            </div>
            <div className="mt-5 space-y-2">
              {serviceCategories.map(category => (
                <button key={category.id} onClick={() => { setSelectedCategoryId(category.id); setQuery(''); setSelectedProduct(null); setSelectedService(null); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${selectedCategoryId === category.id ? 'bg-[#eeeaff] text-[#5b48bf]' : 'text-[#626779] hover:bg-[#f5f6fb] hover:text-[#202331]'}`}>
                  <span className="pr-2">{category.name}</span><span className="text-[10px] opacity-60">{category.subcategories.reduce((sum, sub) => sum + sub.items.length, 0)}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-3xl border border-[#e4e6ef] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#7968d5]">Selected category</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">{selectedCategory?.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#74798b]">{selectedCategory?.description}</p>
                </div>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#edf8f2] px-3 py-1.5 text-[11px] font-bold text-[#23754c]"><MapPin className="h-3.5 w-3.5" /> Kolkata / West Bengal focus</div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8a8ea0]" />
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder={activeTab === 'services' ? 'Search services in this category…' : 'Search parts, sizes, materials…'} className="w-full rounded-xl border border-[#e2e4ed] bg-[#fafbfe] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#7762df] focus:ring-2 focus:ring-[#7762df]/15" />
                </div>
                <div className="flex rounded-xl bg-[#f0f1f7] p-1">
                  <button onClick={() => {setActiveTab('services');setQuery('');}} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${activeTab === 'services' ? 'bg-white text-[#5747b8] shadow-sm' : 'text-[#74798b]'}`}><Wrench className="h-4 w-4" /> Services</button>
                  <button onClick={() => {setActiveTab('products');setQuery('');}} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-extrabold transition ${activeTab === 'products' ? 'bg-white text-[#5747b8] shadow-sm' : 'text-[#74798b]'}`}><Package className="h-4 w-4" /> Parts & materials</button>
                </div>
              </div>

              {activeTab === 'products' && <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#85899a]">Prices shown are indicative product/material ranges, not guaranteed stock quotes.</p><label className="flex items-center gap-2 text-xs font-bold text-[#626779]"><input type="checkbox" checked={showQuoteOnly} onChange={event => setShowQuoteOnly(event.target.checked)} className="accent-[#7160d7]" /> Quote required only</label></div>}
            </div>

            {activeTab === 'services' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filteredServices.map(service => (
                  <article key={service.id} className="flex flex-col rounded-2xl border border-[#e4e6ef] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9c0ff] hover:shadow-md">
                    <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8ea0]">{service.subcategoryName}</div><h3 className="mt-1 font-extrabold text-[#222534]">{service.name}</h3></div><span className="shrink-0 rounded-lg bg-[#f0edff] px-2 py-1 text-[10px] font-extrabold text-[#6453c5]">Service</span></div>
                    <p className="mt-2 flex-1 text-xs leading-5 text-[#74798b]">{service.description}</p>
                    {service.material && <p className="mt-2 text-[11px] text-[#656a7c]"><span className="font-bold">Materials:</span> {service.material}</p>}
                    <div className="mt-4 flex items-end justify-between gap-2 border-t border-[#eef0f5] pt-3"><div><div className="text-[10px] font-bold text-[#8a8ea0]">Indicative service price</div><div className="text-lg font-black text-[#171923]">{money(service.price)} <span className="text-[10px] font-semibold text-[#8a8ea0]">/ {service.unit}</span></div></div><button onClick={() => {setSelectedService(service);setSelectedProduct(null);}} className="rounded-xl bg-[#171c35] px-3 py-2.5 text-xs font-extrabold text-white hover:bg-[#2a3157]">Select</button></div>
                  </article>
                ))}
                {filteredServices.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-[#d9dce7] bg-white p-10 text-center"><Search className="mx-auto h-7 w-7 text-[#a5a8b5]" /><p className="mt-3 font-bold">No service matched that search.</p><p className="mt-1 text-xs text-[#85899a]">Try a different keyword or clear the search field.</p></div>}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filteredProducts.map(product => (
                  <article key={product.id} className="flex flex-col rounded-2xl border border-[#e4e6ef] bg-white p-4 shadow-sm transition hover:border-[#c9c0ff] hover:shadow-md">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-[#222534]">{product.name}</h3><span className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-extrabold ${product.confidence === 'A/B' ? 'bg-[#e9f8ef] text-[#26784b]' : product.confidence === 'B' ? 'bg-[#eef4ff] text-[#315da8]' : 'bg-[#fff4df] text-[#97651a]'}`}>{product.confidence} confidence</span></div>
                    <div className="mt-2 text-lg font-black text-[#171923]">{money(product.minPrice)} – {money(product.maxPrice)} <span className="text-[10px] font-semibold text-[#8a8ea0]">/ {product.unit}</span></div>
                    <p className="mt-2 flex-1 text-xs leading-5 text-[#74798b]">{product.specification}</p>
                    {product.quoteRequired && <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#9a5b0d]"><Info className="h-3.5 w-3.5" /> Confirm exact model, stock or measurements</div>}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#eef0f5] pt-3"><span className="text-[10px] text-[#8a8ea0]">Product/material only</span><button onClick={() => requestQuote(product)} className="rounded-xl border border-[#d8d2ff] bg-[#f3f0ff] px-3 py-2.5 text-xs font-extrabold text-[#5b49bf] hover:bg-[#e9e4ff]">Select item</button></div>
                  </article>
                ))}
                {filteredProducts.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-[#d9dce7] bg-white p-10 text-center"><Package className="mx-auto h-7 w-7 text-[#a5a8b5]" /><p className="mt-3 font-bold">No items matched those filters.</p><p className="mt-1 text-xs text-[#85899a]">Clear the search or turn off “Quote required only”.</p></div>}
              </div>
            )}
          </section>
        </div>

        {(selectedService || selectedProduct) && <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#dcd7ff] bg-white p-4 shadow-[0_20px_70px_rgba(20,24,50,.25)] sm:inset-x-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7968d5]">{selectedService ? 'Service selected' : 'Product / material selected'}</div><div className="mt-1 truncate font-black">{selectedService?.name || selectedProduct?.name}</div><div className="mt-1 text-xs text-[#74798b]">{selectedService ? `Indicative service price: ${money(selectedService.price)} per ${selectedService.unit}` : `Range: ${money(selectedProduct!.minPrice)}–${money(selectedProduct!.maxPrice)} per ${selectedProduct!.unit}`}</div></div>
            <div className="flex shrink-0 items-center gap-2"><label className="text-xs font-bold text-[#626779]" htmlFor="catalogue-quantity">Qty</label><input id="catalogue-quantity" type="number" min={1} max={99} value={quantity} onChange={event => setQuantity(Math.max(1,Math.min(99,Number(event.target.value)||1)))} className="w-16 rounded-lg border border-[#e2e4ed] px-2 py-2 text-sm font-bold" /><button onClick={() => {if (selectedService) openBooking(selectedService.name,selectedService.description,selectedService.price,'service',selectedService.id,selectedService.unit); else if (selectedProduct) {requestQuote(selectedProduct); onTransition('booking');}}} className="inline-flex items-center gap-2 rounded-xl bg-[#6653ce] px-4 py-3 text-xs font-extrabold text-white hover:bg-[#5341b7]"><ClipboardList className="h-4 w-4" /> Continue <ArrowRight className="h-4 w-4" /></button><button onClick={() => {setSelectedService(null);setSelectedProduct(null);}} aria-label="Clear selected item" className="rounded-lg px-2 py-2 text-[#8a8ea0] hover:bg-[#f4f4fa]">×</button></div>
          </div>
        </div>}

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#e7e0c6] bg-[#fffaf0] p-4 text-xs leading-5 text-[#75633d]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Price transparency note:</strong> Catalogue prices are planning estimates for Kolkata / West Bengal and are not live supplier quotes. Professional labour, parts, travel, taxes, disposal and warranty may be separate. For model-specific spares, custom measurements, high-value parts or safety-sensitive work, request a confirmed quote before authorising purchase or repair.</div></div>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => onTransition('home')} className="rounded-xl border border-[#dfe2eb] bg-white px-5 py-3 text-sm font-bold text-[#555b6f] hover:bg-[#f8f8fc]">Back to home</button><button onClick={() => {onSelectCategory(selectedCategory?.name || 'General Service');onTransition('providers');}} className="inline-flex items-center gap-2 rounded-xl bg-[#171c35] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#2a3157]">Find professionals <ArrowRight className="h-4 w-4" /></button></div>
      </main>
    </div>
  );
}
