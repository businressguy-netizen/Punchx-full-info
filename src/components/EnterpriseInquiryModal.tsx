import React, { useState } from 'react';
import { Building2, X, Check, ShieldCheck, Download, Send, Phone, Mail, Sparkles } from 'lucide-react';

interface EnterpriseInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string) => void;
}

export default function EnterpriseInquiryModal({
  isOpen,
  onClose,
  showNotification
}: EnterpriseInquiryModalProps) {
  const [propertyType, setPropertyType] = useState<string>('Apartment Society');
  const [unitCount, setUnitCount] = useState<string>('100 - 250 Units');
  const [contactName, setContactName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [societyName, setSocietyName] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !phone.trim() || !societyName.trim()) {
      showNotification('⚠️ Please enter your name, contact phone number, and society/property name.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/consultant-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType,
          unitCount,
          contactName,
          phone,
          societyName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit inquiry');
      }

      setSubmitted(true);
      showNotification('✓ Corporate AMC Inquiry registered! Relationship manager will contact within 30 minutes.');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      showNotification('❌ Failed to submit inquiry. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#09152e] border border-[#c5a059]/40 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 bg-[#0c1b3b] border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a059] font-bold">
                ENTERPRISE & SOCIETY SOLUTIONS
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                Corporate & Society AMC Plans
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Inquiry Registered Successfully</h4>
              <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{contactName}</strong>. Our dedicated Kolkata Enterprise Account Manager has received your proposal request for <strong>{societyName}</strong> ({unitCount}) and will call you on <strong>{phone}</strong> within 30 minutes.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-bold text-xs transition-all cursor-pointer"
                >
                  Return to Platform
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0e1e40] border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div className="text-[#e9c176] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  What is included in PunchX Society AMC?
                </div>
                <p className="text-[11px] text-zinc-400">
                  Dedicated on-site electrician & plumber stations, monthly water pump preventive maintenance, lift room DG checks, 15-minute emergency breakdown SLA, and discounted residential rates for all society flat owners.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Property Type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    <option>Apartment Society (Gated)</option>
                    <option>Villa Community</option>
                    <option>Commercial Tech Park</option>
                    <option>Co-Working Space</option>
                    <option>Retail / Restaurant Chain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Property Scale / Units</label>
                  <select
                    value={unitCount}
                    onChange={(e) => setUnitCount(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    <option>25 - 50 Units</option>
                    <option>50 - 100 Units</option>
                    <option>100 - 250 Units</option>
                    <option>250 - 500 Units</option>
                    <option>500+ Luxury Flats</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Society / Enterprise Name</label>
                <input
                  type="text"
                  value={societyName}
                  onChange={(e) => setSocietyName(e.target.value)}
                  placeholder="e.g. Prestige Green Meadows / WeWork Galaxy"
                  className="w-full bg-[#07122a] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Contact Representative Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Secretary / Facility Head"
                    className="w-full bg-[#07122a] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#07122a] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-bold text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Request Custom AMC Proposal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
