import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Eye, Calendar, Clock, Phone, MapPin, IndianRupee, Image, RefreshCw } from 'lucide-react';
import { WarrantyClaim, OrderRecord } from '../../types';

interface WarrantyClaimsManagerProps {
  claims: WarrantyClaim[];
  onClaimUpdated: () => void;
  showNotification: (msg: string) => void;
}

export default function WarrantyClaimsManager({
  claims,
  onClaimUpdated,
  showNotification
}: WarrantyClaimsManagerProps) {
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [inspectPhoto, setInspectPhoto] = useState<string | null>(null);
  const [rejectModalClaim, setRejectModalClaim] = useState<WarrantyClaim | null>(null);
  const [rejectReason, setRejectReason] = useState('Issue not covered under 30-day recurring fault policy');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredClaims = claims.filter(c => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const handleApproveRebooking = async (claim: WarrantyClaim) => {
    try {
      // 1. Update claim status in Firestore
      await updateDoc(doc(db, 'warranty_claims', claim.id), {
        status: 'APPROVED',
        approvedAt: new Date().toISOString()
      });

      // 2. Create an active Rebooked Order in Firestore
      const rebookOrderId = `ORD-REBOOK-${Math.floor(1000 + Math.random() * 9000)}`;
      const rebookedOrder: OrderRecord = {
        id: rebookOrderId,
        category: claim.category,
        customerName: claim.customerName,
        customerPhone: claim.customerPhone,
        customerAddress: claim.customerAddress,
        workerName: claim.originalWorkerName || claim.workerName || 'Rajesh Kumar',
        workerPhone: '+91 98765 43210',
        price: 0, // ₹0 Free for customer under 30-day guarantee
        baseFee: 0,
        warrantyFee: 0,
        personalSelectionFee: 0,
        emergencySurcharge: 0,
        status: 'In Progress',
        paymentMethod: '30-Day Guarantee Free Rebooking',
        dispatchMode: 'AREA_MATCH',
        date: claim.preferredDate || claim.rebookingDate || 'Today',
        time: claim.preferredTimeSlot || claim.rebookingTime || '11:00 AM',
        createdTimestamp: Date.now(),
        issueDescription: `[30-Day Free Revisit Guarantee] Claim ID: ${claim.id} • Recurring Problem: ${claim.problemDescription || claim.recurringIssue} (Persisting for ${claim.problemDurationDays || claim.daysRecurring} days). Platform Visiting Subsidy: ₹59.`
      };

      await setDoc(doc(db, 'orders', rebookOrderId), rebookedOrder);

      // 3. Update localStorage fallback
      try {
        const storedClaims = JSON.parse(localStorage.getItem('punchx_warranty_claims') || '[]');
        const updated = storedClaims.map((c: any) => c.id === claim.id ? { ...c, status: 'APPROVED' } : c);
        localStorage.setItem('punchx_warranty_claims', JSON.stringify(updated));

        const storedOrders = JSON.parse(localStorage.getItem('punchx_order_history') || '[]');
        storedOrders.unshift(rebookedOrder);
        localStorage.setItem('punchx_order_history', JSON.stringify(storedOrders));
        localStorage.setItem('punchx_active_order', JSON.stringify(rebookedOrder));
      } catch (err) {
        console.warn("Storage sync warning:", err);
      }

      showNotification(`✓ Rebooking ${rebookOrderId} Approved & Dispatched for ₹0! Specialist will receive ₹59 visiting compensation.`);
      onClaimUpdated();
    } catch (err: any) {
      console.error("Failed to approve rebooking claim:", err);
      showNotification("⚠️ Failed to approve claim: " + err?.message);
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectModalClaim) return;
    try {
      await updateDoc(doc(db, 'warranty_claims', rejectModalClaim.id), {
        status: 'REJECTED',
        rejectionReason: rejectReason,
        rejectedAt: new Date().toISOString()
      });

      try {
        const storedClaims = JSON.parse(localStorage.getItem('punchx_warranty_claims') || '[]');
        const updated = storedClaims.map((c: any) => c.id === rejectModalClaim.id ? { ...c, status: 'REJECTED', rejectionReason: rejectReason } : c);
        localStorage.setItem('punchx_warranty_claims', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }

      showNotification(`Claim ${rejectModalClaim.id} declined.`);
      setRejectModalClaim(null);
      onClaimUpdated();
    } catch (err: any) {
      showNotification("Error rejecting claim: " + err?.message);
    }
  };

  return (
    <div className="space-y-5 text-left font-sans">
      {/* Header Info */}
      <div className="bg-[#11192e] border border-[#c5a059]/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/20 border border-[#c5a059]/40 flex items-center justify-center text-[#e9c176]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              30-Day Guarantee Rebooking Claims
              <span className="text-[10px] bg-[#c5a059]/20 text-[#e9c176] px-2 py-0.5 rounded font-mono">
                {claims.length} CLAIMS LOGGED
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Review customer recurring defect claims with photo proof. Approving dispatches a <strong>₹0 Free Service Revisit</strong> while compensating technician ₹59.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                filterStatus === st
                  ? 'bg-[#c5a059] text-black shadow'
                  : 'bg-[#07122a] border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {st === 'PENDING_ADMIN_REVIEW' ? 'Pending' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Claims List Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="bg-[#11192e] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col justify-between transition-all"
            >
              <div className="space-y-2.5">
                {/* Header tag */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs font-mono font-extrabold text-[#e9c176]">{claim.id}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono">Ref Order: {claim.orderId}</span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    claim.status === 'APPROVED' || claim.status === 'REBOOKING_CONFIRMED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : claim.status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}>
                    {claim.status === 'PENDING_ADMIN_REVIEW' ? 'Action Required' : claim.status}
                  </span>
                </div>

                {/* Service Details */}
                <div className="bg-[#07122a] border border-zinc-800/80 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-400">
                    <span>Category:</span>
                    <span className="font-bold text-white">{claim.category}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Customer:</span>
                    <span className="font-bold text-white">{claim.customerName}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Phone:</span>
                    <span className="font-mono text-zinc-300">{claim.customerPhone}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Recurring Since:</span>
                    <span className="font-mono text-amber-400 font-bold">{claim.problemDurationDays || claim.daysRecurring || 1} Days</span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Recurring Defect:</span>
                  <p className="text-xs text-zinc-200 bg-[#07122a]/60 p-2.5 rounded-xl border border-zinc-800/60 leading-relaxed italic">
                    "{claim.problemDescription || claim.recurringIssue || 'Service issue recurring within guarantee period.'}"
                  </p>
                </div>

                {/* Preferred Schedule */}
                <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#e9c176]" />
                  <span>{claim.preferredDate || claim.rebookingDate || 'Flexible'}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-[#e9c176]" />
                  <span className="truncate">{claim.preferredTimeSlot || claim.rebookingTime || 'Morning Slot'}</span>
                </div>

                {/* Photo Proof preview */}
                {claim.photoProof && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700 h-28 bg-black group cursor-pointer" onClick={() => setInspectPhoto(claim.photoProof)}>
                    <img src={claim.photoProof} alt="Claim Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity">
                      <Eye className="w-4 h-4" /> Click to Enlarge
                    </div>
                  </div>
                )}

                {/* Pricing / Payout structure */}
                <div className="bg-[#0b162b] border border-[#c5a059]/30 rounded-xl p-2.5 text-xs flex justify-between items-center font-mono">
                  <div>
                    <span className="text-zinc-400 block text-[9px]">CUSTOMER CHARGE</span>
                    <span className="text-emerald-400 font-bold">₹0 (Free Rebooking)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 block text-[9px]">SPECIALIST PAYOUT</span>
                    <span className="text-[#e9c176] font-bold">₹59.00 (Platform)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Claims */}
              {claim.status === 'PENDING_ADMIN_REVIEW' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => setRejectModalClaim(claim)}
                    className="py-2.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                  <button
                    onClick={() => handleApproveRebooking(claim)}
                    className="py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Book
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-[#11192e] border border-zinc-800 rounded-3xl p-6 space-y-2">
            <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">No Warranty Claims Found</p>
            <p className="text-xs text-zinc-500">
              When customers report a recurring problem within 30 days of repair, their claim will appear here for one-click approval and rebooking.
            </p>
          </div>
        )}
      </div>

      {/* Photo Fullscreen Inspector Modal */}
      <AnimatePresence>
        {inspectPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setInspectPhoto(null)}>
            <div className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-700 bg-black">
              <img src={inspectPhoto} alt="Proof" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalClaim && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#11192e] border border-red-800/60 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" /> Decline Guarantee Rebooking Claim
              </h3>
              <p className="text-xs text-zinc-300">
                You are declining Claim <strong className="text-white">{rejectModalClaim.id}</strong> for {rejectModalClaim.customerName}.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Decline Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none"
                >
                  <option value="Issue not covered under 30-day recurring fault policy">Issue not covered under 30-day recurring fault policy</option>
                  <option value="Damage caused by external accidental factor after service">Damage caused by external accidental factor after service</option>
                  <option value="Incomplete or unclear photo verification">Incomplete or unclear photo verification</option>
                  <option value="Guarantee window expired">Guarantee window expired</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRejectModalClaim(null)}
                  className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectClaim}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase shadow-lg"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
