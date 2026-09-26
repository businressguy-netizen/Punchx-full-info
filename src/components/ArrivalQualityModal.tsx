import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ShieldAlert, CheckCircle, AlertTriangle, X, Wrench, ThumbsUp, ThumbsDown, MessageSquare, IndianRupee } from 'lucide-react';
import { OrderRecord, ComplaintRecord } from '../types';

interface ArrivalQualityModalProps {
  order: OrderRecord;
  isOpen: boolean;
  onClose: () => void;
  onFeedbackProcessed: (discountAmount: number, isCritical: boolean) => void;
  showNotification: (msg: string) => void;
}

export default function ArrivalQualityModal({
  order,
  isOpen,
  onClose,
  onFeedbackProcessed,
  showNotification
}: ArrivalQualityModalProps) {
  const [correctEquipment, setCorrectEquipment] = useState<boolean | null>(null);
  const [equipmentWorking, setEquipmentWorking] = useState<boolean | null>(null);
  const [behaviourRating, setBehaviourRating] = useState<'EXCELLENT' | 'NEEDS_IMPROVEMENT' | 'UNACCEPTABLE' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{ isNegative: boolean; discountAmount: number } | null>(null);

  if (!isOpen) return null;

  const basePrice = order.baseFee || order.price || 199;
  const potentialDiscount = Math.round(basePrice * 0.10); // 10% Discount on base service

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (correctEquipment === null || equipmentWorking === null || behaviourRating === null) {
      showNotification('⚠️ Please answer all quality verification questions.');
      return;
    }

    setIsSubmitting(true);

    const isNegative = !correctEquipment || !equipmentWorking || behaviourRating !== 'EXCELLENT';
    const discountAmount = isNegative ? potentialDiscount : 0;
    const complaintId = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaintRecord: ComplaintRecord = {
      id: complaintId,
      orderId: order.id,
      customerName: order.customerName || 'Customer',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      workerName: order.workerName || 'Assigned Specialist',
      workerPhone: order.workerPhone || '',
      workerCategory: order.category,
      correctEquipment: correctEquipment,
      equipmentWorking: equipmentWorking,
      behaviourRating: behaviourRating,
      comment: comment.trim(),
      discountAmount: discountAmount,
      status: isNegative ? 'CRITICAL_PENDING_ADMIN' : 'RESOLVED',
      refundType: order.paymentMethod === 'Cash on Delivery' ? 'CASH_DISCOUNT' : 'PREPAID_GATEWAY_REFUND',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Log in Firestore complaints (requires authenticated user)
      if (!auth.currentUser?.uid) {
        showNotification('⚠️ You must be signed in to submit feedback.');
        setIsSubmitting(false);
        return;
      }
      if (isNegative) {
        await setDoc(doc(db, 'complaints', complaintId), { ...complaintRecord, customerId: auth.currentUser.uid });
      }

      // 2. Update order document with quality results
      await updateDoc(doc(db, 'orders', order.id), {
        arrivalFeedbackSubmitted: true,
        arrivalQualityRating: behaviourRating,
        qualityDiscountApplied: isNegative ? discountAmount : 0,
        prepaidRefundStatus: isNegative && order.paymentMethod !== 'Cash on Delivery' ? 'REFUND_QUEUED' : 'NONE',
        prepaidRefundAmount: isNegative ? discountAmount : 0
      });

      // 3. Save locally in localStorage for active order
      try {
        const storedOrder = localStorage.getItem('punchx_active_order');
        if (storedOrder) {
          const parsed = JSON.parse(storedOrder);
          parsed.arrivalFeedbackSubmitted = true;
          parsed.qualityDiscountApplied = discountAmount;
          parsed.prepaidRefundAmount = discountAmount;
          parsed.prepaidRefundStatus = isNegative && order.paymentMethod !== 'Cash on Delivery' ? 'REFUND_QUEUED' : 'NONE';
          localStorage.setItem('punchx_active_order', JSON.stringify(parsed));
        }

        if (isNegative) {
          const existingComplaints = JSON.parse(localStorage.getItem('punchx_complaints') || '[]');
          existingComplaints.unshift(complaintRecord);
          localStorage.setItem('punchx_complaints', JSON.stringify(existingComplaints));
        }
      } catch (err) {
        console.warn("Error updating local storage:", err);
      }

      setSubmittedResult({ isNegative, discountAmount });
      onFeedbackProcessed(discountAmount, isNegative);

      if (isNegative) {
        showNotification(`⚠️ Admin Alerted! 10% Discount of ₹${discountAmount} applied to your order.`);
      } else {
        showNotification("✓ Thank you! Verified specialist arrival checklist.");
      }
    } catch (err) {
      console.error("Error processing arrival feedback:", err);
      // Fallback
      setSubmittedResult({ isNegative, discountAmount });
      onFeedbackProcessed(discountAmount, isNegative);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
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
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Technician Arrival Quality Check</h3>
                <p className="text-[11px] text-zinc-400 font-mono">Specialist: {order.workerName || 'Rajesh Kumar'} • {order.category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submittedResult ? (
            /* Result Confirmation Screen */
            <div className="p-6 text-center space-y-4 font-sans">
              {submittedResult.isNegative ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto animate-bounce">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Quality Guarantee Triggered</h3>
                  <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-2xl text-left space-y-2 text-xs">
                    <p className="text-red-200 font-semibold">
                      🚨 Central Operations Dashboard has been flagged immediately.
                    </p>
                    <p className="text-zinc-300">
                      Our administrator is contacting technician <strong className="text-white">{order.workerName}</strong> to rectify equipment and conduct.
                    </p>
                    <div className="pt-2 border-t border-red-800/40 flex justify-between items-center">
                      <span className="text-emerald-400 font-bold">10% Compensation Applied:</span>
                      <span className="font-mono text-emerald-400 font-extrabold text-sm">₹{submittedResult.discountAmount}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {order.paymentMethod === 'Cash on Delivery'
                      ? '✓ Cash payable at job completion has been automatically reduced.'
                      : '✓ ₹' + submittedResult.discountAmount + ' Refund has been queued back to your original payment method.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Verified & Approved</h3>
                  <p className="text-xs text-zinc-300">
                    Thank you for verifying technician equipment and conduct. You can share your secure OTP with the technician after service is completed!
                  </p>
                </>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#c5a059] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Return to Live Tracking
              </button>
            </div>
          ) : (
            /* Questions Form */
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-left font-sans">
              <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-2xl p-3 text-xs text-zinc-300">
                <span className="font-bold text-[#e9c176] block mb-0.5">🛡️ PunchX High-Quality Guarantee</span>
                If the technician arrives with incomplete tools, broken equipment, or unprofessional behavior, you get an <strong className="text-emerald-400">instant 10% discount</strong> and our operations manager is alerted immediately.
              </div>

              {/* Question 1: Tools */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  1. Did the technician bring the correct tools/equipment?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCorrectEquipment(true)}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      correctEquipment === true
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Yes, Complete Tools</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrectEquipment(false)}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      correctEquipment === false
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>No, Missing Tools</span>
                  </button>
                </div>
              </div>

              {/* Question 2: Working Condition */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  2. Is the equipment in proper working condition?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEquipmentWorking(true)}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      equipmentWorking === true
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Yes, Working Fine</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEquipmentWorking(false)}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      equipmentWorking === false
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>No, Broken / Faulty</span>
                  </button>
                </div>
              </div>

              {/* Question 3: Demeanour & Professionalism */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider block">
                  3. Technician Demeanour & Professionalism:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBehaviourRating('EXCELLENT')}
                    className={`py-2.5 px-2 rounded-xl border font-bold text-[11px] text-center cursor-pointer transition-all ${
                      behaviourRating === 'EXCELLENT'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Polite & Courteous
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehaviourRating('NEEDS_IMPROVEMENT')}
                    className={`py-2.5 px-2 rounded-xl border font-bold text-[11px] text-center cursor-pointer transition-all ${
                      behaviourRating === 'NEEDS_IMPROVEMENT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Needs Improvement
                  </button>

                  <button
                    type="button"
                    onClick={() => setBehaviourRating('UNACCEPTABLE')}
                    className={`py-2.5 px-2 rounded-xl border font-bold text-[11px] text-center cursor-pointer transition-all ${
                      behaviourRating === 'UNACCEPTABLE'
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-md'
                        : 'bg-[#07122a] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Rude / Unprofessional
                  </button>
                </div>
              </div>

              {/* Optional comments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Additional remarks (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide any specific comments about arrival condition..."
                  className="w-full bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none min-h-[60px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs uppercase cursor-pointer"
                >
                  Skip Check
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-3 bg-[#c5a059] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Verifying...' : 'Submit Arrival Quality Check'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
