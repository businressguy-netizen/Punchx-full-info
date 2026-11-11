import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AppScreen, Worker, CustomerReview } from '../types';
import { ArrowLeft, Star, ShieldCheck, CheckCircle2, Shield, Award, Sparkles, Building2, Compass, Heart, ThumbsUp, Check } from 'lucide-react';
import { CategoryProfileBadge } from './CategoryIcon';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface ProviderDetailsProps {
  onTransition: (target: AppScreen) => void;
  selectedWorker: Worker | null;
  showNotification: (msg: string) => void;
}

export default function ProviderDetails({
  onTransition,
  selectedWorker,
  showNotification
}: ProviderDetailsProps) {
  const [firestoreReviews, setFirestoreReviews] = useState<CustomerReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedWorker) return;
    
    let isMounted = true;
    const fetchWorkerReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const path = 'reviews';
        const reviewsRef = collection(db, path);
        const q = query(reviewsRef, where('workerName', '==', selectedWorker.name));
        const snapshot = await getDocs(q);
        
        const fetched: CustomerReview[] = [];
        snapshot.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as CustomerReview);
        });

        if (isMounted) {
          setFirestoreReviews(fetched);
        }
      } catch (err) {
        console.warn('Firestore reviews fetch offline/failed, using fallback:', err);
      } finally {
        if (isMounted) {
          setIsLoadingReviews(false);
        }
      }
    };

    fetchWorkerReviews();
    return () => { isMounted = false; };
  }, [selectedWorker]);

  if (!selectedWorker) {
    return (
      <div className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="w-12 h-12 text-[#c5a059] mb-4 animate-spin" />
        <h3 className="font-sans font-bold text-lg text-white">No Specialist Selected</h3>
        <p className="text-zinc-400 text-xs mt-2 max-w-xs">Please return to the main directory to select an active service expert.</p>
        <button
          onClick={() => onTransition('providers')}
          className="mt-6 px-5 py-2.5 bg-[#c5a059] text-black font-extrabold text-xs uppercase rounded-xl tracking-wider hover:bg-[#e9c176]"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  // Generate dynamic description bio based on category & name
  const getBio = (worker: Worker) => {
    switch (worker.id) {
      case 'rajesh':
        return 'AC specialist with 9+ years of field experience in South Kolkata. Expert in compressor overhaul, copper piping, coolant leak diagnosis, and multi-split inverter repairs. Verified HVAC professional.';
      case 'amit':
        return 'Certified Senior Technician. Specializes in rapid-response troubleshooting, condenser replacement, and heavy cooling unit setups. Completed deep vetting checks.';
      case 'marcus':
        return 'Licensed electrical supervisor with credentials in high-tension line diagnostics, smart home inverter boards, and electrical fuse box safety updates. Known for pristine wire discipline.';
      case 'arjun':
        return 'Skilled domestic electrician. Adept at phase balancing, short circuit identification, LED panel integrations, and compliance inspections. Prompt and reliable execution.';
      case 'priya':
        return 'Expert plumbing engineer specializing in pressure testing, high-grade fixture bonding, blockages, and premium internal piping system layouts. 5-Star feedback on behavior.';
      case 'rohan':
        return 'Fast-response domestic plumber. Experienced in tap replacements, clogged drain cleanups, water pump repairs, and kitchen drainage installations.';
      case 'sarah':
        return 'Elite sanitation specialist. Background in surgical room cleanliness standards. Expert in allergen-free chemical cleaning, sofa sanitization, and premium kitchen polishing.';
      case 'deepak':
        return 'Deep disinfection professional. Focused on deep-carpet extraction, balcony washing, water tank disinfection and dust mitigation protocols.';
      case 'vikram':
        return 'Professional surface stylist and painter. Specialized in flawless texture coating, prime base application, damp proofing, and luxury accent walls.';
      case 'david':
        return 'Premium master joiner and carpenter. Background in structural modular kitchen restoration, lock-set key updates, and custom furniture polishing.';
      case 'sunita':
        return 'Eco-friendly pest management expert. Employs advanced micro-gel techniques for cockroach elimination and termite barrier control. Safe for kids and pets.';
      case 'malhotra':
        return 'Logistics and heavy packaging specialist. Trusted expert in premium fragile item packing, secure bubble wraps, and reliable local shifting.';
      default:
        return `Expert service professional focusing on professional ${worker.category} installations, emergency troubleshooting, and technical diagnosis with state-approved certifications.`;
    }
  };

  // Generate behaviour reviews
  const getBehaviourTags = (worker: Worker) => {
    switch (worker.id) {
      case 'rajesh': return ['Punctual', 'Polite Behaviour', 'Highly Professional', 'Clean Workspace'];
      case 'priya': return ['Super Courteous', 'Extremely Neat', 'Friendly Guide', 'No Hidden Fees'];
      case 'marcus': return ['Precision Minded', 'Polite Behaviour', 'Quiet Worker', 'Tidy Setup'];
      case 'sarah': return ['Meticulous Care', 'Polite Behaviour', 'Honest Advice', 'Perfect Polish'];
      default: return ['Polite Behaviour', 'Active Listener', 'Punctual', 'Tidy Setup'];
    }
  };

  const bio = getBio(selectedWorker);
  const behaviourTags = getBehaviourTags(selectedWorker);
  // Estimate completed order success rate and total orders
  const successRate = selectedWorker.rating >= 4.85 ? '99.4%' : selectedWorker.rating >= 4.7 ? '98.2%' : '96.5%';
  const experienceYears = selectedWorker.rating >= 4.9 ? '8+ Years' : selectedWorker.rating >= 4.75 ? '5+ Years' : '3 Years';

  const handleOrderProceed = () => {
    showNotification(`✓ Proceeding to set date and time slot for ${selectedWorker.name}.`);
    onTransition('booking');
  };

  return (
    <div id="provider-details-root" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-32">
      {/* Dynamic Header with navigation */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#07122a]/90 backdrop-blur-md border-b border-[#c5a059]/25 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onTransition('providers')}
              className="p-2 bg-zinc-900/60 hover:bg-[#c5a059]/15 rounded-xl text-[#c5a059] border border-zinc-805 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] text-[#e9c176] font-mono tracking-widest uppercase font-extrabold block">Specialist Background</span>
              <h1 className="font-sans font-bold text-base text-white -mt-0.5 tracking-tight">Verified Expert Profile</h1>
            </div>
          </div>

          <div className="px-3 py-1 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg text-right">
            <span className="text-[9px] text-zinc-400 block font-mono"></span>
            <span className="font-sans font-extrabold text-[#e9c176] text-sm"></span>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main id="punchx-provider-details" className="punchx-citizen-main max-w-xl mx-auto px-6 pt-24 space-y-6">
        
        {/* Profile Card Intro hero banner block */}
        <div className="bg-gradient-to-b from-[#11192e] to-[#111415] border border-[#c5a059]/30 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#e9c176] text-[10px] font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {selectedWorker.proBadge === 'PRO' ? 'Elite Professional' : selectedWorker.proBadge === 'TOP' ? 'Verified Professional' : 'Vetted Veteran'}
          </div>

          <div className="relative inline-block mt-4">
            <img
              src={selectedWorker.avatar}
              alt={selectedWorker.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-[#c5a059] shadow-md mx-auto"
              referrerPolicy="no-referrer"
            />
            {/* Category badge in the top corner of the profile */}
            <CategoryProfileBadge category={selectedWorker.category} sizeClassName="w-7 h-7 p-1.5" className="-top-0.5 -right-0.5" />
            <span className="absolute bottom-1 right-2 w-5 h-5 rounded-full border-2 border-[#11192e] bg-emerald-500" />
          </div>

          <h2 className="text-xl font-bold font-sans text-white mt-4">{selectedWorker.name}</h2>
          <p className="text-sm text-[#e9c176] font-medium mt-1 font-sans">{selectedWorker.category} Specialist</p>

          {/* Public ratings are intentionally not displayed. */}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 mt-6 pt-6 border-t border-zinc-800/80">
            <div className="bg-[#0c0f10] p-2.5 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-500 font-sans block uppercase font-bold">Successful Orders</span>
    
            </div>
            <div className="bg-[#0c0f10] p-2.5 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-500 font-sans block uppercase font-bold">Success Rate</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">{successRate}</span>
            </div>
            <div className="bg-[#0c0f10] p-2.5 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-500 font-sans block uppercase font-bold">Experience</span>
              <span className="text-base font-extrabold text-[#e9c176] font-sans">{experienceYears}</span>
            </div>
          </div>
        </div>

        {/* Overview Bio description segment */}
        <section className="bg-[#111415] border border-zinc-850 rounded-2xl p-5 space-y-3 shadow">
          <h3 className="text-xs uppercase font-mono tracking-wider text-[#e9c176] font-bold flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            Professional Bio
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed font-sans">{bio}</p>
        </section>

        {/* Customer Satisfaction Checklist */}
        

      </main>

      {/* Booking Drawer CTA Button */}
      <div className="fixed bottom-0 left-0 w-full z-45 bg-[#07122a] border-t border-[#c5a059]/40 p-4 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button
            onClick={() => onTransition('providers')}
            className="px-5 py-4 bg-zinc-900 hover:bg-zinc-800 text-[#c5a059] border border-zinc-800 rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer transition-colors"
          >
            Directory
          </button>
          <button
            onClick={handleOrderProceed}
            className="flex-grow py-4 bg-gradient-to-r from-[#c5a059] to-[#e9c176] hover:brightness-110 active:scale-[0.98] text-black font-extrabold uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#c5a059]/10 transition-all border border-[#ffdea5]/40"
          >
            Book Now with {selectedWorker.name}
          </button>
        </div>
      </div>
    </div>
  );
}
