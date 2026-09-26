import React, { useState } from 'react';
import { 
  ShieldCheck, MapPin, Phone, Mail, Clock, Award, Shield, CheckCircle2,
  ExternalLink, ChevronRight, Heart, Sparkles
} from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface WebsiteFooterProps {
  onTransition: (target: AppScreen) => void;
  onSelectCategory?: (category: string) => void;
  showNotification: (msg: string) => void;
}

export default function WebsiteFooter({
  onTransition,
  onSelectCategory,
  showNotification
}: WebsiteFooterProps) {
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const categories = [
    'Electrical Maintenance',
    'High-Pressure Plumbing',
    'AC Repair & Gas Refill',
    'Deep Home Sanitization',
    'Precision Painting',
    'Structural Carpentry',
    'Eco Pest Control',
    'Express Shifting & Moving'
  ];

  const bangaloreHubs = [
    'Indiranagar (HQ Hub)',
    'Koramangala 4th & 5th Block',
    'Whitefield ITPL Corridor',
    'HSR Layout Sectors 1-7',
    'JP Nagar & Jayanagar',
    'Hebbal & Sahakara Nagar',
    'Electronic City Phase 1 & 2',
    'Yelahanka New Town'
  ];

  const handleCategoryJump = (catName: string) => {
    let clean = catName.split(' ')[0];
    if (catName.includes('AC')) clean = 'AC Repair';
    if (catName.includes('Pest')) clean = 'Pest Control';
    if (catName.includes('Shifting')) clean = 'Moving';
    if (onSelectCategory) onSelectCategory(clean);
    onTransition('providers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification(`⚡ Viewing verified specialists for: ${clean}`);
  };

  return (
    <footer id="punchx-website-footer" className="w-full bg-[#040914] text-[#e1e3e4] border-t border-[#c5a059]/25 pt-16 pb-12 select-none relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Trust & Value Proposition Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-12 mb-12 border-b border-zinc-800/80">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#07122a]/80 border border-zinc-800">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Rapid On-Demand Dispatch</h4>
              <p className="text-xs text-zinc-400 mt-0.5">High-speed GPS radar allocation across all city sectors.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#07122a]/80 border border-zinc-800">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Police Verified Experts</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Aadhaar verified, background cleared master technicians.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#07122a]/80 border border-zinc-800">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">30-Day Service Guarantee</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Complete warranty protection on all completed works.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#07122a]/80 border border-zinc-800">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] flex-shrink-0">
              <Phone className="w-5 h-5 text-[#e9c176]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">24/7 Priority Concierge</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Live operator support & DRAGO AI smart assistance.</p>
            </div>
          </div>
        </div>

        {/* 3 Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-zinc-800/80">
          
          {/* Column 1: Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-[#c5a059] flex items-center justify-center p-1 shadow-md">
                <img src={PUNCHX_LOGO} alt="PunchX Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-sans font-black text-xl text-white tracking-tight">
                  PUNCH<span className="text-[#c5a059]">X</span>
                </span>
                <p className="font-mono text-[9px] text-[#c5a059] tracking-widest uppercase font-bold">
                  Prestige Service Utility
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Kolkata’s premier AI-assisted smart home utility and rapid emergency technician network. Connecting citizens with vetted master specialists in real-time.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a152e] border border-[#c5a059]/30 text-[11px] font-mono text-[#e9c176]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SYSTEM STATUS: 100% OPERATIONAL</span>
              </div>
            </div>
          </div>

          {/* Column 2: On-Demand Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c5a059]">
              Verified Services
            </h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              {categories.map((c) => (
                <li key={c}>
                  <button
                    onClick={() => handleCategoryJump(c)}
                    className="hover:text-[#e9c176] transition-colors flex items-center gap-1.5 text-left cursor-pointer group"
                  >
                    <ChevronRight className="w-3 h-3 text-[#c5a059] group-hover:translate-x-0.5 transition-transform" />
                    <span>{c}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Ecosystem & Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#c5a059]">
              Emergency & Portals
            </h3>

            <div className="p-3.5 rounded-xl bg-[#0a152e] border border-[#c5a059]/30 space-y-2">
              <div className="text-[11px] font-mono text-zinc-400">TOLL-FREE 24/7 HELPLINE</div>
              <div className="text-base font-extrabold text-white font-mono tracking-wider">
                1800-PUNCHX-24
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-2">SUPPORT EMAIL</div>
              <div className="text-sm font-extrabold text-white font-mono tracking-wider">
                <a href="mailto:PUNCHXSERVICE@GMAIL.COM" className="hover:text-[#e9c176] transition-colors">PUNCHXSERVICE@GMAIL.COM</a>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>AVERAGE PICKUP: &lt; 15 SECONDS</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  onTransition('panel-select');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-2.5 px-3 bg-[#111f3d] hover:bg-[#182a52] border border-[#c5a059]/40 text-[#e9c176] rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer text-xs"
              >
                <span>Technician & Authority Portal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal, Copyright & Gateway Security Badges */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-zinc-500 font-sans">
          <div className="flex flex-wrap items-center gap-4">
            <span>© {new Date().getFullYear()} PUNCHX SERVICE PLATFORM PVT. LTD.</span>
            <span>•</span>
            <span>All Rights Reserved.</span>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <a
              id="footer-link-founder"
              href="/founder"
              onClick={(e) => {
                e.preventDefault();
                onTransition('founder');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-zinc-300 hover:text-[#e9c176] font-semibold transition-colors cursor-pointer hover:underline"
            >
              Founder &amp; Leadership
            </a>
            <span>•</span>
            <a
              id="footer-link-terms"
              href="/terms-and-conditions"
              onClick={(e) => {
                e.preventDefault();
                onTransition('terms-and-conditions');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-zinc-400 hover:text-[#e9c176] transition-colors cursor-pointer hover:underline"
            >
              Terms &amp; Conditions
            </a>
            <span>•</span>
            <a
              id="footer-link-privacy"
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                onTransition('privacy-policy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-zinc-400 hover:text-[#e9c176] transition-colors cursor-pointer hover:underline"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Refund &amp; Warranty
            </button>
          </div>
        </div>
      </div>

      {/* Refund & Warranty Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a152e] border border-[#c5a059]/40 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-base">30-Day Warranty & Refund Policy</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-zinc-400 hover:text-white text-xs font-mono">CLOSE</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>1. <strong>30-Day Guarantee:</strong> If the repaired fixture or serviced unit exhibits recurring defects within 30 days, a master specialist will revisit free of charge.</p>
              <p>2. <strong>Instant Cancellation:</strong> Free cancellation up to 10 minutes prior to technician arrival.</p>
              <p>3. <strong>Refund Timelines:</strong> UPI and card refund reversals are processed instantly back to the original source method.</p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
