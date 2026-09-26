import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, WorkerApplication } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { requestAndAutoUpdateLocation } from '../lib/location';
import { 
  Wrench, UserCheck, Calendar, MapPin, Briefcase, Award, Phone, Mail, 
  ShieldCheck, FileText, CheckSquare, Square, ChevronRight, X, Lock, AlertCircle, Compass, DollarSign,
  Grid, CheckCircle2, Plus, Search
} from 'lucide-react';
import ServiceCategoryModal from './ServiceCategoryModal';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WorkerSignupProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
  setWorkerApplicationData: (data: WorkerApplication) => void;
}

export default function WorkerSignup({ onTransition, showNotification, setWorkerApplicationData }: WorkerSignupProps) {
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Electrician']);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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
      showNotification(`📍 Worker address detected: ${loc.address}`);
    }
  };
  const [customSkill, setCustomSkill] = useState('');
  const [experienceYears, setExperienceYears] = useState('3-5 Years');
  const [visitingFee, setVisitingFee] = useState<number>(199);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Terms & Conditions acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Form Validation errors
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Please enter your date of birth as registered with NamoID.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your complete work or residential address.');
      return;
    }
    if (selectedCategories.length === 0 && !customSkill.trim()) {
      setErrorMsg('Please select at least one service category or enter a custom skill.');
      return;
    }
    if (visitingFee <= 0 || isNaN(visitingFee)) {
      setErrorMsg('Please specify a valid estimated visiting fee (minimum ₹50).');
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
    if (!termsAccepted) {
      setErrorMsg('You must review and accept the PunchX Terms & Conditions and Privacy Policy to proceed.');
      return;
    }
    const firebaseUid = auth.currentUser?.uid;

if (!firebaseUid) {
  setErrorMsg('You must be logged in before submitting a worker application.');
  return;
}

    const application: WorkerApplication = {
      id: `APP-${crypto.randomUUID()}`,
      uid: auth.currentUser?.uid,
      legalName: legalName.trim(),
      address: address.trim(),
      categories: selectedCategories.length > 0 ? selectedCategories : (customSkill.trim() ? [customSkill.trim()] : ['Electrician']),
      skill: selectedCategories.length > 0 ? selectedCategories.join(', ') : customSkill.trim(),
      customSkill: customSkill.trim() || undefined,
      experienceYears,
      visitingFee: Number(visitingFee),
      phone: phone.trim(),
      email: email.trim(),
      termsAccepted: true,
      status: 'PENDING',
      appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today'
    };

    setWorkerApplicationData(application);
    
    // Save to Firestore & localStorage
// Save worker application to Firestore
try {
  await setDoc(
    doc(db, 'workerApplications', application.id),
    application
  );

  console.log(
    'Successfully saved worker application to Firestore:',
    application.id
  );
} catch (error) {
  console.error('Firestore save application failed:', error);

  showNotification(
    'Unable to submit your application. Please try again.'
  );

  return;
}

// Local storage is only a temporary UI cache.
// Firestore is the source of truth.
const existingApps = JSON.parse(
  localStorage.getItem('punchx_worker_applications') || '[]'
);

localStorage.setItem(
  'punchx_worker_applications',
  JSON.stringify([application, ...existingApps])
);

showNotification(
  '✓ Worker profile details saved! Moving to Dual OTP verification.'
);

onTransition('worker-otp-pass');
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
          
          {/* Full Name & Date of Birth (2 cols on tablet/desktop, 1 col on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Full Legal Name
              </label>
              <input
                id="signup-worker-name"
                type="text"
                placeholder="e.g. Rajesh Kumar Sharma"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5 w-full">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date of Birth (NamoID)
              </label>
              <input
                id="signup-worker-dob"
                type="date"
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Full Residential & Work Address */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Full Residential & Work Address
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                className="text-[10px] font-mono font-bold text-[#e9c176] hover:underline flex items-center gap-1 bg-[#c5a059]/15 px-2 py-0.5 rounded border border-[#c5a059]/30 cursor-pointer"
              >
                <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting...' : 'Auto GPS Fill'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="e.g. House #104, 3rd Cross, Indiranagar, Kolkata, KA 560038"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors resize-none"
            />
          </div>

          {/* What service do you provide? (50 Categories Selection) */}
          <div className="space-y-3 bg-[#0a152e] border border-[#c5a059]/30 p-4 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> What service do you provide?
                </label>
                <p className="text-[11px] text-zinc-400">
                  Select one or multiple categories from our 50 verified trades.
                </p>
              </div>
              <button
                type="button"
                id="worker-open-categories-btn"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-2 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all self-start sm:self-auto"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Search 50 Categories ({selectedCategories.length} selected)</span>
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
              {customSkill && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-200 rounded-full text-xs font-medium">
                  <span>Custom: {customSkill}</span>
                  <button
                    type="button"
                    onClick={() => setCustomSkill('')}
                    className="hover:text-red-400 p-0.5 rounded-full hover:bg-black/40 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
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

            {/* Optional Custom Technical Skill Input */}
            <div className="pt-2">
              <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                Have a specialized trade not listed? (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Solar Inverter Repair, Aquarium Maintenance, Chimney Tech..."
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none"
              />
            </div>
          </div>

          {/* Experience Years & Visiting Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Years of Field Experience
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
                <DollarSign className="w-3.5 h-3.5 text-[#e9c176]" /> Estimated Visiting / Inspection Fee (₹)
              </label>
              <input
                type="number"
                min={50}
                max={5000}
                placeholder="199"
                value={visitingFee}
                onChange={(e) => setVisitingFee(Number(e.target.value))}
                className="w-full bg-[#07122a] border border-[#c5a059]/40 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white font-mono font-bold outline-none"
              />
              <p className="text-[10px] text-zinc-400">Base visit fee charged to customer before company commission & GST.</p>
            </div>
          </div>

          {/* Mobile Phone & Gmail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Mobile Phone Number
              </label>
              <input
                type="tel"
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
                placeholder="worker.expert@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none font-mono"
              />
            </div>
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
              By registering as a PunchX Authority Worker, you agree to background identity screening, safety compliance protocols, and data privacy safeguards.
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
            <span>Proceed to Dual OTP & Security Lock</span>
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
                    All registered technicians ("Workers") agree to maintain peak professional decorum when visiting citizen premises. Workers must arrive within the designated service window, display official PunchX digital badges, and adhere strictly to requested diagnostic procedures.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">2. Identity Verification & Background Screening</h4>
                  <p>
                    By submitting your application, you consent to background identity validation via official government credentials. PunchX reserves the right to suspend or reject any profile containing fraudulent qualifications or unverified records.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">3. Security Hand-Off OTP & Proof Protocol</h4>
                  <p>
                    Workers are strictly prohibited from initiating work without verifying the 4-digit site OTP provided by the citizen. Furthermore, workers must upload valid photographic proof of work completion before requesting payout release.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">4. Financial Terms, Earnings & Payouts</h4>
                  <p>
                    Service earnings will be credited directly to the worker's verified account upon successful completion and citizen sign-off. PunchX levies a standard enterprise technology fee of 10% on gross bookings.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-white text-sm">5. Citizen Data Privacy & Non-Disclosure</h4>
                  <p>
                    Citizen addresses, phone numbers, and structural details disclosed during service dispatches are confidential. Workers are legally bound not to store, share, or contact citizens outside the PunchX platform.
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
