import React, { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppScreen, Worker } from '../types';

interface ChoosePaymentProps {
  onTransition: (target: AppScreen) => void;
  selectedWorker: Worker | null;
  promoApplied: boolean;
  hasUsedBonus?: boolean;
  onOrderFinalized?: () => void;
  onApplyPromo: (code: string) => void;
  showNotification?: (msg: string) => void;
}

type PendingBooking = { serviceId?: string; serviceName?: string; category?: string; description?: string; price?: number | null; address?: string; date?: string; time?: string };

export default function ChoosePayment({ onTransition, selectedWorker, onOrderFinalized, showNotification }: ChoosePaymentProps) {
  const [pending] = useState<PendingBooking>(() => { try { return JSON.parse(localStorage.getItem('punchx_pending_booking') || '{}'); } catch { return {}; } });
  const [method, setMethod] = useState<'cash' | 'online'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [orderId, setOrderId] = useState('');

  const total = useMemo(() => typeof pending.price === 'number' ? pending.price : null, [pending.price]);

  const finalize = async () => {
    if (method === 'online') {
      showNotification?.('Online payment is not enabled in the current PUNCHX production configuration. No fake payment will be shown.');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) { showNotification?.('Please sign in before creating a booking.'); return; }
    if (!pending.serviceName || !pending.address || !pending.date || !pending.time) { showNotification?.('Booking details are incomplete. Return to the booking summary.'); return; }

    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, 'orders'), {
        customerId: uid,
        category: pending.category || 'Service',
        serviceId: pending.serviceId || null,
        serviceName: pending.serviceName,
        description: pending.description || '',
        price: total,
        totalAmountToPay: total,
        date: pending.date,
        time: pending.time,
        bookingTime: pending.time,
        status: 'Pending',
        paymentMethod: 'Cash on Service',
        paymentStatus: 'pending',
        customerName: auth.currentUser?.displayName || 'PUNCHX Customer',
        customerAddress: pending.address,
        workerId: selectedWorker?.id || null,
        workerName: selectedWorker?.name || null,
        workerPhone: selectedWorker?.phone || null,
        createdAt: new Date().toISOString()
      });

      const localOrder = {
        id: ref.id,
        serviceName: pending.serviceName,
        category: pending.category,
        customerAddress: pending.address,
        date: pending.date,
        time: pending.time,
        bookingTime: pending.time,
        status: 'Pending',
        paymentMethod: 'Cash on Service',
        paymentStatus: 'pending',
        price: total,
        workerId: selectedWorker?.id || null,
        workerName: selectedWorker?.name || null
      };
      localStorage.setItem('punchx_active_order', JSON.stringify(localOrder));
      const history = JSON.parse(localStorage.getItem('punchx_order_history') || '[]');
      localStorage.setItem('punchx_order_history', JSON.stringify([localOrder, ...history]));
      localStorage.removeItem('punchx_pending_booking');
      setOrderId(ref.id);
      setConfirmed(true);
      onOrderFinalized?.();
    } catch (error) {
      console.error('PUNCHX booking creation failed:', error);
      showNotification?.('Booking could not be created. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (confirmed) return <div className="min-h-screen bg-[#f7f8fa] px-4 py-10 text-[#17191d]"><div className="mx-auto max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-black/5"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eee9ff]"><CheckCircle2 className="h-10 w-10 text-[#7358d7]" /></div><h1 className="mt-6 text-3xl font-black">Booking confirmed</h1><p className="mt-2 text-sm leading-6 text-[#6f747d]">Booking ID: <strong>{orderId}</strong></p><p className="mt-3 text-sm leading-6 text-[#6f747d]">Finding a professional near you. Assignment and live status will update from the PUNCHX backend.</p><div className="mt-6 rounded-2xl bg-[#f7f8fa] p-4 text-left text-sm"><div className="font-black">{pending.serviceName}</div><div className="mt-1 text-[#777c85]">{pending.address}</div><div className="mt-1 font-bold">{pending.date} · {pending.time}</div><div className="mt-1 text-[#777c85]">Payment: Cash on Service</div></div><button onClick={() => onTransition('tracking')} className="mt-6 w-full rounded-2xl bg-[#7358d7] py-3.5 text-sm font-black text-white">View booking status</button></div></div>;

  return <div className="min-h-screen bg-[#f7f8fa] pb-24 text-[#17191d]"><header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f5f7]"><Lock className="h-4 w-4" /></div><div><div className="text-[10px] font-bold uppercase tracking-wider text-[#8b9098]">PUNCHX</div><h1 className="text-lg font-black">Payment</h1></div></div></header><main className="mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8"><section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7358d7]"><ShieldCheck className="h-4 w-4" /> Secure checkout</div><h2 className="mt-3 text-2xl font-black">{pending.serviceName || 'PUNCHX service'}</h2><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#777c85]">Service</span><span className="font-bold">{pending.serviceName || '—'}</span></div><div className="flex justify-between"><span className="text-[#777c85]">Amount</span><span className="font-black">{total === null ? 'Final amount from backend' : `₹${total.toLocaleString('en-IN')}`}</span></div></div></section><section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5"><h3 className="font-black">Payment method</h3><button onClick={() => setMethod('cash')} className={`mt-4 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method === 'cash' ? 'border-[#7358d7] bg-[#f3f0ff]' : 'border-black/5'}`}><Wallet className="h-5 w-5 text-[#7358d7]" /><div className="flex-1"><div className="font-black">Cash on Service</div><div className="text-xs text-[#777c85]">Payment status remains pending until the service payment is recorded.</div></div>{method === 'cash' && <CheckCircle2 className="h-5 w-5 text-[#7358d7]" />}</button><button onClick={() => setMethod('online')} className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method === 'online' ? 'border-[#7358d7] bg-[#f3f0ff]' : 'border-black/5'}`}><CreditCard className="h-5 w-5 text-[#7358d7]" /><div className="flex-1"><div className="font-black">Online payment</div><div className="text-xs text-[#777c85]">Unavailable until a real PUNCHX payment gateway is configured.</div></div>{method === 'online' && <CheckCircle2 className="h-5 w-5 text-[#7358d7]" />}</button></section><button onClick={finalize} disabled={submitting || method === 'online'} className="w-full rounded-2xl bg-[#7358d7] py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Creating booking…' : 'Confirm & create booking'}</button></main></div>;
}
