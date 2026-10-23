import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowDownCircle, CheckCircle2, Clock3, Copy, ExternalLink, RefreshCw, Smartphone, Wallet } from 'lucide-react';
import { auth } from '../lib/firebase';

type WalletTransaction = {
  id: string;
  type: string;
  amountPaise: number;
  balanceAfterPaise?: number;
  orderId?: string;
  reference?: string;
  status?: string;
  createdAtIso?: string;
  note?: string;
};

type TopUpRequest = {
  id: string;
  amountPaise: number;
  reference: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  createdAtIso?: string;
  reviewedAtIso?: string;
  reviewNote?: string;
};

type WalletPayload = {
  wallet: { balancePaise: number; reservedPaise?: number; updatedAtIso?: string };
  transactions: WalletTransaction[];
  topUps: TopUpRequest[];
};

const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || '';
const punchxUpiId = String((import.meta as any).env?.VITE_PUNCHX_UPI_ID || '').trim();
const punchxQrUrl = String((import.meta as any).env?.VITE_PUNCHX_UPI_QR_URL || '').trim();
const inr = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((Number(paise) || 0) / 100);
const dateLabel = (value?: string) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function WorkerWalletView({ showNotification }: { showNotification?: (message: string) => void }) {
  const [payload, setPayload] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('100');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!auth.currentUser) {
      setError('Your secure sign-in session is not ready. Please sign in again.');
      setLoading(false);
      return;
    }
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backendBase}/api/worker-wallet`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true) throw new Error(data?.error || 'Could not load your wallet.');
      setPayload(data as WalletPayload);
    } catch (e: any) {
      setError(e?.message || 'Could not load your wallet. Check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const requestTopUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const amountNumber = Number(amount);
    if (!Number.isInteger(amountNumber) || amountNumber < 100 || amountNumber > 50000) {
      setError('Enter a whole-rupee recharge amount between ₹100 and ₹50,000.');
      return;
    }
    const transactionReference = reference.trim();
    if (transactionReference.length < 6 || transactionReference.length > 80) {
      setError('Enter the PhonePe / UPI transaction reference after you have paid.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('Please sign in again before submitting a recharge.');
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${backendBase}/api/worker-wallet/top-up-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountRupees: amountNumber, reference: transactionReference, paymentMethod: 'PHONEPE_UPI' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true) throw new Error(data?.error || 'Could not submit the recharge request.');
      setReference('');
      setAmount('100');
      showNotification?.('Recharge request submitted. Credits will be added after PunchX verifies your payment.');
      await load(true);
    } catch (e: any) {
      setError(e?.message || 'Could not submit the recharge request.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(punchxUpiId);
      showNotification?.('PunchX UPI ID copied.');
    } catch {
      showNotification?.('Copy unavailable. Please select and copy the UPI ID manually.');
    }
  };

  const balancePaise = Number(payload?.wallet?.balancePaise || 0);
  const reservedPaise = Number(payload?.wallet?.reservedPaise || 0);
  const topUps = payload?.topUps || [];
  const transactions = payload?.transactions || [];

  return <div className="wx-stack wx-wallet-page">
    <div className="wx-page-intro">
      <div><span className="wx-section-label">PROFESSIONAL FINANCE</span><h2>Commission wallet</h2><p>Recharge commission credits and review every wallet transaction.</p></div>
      <button type="button" className="wx-secondary" onClick={() => void load(true)} disabled={loading || refreshing}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
    </div>

    <section className="wx-wallet-hero">
      <div className="wx-wallet-orb"><Wallet size={25}/></div>
      <div className="wx-wallet-hero-copy"><span>AVAILABLE WALLET CREDITS</span><strong>{loading ? 'Loading…' : inr(balancePaise)}</strong><small>Available credits are used for commission and the applicable citizen platform fee on direct-to-worker payments.</small></div>
      <div className="wx-wallet-hero-side"><span>Reserved credits</span><b>{inr(reservedPaise)}</b><span>Minimum recharge</span><b>₹100.00</b></div>
    </section>

    <div className="wx-wallet-notice"><AlertCircle size={19}/><div><b>Credits are not money held for customer bookings.</b><span>Top-ups remain pending until the PunchX team verifies the PhonePe / UPI reference. Never submit a payment reference for a transfer you have not made.</span></div></div>

    <div className="wx-wallet-grid">
      <section className="wx-card wx-wallet-recharge">
        <div className="wx-card-head"><div><span className="wx-section-label">ADD CREDITS</span><h3>Recharge wallet</h3></div><Smartphone size={20}/></div>
        <p className="wx-muted wx-wallet-help">Pay PunchX using the official UPI details shared by the team, then submit the UPI reference below. Recharge is manual for now; this website does not automatically verify bank payments.</p>
        {punchxQrUrl && <img className="wx-wallet-qr" src={punchxQrUrl} alt="PunchX official UPI QR code" loading="lazy"/>}
        {punchxUpiId ? <div className="wx-wallet-upi"><div><span>Official PunchX UPI ID</span><b>{punchxUpiId}</b></div><button type="button" className="wx-icon-btn" onClick={() => void copyUpi()} aria-label="Copy PunchX UPI ID"><Copy size={16}/></button><a href={`upi://pay?pa=${encodeURIComponent(punchxUpiId)}&pn=PUNCHX&cu=INR`} className="wx-secondary"><ExternalLink size={14}/> Open UPI app</a></div> : <div className="wx-wallet-config-warning"><AlertCircle size={17}/><span>The official PunchX UPI ID / QR is not configured in the website. Ask PunchX admin for the verified PhonePe QR before transferring money.</span></div>}
        <form onSubmit={requestTopUp} className="wx-wallet-form">
          <label>Recharge amount (₹)<input inputMode="numeric" type="number" min="100" max="50000" step="1" value={amount} onChange={e => setAmount(e.target.value)} required/><small>Minimum ₹100 per request.</small></label>
          <label>PhonePe / UPI transaction reference<input autoComplete="off" value={reference} onChange={e => setReference(e.target.value)} placeholder="Enter UTR / transaction ID" minLength={6} maxLength={80} required/><small>The request will be reviewed by PunchX before credits are added.</small></label>
          {error && <div className="wx-wallet-error" role="alert">{error}</div>}
          <button type="submit" className="wx-primary" disabled={submitting || loading}>{submitting ? <><RefreshCw size={15} className="animate-spin"/>Submitting…</> : <>Submit recharge for verification <ArrowDownCircle size={16}/></>}</button>
        </form>
      </section>

      <section className="wx-card">
        <div className="wx-card-head"><div><span className="wx-section-label">RECHARGE STATUS</span><h3>Recent recharge requests</h3></div><Clock3 size={19}/></div>
        {topUps.length ? topUps.map(item => <div className="wx-wallet-transaction" key={item.id}><div className="wx-wallet-transaction-icon"><Clock3 size={17}/></div><div className="wx-wallet-transaction-copy"><b>{inr(item.amountPaise)} recharge</b><span>Ref: {item.reference} · {dateLabel(item.createdAtIso)}</span><small>{item.reviewNote || (item.status === 'PENDING_REVIEW' ? 'Waiting for admin verification' : item.status === 'APPROVED' ? 'Recharge verified and credited' : 'Recharge request rejected')}</small></div><span className={'wx-wallet-status '+(item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'pending')}>{item.status === 'PENDING_REVIEW' ? 'Pending' : item.status === 'APPROVED' ? 'Approved' : 'Rejected'}</span></div>) : <div className="wx-empty"><Clock3/><b>No recharge requests</b><span>Your pending and completed recharge requests will appear here.</span></div>}
      </section>
    </div>

    <section className="wx-card">
      <div className="wx-card-head"><div><span className="wx-section-label">WALLET LEDGER</span><h3>Transaction history</h3></div><span className="wx-muted">{transactions.length} records</span></div>
      {transactions.length ? transactions.map(tx => {
        const isCredit = tx.type === 'TOP_UP' || tx.type === 'ADMIN_CREDIT' || tx.type === 'REVERSAL';
        const title = tx.type === 'JOB_FEE_DEBIT' ? 'Job commission + platform fee' : tx.type === 'TOP_UP' ? 'Verified wallet recharge' : tx.type === 'ADMIN_CREDIT' ? 'Admin credit adjustment' : tx.type === 'REVERSAL' ? 'Wallet debit reversal' : tx.type.replace(/_/g, ' ').toLowerCase();
        return <div className="wx-wallet-transaction" key={tx.id}><div className="wx-wallet-transaction-icon">{isCredit ? <ArrowDownCircle size={17}/> : <Wallet size={17}/>}</div><div className="wx-wallet-transaction-copy"><b>{title}</b><span>{tx.orderId ? `Booking #${tx.orderId} · ` : ''}{dateLabel(tx.createdAtIso)}{tx.reference ? ` · Ref: ${tx.reference}` : ''}</span><small>Balance after transaction: {inr(Number(tx.balanceAfterPaise || 0))}{tx.note ? ` · ${tx.note}` : ''}</small></div><strong className={isCredit ? 'good' : 'bad'}>{isCredit ? '+' : '−'}{inr(tx.amountPaise)}</strong></div>;
      }) : <div className="wx-empty"><Wallet/><b>No wallet transactions yet</b><span>Verified recharges and fee deductions will be itemised here.</span></div>}
    </section>

    <section className="wx-card wx-report-note"><CheckCircle2 size={18}/><div><b>Clear fee accounting</b><span>For cash or direct UPI paid to you, PunchX deducts the agreed commission and applicable ₹10 platform fee from these credits. If a future integrated gateway confirms payment to PunchX, that booking uses the worker settlement ledger instead and will not debit this wallet.</span></div></section>
  </div>;
}
