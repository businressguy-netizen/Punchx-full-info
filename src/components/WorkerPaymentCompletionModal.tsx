import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Loader2, Smartphone, Wallet, X } from 'lucide-react';
import { OrderRecord } from '../types';

type WorkerOrder = { id: string; service: string; customer: string; price: number | null; raw?: OrderRecord };
type CompletionPayment = { paymentMethod: 'CASH_DIRECT' | 'UPI_DIRECT'; amountCollectedRupees: number; paymentReference: string; paymentReceivedConfirmed: boolean };

export default function WorkerPaymentCompletionModal({
  order, balancePaise, saving, close, onConfirm,
}: {
  order: WorkerOrder;
  balancePaise: number;
  saving: boolean;
  close: () => void;
  onConfirm: (payment: CompletionPayment) => Promise<void>;
}) {
  const gatewayPaid = order.raw?.paymentCollectionRoute === 'PUNCHX_GATEWAY'
    && order.raw?.paymentVerificationStatus === 'VERIFIED'
    && Boolean(order.raw?.paymentId);
  const defaultAmount = useMemo(() => {
    const raw: any = order.raw || {};
    const storedTotal = Number(raw.totalAmountToPay);
    if (Number.isFinite(storedTotal) && storedTotal > 0) return String(storedTotal);
    const serviceValue = Number(raw.serviceSubtotal ?? raw.price ?? order.price ?? 0);
    const customerFee = raw.customerPlatformFee == null ? 10 : Math.max(0, Number(raw.customerPlatformFee) || 0);
    return (serviceValue + customerFee).toFixed(2).replace(/\.00$/, '');
  }, [order.id, order.raw, order.price]);
  const [method, setMethod] = useState<'CASH_DIRECT' | 'UPI_DIRECT'>('CASH_DIRECT');
  const [amount, setAmount] = useState(defaultAmount);
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1000000) {
      setError('Enter the actual amount received from the customer.');
      return;
    }
    if (!gatewayPaid && !confirmed) {
      setError('Confirm that you received payment from the customer before completing the booking.');
      return;
    }
    if (method === 'UPI_DIRECT' && reference.trim() && reference.trim().length < 6) {
      setError('Check the UPI transaction reference, or leave it blank if unavailable.');
      return;
    }
    setError('');
    await onConfirm({
      paymentMethod: method,
      amountCollectedRupees: amountValue,
      paymentReference: reference.trim(),
      paymentReceivedConfirmed: gatewayPaid || confirmed,
    });
  };

  const walletFeeEstimate = useMemo(() => {
    const raw: any = order.raw || {};
    const serviceValue = Number(raw.serviceSubtotal ?? raw.price ?? order.price ?? 0);
    const fee = raw.customerPlatformFee == null ? 10 : Math.max(0, Number(raw.customerPlatformFee) || 0);
    const tiers = [{ max: 49, rate: .05 }, { max: 300, rate: .08 }, { max: 800, rate: .10 }, { max: 1500, rate: .12 }, { max: 3000, rate: .15 }, { max: 5000, rate: .18 }, { max: 10000, rate: .20 }, { max: Infinity, rate: .23 }];
    const rate = tiers.find(t => serviceValue <= t.max)?.rate ?? .23;
    return Math.round(serviceValue * rate * 100) / 100 + fee;
  }, [order.id, order.raw, order.price]);

  return <div className="wx-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) close(); }}>
    <section className="wx-card wx-completion-modal" role="dialog" aria-modal="true" aria-labelledby="wx-complete-title">
      <div className="wx-card-head"><div><span className="wx-section-label">SERVICE COMPLETION</span><h3 id="wx-complete-title">Finalise payment</h3></div><button type="button" className="wx-icon-btn" onClick={close} disabled={saving} aria-label="Close payment form"><X size={18}/></button></div>
      <p className="wx-muted">Booking #{order.id} · {order.service} · {order.customer}</p>
      {gatewayPaid ? <div className="wx-wallet-notice"><CheckCircle2 size={18}/><div><b>Payment verified by PunchX</b><span>This booking will use the gateway settlement ledger. The worker commission wallet will not be debited.</span></div></div> : <>
        <div className="wx-wallet-notice"><Wallet size={18}/><div><b>Estimated wallet deduction: ₹{walletFeeEstimate.toFixed(2)}</b><span>Calculated from the service charge plus the configured citizen platform fee. Approved materials are not included in commission unless the applicable fee policy says otherwise. Current wallet balance: ₹{(balancePaise / 100).toFixed(2)}.</span></div></div>
        <form onSubmit={submit} className="wx-wallet-form">
          <label>Payment method received
            <div className="wx-payment-methods">
              <button type="button" className={'wx-payment-method '+(method === 'CASH_DIRECT' ? 'active' : '')} onClick={() => setMethod('CASH_DIRECT')}><Banknote size={18}/><b>Cash</b><span>Paid directly to you</span></button>
              <button type="button" className={'wx-payment-method '+(method === 'UPI_DIRECT' ? 'active' : '')} onClick={() => setMethod('UPI_DIRECT')}><Smartphone size={18}/><b>Direct UPI</b><span>Paid to your UPI</span></button>
            </div>
          </label>
          <label>Final amount received from citizen (₹)
            <input type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required/>
            <small>Include only agreed charges. Product/material charges must have customer approval first.</small>
          </label>
          {method === 'UPI_DIRECT' && <label>UPI transaction reference (optional)<input value={reference} onChange={event => setReference(event.target.value)} maxLength={80} placeholder="UTR / transaction ID"/></label>}
          <label className="wx-payment-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required/><span>I confirm that the citizen has paid me the amount shown above. I understand that PunchX will record this as a worker-reported payment.</span></label>
          {error && <p className="wx-wallet-error" role="alert">{error}</p>}
          <button type="submit" className="wx-primary" disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin"/>Saving payment…</> : <><CheckCircle2 size={16}/>Confirm payment & complete job</>}</button>
        </form>
      </>}
      {gatewayPaid && <button type="button" className="wx-primary" onClick={() => void onConfirm({ paymentMethod: 'CASH_DIRECT', amountCollectedRupees: Number((order.raw as any)?.totalAmountToPay || order.price || 0), paymentReference: '', paymentReceivedConfirmed: true })} disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin"/>Completing…</> : <><CheckCircle2 size={16}/>Complete booking</>}</button>}
    </section>
  </div>;
}
