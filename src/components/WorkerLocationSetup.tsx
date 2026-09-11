import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, WorkerApplication } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { 
  User, Calendar, MapPin, Compass, Navigation, CheckCircle, ArrowRight, 
  ShieldCheck, Sparkles, Building, AlertCircle, Loader2, Wrench,
  Zap, Droplets, SprayCan as SparkleIcon, Hammer, Phone, Star,
  Briefcase, Users, Clock, Shield, Lock, Radio, Grid, CheckCircle2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/authContext';
import { 
  requestAndAutoUpdateLocation, 
  fetchRegisteredCustomersForWorkerLocation
} from '../lib/location';
import ServiceCategoryModal from './ServiceCategoryModal';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WorkerLocationSetupProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  workerApplication?: WorkerApplication | null;
  setWorkerApplicationData?: (data: WorkerApplication) => void;
}

export default function WorkerLocationSetup({
  onTransition,
  showNotification,
  authMethod,
  authTarget,
  workerApplication,
  setWorkerApplicationData
}: WorkerLocationSetupProps) {
  const { currentUser } = useAuth() as any;
  const [legalName, setLegalName] = useState(
    workerApplication?.legalName ||
    (authMethod === 'gmail' && authTarget ? authTarget.split('@')[0] : '') ||
    localStorage.getItem('punchx_worker_name') ||
    ''
  );

  const [dob, setDob] = useState(
    localStorage.getItem('punchx_worker_dob') ||
    localStorage.getItem('punchx_user_dob') ||
    ''
  );

  const [address, setAddress] = useState(
    workerApplication?.address ||
    localStorage.getItem('punchx_worker_address') ||
    ''
  );

  const [landmark, setLandmark] = useState(
    localStorage.getItem('punchx_worker_landmark') || ''
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (workerApplication?.categories && workerApplication.categories.length > 0) {
      return workerApplication.categories;
    }
    if (workerApplication?.skill) {
      return [workerApplication.skill];
    }
    return ['AC Technician'];
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isResolvingBackend, setIsResolvingBackend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Location resolution state from backend
  const [resolvedSector, setResolvedSector] = useState('Sector 2 (Indiranagar)');
  const [resolvedArea, setResolvedArea] = useState('Indiranagar');
  const [resolvedCity, setResolvedCity] = useState('Bengaluru');
  const [coverageMessage, setCoverageMessage] = useState('Connecting to location dispatch server...');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });

  const quickCategories = [
    'Electrician',
    'Plumber',
    'AC Technician',
    'Carpenter',
    'Mechanic',
    'Cleaner/Housekeeper'
  ];

  // Query backend for location sector and telemetry (Customer details remain strictly hidden for privacy)
  const resolveWorkerLocationFromBackend = useCallback(async (
    targetAddress?: string,
    targetLandmark?: string,
    lat?: number,
    lng?: number
  ) => {
    setIsResolvingBackend(true);
    try {
      const resp = await fetchRegisteredCustomersForWorkerLocation({
        address: targetAddress || address || 'Indiranagar 100ft Road, Bengaluru',
        landmark: targetLandmark || landmark,
        lat: lat || coords.lat,
        lng: lng || coords.lng
      });

      if (resp && resp.success) {
        setResolvedSector(resp.sector || 'Sector 2 (Indiranagar)');
        setResolvedArea(resp.area || 'Indiranagar');
        setResolvedCity(resp.city || 'Bengaluru');
        setCoverageMessage(resp.coverageMessage || `Service partner visibility active for ${resp.sector}`);
        if (resp.lat && resp.lng) {
          setCoords({ lat: resp.lat, lng: resp.lng });
        }
      }
    } catch (e) {
      console.warn("Error querying worker location backend:", e);
    } finally {
      setIsResolvingBackend(false);
    }
  }, [address, landmark, coords.lat, coords.lng]);

  // Initial lookup on mount
  useEffect(() => {
    resolveWorkerLocationFromBackend(address || 'Indiranagar 100ft Road, Bengaluru', landmark);
  }, []);

  // Debounced lookup when worker types address or landmark manually
  useEffect(() => {
    if (!address || address.trim().length < 3) return;
    const timer = setTimeout(() => {
      resolveWorkerLocationFromBackend(address, landmark);
    }, 700);
    return () => clearTimeout(timer);
  }, [address, landmark]);

  // GPS Auto Detection Trigger
  const handleAutoDetectGps = async () => {
    setIsDetectingGps(true);
    setErrorMessage('');
    showNotification("📡 Acquiring GPS satellite lock for Service Partner...");

    try {
      const loc = await requestAndAutoUpdateLocation('worker');
      if (loc && loc.address) {
        setAddress(loc.address);
        setCoords({ lat: loc.lat, lng: loc.lng });
        setResolvedArea(loc.area);
        setResolvedCity(loc.city);
        setResolvedSector(loc.sector);

        // Query backend with GPS coordinates to bind operational sector
        await resolveWorkerLocationFromBackend(loc.address, landmark, loc.lat, loc.lng);
        showNotification(`✓ GPS Location Auto-Detected: ${loc.area || loc.sector}`);
      } else {
        setErrorMessage("Could not get precise GPS. Please enter your hub / workshop address manually.");
      }
    } catch (err: any) {
      console.warn("Worker GPS detection error:", err);
      setErrorMessage("GPS permission denied or timed out. Please enter address manually.");
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!legalName.trim()) {
      setErrorMessage('Please enter your full legal name or partner name.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter your service hub / residential address.');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMessage('Please provide a more specific address for accurate operational dispatch matching.');
      return;
    }

    setIsSubmitting(true);
    const finalFormattedAddress = landmark.trim() 
      ? `${address.trim()}, Near ${landmark.trim()}, ${resolvedCity}`
      : `${address.trim()}, ${resolvedCity}`;

    // Save to LocalStorage
    try {
      localStorage.setItem('punchx_worker_name', legalName.trim());
      localStorage.setItem('punchx_worker_dob', dob.trim());
      localStorage.setItem('punchx_worker_address', finalFormattedAddress);
      localStorage.setItem('punchx_worker_landmark', landmark.trim());
      localStorage.setItem('punchx_worker_sector', resolvedSector);
      localStorage.setItem('punchx_worker_skill', selectedCategories.join(', ') || 'AC Technician');
      localStorage.setItem('punchx_worker_categories', JSON.stringify(selectedCategories));
      localStorage.setItem('punchx_worker_location', JSON.stringify({
        lat: coords.lat,
        lng: coords.lng,
        address: finalFormattedAddress,
        area: resolvedArea,
        city: resolvedCity,
        sector: resolvedSector,
        landmark: landmark.trim(),
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.warn("LocalStorage save error:", err);
    }

    // Save/Update in Firestore with PENDING status for Admin Approval
    const activeUid = currentUser?.sub || `worker_${Date.now()}`;
    const generatedAppId = workerApplication?.id || `APP-${Date.now().toString().slice(-6)}`;

    const appData: WorkerApplication = {
      id: generatedAppId,
      uid: activeUid,
      legalName: legalName.trim(),
      address: finalFormattedAddress,
      area: resolvedArea,
      sector: resolvedSector,
      skill: selectedCategories.join(', ') || 'AC Technician',
      categories: selectedCategories,
      experienceYears: workerApplication?.experienceYears || '3-5 Years',
      phone: authMethod === 'phone' ? authTarget : (workerApplication?.phone || currentUser?.phone_number || ''),
      email: authMethod === 'gmail' ? authTarget : (workerApplication?.email || currentUser?.email || 'partner@punchx.com'),
      visitingFee: workerApplication?.visitingFee || 199,
      termsAccepted: true,
      status: 'PENDING',
      appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today'
    };

    try {
      await setDoc(doc(db, 'users', activeUid), {
        uid: activeUid,
        name: legalName.trim(),
        dob: dob.trim(),
        birthdate: dob.trim(),
        address: finalFormattedAddress,
        streetAddress: address.trim(),
        landmark: landmark.trim(),
        area: resolvedArea,
        city: resolvedCity,
        sector: resolvedSector,
        workerSkill: selectedCategories.join(', ') || 'AC Technician',
        categories: selectedCategories,
        skill: selectedCategories[0] || 'AC Technician',
        location: { lat: coords.lat, lng: coords.lng },
        role: 'worker',
        phone: appData.phone,
        email: appData.email,
        isProfileCompleted: true,
        status: 'PENDING',
        applicationId: generatedAppId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Save application document to Firestore workerApplications collection
      await setDoc(doc(db, 'workerApplications', generatedAppId), appData, { merge: true });

      if (setWorkerApplicationData) {
        setWorkerApplicationData(appData);
      }

      // Update in LocalStorage
      const existingApps = JSON.parse(localStorage.getItem('punchx_worker_applications') || '[]');
      const filtered = existingApps.filter((a: WorkerApplication) => a.id !== generatedAppId);
      localStorage.setItem('punchx_worker_applications', JSON.stringify([appData, ...filtered]));

      // Save credential mapping
      const workerAccount = {
        email: appData.email,
        phone: appData.phone,
        legalName: appData.legalName,
        status: 'PENDING',
        applicationId: generatedAppId
      };
      localStorage.setItem(`punchx_worker_cred_${appData.phone}`, JSON.stringify(workerAccount));
    } catch (dbErr) {
      console.warn("Firestore worker profile save error:", dbErr);
    }

    setIsSubmitting(false);
    showNotification(`📋 Hub Registered! Request submitted to Company Admin Dashboard for authorization review.`);
    onTransition('worker-pending-approval');
  };

  return (
    <main
      id="worker-location-setup-page"
      className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col items-center justify-between pb-10 pt-6 px-4 sm:px-6 overflow-y-auto"
    >
      <div className="w-full max-w-2xl flex flex-col items-center space-y-6">
        
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#c5a059]/50 flex items-center justify-center p-1.5 shadow-xl shadow-[#c5a059]/10">
            <img
              id="worker-setup-logo"
              src={PUNCHX_LOGO}
              alt="PunchX Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#c5a059] text-[11px] font-mono font-bold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5" />
            <span>Service Partner Hub & Dispatch Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Service Hub & Operational Area
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg font-sans">
            Set your workshop or base location. Your profile will be automatically linked to nearby dispatch sectors for rapid 15-minute emergency routing.
          </p>
        </div>

        {/* Setup Form */}
        <form
          id="worker-setup-form"
          onSubmit={handleSubmit}
          className="w-full bg-[#0d1b38]/90 border border-zinc-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md space-y-5"
        >
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2.5 text-xs text-red-300 font-sans"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* 1. Legal / Partner Name & Date of Birth (2 cols on tablet/desktop, 1 col on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                Legal Name / Specialist Name <span className="text-[#c5a059]">*</span>
              </label>
              <div className="relative flex items-center w-full">
                <User className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  id="worker-name-input"
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (Thermal Specialist)"
                  required
                  className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059]"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                Date of Birth (NamoID) <span className="text-[#c5a059]">*</span>
              </label>
              <div className="relative flex items-center w-full">
                <Calendar className="absolute left-3.5 w-4 h-4 text-[#c5a059]" />
                <input
                  id="worker-dob-input"
                  type="date"
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059] [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* 2. What service do you provide? (50 Categories) */}
          <div className="space-y-2.5 bg-[#09152e] p-4 rounded-xl border border-zinc-800">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                  What service do you provide? <span className="text-[#c5a059]">*</span>
                </label>
                <p className="text-[11px] text-zinc-400">
                  Select your primary and secondary trade services ({selectedCategories.length} selected).
                </p>
              </div>
              <button
                type="button"
                id="worker-setup-open-categories-btn"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#d8b56f] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all self-start sm:self-auto"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Search 50 Categories</span>
              </button>
            </div>

            {/* Selected Categories Display */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedCategories.map((catName) => (
                <span
                  key={catName}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#c5a059]/20 border border-[#c5a059]/50 text-white rounded-full text-xs font-medium"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#c5a059]" />
                  <span>{catName}</span>
                </span>
              ))}
            </div>

            {/* Quick-Pick Popular Category Pills */}
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                Quick Category Toggles:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (selectedCategories.length > 1) {
                            setSelectedCategories(prev => prev.filter(c => c !== cat));
                          }
                        } else {
                          setSelectedCategories(prev => [...prev, cat]);
                        }
                      }}
                      className={`p-2 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#c5a059] text-black font-bold border-[#c5a059]'
                          : 'bg-[#07122a] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Address Input + GPS Auto Detect Button */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                Hub / Workshop / Operational Address <span className="text-[#c5a059]">*</span>
              </label>
              <button
                type="button"
                id="worker-gps-detect-btn"
                onClick={handleAutoDetectGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#c5a059] hover:text-[#d8b56f] transition-all bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {isDetectingGps ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Auto-Detecting GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>Auto-Update GPS Location</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative flex items-start">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c5a059]" />
              <textarea
                id="worker-address-input"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 100ft Road, Sector 2, Indiranagar, Bengaluru"
                required
                className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059] resize-none"
              />
            </div>
            <p className="text-[10px] font-sans text-zinc-400">
              💡 Type your workshop address or tap <strong className="text-[#c5a059]">Auto-Update GPS Location</strong> to bind your operational dispatch sector.
            </p>
          </div>

          {/* 4. Landmark */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
              Prominent Landmark <span className="text-zinc-500 font-normal">(For operational zone proximity)</span>
            </label>
            <div className="relative flex items-center">
              <Compass className="absolute left-3.5 w-4 h-4 text-emerald-400" />
              <input
                id="worker-landmark-input"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Metro Pillar 140, Opposite BDA Complex"
                className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059]"
              />
            </div>
          </div>

          {/* 5. Operational Sector & Dispatch Zone Readiness */}
          <div className="bg-[#09152e]/95 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#c5a059]" />
                <div>
                  <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    {resolvedSector}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    {resolvedCity} • Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 font-semibold">
                <CheckCircle className="w-3 h-3" />
                <span>Sector Active</span>
              </div>
            </div>

            {/* Operational Telemetry & Privacy Shield Display */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#07122a] border border-zinc-800/80 p-2.5 rounded-lg flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-mono">Dispatch Radius</p>
                    <p className="font-bold text-white text-xs">15-Km High Priority Zone</p>
                  </div>
                </div>
                <div className="bg-[#07122a] border border-zinc-800/80 p-2.5 rounded-lg flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-mono">Routing Protocol</p>
                    <p className="font-bold text-white text-xs">Direct Emergency Queue</p>
                  </div>
                </div>
              </div>

              {/* Data Privacy Shield Notice */}
              <div className="p-3 bg-zinc-950/60 border border-zinc-800/90 rounded-xl flex items-start gap-2.5 text-left">
                <Lock className="w-4 h-4 text-[#c5a059] flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-mono font-bold text-[#e9c176] uppercase">
                    Customer Privacy Shield Enforced
                  </p>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Customer identities, contact numbers, and private residential addresses remain strictly confidential and will only be displayed when a live service request is dispatched and accepted by you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="save-worker-location-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#c5a059] hover:bg-[#d8b56f] text-black font-extrabold text-xs tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-lg shadow-[#c5a059]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Activating Service Hub...</span>
              </>
            ) : (
              <>
                <span>Save Location & Open Partner Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Verification Disclaimer */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 text-center">
          <ShieldCheck className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
          <span>All location updates are encrypted and synchronized with PunchX backend dispatch servers.</span>
        </div>
      </div>

      {/* 50 Worker Categories Selection Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="worker"
        selectedCategories={selectedCategories}
        onSaveWorkerCategories={(cats) => {
          setSelectedCategories(cats);
          showNotification(`✓ ${cats.length} trade categories saved!`);
        }}
      />
    </main>
  );
}

