import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { 
  User, Calendar, MapPin, Compass, Navigation, CheckCircle, ArrowRight, 
  ShieldCheck, Sparkles, Building, AlertCircle, Loader2, Wrench,
  Zap, Droplets, SprayCan as SparkleIcon, Paintbrush, Hammer, Bug, Truck, Tv, Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/authContext';
import { requestAndAutoUpdateLocation, fetchRegisteredLocationServices, RegisteredService } from '../lib/location';

interface CustomerLocationSetupProps {
  onTransition: (target: AppScreen) => void;
  citizenName: string;
  setCitizenName: (name: string) => void;
  citizenAddress: string;
  setCitizenAddress: (addr: string) => void;
  showNotification: (msg: string) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
}

export default function CustomerLocationSetup({
  onTransition,
  citizenName,
  setCitizenName,
  citizenAddress,
  setCitizenAddress,
  showNotification,
  authMethod,
  authTarget
}: CustomerLocationSetupProps) {
  const { currentUser, userProfile, updateUserProfile } = useAuth() as any;

  // Initialize Full Name from NamoID / Profile / LocalStorage
  const [name, setName] = useState<string>(() => {
    if (userProfile?.name) return userProfile.name;
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.given_name) {
      return `${currentUser.given_name} ${currentUser.family_name || ''}`.trim();
    }
    if (citizenName && !citizenName.includes('PunchX Citizen') && !citizenName.includes('Loading')) {
      return citizenName;
    }
    const savedName = localStorage.getItem('punchx_user_name');
    if (savedName) return savedName;
    if (authMethod === 'gmail' && authTarget) {
      return authTarget.split('@')[0];
    }
    return '';
  });

  // Initialize Date of Birth from NamoID / Profile / LocalStorage
  const [dob, setDob] = useState<string>(() => {
    if (userProfile?.dob) return userProfile.dob;
    if (userProfile?.birthdate) return userProfile.birthdate;
    if (currentUser?.birthdate) return String(currentUser.birthdate);
    if (currentUser?.dob) return String(currentUser.dob);
    if (currentUser?.date_of_birth) return String(currentUser.date_of_birth);
    if (currentUser?.birth_date) return String(currentUser.birth_date);
    const savedDob = localStorage.getItem('punchx_user_dob');
    if (savedDob) return savedDob;
    return '';
  });

  const [address, setAddress] = useState<string>(() => {
    if (citizenAddress && !citizenAddress.includes('Galaxy Towers') && !citizenAddress.includes('Loading')) {
      return citizenAddress;
    }
    if (userProfile?.address && !userProfile.address.includes('Galaxy Towers')) {
      return userProfile.address;
    }
    const savedAddr = localStorage.getItem('punchx_user_address');
    if (savedAddr && !savedAddr.includes('Galaxy Towers')) {
      return savedAddr;
    }
    return '';
  });

  const [landmark, setLandmark] = useState<string>(() => {
    return userProfile?.landmark || localStorage.getItem('punchx_user_landmark') || '';
  });

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isResolvingBackend, setIsResolvingBackend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Location resolution state from backend
  const [resolvedSector, setResolvedSector] = useState('Sector 2 (Indiranagar)');
  const [resolvedArea, setResolvedArea] = useState('Indiranagar');
  const [resolvedCity, setResolvedCity] = useState('Kolkata');
  const [registeredServices, setRegisteredServices] = useState<RegisteredService[]>([]);
  const [coverageStatus, setCoverageStatus] = useState('Checking registered services in your area...');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });

  // Sync state if NamoID profile loads asynchronously
  useEffect(() => {
    if (currentUser || userProfile) {
      if (!name) {
        const nam = userProfile?.name || 
          currentUser?.name || 
          (currentUser?.given_name ? `${currentUser.given_name} ${currentUser.family_name || ''}`.trim() : '');
        if (nam) setName(nam);
      }
      if (!dob) {
        const birth = userProfile?.dob || 
          userProfile?.birthdate || 
          currentUser?.birthdate || 
          currentUser?.dob || 
          currentUser?.date_of_birth || 
          currentUser?.birth_date;
        if (birth) setDob(String(birth));
      }
      if (!address && userProfile?.address && !userProfile.address.includes('Galaxy Towers')) {
        setAddress(userProfile.address);
      }
    }
  }, [currentUser, userProfile]);

  // Function to query backend for registered services based on current address/coords/landmark
  const resolveServicesFromBackend = useCallback(async (
    targetAddress?: string,
    targetLandmark?: string,
    lat?: number,
    lng?: number
  ) => {
    setIsResolvingBackend(true);
    try {
      const resp = await fetchRegisteredLocationServices({
        address: targetAddress || address || 'Indiranagar 100ft Road, Kolkata',
        landmark: targetLandmark || landmark,
        lat: lat || coords.lat,
        lng: lng || coords.lng
      });

      if (resp && resp.success) {
        setResolvedSector(resp.sector || 'Sector (Metro Zone)');
        setResolvedArea(resp.area || 'Local Area');
        setResolvedCity(resp.city || 'Kolkata');
        setRegisteredServices(resp.registeredServices || []);
        setCoverageStatus(resp.coverageStatus || '100% Active & Certified Coverage');
        if (resp.lat && resp.lng) {
          setCoords({ lat: resp.lat, lng: resp.lng });
        }
      }
    } catch (e) {
      console.warn("Error querying location services backend:", e);
    } finally {
      setIsResolvingBackend(false);
    }
  }, [address, landmark, coords.lat, coords.lng]);

  // Initial lookup on mount
  useEffect(() => {
    resolveServicesFromBackend(address || 'Indiranagar, Kolkata', landmark);
  }, []);

  // Debounced lookup when user types manual address or landmark
  useEffect(() => {
    if (!address || address.trim().length < 3) return;
    const timer = setTimeout(() => {
      resolveServicesFromBackend(address, landmark);
    }, 700);
    return () => clearTimeout(timer);
  }, [address, landmark]);

  // GPS Auto Detection Trigger
  const handleAutoDetectGps = async () => {
    setIsDetectingGps(true);
    setErrorMessage('');
    showNotification("📡 Connecting to GPS satellites & resolving location...");

    try {
      const loc = await requestAndAutoUpdateLocation('customer');
      if (loc && loc.address) {
        setAddress(loc.address);
        setCoords({ lat: loc.lat, lng: loc.lng });
        setResolvedArea(loc.area);
        setResolvedCity(loc.city);
        setResolvedSector(loc.sector);

        // Query backend registered services with GPS coordinates
        await resolveServicesFromBackend(loc.address, landmark, loc.lat, loc.lng);
        showNotification(`✓ GPS Location Auto-Detected: ${loc.area || loc.sector}`);
      } else {
        setErrorMessage("Could not get precise GPS. Please enter your street address manually.");
      }
    } catch (err: any) {
      console.warn("GPS detection error:", err);
      setErrorMessage("GPS permission denied or timed out. Please enter address manually.");
    } finally {
      setIsDetectingGps(false);
    }
  };

  // Form Submission with Strict NamoID Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Full Name Validation
    if (!name.trim()) {
      setErrorMessage('Full Name is required for NamoID profile verification.');
      return;
    }
    if (name.trim().length < 2) {
      setErrorMessage('Full Legal Name must be at least 2 characters.');
      return;
    }

    // 2. Date of Birth Validation
    if (!dob.trim()) {
      setErrorMessage('Date of Birth is required for NamoID identity verification.');
      return;
    }
    const birthDateObj = new Date(dob);
    if (isNaN(birthDateObj.getTime())) {
      setErrorMessage('Please provide a valid Date of Birth (YYYY-MM-DD).');
      return;
    }
    if (birthDateObj > new Date()) {
      setErrorMessage('Date of Birth cannot be in the future.');
      return;
    }
    const ageInYears = (Date.now() - birthDateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageInYears < 18) {
      setErrorMessage('You must be at least 18 years of age to complete NamoID profile registration.');
      return;
    }

    // 3. Address Validation
    if (!address.trim()) {
      setErrorMessage('Please enter your house / street / locality address.');
      return;
    }
    if (address.trim().length < 5) {
      setErrorMessage('Please provide a more specific address for accurate technician dispatch.');
      return;
    }

    setIsSubmitting(true);
    const finalFormattedAddress = landmark.trim() 
      ? `${address.trim()}, Near ${landmark.trim()}, ${resolvedCity}`
      : `${address.trim()}, ${resolvedCity}`;

    setCitizenName(name.trim());
    setCitizenAddress(finalFormattedAddress);

    // Save to LocalStorage
    try {
      localStorage.setItem('punchx_user_name', name.trim());
      localStorage.setItem('punchx_user_dob', dob.trim());
      localStorage.setItem('punchx_user_address', finalFormattedAddress);
      localStorage.setItem('punchx_user_landmark', landmark.trim());
      localStorage.setItem('punchx_user_sector', resolvedSector);
      localStorage.setItem('punchx_user_location', JSON.stringify({
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

    // Save to Firestore users collection
    const activeUid = currentUser?.sub || `cust_${Date.now()}`;
    const userPayload = {
      uid: activeUid,
      name: name.trim(),
      dob: dob.trim(),
      birthdate: dob.trim(),
      address: finalFormattedAddress,
      streetAddress: address.trim(),
      landmark: landmark.trim(),
      area: resolvedArea,
      city: resolvedCity,
      sector: resolvedSector,
      location: { lat: coords.lat, lng: coords.lng },
      role: 'citizen' as const,
      phone: authMethod === 'phone' ? authTarget : (currentUser?.phone_number || ''),
      email: authMethod === 'gmail' ? authTarget : (currentUser?.email || ''),
      isProfileCompleted: true,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', activeUid), userPayload, { merge: true });
      if (updateUserProfile) {
        await updateUserProfile({
          name: name.trim(),
          dob: dob.trim(),
          birthdate: dob.trim(),
          address: finalFormattedAddress,
          isProfileCompleted: true
        });
      }
    } catch (dbErr) {
      console.warn("Firestore customer profile save error:", dbErr);
    }

    setIsSubmitting(false);
    showNotification(`🎉 Profile completed for ${name.trim()}! Services in ${resolvedSector} are unlocked.`);
    onTransition('home');
  };

  const getServiceCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'ac_unit':
        return <Wrench className="w-4 h-4 text-[#c5a059]" />;
      case 'electrical_services':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'plumbing':
        return <Droplets className="w-4 h-4 text-sky-400" />;
      case 'cleaning_services':
        return <SparkleIcon className="w-4 h-4 text-emerald-400" />;
      case 'format_paint':
        return <Paintbrush className="w-4 h-4 text-purple-400" />;
      case 'carpenter':
        return <Hammer className="w-4 h-4 text-amber-500" />;
      case 'pest_control':
        return <Bug className="w-4 h-4 text-rose-400" />;
      case 'local_shipping':
        return <Truck className="w-4 h-4 text-indigo-400" />;
      default:
        return <Tv className="w-4 h-4 text-[#c5a059]" />;
    }
  };

  return (
    <main
      id="customer-location-setup-page"
      className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col items-center justify-between pb-12 pt-6 px-4 sm:px-6 lg:px-8 overflow-y-auto"
    >
      <div className="w-full max-w-2xl flex flex-col items-center space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#c5a059]/50 flex items-center justify-center p-1.5 shadow-xl shadow-[#c5a059]/10">
            <img
              id="setup-punchx-logo"
              src={PUNCHX_LOGO}
              alt="PunchX Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-[11px] font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NamoID Profile & Location Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Complete Your NamoID Profile
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md font-sans leading-relaxed">
            Verify your legal name, date of birth, and service address to activate instant dispatch and doorstep booking.
          </p>
        </div>

        {/* Form Container - Fully Responsive across Mobile, Tablet, and Desktop */}
        <form
          id="customer-setup-form"
          onSubmit={handleSubmit}
          className="w-full bg-[#0d1b38]/95 border border-zinc-800/90 rounded-2xl p-5 sm:p-7 md:p-8 shadow-2xl backdrop-blur-md space-y-5"
        >
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2.5 text-xs text-red-200 font-sans"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </motion.div>
          )}

          {/* Top Row: Full Name & Date of Birth (2 cols on tablet/desktop, 1 col on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full">
            {/* 1. Full Legal Name */}
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="customer-name-input"
                  className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold"
                >
                  Full Legal Name <span className="text-[#c5a059]">*</span>
                </label>
                <span className="text-[10px] font-mono text-[#e9c176] bg-[#c5a059]/15 px-1.5 py-0.5 rounded border border-[#c5a059]/30">
                  NamoID Verified
                </span>
              </div>
              <div className="relative flex items-center w-full">
                <User className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  id="customer-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Sharma"
                  required
                  className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059]"
                />
              </div>
            </div>

            {/* 2. Date of Birth */}
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="customer-dob-input"
                  className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold"
                >
                  Date of Birth <span className="text-[#c5a059]">*</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  Min. 18 years
                </span>
              </div>
              <div className="relative flex items-center w-full">
                <Calendar className="absolute left-3.5 w-4 h-4 text-[#c5a059] pointer-events-none" />
                <input
                  id="customer-dob-input"
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

          {/* 3. Street Address with GPS auto-detect button */}
          <div className="space-y-1.5 w-full">
            <div className="flex justify-between items-center">
              <label 
                htmlFor="customer-address-input"
                className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold"
              >
                Street / Society / Area Address <span className="text-[#c5a059]">*</span>
              </label>
              <button
                type="button"
                id="auto-gps-detect-btn"
                onClick={handleAutoDetectGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#c5a059] hover:text-[#d8b56f] transition-all bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/40 px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {isDetectingGps ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Auto-Detecting...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>Auto-Update GPS</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative flex items-start w-full">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[#c5a059] pointer-events-none" />
              <textarea
                id="customer-address-input"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Flat 402, Royal Palms, 12th Main Road, Indiranagar"
                required
                className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059] resize-none"
              />
            </div>
            <p className="text-[10px] font-sans text-zinc-400">
              💡 Type your address manually or click <strong className="text-[#c5a059]">Auto-Update GPS</strong> to fetch your exact coordinates.
            </p>
          </div>

          {/* 4. Landmark Input */}
          <div className="space-y-1.5 w-full">
            <label 
              htmlFor="customer-landmark-input"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold"
            >
              Prominent Landmark <span className="text-zinc-500 font-normal">(Crucial for technician navigation)</span>
            </label>
            <div className="relative flex items-center w-full">
              <Compass className="absolute left-3.5 w-4 h-4 text-emerald-400 pointer-events-none" />
              <input
                id="customer-landmark-input"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 142, Behind HDFC Bank"
                className="w-full bg-[#09152e] border border-zinc-700/80 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-[#c5a059]"
              />
            </div>
          </div>

          {/* 5. Live Backend Sector & Registered Services Card */}
          <div className="bg-[#09152e]/95 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
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
                <span>Certified Zone</span>
              </div>
            </div>

            {/* Registered Services in Location list */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#c5a059] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />
                  Services Registered In This Location ({registeredServices.length})
                </span>
                {isResolvingBackend && (
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-[#c5a059]" />
                    <span>Verifying backend...</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {registeredServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-[#07122a] border border-zinc-800/90 rounded-lg p-2.5 flex flex-col justify-between space-y-1 hover:border-[#c5a059]/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {getServiceCategoryIcon(srv.icon)}
                      <span className="text-xs font-sans font-semibold text-zinc-200 truncate">
                        {srv.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="text-emerald-400 font-semibold">From ₹{srv.startingPrice}</span>
                      <span>⚡ {srv.slaMinutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="save-customer-setup-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#c5a059] hover:bg-[#d8b56f] text-black font-extrabold text-xs tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-lg shadow-[#c5a059]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Configuring Profile & Services...</span>
              </>
            ) : (
              <>
                <span>Complete Profile & Unlock Services</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Verification Disclaimer */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 text-center max-w-lg">
          <ShieldCheck className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
          <span>All NamoID profile records are encrypted and synchronized with PunchX backend dispatch servers.</span>
        </div>
      </div>
    </main>
  );
}
