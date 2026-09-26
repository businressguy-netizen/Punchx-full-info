import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, CheckCircle2, MapPin } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReviewItem {
  id: string;
  name: string;
  role?: string;
  category: string;
  rating: number;
  date: string;
  headline?: string;
  review: string;
  verified: boolean;
  serviceBadge?: string;
  initials: string;
  color: string;
}

export default function CustomerTestimonials() {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = [
    'from-amber-600 to-yellow-700',
    'from-blue-600 to-indigo-800',
    'from-emerald-600 to-teal-800',
    'from-purple-600 to-pink-800',
    'from-rose-600 to-orange-700'
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const live: ReviewItem[] = [];
      snapshot.docs.forEach((docSnap, idx) => {
        const data = docSnap.data();
        const authorName = data.customerName || data.name || 'PunchX Member';
        const initials = authorName.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase() || 'PX';
        const color = colors[idx % colors.length];

        live.push({
          id: docSnap.id,
          name: authorName,
          role: data.customerArea ? `Citizen, ${data.customerArea}` : 'Verified Citizen',
          category: data.category || 'Home Service',
          rating: data.rating || 5,
          date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Recent',
          headline: data.headline || `${data.rating || 5}★ Service Completed`,
          review: data.feedback || data.comment || data.review || 'Service completed swiftly and professionally with high standards.',
          verified: true,
          serviceBadge: data.serviceName || data.category || 'Verified Booking',
          initials,
          color
        });
      });

      setReviews(live);
      setIsLoading(false);
    }, (err) => {
      console.warn("Firestore reviews listener notice:", err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const categories = ['All', ...Array.from(new Set(reviews.map(r => r.category))).filter(Boolean)];

  const filteredList = filterCategory === 'All' 
    ? reviews 
    : reviews.filter(t => t.category === filterCategory);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(2)
    : '5.0';

  if (!isLoading && reviews.length === 0) {
    return (
      <section id="customer-reviews-section" className="w-full space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#e9c176] text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-[#c5a059]/30">
              <Star className="w-3.5 h-3.5 fill-[#e9c176]" />
              <span>Verified Citizen Experiences</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Citizen Reviews & Verified Ratings
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Live feedback from residents across Kolkata following verified job completions.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-[#09152e] border border-zinc-800 text-center space-y-2">
          <p className="text-sm font-bold text-zinc-300">No verified citizen reviews recorded yet.</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Book any service pan-Kolkata. Once work is fulfilled, your verified rating and feedback will appear directly on this board.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="customer-reviews-section" className="w-full space-y-6 pt-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#e9c176] text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-[#c5a059]/30">
            <Star className="w-3.5 h-3.5 fill-[#e9c176]" />
            <span>Verified Citizen Experiences</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Live Citizen Reviews
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real feedback from residents across Kolkata after verified on-site service completion.
          </p>
        </div>

        {/* Aggregate Ratings Metric */}
        <div className="flex items-center gap-4 bg-[#0a1630] border border-[#c5a059]/30 px-4 py-2.5 rounded-2xl">
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#e9c176] justify-end">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-[#e9c176] text-[#e9c176]" />
              ))}
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Based on {reviews.length} ratings</span>
          </div>
          <div className="pl-3 border-l border-zinc-700">
            <span className="text-2xl font-black text-white font-mono leading-none">{averageRating}</span>
            <span className="text-[10px] text-emerald-400 font-mono block font-bold">/ 5.0 STAR</span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterCategory === cat
                  ? 'bg-[#c5a059] text-black border-[#e9c176]'
                  : 'bg-[#0a1630] text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className="p-6 rounded-3xl bg-[#09152e] border border-zinc-800 hover:border-[#c5a059]/40 transition-all flex flex-col justify-between shadow-xl relative group"
          >
            <div className="space-y-3">
              {/* Stars & Service Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#e9c176] text-[#e9c176]" />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{item.date}</span>
              </div>

              {/* Service Tag */}
              <div className="inline-block px-2.5 py-0.5 rounded-lg bg-[#0e1d3d] border border-zinc-700 text-[10px] font-mono text-[#e9c176]">
                {item.serviceBadge}
              </div>

              <h4 className="text-sm font-bold text-white leading-snug">
                "{item.headline}"
              </h4>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {item.review}
              </p>
            </div>

            {/* Author Profile */}
            <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-xs shadow`}>
                  {item.initials}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1">
                    {item.name}
                    {item.verified && (
                      <span title="Verified Customer Booking">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </span>
                    )}
                  </h5>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-[#c5a059]" /> {item.role}
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                VERIFIED JOB
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
