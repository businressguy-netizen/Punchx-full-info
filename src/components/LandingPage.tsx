import React, { useEffect, useMemo, useState } from 'react';
import type { AppScreen } from '../types';

interface Category {
  id: string;
  name: string;
  icon: string;
  price: number;
  keywords: string[];
}

interface Location {
  id: string;
  name: string;
  type: 'city' | 'pincode';
}

interface LandingPageProps {
  onTransition: (target: AppScreen) => void;
  onSelectCategory: (category: string) => void;
  showNotification: (message: string) => void;
}

const categories: Category[] = [
  { id: 'electrical', name: 'Electrical Work', icon: '⚡', price: 149, keywords: ['electrician', 'fan', 'switch', 'socket', 'wiring', 'light', 'bulb', 'repair'] },
  { id: 'plumbing', name: 'Plumbing', icon: '🚰', price: 149, keywords: ['plumber', 'tap', 'leakage', 'pipe', 'sink', 'bathroom', 'drainage', 'water'] },
  { id: 'ac-appliance', name: 'AC & Appliance Repair', icon: '❄️', price: 299, keywords: ['ac', 'air conditioner', 'refrigerator', 'washing machine', 'microwave', 'cooler', 'appliance'] },
  { id: 'cleaning', name: 'Home Cleaning', icon: '🧹', price: 499, keywords: ['cleaning', 'cleaner', 'deep clean', 'sofa', 'bathroom', 'kitchen', 'floor'] },
  { id: 'carpentry', name: 'Carpentry', icon: '🔨', price: 199, keywords: ['carpenter', 'furniture', 'door', 'bed', 'table', 'chair', 'wood', 'drilling'] },
  { id: 'painting', name: 'Painting', icon: '🎨', price: 999, keywords: ['painter', 'paint', 'wall', 'room', 'house', 'interior', 'exterior'] },
];

const locations: Location[] = [
  { id: 'kolkata', name: 'Kolkata', type: 'city' },
  { id: 'howrah', name: 'Howrah', type: 'city' },
  { id: 'new-town', name: 'New Town', type: 'city' },
  { id: 'salt-lake', name: 'Salt Lake', type: 'city' },
  { id: 'nabadwip', name: 'Nabadwip', type: 'city' },
  { id: 'delhi', name: 'Delhi NCR', type: 'city' },
  { id: 'mumbai', name: 'Mumbai', type: 'city' },
  { id: 'bangalore', name: 'Bangalore', type: 'city' },
];

const normalize = (value: string): string => value.toLowerCase().trim().replace(/\s+/g, ' ');

