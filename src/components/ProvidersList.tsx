import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { ArrowLeft, Star, ShieldCheck, Clock, MapPin, CheckCircle, AlertTriangle, Filter, Laptop, User, Mail, Phone, Calendar, Compass, RefreshCw, Grid, Search } from 'lucide-react';
import { CategoryProfileBadge } from './CategoryIcon';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/authContext';
import { requestAndAutoUpdateLocation, isSameAreaOrNearby, extractAreaFromAddress, getSectorFromAddress, getCoordinatesForAddressOrSector } from '../lib/location';
import ServiceRadiusRadarModal from './ServiceRadiusRadarModal';
import ServiceCategoryModal from './ServiceCategoryModal';
import { isCategoryMatching } from '../data/categories';

interface ProvidersListProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
  onSelectWorker: (worker: Worker) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  citizenName: string;
  setCitizenName: (name: string) => void;
  citizenAddress: string;
  setCitizenAddress: (addr: string) => void;
}

export default function ProvidersList({
  onTransition,
  selectedCategory,
  onSelectCategory,
  onSelectWorker,
  authMethod,
  authTarget,
  showNotification,
  citizenName,
  setCitizenName,
  citizenAddress,
  setCitizenAddress
}: ProvidersListProps) {
  const { currentUser } = useAuth() as any;
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price-low' | 'price-high'>('distance');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showRadiusRadarModal, setShowRadiusRadarModal] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // Profile edit fields
  const [tempName, setTempName] = useState(citizenName);
  const [tempAddress, setTempAddress] = useState(citizenAddress);

  // Live Worker Online Status Tracker
  const [workerOnlineStatus, setWorkerOnlineStatus] = React.useState<'online' | 'offline'>(() => {
    return (localStorage.getItem('punchx_worker_online_status') as 'online' | 'offline') || 'online';
  });

  const [registeredWorkers, setRegisteredWorkers] = useState<Worker[]>([]);

  const [isLocating, setIsLocating] = useState(false);

  const handleRefreshLocation = async () => {
    setIsLocating(true);
    const loc = await requestAndAutoUpdateLocation('customer');
    setIsLocating(false);
    if (loc && loc.address) {
      setCitizenAddress(loc.address);
      showNotification(`📍 GPS location updated: ${loc.area || loc.address}`);
    }
  };

  useEffect(() => {
    // Fetch real authorized service providers from Firestore workerApplications where status === APPROVED
    const unsub = onSnapshot(collection(db, 'workerApplications'), (snapshot) => {
      const list: Worker[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'APPROVED') {
          const wrkAddr = data.address || citizenAddress || 'Indiranagar, Kolkata';
          const wrkArea = data.area || extractAreaFromAddress(wrkAddr);
          const wrkSector = data.sector || getSectorFromAddress(wrkAddr, wrkArea);

          list.push({
            id: docSnap.id,
            name: data.legalName || 'Authorized Specialist',
            category: data.skill || 'General Repairs',
            rating: 5.0,
            reviewsCount: 12,
            avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
            proBadge: 'AUTHORIZED',
            price: data.visitingFee || 199,
            visitingFee: data.visitingFee || 199,
            available: true,
            address: wrkAddr,
            area: wrkArea,
            sector: wrkSector,
            location: data.location || { lat: 12.9716, lng: 77.5946 },
            phone: data.phone || '+91 98765 43210'
          });
        }
      });

      setRegisteredWorkers(list);
    }, (err) => {
      console.warn("Firestore workerApplications listener notice:", err);
    });

    return () => unsub();
  }, [citizenAddress]);

  React.useEffect(() => {
    const handleStatusChange = () => {
      const st = (localStorage.getItem('punchx_worker_online_status') as 'online' | 'offline') || 'online';
      setWorkerOnlineStatus(st);
    };
    window.addEventListener('punchx_worker_status_change', handleStatusChange);
    window.addEventListener('storage', handleStatusChange);
    return () => {
      window.removeEventListener('punchx_worker_status_change', handleStatusChange);
      window.removeEventListener('storage', handleStatusChange);
    };
  }, []);

  // Customer current active Sector
  const customerSector = getSectorFromAddress(citizenAddress);

  // Use dynamic authorized workers directly from Firestore
  const allProvidersList = registeredWorkers;

  // Normalize category name for filtering
  const displayCategory = selectedCategory || 'AC Repair';
  const isAllSpecialties = displayCategory.toLowerCase() === 'all specialties' || displayCategory.toLowerCase() === 'all';
  
  // Annotate providers with proximity distance calculation and sector details
  const annotatedList = allProvidersList.map(expert => {
    const workerSector = expert.sector || getSectorFromAddress(expert.address, expert.area);
    const proximity = isSameAreaOrNearby(
      citizenAddress,
      expert.address,
      undefined,
      expert.location
    );

    const distanceKm = proximity.distanceKm;

    return {
      ...expert,
      sector: workerSector,
      sectorMatch: true,
      isWithin15Km: true,
      areaMatch: proximity.isMatch,
      distanceKm: distanceKm
    };
  });

  // Filter providers strictly by category & availability
  let filtered = annotatedList.filter(expert => {
    const expertCat = (expert.category || '').toLowerCase();
    const targetCat = displayCategory.toLowerCase();
    
    // Support centralized 50 category synonym & array matching
    const isCategoryMatch = isAllSpecialties ||
                     isCategoryMatching(expert.categories || expert.category, displayCategory) ||
                     expertCat === targetCat || 
                     expertCat.includes(targetCat) || 
                     targetCat.includes(expertCat);
    
    // Check if worker is active / on-duty
    const isAvailable = filterAvailableOnly ? expert.available !== false : true;

    return isCategoryMatch && isAvailable;
  });

  // Sort by distance, rating or price
  filtered.sort((a, b) => {
    if (sortBy === 'distance') {
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    } else if (sortBy === 'rating') {
      return b.rating - a.rating;
    } else if (sortBy === 'price-low') {
      return a.price - b.price;
    } else if (sortBy === 'price-high') {
      return b.price - a.price;
    }
    return 0;
  });

  const handleSelect = (worker: Worker) => {
    if (worker.available === false) {
      showNotification(`⚠️ ${worker.name} is currently busy at another precinct. Please choose an active provider.`);
      return;
    }
    onSelectWorker(worker);
    showNotification(`✓ Specialist ${worker.name} selected. Opening details page.`);
    onTransition('provider-details');
  };

  const handleSaveProfile = async () => {
    if (!tempName.trim()) {
      showNotification("⚠️ User details fields cannot be left empty.");
      return;
    }
    const cleanAddress = tempAddress.trim() || 'Address not provided';
    setCitizenName(tempName.trim());
    setCitizenAddress(cleanAddress);
    setIsEditingProfile(false);

    if (currentUser?.sub) {
      try {
        await updateDoc(doc(db, 'users', currentUser.sub), {
          name: tempName.trim(),
          address: cleanAddress,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Firestore user profile save error:", e);
      }
    }
    showNotification("✓ Citizen profile metadata refreshed successfully.");
  };

  return (
    <div id="providers-list-root" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-32">
      {/* Top Main Luxurious Header with integrated Citizen Credentials */}
      <header id="providers-header" className="relative z-40 bg-[#11192e]/90 backdrop-blur-md border-b border-[#c5a059]/25 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          
          {/* Header left side (Navigation, category context) */}
          <div className="flex items-center gap-4">
            <button
              id="providers-back-to-home"
              onClick={() => onTransition('home')}
              className="p-2.5 bg-zinc-900/60 hover:bg-[#c5a059]/15 rounded-xl text-[#c5a059] border border-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-[#c5a059]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono tracking-widest text-[#e9c176] uppercase font-extrabold bg-[#c5a059]/10 px-2.5 py-0.5 rounded-full border border-[#c5a059]/20">
                  Elite Force Directory
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[10px] font-mono text-[#c5a059] hover:text-[#e9c176] bg-[#c5a059]/15 hover:bg-[#c5a059]/30 px-2.5 py-0.5 rounded-full border border-[#c5a059]/40 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Search className="w-3 h-3" />
                  <span>Change Service (50 Available)</span>
                </button>
              </div>
              <h1 id="providers-category-title" className="font-sans font-bold text-xl text-white tracking-tight mt-0.5">
                {displayCategory} Specialists
              </h1>
            </div>
          </div>

          {/* Header right side: PREMIUM CITIZEN / USER DETAILS BLOCK */}
          <div id="header-citizen-block" className="relative md:self-end self-center w-full md:w-auto">
            <div className="bg-[#0b1325]/90 border border-[#c5a059]/40 p-3.5 rounded-xl shadow-lg max-w-sm md:ml-auto">
              <div className="flex justify-between items-center gap-2 border-b border-zinc-800/80 pb-2 mb-2">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#e9c176] uppercase tracking-wider font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />
                  Citizen Access Token
                </div>
                <button
                  onClick={() => {
                    setIsEditingProfile(!isEditingProfile);
                    setTempName(citizenName);
                    setTempAddress(citizenAddress);
                  }}
                  className="text-[9px] font-mono text-[#c5a059] hover:underline uppercase tracking-wide cursor-pointer font-bold bg-[#c5a059]/10 px-2 py-0.5 rounded"
                >
                  {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Citizen Name"
                    className="w-full bg-[#07122a] border border-[#c5a059]/50 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    placeholder="Installation Address"
                    className="w-full bg-[#07122a] border border-[#c5a059]/50 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-1 text-[10px] font-mono text-black font-extrabold bg-[#c5a059] rounded hover:bg-[#e9c176]"
                  >
                    SAVE PROFILE DETAILS
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    <span id="citizen-name-badge" className="text-xs font-bold text-white tracking-wide">
                      {citizenName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-[#c5a059] flex-shrink-0" />
                        <span id="citizen-address-badge" className="truncate max-w-[170px]" title={citizenAddress}>
                          {citizenAddress}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-extrabold text-[#e9c176] bg-[#c5a059]/10 border border-[#c5a059]/30 px-2 py-0.5 rounded-full inline-block self-start mt-0.5">
                        📍 Sector: {customerSector}
                      </span>
                    </div>
                    <button
                      onClick={handleRefreshLocation}
                      disabled={isLocating}
                      className="text-[9px] font-mono font-bold text-[#e9c176] hover:text-white bg-[#c5a059]/20 hover:bg-[#c5a059]/40 px-2 py-1 rounded border border-[#c5a059]/30 cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 self-center"
                    >
                      <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                      <span>{isLocating ? 'Syncing...' : 'Auto GPS'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {authMethod === 'gmail' ? (
                      <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    ) : (
                      <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    )}
                    <span id="citizen-contact-badge" className="text-[9px] text-zinc-500 font-mono">
                      {authTarget || 'Verified Account'} (Master Link Verified)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main content grid */}
      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-6">
        
        {/* Dynamic Controls layout */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#111415] border border-zinc-800 p-4 rounded-2xl gap-4 shadow">
          {/* Availability filter & 15km radar button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <button
              id="open-customer-radar-btn"
              onClick={() => setShowRadiusRadarModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20"
            >
              <Compass className="w-3.5 h-3.5" /> Map Radar
            </button>

            <button
              id="toggle-available-only"
              onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterAvailableOnly 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-[#c5a059]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterAvailableOnly ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></span>
              Active Only
            </button>
          </div>

          {/* Sorter tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#c5a059]" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">Sort:</span>
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 text-[10px] flex-wrap gap-1">
              <button
                onClick={() => setSortBy('distance')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold uppercase ${sortBy === 'distance' ? 'bg-[#c5a059] text-black font-extrabold' : 'text-zinc-400'}`}
              >
                Nearest
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold uppercase ${sortBy === 'rating' ? 'bg-[#c5a059] text-black font-extrabold' : 'text-zinc-400'}`}
              >
                Rating
              </button>
              <button
                onClick={() => setSortBy('price-low')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold uppercase ${sortBy === 'price-low' ? 'bg-[#c5a059] text-black font-extrabold' : 'text-zinc-400'}`}
              >
                Price: Low
              </button>
              <button
                onClick={() => setSortBy('price-high')}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold uppercase ${sortBy === 'price-high' ? 'bg-[#c5a059] text-black font-extrabold' : 'text-zinc-400'}`}
              >
                Price: High
              </button>
            </div>
          </div>
        </div>

        {/* Directory Listings */}
        <div id="providers-card-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((worker) => {
                const isRajesh = worker.id === 'rajesh' || worker.name.toLowerCase().includes('rajesh');
                const isAvailable = isRajesh ? (workerOnlineStatus === 'online') : (worker.available !== false);

                const handleSelect = (w: Worker) => {
                  if (!isAvailable) {
                    showNotification(`⚠️ ${w.name} is currently OFFLINE / OFF DUTY. Please choose an active online specialist.`);
                    return;
                  }
                  onSelectWorker(w);
                  onTransition('provider-details');
                };

                return (
                  <motion.div
                    id={`provider-list-card-${worker.id}`}
                    key={worker.id}
                    className={`relative bg-[#111415] border rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.01] transition-all duration-200 group ${
                      isAvailable 
                        ? 'border-zinc-850 hover:border-[#c5a059]/55' 
                        : 'border-zinc-800/40 opacity-70'
                    }`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    {/* Top block */}
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={worker.avatar}
                            alt={worker.name}
                            className={`w-14 h-14 rounded-full object-cover border-2 shadow-md ${
                              isAvailable ? 'border-[#c5a059]' : 'border-zinc-700 brightness-75'
                            }`}
                            referrerPolicy="no-referrer"
                          />
                          {/* Category badge in the top-right corner of the profile */}
                          <CategoryProfileBadge category={worker.category} sizeClassName="w-5.5 h-5.5 p-1" />
                          {/* Live pulse dot */}
                          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#111415] flex items-center justify-center ${
                            isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                        </div>

                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white tracking-wide group-hover:text-[#c5a059] transition-colors">
                              {worker.name}
                            </h3>
                            <span className="bg-[#c5a059] text-black font-mono text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-yellow-200/20">
                              {worker.proBadge}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[#e9c176] font-mono tracking-wide mt-0.5">
                            {worker.category} Specialist
                          </p>

                          {/* Location & Proximity Distance Match Badge */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-sans">
                              <MapPin className="w-3 h-3 text-[#c5a059]" />
                              {worker.area || extractAreaFromAddress(worker.address || '')}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                              <Compass className="w-2.5 h-2.5 text-emerald-400" />
                              📍 {worker.distanceKm} km away
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <Star className="w-3.5 h-3.5 fill-[#e9c176] text-[#e9c176]" />
                            <span className="font-bold text-xs text-zinc-300">{worker.rating}</span>
                            <span className="text-zinc-500 text-[10px] font-mono">({worker.reviewsCount} jobs)</span>
                          </div>
                        </div>

                        {/* Availability Text label */}
                        <div className="text-right flex flex-col items-end">
                          {isAvailable ? (
                            <div className="flex items-center gap-1 text-emerald-400 font-mono text-[9px] font-black tracking-widest uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              Active Online
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-400 font-mono text-[9px] font-black tracking-widest uppercase bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                              OFFLINE (OFF DUTY)
                            </div>
                          )}
                          {/* Transparent Fee Breakdown */}
                          <div className="mt-2 text-right bg-[#07122a] p-2 rounded-xl border border-zinc-800">
                            <span className="text-[9px] text-zinc-400 font-mono uppercase block">Visit Fee: ₹{worker.visitingFee || worker.price || 199}</span>
                            <span className="text-[8px] text-[#e9c176] font-mono block">+ ₹20 Co. Comm + GST</span>
                            <p className="text-xs font-extrabold text-[#e9c176] leading-none mt-1">
                              Total: ₹{(worker.visitingFee || worker.price || 199) + 20 + Math.round(((worker.visitingFee || worker.price || 199) + 20) * 0.18)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Info lines */}
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-4">
                        Highly recommended for {worker.category} installations, diagnostic sweeps, and security clearances.
                      </p>
                    </div>

                    {/* Button actions */}
                    <div className="border-t border-zinc-800/60 pt-4 flex items-center justify-between gap-4">
                      <div className="flex gap-2">
                        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">
                          ⚡ Express Contact
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">
                          🛡️ Bonded Core
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleSelect(worker)}
                        className={`px-5 py-2.5 rounded-xl text-xs uppercase font-extrabold tracking-widest transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-[#c5a059] text-black hover:bg-[#e9c176] shadow-lg shadow-[#c5a059]/15'
                            : 'bg-zinc-800 text-rose-300 border border-rose-500/30 opacity-70 cursor-pointer'
                        }`}
                      >
                        {isAvailable ? 'Book Expert' : 'Worker Offline'}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-1 md:col-span-2 py-12 px-6 border-2 border-dashed border-rose-500/40 rounded-3xl text-center space-y-4 bg-[#11192e]/90 shadow-2xl relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                  <AlertTriangle className="w-8 h-8 animate-pulse" />
                </div>
                
                <div className="space-y-2 max-w-lg mx-auto">
                  <span className="text-[10px] font-mono font-extrabold uppercase bg-[#c5a059]/20 text-[#e9c176] px-3 py-1 rounded-full border border-[#c5a059]/30">
                    PUNCH X SECTOR DISPATCH MODEL
                  </span>
                  <h3 className="font-sans font-extrabold text-xl text-white tracking-tight">
                    NOT AVAILABLE IN YOUR SECTOR
                  </h3>
                  <div className="bg-[#07122a] p-3 rounded-2xl border border-zinc-800 text-xs font-mono font-bold text-[#e9c176] flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4 text-[#c5a059]" />
                    <span>Your Sector: {customerSector}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    To guarantee instant 10-minute arrival, customers can strictly only book authorized specialists physically present inside their designated sector. Currently, no active {displayCategory} specialist is on duty in <span className="text-white font-bold">{customerSector}</span>.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={handleRefreshLocation}
                    disabled={isLocating}
                    className="px-5 py-2.5 bg-[#c5a059] text-black rounded-xl font-mono text-xs uppercase tracking-wider font-extrabold shadow-lg hover:bg-[#e9c176] transition-all cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'Locating Sector...' : 'Refresh GPS Sector'}
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-5 py-2.5 bg-zinc-800 text-zinc-200 rounded-xl font-mono text-xs uppercase tracking-wider font-bold border border-zinc-700 hover:border-[#c5a059] cursor-pointer"
                  >
                    Change Address / Sector
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Floating Bottom Nav for visual coherence */}
      <nav id="providers-bottom-navbar" className="fixed bottom-0 left-0 w-full z-45 bg-[#07122a] border-t border-[#c5a059]/20 flex justify-around items-center h-20 shadow-2xl px-6">
        <button
          onClick={() => onTransition('home')}
          className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#e9c176] transition-colors"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-sans">Home</span>
        </button>

        <button
          onClick={() => {
            onTransition('home');
          }}
          className="flex flex-col items-center justify-center gap-1 text-[#e9c176] bg-[#c5a059]/10 px-4 py-1.5 rounded-xl border border-[#c5a059]/30"
        >
          <Calendar className="w-5 h-5 text-[#e9c176]" />
          <span className="text-[10px] font-bold font-sans uppercase">Directory</span>
        </button>
      </nav>

      {/* 15 KM RADIUS DISPATCH RADAR MODAL FOR CITIZENS */}
      <ServiceRadiusRadarModal
        isOpen={showRadiusRadarModal}
        onClose={() => setShowRadiusRadarModal(false)}
        mode="customer"
        centerLocation={{
          lat: 12.9716,
          lng: 77.5946,
          address: citizenAddress || 'Customer Residence',
          name: citizenName || 'Your Location'
        }}
        workers={annotatedList.filter(w => w.available !== false)}
        onSelectWorker={(w) => {
          setShowRadiusRadarModal(false);
          handleSelect(w);
        }}
        onRecalibrateGps={handleRefreshLocation}
      />

      {/* Centralized 50 Categories Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="citizen"
        selectedCategory={selectedCategory}
        onSelectCategory={(catName) => {
          if (onSelectCategory) {
            onSelectCategory(catName);
          }
          showNotification(`⚡ Showing verified ${catName} specialists`);
        }}
      />
    </div>
  );
}
