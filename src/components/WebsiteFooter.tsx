import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Clock3, Navigation2, Gift, Mail, MapPin, ShieldCheck, Sparkles, Wrench, X } from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WebsiteFooterProps {
  onTransition: (target: AppScreen) => void;
  onSelectCategory?: (category: string) => void;
  showNotification: (msg: string) => void;
}

export default function WebsiteFooter({ onTransition, onSelectCategory, showNotification }: WebsiteFooterProps) {
  const [refundOpen, setRefundOpen] = useState(false);

  const serviceLinks = PUNCHX_50_CATEGORIES;

  const jump = (category: string) => {
    onSelectCategory?.(category);
    onTransition('providers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification(`Opening ${category} service options.`);
  };

  return (
    <footer id="punchx-website-footer" className="relative overflow-hidden border-t border-white/10 bg-[#11110f] text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#94703a]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[#c5a66a]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            [Clock3, 'Smart dispatch', 'Your request is reviewed before a professional is coordinated.'],
            [ShieldCheck, 'Clear service details', 'Review the service details and booking terms before you confirm.'],
            [CheckCircle2, 'Clear checkout', 'Review the itemised quotation before authorising the service.'],
            [Navigation2Icon, 'Service tracking', 'Follow active jobs from assignment to arrival with live updates.'],
          ].map(([Icon, title, desc]) => (
            <div key={String(title)} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#94703a]/15 text-[#d7bd82]"><Icon className="h-5 w-5" /></div>
              <div className="mt-4 text-sm font-black">{title as string}</div>
              <div className="mt-1 text-[11px] leading-5 text-white/55">{desc as string}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-10 border-y border-white/10 py-10 lg:grid-cols-[1.15fr_.9fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1"><img src={PUNCHX_LOGO} alt="PunchX" className="h-full w-full rounded-xl object-contain" /></div>
              <div><div className="text-xl font-black tracking-[-0.03em]">PunchX</div><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Customer × professional network</div></div>
            </div>
            <p className="mt-4 max-w-md text-xs leading-6 text-white/60">A service marketplace being built to help customers discover local professionals, understand booking details, and stay connected throughout the service journey.</p>
            <a
              href="/founder"
              onClick={(event) => {
                event.preventDefault();
                onTransition('founder');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Meet PunchX founders Rimil Das and Abhradip Ghosh"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d7bd82]/30 bg-[#94703a]/15 px-4 py-3 text-xs font-extrabold text-[#d7d0ff] transition hover:border-[#d7bd82]/60 hover:bg-[#94703a]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7bd82]"
            >
              Meet the founders <ArrowRight className="h-4 w-4" />
            </a>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Local service options', 'Booking details', 'Service status'].map(x => <span key={x} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold text-white/70">{x}</span>)}
            </div>
          </div>

          <div>
            <button onClick={() => onTransition('catalogue')} className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#d7bd82]/25 bg-[#94703a]/15 px-3 py-3 text-left text-xs font-extrabold text-[#d7d0ff] transition hover:bg-[#94703a]/25">Browse interactive price catalogue <ArrowRight className="h-4 w-4" /></button>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d7bd82]">Explore services</div>
            <div className="mt-4 space-y-2">
              {serviceLinks.map(cat => <button key={cat.id} onClick={() => jump(cat.name)} className="group flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-[11px] font-bold text-white/65 hover:bg-white/5 hover:text-white"><span className="flex items-center gap-2"><span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white/10"><img src={cat.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" /></span>{cat.name}</span><ChevronRight className="h-3.5 w-3.5 text-white/25 transition group-hover:translate-x-0.5" /></button>)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d7bd82]">PunchX support</div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-2 text-xs font-black"><Mail className="h-4 w-4 text-[#d7bd82]" /> Contact PunchX</div>
              <a className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-white underline underline-offset-4" href="mailto:punchxservice@gmail.com">punchxservice@gmail.com</a>
              <button onClick={() => showNotification('Support request entry point is available from your PunchX account.')} className="mt-4 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#171714] transition hover:bg-[#efeff2]">Open support flow <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => {
                try {
                  localStorage.setItem('punchx_auth_role', 'worker');
                  localStorage.setItem('punchx_edit_worker_signup', 'true');
                  localStorage.removeItem('punchx_worker_approved');
                } catch {}
                onTransition('worker-signup');
              }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.08]">Join as a professional</button>
              <button onClick={() => setRefundOpen(true)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[10px] font-bold text-white/75 hover:bg-white/[0.08]">Refund & warranty</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-[10px] text-white/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>© {new Date().getFullYear()} PunchX. All rights reserved.</div>
            <a 
              href="https://namoid.in/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 hover:text-white transition group"
            >
              <span>Authenticated via</span>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 group-hover:bg-white/10 transition">
                <svg width="14" height="14" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="400" rx="100" fill="#115c46" />
                  <path d="M120 280V120L280 280V120" stroke="white" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-bold text-white tracking-wide">NamoID</span>
              </div>
            </a>
            <a
              href="https://www.producthunt.com/products/punch-x?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-punch-x"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PUNCH X on Product Hunt"
              className="inline-flex max-w-full items-center transition-opacity hover:opacity-80"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1300136&theme=light&t=1793509895126"
                alt="PUNCH X - Connecting Customers with Trusted Local Professionals on Product Hunt"
                width="250"
                height="54"
                loading="lazy"
                className="h-auto max-w-full"
              />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button onClick={() => onTransition('founder')} className="hover:text-white">Founding team</button>
            <button onClick={() => onTransition('terms-and-conditions')} className="hover:text-white">Terms</button>
            <button onClick={() => onTransition('privacy-policy')} className="hover:text-white">Privacy</button>
            <button onClick={() => showNotification('Accessibility support details: [CONFIRM WITH FOUNDERS].')} className="hover:text-white">Accessibility</button>
          </div>
        </div>
      </div>

      {refundOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <MotionRefund />
        </div>
      )}
    </footer>
  );

  function MotionRefund() {
    return (
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-white/10 bg-[#101525] p-4 sm:p-5 shadow-2xl pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-sm font-black"><Gift className="h-4 w-4 text-[#d7bd82]" /> Refund & warranty</div>
          <button onClick={() => setRefundOpen(false)} className="rounded-xl bg-white/5 p-2 text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 pt-4 text-xs leading-5 text-white/65">
          <p><strong className="text-white">Refund policy:</strong> [REFUND POLICY: confirm with founders before publishing].</p>
          <p><strong className="text-white">Cancellation:</strong> [CANCELLATION POLICY: confirm with founders before publishing].</p>
          <p><strong className="text-white">Payment disputes:</strong> contact <a className="underline underline-offset-4" href="mailto:punchxservice@gmail.com">punchxservice@gmail.com</a> while the formal dispute process is confirmed.</p>
        </div>
      </div>
    );
  }
}

function Navigation2Icon(props: React.SVGProps<SVGSVGElement>) {
  return <Navigation2 {...props} />;
}
