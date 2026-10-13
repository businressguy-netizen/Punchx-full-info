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
      answer: '[SERVICE PRICE RANGES, VISIT FEES AND PLATFORM FEES: confirm with founders]. The final amount and any applicable fees should be reviewed before booking confirmation.'
    },
    {
      category: 'Safety',
      question: 'How are professionals verified before a booking?',
      answer: '[VERIFICATION STEPS: confirm with founders]. PunchX should publish the actual checks used before making a specific verification claim.'
    },
    {
      category: 'Warranty',
      question: 'What warranty or revisit policy applies to a service?',
      answer: '[WARRANTY AND REVISIT POLICY: confirm with founders]. Any applicable terms should be shown before a booking is confirmed.'
    },
    {
      category: 'Dispatch',
      question: 'When will the professional arrive?',
      answer: 'Arrival timing depends on the service, availability and booking details. Tracking availability depends on the booking. [CONFIRM SERVICE-AREA AND ETA PROMISES WITH FOUNDERS].'
    },
    {
      category: 'Payments',
      question: 'When do I need to pay, and what payment methods are accepted?',
      answer: 'Payment options can include online payment and cash where applicable. The available methods and payment timing should be confirmed in the checkout flow. [CONFIRM PAYMENT TERMS WITH FOUNDERS].'
    },
    {
      category: 'Safety',
      question: 'How is a booking or completed job confirmed?',
      answer: 'Booking and completion confirmation steps depend on the current booking flow. [CONFIRM OTP PURPOSE AND TIMING WITH FOUNDERS].'
    },
    {
      category: 'Corporate',
      question: 'Does PunchX provide Annual Maintenance Contracts (AMC) for apartment complexes and offices?',
      answer: '[BUSINESS OR CORPORATE SERVICE AVAILABILITY: confirm with founders].'
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
            Answers about services, booking, safety and pricing.
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
            No questions matched your search. Try another term or email punchxservice@gmail.com.
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
            <p className="text-xs text-zinc-400">Contact PunchX by email for questions about services and bookings.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="mailto:punchxservice@gmail.com"
            className="px-4 py-2 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Email punchxservice@gmail.com</span>
          </a>
        </div>
      </div>
    </section>
  );
}
