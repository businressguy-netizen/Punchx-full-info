import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Search, Sparkles, Phone, MessageSquare, ShieldCheck } from 'lucide-react';

export default function WebsiteFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const faqData = [
    {
      category: 'Pricing',
      question: 'How does PunchX pricing work? Are there any hidden fees?',
      answer: 'PunchX operates with complete upfront price transparency. A flat standard inspection & visiting fee of ₹199 is applied, which is fully adjusted against the final service bill if you proceed with the work. Master technician labor and genuine spare parts are itemized and approved by you before physical execution begins. There are zero surge traps or hidden conveyance costs.'
    },
    {
      category: 'Safety',
      question: 'How are technicians vetted and verified before visiting my residence?',
      answer: 'Every PunchX service partner undergoes a rigorous 4-stage onboarding protocol: (1) Government Aadhaar & identity validation, (2) Criminal record & local police background clearance, (3) Practical trade competency examination by senior guild inspectors, and (4) Standardized customer safety & hygiene training. Every specialist wears a verified PunchX digital photo badge and uniform.'
    },
    {
      category: 'Warranty',
      question: 'What is the PunchX 30-Day Service Guarantee and how does it work?',
      answer: 'All completed repairs and maintenance tasks come backed by our unconditional 30-Day Revisit Guarantee. If any serviced electrical circuit, AC compressor unit, or plumbing joint develops recurring issues within 30 days of service closure, our team will dispatch a master specialist for a complimentary re-inspection and resolution at zero extra labor cost.'
    },
    {
      category: 'Dispatch',
      question: 'How quickly will a technician arrive at my doorstep in Kolkata?',
      answer: 'Our smart GPS radar allocates the nearest available on-duty master technician in your neighborhood sector. Average arrival time across Kolkata is 15–30 minutes for emergency dispatches, with live real-time turn-by-turn tracking available directly on your customer tracking screen.'
    },
    {
      category: 'Payments',
      question: 'When do I need to pay, and what payment methods are accepted?',
      answer: 'No advance payment is needed to book. You only pay once the technician finishes the service to your satisfaction, shows digital photo proof, and collects your completion signature. We accept all major UPI apps (GPay, PhonePe, Paytm), credit/debit cards, net banking, and cash on delivery.'
    },
    {
      category: 'Safety',
      question: 'What is the 4-Digit Security OTP Gate and why is it important?',
      answer: 'To protect customer security and verify technician identity, our system issues a unique 4-digit numeric verification OTP upon booking. You share this code with the technician only when they arrive at your physical doorstep. Entering this code on the worker portal is mandatory to unlock the job ledger and start work.'
    },
    {
      category: 'Corporate',
      question: 'Does PunchX provide Annual Maintenance Contracts (AMC) for apartment complexes and offices?',
      answer: 'Yes. PunchX Corporate Care delivers customized maintenance contracts for residential societies, gated villas, co-working spaces, and retail hubs with dedicated on-site technicians, scheduled monthly electrical & pump inspections, and guaranteed 15-minute emergency SLAs.'
    }
  ];

  const categories = ['All', 'Pricing', 'Safety', 'Warranty', 'Dispatch', 'Payments', 'Corporate'];

  const filteredFaqs = faqData.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="website-faq-section" className="w-full bg-[#081226] border border-[#c5a059]/30 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#e9c176] text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-[#c5a059]/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Knowledge Base & FAQs</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Everything you need to know about our verified technicians, guarantees, and pricing.
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#c5a059] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-[#0e1b38] border border-zinc-700 focus:border-[#c5a059] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="py-4 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeCategory === cat
                ? 'bg-[#c5a059] text-black border-[#e9c176]'
                : 'bg-[#0a1630] text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3 pt-2">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs font-mono">
            No questions matched your search query. Try another term or contact our 24/7 helpline at 1800-PUNCHX-24 or PUNCHXSERVICE@GMAIL.COM.
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen 
                    ? 'bg-[#0e1d3d] border-[#c5a059]/60 shadow-lg' 
                    : 'bg-[#09152e] border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#c5a059]/15 text-[#e9c176] font-mono font-bold border border-[#c5a059]/30">
                      {faq.category}
                    </span>
                    <span className="font-bold text-white text-sm sm:text-base leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#c5a059] flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/60 mt-1">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Direct Help Callout Banner */}
      <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-[#0e1a34] border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/15 border border-[#c5a059]/30 flex items-center justify-center text-[#e9c176] flex-shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Have a specific emergency or enterprise question?</h4>
            <p className="text-xs text-zinc-400">Our concierge support team is available 24/7 across Kolkata.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="tel:1800786249"
            className="px-4 py-2 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call 1800-PUNCHX</span>
          </a>
        </div>
      </div>
    </section>
  );
}
