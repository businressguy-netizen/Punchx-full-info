import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { AppScreen, Worker } from '../types';

interface ConfirmBookingProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  selectedWorker: Worker | null;
  promoApplied: boolean;
  issueDescription: string;
  setIssueDescription: (text: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  bookingDate: string;
  setBookingDate: (date: string) => void;
  citizenAddress: string;
  setCitizenAddress: (val: string) => void;
}

type PendingBooking = { serviceName?: string; category?: string; price?: number | null; address?: string; date?: string; time?: string; description?: string };

export default function ConfirmBooking({ onTransition, selectedCategory, selectedWorker, bookingTime, setBookingTime, bookingDate, setBookingDate, citizenAddress, setCitizenAddress }: ConfirmBookingProps) {
  const [pending] = useState<PendingBooking>(() => {
    try { return JSON.parse(localStorage.getItem('punchx_pending_booking') || '{}'); } catch { return {}; }
  });
  const [address, setAddress] = useState(pending.address || citizenAddress || '');
  const [date, setDate] = useState(pending.date || bookingDate || '');
  const [time, setTime] = useState(pending.time || bookingTime || '');
  const [submitting, setSubmitting] = useState(false);

  const serviceName = pending.serviceName || selectedCategory || 'Selected service';
  const price = typeof pending.price === 'number' ? pending.price : null;
  const valid = Boolean(address.trim() && date && time);
  const providerText = selectedWorker ? selectedWorker.name : 'Finding a professional after confirmation';

  const summary = useMemo(() => ({ serviceName, address, date, time, price }), [serviceName, address, date, time, price]);

  const confirm = () => {
    if (!valid) return;
    setSubmitting(true);
    setCitizenAddress(address.trim());
    setBookingDate(date);
    setBookingTime(time);
    try { localStorage.setItem('punchx_pending_booking', JSON.stringify({ ...pending, ...summary, category: selectedCategory })); } catch {}
    window.setTimeout(() => onTransition('payment'), 250);
  };

  return <div className="min-h-screen bg-[#f7f8fa] pb-24 text-[#17191d]">
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center gap-3"><button onClick={() => onTransition('providers')} className="rounded-xl bg-[#f4f5f7] p-2"><ArrowLeft className="h-5 w-5" /></button><div><div className="text-[10px] font-bold uppercase tracking-wider text-[#8b9098]">PUNCHX</div><h1 className="text-lg font-black">Booking summary</h1></div></div></header>
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7358d7]"><ShieldCheck className="h-4 w-4" /> Review before confirming</div><h2 className="mt-3 text-2xl font-black">{serviceName}</h2><p className="mt-2 text-sm leading-6 text-[#6f747d]">{pending.description || 'Your selected service will be handled through the PUNCHX booking workflow.'}</p></section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><div className="space-y-4 text-sm"><div className="flex items-start justify-between gap-4"><span className="text-[#777c85]">Professional</span><span className="text-right font-bold">{providerText}</span></div><div className="flex items-start justify-between gap-4"><span className="flex items-center gap-2 text-[#777c85]"><MapPin className="h-4 w-4" /> Address</span><textarea value={address} onChange={e => setAddress(e.target.value)} className="min-h-20 w-[60%] resize-none rounded-xl bg-[#f6f7f9] p-3 text-right font-semibold outline-none" placeholder="Enter service address" /></div><div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-[#777c85]"><Clock3 className="h-4 w-4" /> Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl bg-[#f6f7f9] p-3 text-sm font-bold outline-none" /></div><div className="flex items-center justify-between gap-4"><span className="text-[#777c85]">Time</span><input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-xl bg-[#f6f7f9] p-3 text-sm font-bold outline-none" /></div><div className="flex items-center justify-between border-t border-black/5 pt-4"><span className="font-black">Applicable price</span><span className="font-black">{price === null ? 'Calculated by backend' : `₹${price.toLocaleString('en-IN')}`}</span></div></div></section>
      <section className="rounded-2xl bg-[#f0ecff] p-4 text-xs leading-5 text-[#5f5873]">After confirmation, the booking is handed to the PUNCHX backend. Assignment, ETA, live location, payment amount and status must come from real production data.</section>
      <button onClick={confirm} disabled={!valid || submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7358d7] px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <><CheckCircle2 className="h-5 w-5 animate-pulse" /> Confirming…</> : 'Confirm booking'}</button>
    </main>
  </div>;
}