export default function LandingPage({ onTransition, onSelectCategory, showNotification }: LandingPageProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [locationModal, setLocationModal] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const filteredCategories = useMemo(() => {
    const q = normalize(query);
    if (!q) return categories;
    return categories.filter((category) => normalize(`${category.name} ${category.keywords.join(' ')}`).includes(q));
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setLocationModal(false);
        setAuthModal(false);
        setMobileMenu(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const locationName = locations.find((item) => item.id === location)?.name;

  const findProfessionals = (): void => {
    if (!query && !location) {
      showNotification('📍 Select a location or enter a service to continue.');
      return;
    }
    if (query) {
      const match = filteredCategories[0];
      if (match) onSelectCategory(match.name);
    }
    onTransition('providers');
  };

  const selectCategory = (category: Category): void => {
    onSelectCategory(category.name);
    setQuery(category.name);
    showNotification(`✓ ${category.name} selected. Find a local professional next.`);
    onTransition('providers');
  };

  const openPartner = (): void => {
    setMobileMenu(false);
    onTransition('worker-signup');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2" aria-label="PunchX home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white">P</span>
            <span className="text-xl font-black tracking-tight text-slate-950">PUNCH<span className="text-orange-500">X</span></span>
          </button>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#services" className="text-sm font-semibold text-slate-600 hover:text-orange-600">Services</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-orange-600">How It Works</a>
            <a href="#partner" className="text-sm font-semibold text-slate-600 hover:text-orange-600">Partner</a>
            <button id="location-selector-btn" type="button" onClick={() => setLocationModal(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:border-orange-300 hover:bg-orange-50">
              📍 {locationName ?? 'Select City / Pincode'}
            </button>
            <button id="worker-register-btn" type="button" onClick={openPartner} className="text-sm font-bold text-orange-600 hover:text-orange-700">Earn as a Pro</button>
            <button id="auth-btn" type="button" onClick={() => setAuthModal(true)} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Login / Sign Up</button>
          </div>

          <button id="mobile-menu-btn" type="button" onClick={() => setMobileMenu((value) => !value)} className="rounded-lg border border-slate-200 p-2 md:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenu}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </nav>

        {mobileMenu && (
          <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="space-y-2">
              <a href="#services" onClick={() => setMobileMenu(false)} className="block rounded-lg px-3 py-3 font-semibold hover:bg-orange-50">Services</a>
              <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block rounded-lg px-3 py-3 font-semibold hover:bg-orange-50">How It Works</a>
              <a href="#partner" onClick={() => setMobileMenu(false)} className="block rounded-lg px-3 py-3 font-semibold hover:bg-orange-50">Partner</a>
              <button type="button" onClick={() => { setMobileMenu(false); setLocationModal(true); }} className="block w-full rounded-lg px-3 py-3 text-left font-semibold hover:bg-orange-50">📍 {locationName ?? 'Select City / Pincode'}</button>
              <button type="button" onClick={openPartner} className="block w-full rounded-lg px-3 py-3 text-left font-bold text-orange-600 hover:bg-orange-50">Earn as a Pro</button>
              <button type="button" onClick={() => { setMobileMenu(false); setAuthModal(true); }} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white">Login / Sign Up</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden bg-orange-50/60">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-200/50 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-orange-100 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-green-500" />Local services with clear booking details.</div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Find Local Service <span className="text-orange-500">Professionals Near You</span></h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Explore local service options and review available booking details before confirming.</p>

              <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                <form onSubmit={(event) => { event.preventDefault(); findProfessionals(); }} className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                  <label htmlFor="hero-location-select" className="sr-only">Select location</label>
                  <select id="hero-location-select" value={location} onChange={(event) => setLocation(event.target.value)} className="h-14 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
                    <option value="">Select City</option>
                    {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <label htmlFor="service-search-input" className="sr-only">Search service</label>
                  <input id="service-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search service (e.g., Fan Repair, Tap Leakage...)" className="h-14 rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
                  <button id="search-btn" type="submit" className="h-14 rounded-xl bg-orange-500 px-6 text-sm font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">Find Professionals</button>
                </form>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-semibold text-slate-500"><span>✓ Local service categories</span><span>✓ Booking details</span><span>✓ Payment methods shown in the booking flow</span></div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              ['✓', 'Local Professionals', 'Review available professional details before booking'],
              ['₹', 'Pricing details', '[SERVICE PRICE RANGES: confirm with founders]'],
              ['🛡️', 'Service support', '[DISPUTE AND REFUND PROCESS: confirm with founders]'],
            ].map(([icon, title, text]) => (
              <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-xl">{icon}</div>
                <h2 className="font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="services" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10"><p className="text-sm font-black uppercase tracking-wider text-orange-500">Popular Services</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">What do you need help with?</h2><p className="mt-3 max-w-2xl text-slate-600">Choose a service category or search for a specific job.</p></div>
            <div id="category-grid" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {filteredCategories.map((category) => (
                <button key={category.id} type="button" data-category={category.id} onClick={() => selectCategory(category)} className="category-card rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">{category.icon}</div>
                  <h3 className="font-bold text-slate-950">{category.name}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Starting at ₹{category.price}</p>
                </button>
              ))}
            </div>
            {filteredCategories.length === 0 && <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">No matching service category found. Try electrician, plumber, AC repair, cleaning or painting.</p>}
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-black uppercase tracking-wider text-orange-400">A clear service journey</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">How PunchX Works</h2><p className="mt-4 text-slate-400">From finding a professional to completing the job, PunchX keeps the service journey simple and transparent.</p></div>
            <div className="mt-14 grid gap-6 md:grid-cols-4">
              {[
                ['01', 'Select Service & Location', 'Choose the work you need and provide your service location.'],
                ['02', 'Instant Professional Match', 'Discover suitable local professionals available for your job.'],
                ['03', 'Transparent Execution & Digital Invoice', 'Track the service and receive a digital record of the work.'],
                ['04', 'Payment & review', 'Use the payment options shown for your booking and share feedback where available.'],
              ].map(([step, title, text]) => <article key={step} className="rounded-2xl border border-white/10 bg-white/5 p-6"><span className="text-sm font-black text-orange-400">{step}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="partner" className="bg-orange-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="overflow-hidden rounded-3xl bg-orange-500 p-8 text-white shadow-xl sm:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div><span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">FOR SERVICE PROFESSIONALS</span><h2 className="mt-5 max-w-3xl text-3xl font-black sm:text-4xl">Are you a skilled electrician, plumber, or technician?</h2><p className="mt-5 max-w-2xl leading-7 text-orange-50">Partner with PunchX to explore customer bookings and digital work opportunities. Wallet, commission and payout terms: [CONFIRM WITH FOUNDERS].</p></div><button id="partner-signup-btn" type="button" onClick={openPartner} className="whitespace-nowrap rounded-xl bg-white px-6 py-4 text-sm font-black text-orange-600 shadow-lg hover:bg-orange-50">Register as a Service Partner</button></div></div></div>
        </section>

        <section id="faq" className="bg-white py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><div className="text-center"><p className="text-sm font-black uppercase tracking-wider text-orange-500">FAQ</p><h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Frequently Asked Questions</h2></div><div className="mt-10 space-y-3">
            {[
              ['How does PunchX verify professionals?', '[VERIFICATION STEPS: confirm with founders]. PunchX will describe the process here after the steps are confirmed.'],
              ['Can I see pricing before booking?', '[SERVICE PRICE RANGES AND FEES: confirm with founders]. Review the final price and applicable fees shown in the booking flow.'],
              ['What happens if there is a service issue?', '[SUPPORT, CANCELLATION AND DISPUTE PROCESS: confirm with founders]. Contact punchxservice@gmail.com while the process is being finalized.'],
              ['How can I become a PunchX service partner?', 'Use the professional registration option. [ONBOARDING AND VERIFICATION STEPS: confirm with founders].'],
            ].map(([question, answer]) => <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer list-none font-bold text-slate-950"><span className="flex items-center justify-between gap-4">{question}<span className="text-xl text-orange-500">+</span></span></summary><p className="mt-4 text-sm leading-7 text-slate-600">{answer}</p></details>)}
          </div></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-2xl font-black tracking-tight">PUNCH<span className="text-orange-500">X</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Connecting people with trusted local professionals.</p></div><div><h2 className="font-bold">Services</h2><ul className="mt-4 space-y-3 text-sm text-slate-400">{categories.map((category) => <li key={category.id}><button type="button" onClick={() => selectCategory(category)} className="hover:text-white">{category.name}</button></li>)}</ul></div><div><h2 className="font-bold">Company & Legal</h2><ul className="mt-4 space-y-3 text-sm text-slate-400"><li><a href="#about" className="hover:text-white">About Us</a></li><li><button type="button" onClick={openPartner} className="hover:text-white">Become a Partner</button></li><li><a href="#contact" className="hover:text-white">Contact & Support</a></li><li><button type="button" onClick={() => onTransition('privacy-policy')} className="hover:text-white">Privacy Policy</button></li><li><button type="button" onClick={() => onTransition('terms-and-conditions')} className="hover:text-white">Terms & Conditions</button></li><li><button type="button" onClick={() => showNotification('Refund/Cancellation Policy available soon')} className="hover:text-white">Refund / Cancellation Policy</button></li><li><button type="button" onClick={() => showNotification('Cookie Policy available soon')} className="hover:text-white">Cookie Policy</button></li></ul></div><div><h2 className="font-bold">Popular Searches</h2><p className="mt-4 text-sm leading-7 text-slate-400">Electrician near me, plumber near me, AC repair, appliance repair, home cleaning, carpenter, painting services, local professionals, local professionals and home services.</p></div></div><div className="mt-12 border-t border-white/10 pt-6 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4"><span>© 2026 PunchX. All rights reserved.</span></div></div></footer>

      {locationModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="location-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationModal(false); }}><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-orange-500">SERVICE LOCATION</p><h2 id="location-modal-title" className="mt-1 text-2xl font-black">Where do you need a professional?</h2></div><button type="button" onClick={() => setLocationModal(false)} className="rounded-xl p-2 text-xl text-slate-500 hover:bg-slate-100" aria-label="Close location selector">×</button></div><div className="mt-6 space-y-4"><select value={location} onChange={(event) => setLocation(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-500"><option value="">Choose a city</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input inputMode="numeric" maxLength={6} placeholder="Or enter 6-digit Pincode" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-500" /><button type="button" onClick={() => { setLocationModal(false); showNotification(`📍 Location selected: ${locationName ?? 'Pincode'}`); }} className="w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-white hover:bg-orange-600">Continue</button></div></div></div>}

      {authModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthModal(false); }}><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-orange-500">PUNCHX ACCOUNT</p><h2 id="auth-modal-title" className="mt-1 text-2xl font-black text-slate-950">Login / Sign Up</h2></div><button type="button" onClick={() => setAuthModal(false)} className="rounded-xl p-2 text-xl text-slate-500 hover:bg-slate-100" aria-label="Close authentication modal">×</button></div><p className="mt-5 text-sm leading-6 text-slate-600">Continue to PunchX to book services, manage bookings, or access your service partner account.</p><button type="button" onClick={() => { setAuthModal(false); onTransition('panel-select'); }} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800">Continue</button></div></div>}
    </div>
  );
}
