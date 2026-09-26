import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ShieldCheck, Upload, X, Calendar, Clock, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { OrderRecord, WarrantyClaim } from '../types';

interface WarrantyClaimModalProps {
  order: OrderRecord;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (claim: WarrantyClaim) => void;
  showNotification: (msg: string) => void;
}

export default function WarrantyClaimModal({
  order,
  isOpen,
  onClose,
  onSubmitSuccess,
  showNotification
}: WarrantyClaimModalProps) {
  const [problemDescription, setProblemDescription] = useState('');
  const [durationDays, setDurationDays] = useState('2');
  const [photoProof, setPhotoProof] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (9:00 AM - 12:00 PM)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file is too large. Please upload an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoProof(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) {
      setError('Please describe the recurring problem with the product/service.');
      return;
    }
    if (!photoProof) {
      setError('Please upload a photo proof showing the recurring issue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const claimId = `WRN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClaim: WarrantyClaim = {
      id: claimId,
      orderId: order.id,
      customerName: order.customerName || 'Customer',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || 'Customer Address',
      category: order.category,
      originalWorkerName: order.workerName,
      problemDescription: problemDescription.trim(),
      problemDurationDays: parseInt(durationDays, 10) || 1,
      photoProof: photoProof,
      preferredDate: preferredDate,
      preferredTimeSlot: preferredTimeSlot,
      status: 'PENDING_ADMIN_REVIEW',
      servicePersonVisitingCharge: 59, // Platform compensates specialist ₹59
      customerCharge: 0, // ₹0 Free for 30-day guarantee customer
      createdAt: new Date().toISOString()
    };

    try {
      // FE-05: Require authenticated user before Firestore writes
      if (!auth.currentUser?.uid) {
        showNotification('⚠️ You must be signed in to file a warranty claim.');
        setIsSubmitting(false);
        return;
      }

      // 1. Save claim into Firestore
      await setDoc(doc(db, 'warranty_claims', claimId), { ...newClaim, customerId: auth.currentUser.uid });

      // 2. Update order document with claim info
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          warrantyClaimId: claimId,
          warrantyClaimStatus: 'PENDING_ADMIN_REVIEW'
        });
      } catch (err) {
        console.warn("Could not update order status:", err);
      }

      // 3. Save locally in localStorage
      try {
        const existingClaims = JSON.parse(localStorage.getItem('punchx_warranty_claims') || '[]');
        existingClaims.unshift(newClaim);
        localStorage.setItem('punchx_warranty_claims', JSON.stringify(existingClaims));
      } catch (e) {
        console.error("Local storage claim save error:", e);
      }

      showNotification(`✓ 30-Day Guarantee Claim ${claimId} submitted! Admin will review for ₹0 free rebooking.`);
      onSubmitSuccess(newClaim);
      onClose();
    } catch (err: any) {
      console.error("Failed to submit claim:", err);
      setError(err?.message || 'Failed to submit warranty claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0b1325] border border-[#c5a059]/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 bg-[#0f1b33] border-b border-zinc-800 flex justify-between items-center text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c5a059]/20 border border-[#c5a059]/40 flex items-center justify-center text-[#e9c176]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">30-Day Free Revisit Guarantee</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Original Order: {order.id} • {order.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmitClaim} className="p-6 overflow-y-auto space-y-4 text-left font-sans">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Guarantee Highlight Banner */}
            <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-2xl p-3.5 flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div className="text-xs">
                <p className="font-bold text-[#e9c176]">100% Free Rebooking Guarantee Activated</p>
                <p className="text-zinc-300 text-[11px] mt-0.5 leading-relaxed">
                  Since you opted for the ₹99 30-Day Guarantee, rebooking the same recurring issue is <strong className="text-emerald-400">completely free (₹0)</strong> for you once approved by our team.
                </p>
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                1. What same problem is occurring again? *
              </label>
              <textarea
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Explain the recurring fault (e.g. AC cooling stopped again, water leaking from pipe joint, switch sparked)..."
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none min-h-[75px] resize-none"
                required
              />
            </div>

            {/* Problem Duration in Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                2. For how many days has this problem been recurring? *
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
              >
                <option value="1">1 Day (Started yesterday/today)</option>
                <option value="2">2 - 3 Days</option>
                <option value="5">4 - 7 Days</option>
                <option value="10">More than a week</option>
              </select>
            </div>

            {/* Photo Proof Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center justify-between">
                <span>3. Upload Photo / Video Proof *</span>
                {photoProof && <span className="text-emerald-400 font-mono text-[10px]">✓ Photo Attached</span>}
              </label>
              
              {photoProof ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#c5a059]/50 h-36 bg-black">
                  <img src={photoProof} alt="Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoProof('')}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded-lg text-xs"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-zinc-750 hover:border-[#c5a059] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#07122a]/60 hover:bg-[#07122a] transition-all">
                  <div className="w-10 h-10 rounded-full bg-[#c5a059]/10 flex items-center justify-center text-[#e9c176]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-zinc-300 font-bold">Click to capture or upload issue photo</span>
                  <span className="text-[10px] text-zinc-500 font-mono">PNG, JPG or WebP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Preferred Revisit Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Preferred Visit Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl p-2.5 text-xs text-white outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Preferred Time Slot
                </label>
                <select
                  value={preferredTimeSlot}
                  onChange={(e) => setPreferredTimeSlot(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl p-2.5 text-xs text-white outline-none"
                >
                  <option value="Morning (9:00 AM - 12:00 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12:00 PM - 3:00 PM)">Afternoon (12 PM - 3 PM)</option>
                  <option value="Evening (3:00 PM - 7:00 PM)">Evening (3 PM - 7 PM)</option>
                </select>
              </div>
            </div>

            {/* Payout & Charges breakdown notice */}
            <div className="bg-[#07122a] border border-zinc-800 rounded-xl p-3 text-xs flex justify-between items-center font-mono">
              <span className="text-zinc-400">Rebooking Cost for You:</span>
              <span className="text-emerald-400 font-extrabold text-sm">₹0.00 (FREE)</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-3 bg-[#c5a059] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting Claim...</span>
                ) : (
                  <span>Submit Free Rebook Claim</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
