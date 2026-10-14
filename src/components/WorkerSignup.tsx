import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, WorkerApplication } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { requestAndAutoUpdateLocation } from '../lib/location';
import { 
  Wrench, UserCheck, Calendar, MapPin, Briefcase, Award, Phone, Mail, 
  ShieldCheck, FileText, CheckSquare, Square, ChevronRight, X, Lock, AlertCircle, Compass, DollarSign,
  Grid, CheckCircle2, Plus, Search, Camera
} from 'lucide-react';
import ServiceCategoryModal from './ServiceCategoryModal';
import DobPicker from './DobPicker';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WorkerSignupProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  setWorkerApplicationData: (data: WorkerApplication) => void;
}

export default function WorkerSignup({ onTransition, showNotification, setWorkerApplicationData }: WorkerSignupProps) {
  // 1. Personal & Contact
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 2. Address & Location
  const [address, setAddress] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // 3. Trade & Technical Skills
  const [primaryService, setPrimaryService] = useState('Electrician');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Electrician']);
  const [customSkill, setCustomSkill] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 4. Experience & Visiting Fee
  const [experienceYears, setExperienceYears] = useState('3-5 Years');
  const [minimumVisitingFee, setMinimumVisitingFee] = useState<number | ''>(99);
  const [maximumVisitingFee, setMaximumVisitingFee] = useState<number | ''>(249);

  // 5. Profile Photo
  const [photoURL, setPhotoURL] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  // 6. Terms & Validation
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill existing user details if available
  useEffect(() => {
    let storedIdentity: any = null;
    let storedProfile: any = null;
    try {
      const rawId = localStorage.getItem('punchx_namoid_identity');
      if (rawId) storedIdentity = JSON.parse(rawId);
    } catch {}
    try {
      const rawProf = localStorage.getItem('punchx_namoid_profile');
      if (rawProf) storedProfile = JSON.parse(rawProf);
    } catch {}

    const defaultName = storedProfile?.name || storedIdentity?.name || (storedIdentity?.given_name ? `${storedIdentity.given_name} ${storedIdentity.family_name || ''}`.trim() : '');
    const defaultDob = storedProfile?.dob || storedProfile?.birthdate || storedIdentity?.birthdate || storedIdentity?.dob || '';
    const defaultEmail = storedProfile?.email || storedIdentity?.email || auth.currentUser?.email || '';
    const defaultPhone = storedProfile?.phone || storedIdentity?.phone_number || '';

    if (defaultName) setLegalName(defaultName);
    if (defaultDob) setDob(defaultDob);
    if (defaultEmail) setEmail(defaultEmail);
    if (defaultPhone) setPhone(defaultPhone);
    if (storedProfile?.address) setAddress(storedProfile.address);
    if (storedProfile?.streetAddress) setStreetAddress(storedProfile.streetAddress);
    if (storedProfile?.landmark) setLandmark(storedProfile.landmark);
    if (storedProfile?.area) setArea(storedProfile.area);
    if (storedProfile?.city) setCity(storedProfile.city);
    if (storedProfile?.sector) setSector(storedProfile.sector);
    if (storedProfile?.workerSkill) setPrimaryService(storedProfile.workerSkill);
    if (storedProfile?.workerCategories?.length) setSelectedCategories(storedProfile.workerCategories);
    if (storedProfile?.customSkill) setCustomSkill(storedProfile.customSkill);
    if (storedProfile?.workerExperience) setExperienceYears(storedProfile.workerExperience);
    if (storedProfile?.minimumVisitingFee) setMinimumVisitingFee(storedProfile.minimumVisitingFee);
    if (storedProfile?.maximumVisitingFee) setMaximumVisitingFee(storedProfile.maximumVisitingFee);
    if (storedProfile?.photoURL) {
      setPhotoURL(storedProfile.photoURL);
      setPhotoPreview(storedProfile.photoURL);
    }
  }, []);

  // Only auto-redirect away if user is already a fully registered worker AND not intentionally editing
  useEffect(() => {
    const isEditing = localStorage.getItem('punchx_edit_worker_signup') === 'true';
    if (isEditing) return;

    const checkExistingWorker = async () => {
      const activeUid = auth.currentUser?.uid || localStorage.getItem('punchx_applicant_uid');
      if (db && activeUid) {
        try {
          const [userSnap, appSnap] = await Promise.all([
            getDoc(doc(db, 'users', activeUid)),
            getDoc(doc(db, 'workerApplications', activeUid))
          ]);
          const uData = userSnap.data();
          const aData = appSnap.data();
          const hasDetails = Boolean(
            (uData?.workerSkill && uData?.address) ||
            (aData?.skill && aData?.address) ||
            uData?.applicationId
          );
          if (hasDetails && localStorage.getItem('punchx_worker_approved') === 'true') {
            showNotification('✓ Existing specialist profile found. Entering dashboard...');
            onTransition('worker-dashboard');
            return;
          }
        } catch (checkErr) {
          console.warn('Existing worker check notice:', checkErr);
        }
      }
    };
    checkExistingWorker();
  }, []);

  // Auto request location permission on load if empty
  useEffect(() => {
    if (!address) {
      handleDetectLocation();
    }
  }, []);

  const handleDetectLocation = async () => {
    setIsLocating(true);
    const loc = await requestAndAutoUpdateLocation('worker');
    setIsLocating(false);
    if (loc && loc.address) {
      setAddress(loc.address);
      if (loc.area && !area) setArea(loc.area);
      if (loc.city && !city) setCity(loc.city);
      showNotification(`📍 Worker address detected: ${loc.address}`);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showNotification('⚠️ Photo size exceeds 2MB. Please select a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoURL(result);
        setPhotoPreview(result);
        showNotification('✓ Profile photo attached');
      };
      reader.readAsDataURL(file);
    }
  };

  const quickCategories = [
    'Electrician',
    'Plumber',
    'AC Technician',
    'Carpenter',
    'Painter',
    'CCTV Technician',
    'Solar Technician',
    'Mechanic'
  ];

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      if (selectedCategories.length === 1 && !customSkill) {
        showNotification('⚠️ You must maintain at least one active service category.');
        return;
      }
      setSelectedCategories(selectedCategories.filter(c => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!legalName.trim()) {
      setErrorMsg('Please enter your full legal name as per official ID.');
      return;
    }
    if (!dob.trim()) {
      setErrorMsg('Please enter your date of birth.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid Gmail / Email address.');
      return;
    }

    const resolvedAddress = address.trim() || [
      streetAddress.trim(),
      landmark.trim(),
      sector.trim(),
      area.trim(),
      city.trim()
    ].filter(Boolean).join(', ');

    if (!resolvedAddress) {
      setErrorMsg('Please enter your complete work or residential address.');
      return;
    }

    const primaryTrade = primaryService || selectedCategories[0] || customSkill.trim() || 'General Specialist';
    const allCategories = Array.from(new Set([
      ...(primaryService ? [primaryService] : []),
      ...selectedCategories,
      ...(customSkill.trim() ? [customSkill.trim()] : [])
    ]));

    if (allCategories.length === 0 && !customSkill.trim()) {
      setErrorMsg('Please select at least one service category or enter a custom skill.');
      return;
    }
    if (!experienceYears.trim()) {
      setErrorMsg('Please select your actual field experience.');
      return;
    }
    if (minimumVisitingFee === '' || Number(minimumVisitingFee) < 49 || !Number.isFinite(Number(minimumVisitingFee))) {
      setErrorMsg('Minimum visiting fee cannot be below ₹49. Enter ₹49 or more to continue.');
      return;
    }
    if (maximumVisitingFee === '' || Number(maximumVisitingFee) > 349 || Number(maximumVisitingFee) < 49 || !Number.isFinite(Number(maximumVisitingFee))) {
      setErrorMsg('Maximum visiting fee must be between ₹49 and ₹349.');
      return;
    }
    if (Number(minimumVisitingFee) > Number(maximumVisitingFee)) {
      setErrorMsg('Minimum visiting fee cannot be greater than the maximum visiting fee.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('You must review and accept the PunchX Terms & Conditions and Privacy Policy to proceed.');
      return;
    }
    const applicantUid = auth.currentUser?.uid || localStorage.getItem('punchx_applicant_uid') || `worker_${Date.now()}`;
    try { localStorage.setItem('punchx_applicant_uid', applicantUid); } catch {}

    const appId = `APP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const application: WorkerApplication = {
      id: appId,
      uid: applicantUid,
      legalName: legalName.trim(),
      dob: dob.trim(),
      birthdate: dob.trim(),
      address: resolvedAddress,
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim(),
      area: area.trim(),
      city: city.trim(),
      sector: sector.trim(),
      categories: allCategories,
      skill: primaryTrade,
      customSkill: customSkill.trim() || undefined,
      experienceYears,
      minimumVisitingFee: Number(minimumVisitingFee),
      maximumVisitingFee: Number(maximumVisitingFee),
      visitingFee: Number(minimumVisitingFee),
      phone: phone.trim(),
      email: email.trim(),
      photoURL: photoURL || undefined,
      termsAccepted: true,
      status: 'APPROVED',
      appliedAt: new Date().toISOString()
    };

    setWorkerApplicationData(application);
    let savedApplication: WorkerApplication = application;

    // 1. Direct Firestore save to both workerApplications and users collections
    try {
      if (db) {
        await Promise.allSettled([
          setDoc(doc(db, 'workerApplications', application.id), application, { merge: true }),
          setDoc(doc(db, 'workerApplications', applicantUid), application, { merge: true }),
          setDoc(doc(db, 'users', applicantUid), {
            uid: applicantUid,
            name: legalName.trim(),
            legalName: legalName.trim(),
            dob: dob.trim(),
            birthdate: dob.trim(),
            address: resolvedAddress,
            streetAddress: streetAddress.trim(),
            landmark: landmark.trim(),
            area: area.trim(),
            city: city.trim(),
            sector: sector.trim(),
            phone: phone.trim(),
            email: email.trim(),
            role: 'worker',
            status: 'APPROVED',
            workerSkill: primaryTrade,
            skill: primaryTrade,
            workerCategories: allCategories,
            categories: allCategories,
            customSkill: customSkill.trim() || '',
            workerExperience: experienceYears,

            visitingFee: Number(minimumVisitingFee),
            minimumVisitingFee: Number(minimumVisitingFee),
            maximumVisitingFee: Number(maximumVisitingFee),
            photoURL: photoURL || '',
            applicationId: application.id,
            termsAccepted: true,
            appliedAt: application.appliedAt,
            isProfileCompleted: true,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        ]);
        console.log('Successfully saved worker form data directly to Firebase:', application.id);
      }
    } catch (fsError) {
      console.warn('Firestore direct write notice:', fsError);
    }

    // 2. Submit through backend Admin API so records are confirmed in database
    try {
      const backendBase = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => null) : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      const response = await fetch(`${backendBase}/api/worker-applications`, {
        method: 'POST',
        headers,
        body: JSON.stringify(application),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success && result.application) {
        savedApplication = result.application as WorkerApplication;
        setWorkerApplicationData(savedApplication);
      }
    } catch (backendErr) {
      console.warn('Backend worker application submit notice:', backendErr);
    }

    // Local storage UI cache
    const existingApps = JSON.parse(
      localStorage.getItem('punchx_worker_applications') || '[]'
    );

    localStorage.setItem(
      'punchx_worker_applications',
      JSON.stringify([savedApplication, ...existingApps])
    );
    localStorage.setItem('punchx_worker_app_id', savedApplication.id);
    localStorage.setItem('punchx_worker_approved', 'true');
    localStorage.setItem('punchx_worker_online_status', 'true');
    localStorage.setItem('punchx_auth_role', 'worker');
    localStorage.removeItem('punchx_edit_worker_signup');

    showNotification(
      '✓ Specialist registered & auto-approved! Welcome to PunchX Specialist Workspace.'
    );

    onTransition('worker-dashboard');
  };

  return (
    <div id="worker-signup-screen" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans py-10 px-4 sm:px-6 relative">
      
      {/* Top Navigation */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-6">
        <button
          onClick={() => onTransition('panel-select')}
          className="text-xs font-mono text-[#e9c176] hover:underline flex items-center gap-1 bg-[#11192e] px-3.5 py-2 rounded-xl border border-zinc-800 cursor-pointer"
        >
          ← Back to Panel Selection
        </button>
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider bg-[#11192e] px-3 py-1.5 rounded-xl border border-zinc-800">
          STEP 1 OF 3: WORKER ONBOARDING
        </span>
      </div>

      <div className="max-w-4xl mx-auto bg-[#11192e] border border-[#c5a059]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Title Header */}
        <div className="text-center space-y-2 border-b border-zinc-800 pb-5">
          <div className="w-14 h-14 rounded-full bg-white border border-[#c5a059]/40 flex items-center justify-center p-1 overflow-hidden mx-auto shadow-lg">
            <img src={PUNCHX_LOGO} alt="PunchX Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            PUNCHX AUTHORITY WORKER REGISTRATION
          </h1>
          <p className="text-xs text-zinc-300">
            Submit your professional specialist profile for vetting and system authorization.
          </p>

          {/* Prominent Login Option Banner */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                showNotification("🔑 Opening Worker Gmail & Saved Password Log In");
                onTransition('auth');
              }}
              className="w-full py-3 bg-[#07122a] hover:bg-[#0e1a38] border-2 border-[#c5a059] rounded-2xl text-xs font-mono font-extrabold text-[#e9c176] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Lock className="w-4 h-4 text-[#c5a059]" />
              <span>Already Registered Worker? Log In with Gmail & Saved Password →</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* SECTION 1: Personal & Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <UserCheck className="w-4 h-4 text-[#c5a059]" />
              <span className="text-xs font-mono font-bold uppercase text-[#e9c176] tracking-wider">
                1. Personal & Contact Identification
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Full Legal Name
                </label>
                <input
                  id="signup-worker-name"
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar Sharma"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5 w-full">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date of Birth
                </label>
                <DobPicker
                  id="signup-worker-dob"
                  value={dob}
                  onChange={setDob}
                  placeholder="YYYY-MM-DD"
                  inputClassName="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Gmail / Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="worker.expert@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>
            </div>

            {/* Profile Photo Upload */}
            <div className="bg-[#0a152e] border border-[#c5a059]/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-[#c5a059] overflow-hidden bg-[#07122a] flex items-center justify-center flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Worker Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-8 h-8 text-[#c5a059]" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] block">
                  Profile Photo (Optional)
                </label>
                <p className="text-[11px] text-zinc-400">
                  Upload a genuine photo of yourself for your verified PunchX specialist badge.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c5a059]/20 hover:bg-[#c5a059]/30 text-[#e9c176] border border-[#c5a059]/40 rounded-xl text-xs font-mono cursor-pointer transition-colors mt-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photoPreview ? 'Change Genuine Photo' : 'Upload Genuine Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: Address & Location Details */}
          <div className="space-y-4 bg-[#0a152e] border border-[#c5a059]/30 p-4 sm:p-5 rounded-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#c5a059]" /> 2. Address & Service Coverage Location
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                className="text-[10px] font-mono font-bold text-[#e9c176] hover:underline flex items-center gap-1 bg-[#c5a059]/15 px-2.5 py-1 rounded-lg border border-[#c5a059]/30 cursor-pointer"
              >
                <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting GPS...' : 'Auto GPS Fill'}</span>
              </button>
            </div>

            {/* Full Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300">Full Residential & Work Address *</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Flat #302, Sunrise Towers, 8th Main, Indiranagar, Bengaluru, Karnataka 560038"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors resize-none"
              />
            </div>

            {/* Street / House Address & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300">Street / House Address</label>
                <input
                  type="text"
                  placeholder="e.g. House #14, 2nd Floor, 5th Cross"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300">Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station / Apollo Clinic"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
            </div>

            {/* Area, City & Sector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300">Area</label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar / Andheri East"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300">City</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru / Kolkata / Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300">Sector / Ward</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 4 / Ward 12 / Block C"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Trade, Skills & Categories */}
          <div className="space-y-4 bg-[#0a152e] border border-[#c5a059]/30 p-4 sm:p-5 rounded-2xl">
            <div className="border-b border-zinc-800 pb-2">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#c5a059]" /> 3. Technical Trade & Service Specialization
              </label>
            </div>

            {/* Primary Service Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Primary Service (Main Trade) *
              </label>
              <select
                value={primaryService}
                onChange={(e) => {
                  setPrimaryService(e.target.value);
                  if (e.target.value && !selectedCategories.includes(e.target.value)) {
                    setSelectedCategories([e.target.value, ...selectedCategories]);
                  }
                }}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white outline-none cursor-pointer"
              >
                <option value="Electrician">Electrician</option>
                <option value="Plumber">Plumber</option>
                <option value="AC Technician">AC Technician</option>
                <option value="Carpenter">Carpenter</option>
                <option value="Painter">Painter</option>
                <option value="CCTV Technician">CCTV Technician</option>
                <option value="Solar Technician">Solar Technician</option>
                <option value="Appliance Repair">Appliance Repair</option>
                <option value="Mechanic">Mechanic</option>
                <option value="Mason / Civil Worker">Mason / Civil Worker</option>
                <option value="Welder">Welder</option>
                <option value="Locksmith">Locksmith</option>
                <option value="Pest Control Specialist">Pest Control Specialist</option>
                <option value="Cleaning Expert">Cleaning Expert</option>
                <option value="General Specialist">General Specialist</option>
              </select>
            </div>

            {/* Service Categories Multi-select */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5" /> Service Categories ({selectedCategories.length} selected)
                  </label>
                  <p className="text-[11px] text-zinc-400">
                    Add all service categories you can service for neighborhood dispatch.
                  </p>
                </div>
                <button
                  type="button"
                  id="worker-open-categories-btn"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3.5 py-2 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all self-start sm:self-auto"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search 50 Categories Modal</span>
                </button>
              </div>

              {/* Currently Selected Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedCategories.map((catName) => (
                  <span
                    key={catName}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c5a059]/20 border border-[#c5a059]/50 text-white rounded-full text-xs font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#e9c176]" />
                    <span>{catName}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(catName)}
                      className="hover:text-red-400 p-0.5 rounded-full hover:bg-black/40 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick-Pick Popular Category Pills */}
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-2">
                  Quick Category Toggles:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#c5a059] text-black font-bold border-[#ffdea5] shadow'
                            : 'bg-[#07122a] text-zinc-300 border-zinc-800 hover:border-[#c5a059]/40'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-black flex-shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Technical Skill Input */}
              <div className="pt-2">
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Custom Skill (Optional specialized trade not listed):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solar Inverter Repair, Chimney Installation, Smart Lock Programming..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Experience & Visiting Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> 4. Field Experience *
              </label>
              <select
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white outline-none cursor-pointer"
              >
                <option value="1-2 Years">1 - 2 Years</option>
                <option value="3-5 Years">3 - 5 Years</option>
                <option value="6-10 Years">6 - 10 Years</option>
                <option value="10+ Years Veteran">10+ Years (Master Veteran)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#e9c176]" /> Visiting / Inspection Fee Range (₹) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-300 mb-1">Min Fee (₹)</label>
                  <input
                    type="number"
                    min={49}
                    max={349}
                    step={1}
                    required
                    placeholder="Min ₹49"
                    value={minimumVisitingFee}
                    onChange={(e) => setMinimumVisitingFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#07122a] border border-[#c5a059]/40 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-300 mb-1">Max Fee (₹)</label>
                  <input
                    type="number"
                    min={49}
                    max={349}
                    step={1}
                    required
                    placeholder="Max ₹349"
                    value={maximumVisitingFee}
                    onChange={(e) => setMaximumVisitingFee(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#07122a] border border-[#c5a059]/40 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-400">Within 30 km service radius. ₹49 to ₹349. Labor & parts are extra.</p>
            </div>
          </div>

          {/* SECTION 5: Partner Status Badge */}
          <div className="bg-[#0f241a] border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Partner Status</p>
                <p className="text-[11px] text-emerald-400/80">Instant approval active · Bypasses manual review queue</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-xs rounded-full">
              APPROVED
            </span>
          </div>

          {/* Terms & Conditions Box */}
          <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#c5a059]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Legal Terms & Privacy Policy</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[11px] font-mono text-[#e9c176] hover:underline font-bold cursor-pointer"
              >
                Read Full Policy →
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              By registering, you agree to the professional onboarding terms and verified operational standards of PunchX.
            </p>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-[#c5a059] focus:ring-[#c5a059] cursor-pointer"
              />
              <span className="text-xs text-zinc-200 font-medium leading-tight">
                I have read, understood, and explicitly accept the <span className="text-[#e9c176] font-bold">PunchX Worker Terms of Service</span> and <span className="text-[#e9c176] font-bold">Privacy Policy</span>.
              </span>
            </label>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!termsAccepted}
            className={`w-full py-4 rounded-xl font-extrabold text-xs uppercase tracking-widest font-mono transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer ${
              termsAccepted
                ? 'bg-gradient-to-r from-[#c5a059] to-[#e9c176] hover:from-[#e9c176] hover:to-[#c5a059] text-black border border-[#ffdea5]/50 active:scale-[0.98]'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Complete Specialist Registration & Set Hub</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Bottom Login Link Option */}
          <div className="pt-2 border-t border-zinc-800 text-center space-y-2">
            <p className="text-xs text-zinc-400 font-sans">Already registered an authority worker account?</p>
            <button
              type="button"
              onClick={() => {
                showNotification("🔑 Opening Worker Gmail & Saved Password Log In");
                onTransition('auth');
              }}
              className="w-full py-3 bg-[#07122a] hover:bg-[#121f3d] border border-[#c5a059]/50 hover:border-[#c5a059] rounded-xl text-xs font-sans font-extrabold text-[#e9c176] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <Lock className="w-4 h-4 text-[#c5a059]" />
              <span>Log In with Gmail & Saved Password</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#c5a059]" />
            </button>
          </div>
        </form>
      </div>

      {/* FULL TERMS & CONDITIONS / PRIVACY POLICY MODAL */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border-2 border-[#c5a059] rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] flex flex-col justify-between space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#c5a059]" />
                  <h3 className="font-extrabold text-lg text-white">PunchX Authority Worker Terms & Privacy Policy</h3>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legal Text Scroll Content */}
              <div className="overflow-y-auto space-y-4 pr-2 text-xs text-zinc-300 leading-relaxed font-sans custom-scrollbar">
                
                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">1. Professional Code of Conduct & Punctuality</h4>
                  <p>
                    Professionals must follow the service terms and respect customer property and privacy. [SERVICE WINDOW, BADGE AND CONDUCT RULES: confirm with founders].
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">2. Identity Verification & Background Screening</h4>
                  <p>
                    [VERIFICATION STEPS AND DOCUMENT REQUIREMENTS: confirm with founders before requiring or promising specific checks].
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">3. Security Hand-Off OTP & Proof Protocol</h4>
                  <p>
                    [JOB START, OTP AND COMPLETION-PROOF REQUIREMENTS: confirm with founders].
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">4. Financial Terms, Earnings & Payouts</h4>
                  <p>
                    Earnings, wallet balances, commissions and payout timing follow the applicable professional terms. [COMMISSION RATE AND PAYOUT RULES: confirm with founders].
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">5. Customer Data Privacy & Non-Disclosure</h4>
                  <p>
                    Customer contact and property details shared for a service are confidential. Professionals must follow the applicable PunchX privacy terms and use customer information only for the service.
                  </p>
                </section>

              </div>

              {/* Modal Accept Footer */}
              <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-400">Document ID: PX-TNC-2026-V4</span>
                <button
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowTermsModal(false);
                    showNotification('✓ Terms & Conditions accepted!');
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
                >
                  I Accept Terms & Policy
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 50 Worker Categories Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="worker"
        selectedCategories={selectedCategories}
        onSaveWorkerCategories={(cats, custom) => {
          setSelectedCategories(cats);
          if (custom) {
            setCustomSkill(custom);
          }
          showNotification(`✓ Updated ${cats.length} services selected`);
        }}
      />
    </div>
  );
}
