import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Wallet, XCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';

type RechargeRequest = {
  id: string;
  workerUid: string;
  amountPaise: number;
  amountRupees?: number;
  reference: string;
  paymentMethod?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  createdAtIso?: string;
  reviewedAtIso?: string;
  reviewedBy?: string;
  reviewNote?: string | null;
};

const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || '';
const inr = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((Number(paise) || 0) / 100);
const dateLabel = (value?: string) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function WorkerWalletTopUpReview({ showNotification }: { showNotification?: (message: string) => void }) {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!auth.currentUser) {
      setError('Please sign in with your authorized PunchX admin account.');
      setLoading(false);
      return;
    }
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backendBase}/api/admin/worker-wallet/top-up-requests`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success !== true) throw new Error(result?.error || 'Could not load recharge requests.');
      setRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load recharge requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: RechargeRequest, action: 'APPROVE' | 'REJECT') => {
    if (busyId) return;
    if (action === 'APPROVE' && !notes[request.id]?.trim()) {
      showNotification?.('Add a short verification note before crediting this recharge.');
      return;
    }
    setBusyId(request.id);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('Please sign in again.');
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backendBase}/api/admin/worker-wallet/top-up-requests/${encodeURIComponent(request.id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reviewNote: notes[request.id] || '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success !== true) throw new Error(result?.error || 'Could not review this recharge.');
      showNotification?.(action === 'APPROVE' ? 'Recharge verified and worker credits added.' : 'Recharge request rejected.');
      await load(true);
    } catch (e: any) {
      setError(e?.message || 'Could not review this recharge.');
    } finally {
      setBusyId('');
    }
  };

  const pending = requests.filter(request => request.status === 'PENDING_REVIEW');
  return <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="text-xs font-black tracking-[.18em] text-blue-300">PUNCHX · FINANCE OPERATIONS</span><h1 className="mt-2 text-3xl font-black tracking-tight">Worker wallet recharges</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Check the PhonePe / UPI reference against the actual receipt in the PunchX account before approving. Approval creates spendable worker credits; references are not auto-verified.</p></div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold hover:bg-slate-800 disabled:opacity-50" onClick={() => void load(true)} disabled={loading || refreshing}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh requests'}</button>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Clock3 className="mb-3 text-amber-300"/><span className="text-xs text-slate-400">Pending review</span><b className="mt-1 block text-2xl">{pending.length}</b></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Wallet className="mb-3 text-blue-300"/><span className="text-xs text-slate-400">All requests</span><b className="mt-1 block text-2xl">{requests.length}</b></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><CheckCircle2 className="mb-3 text-emerald-300"/><span className="text-xs text-slate-400">Approved</span><b className="mt-1 block text-2xl">{requests.filter(request => request.status === 'APPROVED').length}</b></section>
      </div>
      {error && <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/60 p-4 text-sm text-red-200" role="alert"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
      <section className="space-y-4">
        <h2 className="text-lg font-extrabold">Recharge queue</h2>
        {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">Loading recharge requests…</div>
        : !requests.length ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"><Wallet className="mx-auto mb-3 text-slate-500"/><b>No recharge requests</b><p className="mt-2 text-sm text-slate-400">Worker-submitted PhonePe / UPI recharge requests will appear here.</p></div>
        : requests.map(request => <article key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold text-slate-400">WORKER {request.workerUid}</div><div className="mt-1 text-2xl font-black">{inr(request.amountPaise)}</div><div className="mt-1 break-all text-sm text-blue-200">UPI reference: {request.reference}</div><div className="mt-1 text-xs text-slate-500">Submitted {dateLabel(request.createdAtIso)}</div></div><span className={'rounded-full px-3 py-1.5 text-[10px] font-black tracking-wide '+(request.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300' : request.status === 'REJECTED' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-200')}>{request.status.replace('_', ' ')}</span></div>
          {request.reviewNote && <p className="mt-3 text-sm text-slate-400">Review note: {request.reviewNote}</p>}
          {request.status === 'PENDING_REVIEW' && <div className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-300">Verification / rejection note<input className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-400" maxLength={300} value={notes[request.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [request.id]: event.target.value }))} placeholder="e.g. matched PhonePe settlement dated 24 Oct"/></label><div className="flex flex-wrap gap-2"><button onClick={() => void review(request, 'APPROVE')} disabled={busyId === request.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-emerald-950 disabled:opacity-50">{busyId === request.id ? <RefreshCw size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}Verify & credit wallet</button><button onClick={() => void review(request, 'REJECT')} disabled={busyId === request.id} className="inline-flex items-center gap-2 rounded-xl border border-red-800 bg-red-950/50 px-4 py-2.5 text-sm font-bold text-red-200 disabled:opacity-50"><XCircle size={15}/>Reject request</button></div><p className="text-xs leading-5 text-slate-500">Approve only after independently checking the payment in the company account. Do not approve based on a screenshot alone.</p></div>}
        </article>)}
      </section>
    </div>
  </main>;
}
