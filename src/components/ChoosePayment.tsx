import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, Worker } from '../types';
import { ArrowLeft, Check, Lock, ShieldCheck, Ticket, Plus, X, ArrowRight, Wallet, CreditCard, Landmark, Coins } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/authContext';

interface ChoosePaymentProps {
  onTransition: (target: AppScreen) => void;
  selectedWorker: Worker | null;
  promoApplied: boolean;
  hasUsedBonus?: boolean;
  onOrderFinalized?: () => void;
  onApplyPromo: (code: string) => void;
  showNotification?: (msg: string) => void;
}

const PAYMENT_METHODS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    description: 'Fast and secure UPI with dynamic quantum tokens.',
    icon: Wallet,
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    description: 'Pay instantly using PhonePe secure wallet.',
    icon: Coins,
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Authentic handshake cash upon successful service.',
    icon: Landmark,
  },
  {
    id: 'card',
    name: 'HDFC Debit Card',
    description: 'Ending in **** 8821. Certified secure transaction.',
    icon: CreditCard,
  }
];

export default function ChoosePayment({
  onTransition,
  selectedWorker,
  promoApplied,
  hasUsedBonus,
  onOrderFinalized,
  onApplyPromo,
  showNotification
}: ChoosePaymentProps) {
  const { userProfile } = useAuth() as any;
  const [selectedMethod, setSelectedMethod] = useState('gpay');
  const [couponInput, setCouponInput] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paying, setPaying] = useState(false);

  // Optional Specialist Tipping States
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTipActive, setCustomTipActive] = useState<boolean>(false);
  const [customTipVal, setCustomTipVal] = useState<string>('');

  const handleCustomTipChange = (val: string) => {
    setCustomTipVal(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setTipAmount(parsed);
    } else {
      setTipAmount(0);
    }
  };

  // Dynamic cost structures matching worker visiting fee + company commission (₹20) + GST (18%)
  const [hasWarranty] = useState<boolean>(() => localStorage.getItem('punchx_opt_warranty') === 'true');
  const [dispatchMode] = useState<'PERSONAL_SELECT' | 'BROADCAST_15KM'>(() => (localStorage.getItem('punchx_dispatch_mode') as any) || 'BROADCAST_15KM');
  const [isEmergency] = useState<boolean>(() => localStorage.getItem('punchx_is_emergency') === 'true');

  const baseFee = selectedWorker ? (selectedWorker.visitingFee || selectedWorker.price || 199) : 199;
  const companyCommission = 20; // Company Commission Fee
  const personalSelectFee = dispatchMode === 'PERSONAL_SELECT' ? 9 : 0;
  const emergencySurcharge = isEmergency ? 49 : 0;
  const warrantyFee = hasWarranty ? 99 : 0;

  const taxableSubtotal = baseFee + companyCommission + personalSelectFee + emergencySurcharge;
  const gstAmount = Math.round(taxableSubtotal * 0.18); // 18% GST
  const grossServiceSubtotal = taxableSubtotal + gstAmount;
  // 20% discount calculation applies to core service
  const discount = promoApplied ? Math.round(grossServiceSubtotal * 0.20) : 0;
  const grandTotal = Math.max(0, grossServiceSubtotal - discount + warrantyFee + tipAmount);

  const handleApplyPromoCode = () => {
    if (!couponInput.trim()) return;
    const code = couponInput.trim().toUpperCase();
    const validCodes = ['ELITE20', 'PUNCHX20', 'FIRST20', 'WELCOME20', 'BONUS20', 'SAVE20', 'DISCOUNT20'];
    
    if (hasUsedBonus) {
      setCouponErr("⚠️ 20% First Order Bonus coupon has already been redeemed on an earlier order.");
      return;
    }

    if (validCodes.includes(code)) {
      onApplyPromo(code);
      setCouponInput('');
      setCouponErr('');
    } else {
      setCouponErr("Invalid code. Try using 'ELITE20' or 'PUNCHX20'.");
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    
    const currentCitizenName = localStorage.getItem('punchx_citizen_name') || userProfile?.name || 'Elite Customer';
    const currentCitizenAddress = localStorage.getItem('punchx_user_address') || userProfile?.address || '';
    const currentCitizenPhone = userProfile?.phone || '';
    let customerCoords: { lat: number; lng: number } | null = null;
    try {
      const locRaw = localStorage.getItem('punchx_user_location');
      if (locRaw) {
        const parsedLoc = JSON.parse(locRaw);
        if (parsedLoc.lat && parsedLoc.lng) {
          customerCoords = { lat: parsedLoc.lat, lng: parsedLoc.lng };
        }
      }
    } catch (e) {
      console.warn("Could not read location coordinates for order", e);
    }

    // Expiry date for 30-day guarantee (30 days from creation)
    const expiryDateObj = new Date();
    expiryDateObj.setDate(expiryDateObj.getDate() + 30);
    const warrantyExpiryDate = expiryDateObj.toISOString();

    const newOrderId = `PX-${Math.floor(1000 + Math.random() * 9000)}`;
   const firebaseUid = auth.currentUser?.uid;

if (!firebaseUid) {
  throw new Error('You must be signed in to create an order');
}

const newOrder = {
  id: newOrderId,
  customerId: firebaseUid,
  category: selectedWorker ? selectedWorker.category : 'AC Repair',
      workerName: selectedWorker ? selectedWorker.name : (dispatchMode === 'BROADCAST_15KM' ? 'Pending Broadcast (15km)' : 'Rajesh Kumar'),
      workerAvatar: selectedWorker ? selectedWorker.avatar : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqGSkUfdfY3HcncTIY6PcfYdkpVlEw562C-in1-G55qC0H9bSKFW8cqmF3xtLQBiLByv5gRtdxWkYekhxeENWyFwDm8ul37KWcjYkERdCJIh3koj0rjMu5e_gD3YlqWbGhl-QHhYi6ut8VbLAlzAtiB0EsJQi8z-zzFZcQ7woGa9eEX8eNwTef7-3MnRen3OP5KenmJgDdlswqLaCtAAmMZ5DF5bLC6SCpZg_YiJm3UtNjd--OeKUw_xIodwne7y1Lg0eex3BtxJQ',
      workerRating: selectedWorker ? (selectedWorker.rating || 4.9) : 4.9,
      price: grandTotal,
      originalPrice: grossServiceSubtotal + warrantyFee + tipAmount,
      baseFee: baseFee,
      discountApplied: discount,
      couponUsed: promoApplied ? '20% BONUS COUPON' : null,
      paymentMethod: selectedMethod === 'gpay' ? 'Google Pay UPI' : selectedMethod === 'phonepe' ? 'PhonePe UPI' : selectedMethod === 'card' ? 'HDFC Debit Card' : 'Cash on Delivery',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'In Progress',
      customerName: currentCitizenName,
      customerAddress: currentCitizenAddress,
      customerPhone: currentCitizenPhone,
      customerLocation: customerCoords || undefined,
      // 30-Day Guarantee Details
      hasWarrantyGuarantee: hasWarranty,
      warrantyFee: warrantyFee,
      warrantyExpiryDate: hasWarranty ? warrantyExpiryDate : null,
      // Dispatch & Emergency Details
      dispatchMode: dispatchMode,
      personalSelectFee: personalSelectFee,
      isEmergency: isEmergency,
      emergencySurcharge: emergencySurcharge,
      emergencyETA: isEmergency ? '15-30 Mins' : undefined,
      prepaidRefundStatus: selectedMethod === 'cod' ? 'NONE' : 'NONE',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Write to Firestore DB
      await setDoc(doc(db, 'orders', newOrderId), newOrder);
      console.log("Successfully saved order to Firestore:", newOrderId);
    } catch (e) {
      console.error("Firestore write failed:", e);
      handleFirestoreError(e, OperationType.WRITE, `orders/${newOrderId}`);
    }

    // 2. Save order to history & register as actively tracked booking locally as fallback
    try {
      const existingRaw = localStorage.getItem('punchx_order_history') || '[]';
      const existing = JSON.parse(existingRaw);
      existing.unshift(newOrder);
      localStorage.setItem('punchx_order_history', JSON.stringify(existing));
      localStorage.setItem('punchx_active_order', JSON.stringify(newOrder));
    } catch (e) {
      console.error("Error writing active order to localStorage:", e);
    }

    if (onOrderFinalized) {
      onOrderFinalized();
    }

    setPaying(false);
    setShowSuccessModal(true);
  };

  return (
    <div id="payment-screen-container" className="w-full min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-24 overflow-x-hidden">
      {/* Top App Bar with Luxurious Styling */}
      <header id="payment-topbar" className="sticky top-0 z-40 w-full bg-[#07122a]/95 backdrop-blur-md border-b border-[#c5a059]/20 px-4 py-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            id="payment-back-btn"
            onClick={() => onTransition('booking')}
            className="text-[#c5a059] active:scale-95 duration-200 cursor-pointer p-1.5 hover:bg-zinc-800 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-[#c5a059]" />
          </button>
          <h1 className="font-sans font-bold text-base text-[#c5a059] tracking-tight">PunchX Payment Gateway</h1>
        </div>

        <div className="flex items-center gap-3">
          <img
            id="payment-profile-avatar"
            alt="Profile logo"
            className="w-8 h-8 rounded-full border border-[#c5a059]/50"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEh7bvQ5Bq5pVQMVTerZd83lwbNGSpPXx2KUl0M9fXWjwobZ23uR1JgabOXrZAWcTuNuRIedSvQAdtFmREdlFiNAoivtFZgtIC0Z0agBpKXnZqxDxVkH4rsZvlPPEcn1GBfHLVvS2byjdme1qxThcwQ-cF14DR1rtcOW4Av0svbpTHbKUebZkLxi3EwQxiRFcelpqPQjFJSzY8ZpfRkEXfgkbCNh_F3MR42Bagjb5fTuuJv6y25VlOa6iAgw2OxUjcWu1ZvS4ifBY"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6">
        <div id="payment-layout-cols" className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Service Fee Selection List Card Column */}
          <div className="lg:col-span-8 space-y-6">
            <section id="payment-greeting-block">
              <h2 className="font-sans font-bold text-xl md:text-2xl text-white mb-2">Choose Payment Method</h2>
              <p className="text-zinc-400 text-xs md:text-sm">
                Select your preferred way to complete the transaction for high-standard elite services.
              </p>
            </section>

            {/* Structured Payment Methods options */}
            <div id="payment-options-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethod === method.id;
                const IconComp = method.icon;
                return (
                  <label
                    id={`pay-label-${method.id}`}
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className="group cursor-pointer relative"
                  >
                    <div
                      className={`p-5 rounded-xl bg-[#111415] border-2 transition-all flex items-center gap-4 group-hover:bg-zinc-900 ${isSelected ? 'border-[#c5a059]' : 'border-zinc-800'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#151f37] flex items-center justify-center text-[#e9c176]">
                        <IconComp className="w-4 h-4 text-[#e9c176]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white font-sans">{method.name}</span>
                        <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">{method.description}</span>
                      </div>
                      <div className="ml-auto flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#c5a059]' : 'border-zinc-700'}`}
                        >
                          {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#c5a059]"></span>}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Add New payment method action */}
            <button
              id="add-payment-method-btn"
              onClick={() => {
                if (showNotification) {
                  showNotification("Secure payment. Credit/Debit card options can be added securely with DRAGO AI Assistant.");
                }
              }}
              className="w-full py-5 px-6 border-2 border-dashed border-zinc-800 hover:border-[#c5a059] rounded-xl text-[#e9c176] font-mono text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer text-center mb-6"
            >
              + ADD NEW PAYMENT METHOD
            </button>

            {/* Optional Elite Specialist Tipping Panel */}
            <div id="tipping-panel-card" className="bg-[#111415] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c5a059]/10 flex items-center justify-center text-[#e9c176]">
                  <Coins className="w-5 h-5 text-[#e9c176]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Support {selectedWorker ? selectedWorker.name : 'your technician'} with a tip?
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    100% of your optional tip goes directly to the technician.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30].map((preset) => {
                  const isSelected = tipAmount === preset && !customTipActive;
                  return (
                    <button
                      key={preset}
                      id={`tip-preset-${preset}`}
                      type="button"
                      onClick={() => {
                        setCustomTipActive(false);
                        setCustomTipVal('');
                        if (tipAmount === preset) {
                          setTipAmount(0);
                        } else {
                          setTipAmount(preset);
                        }
                      }}
                      className={`py-3 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-[#c5a059] border-[#c09a56] text-black shadow-md'
                          : 'bg-[#151f37]/40 border-zinc-850 text-zinc-300 hover:border-[#c5a059]/50 hover:bg-[#151f37]/80'
                      }`}
                    >
                      <span className="text-sm">₹{preset}</span>
                      <span className="text-[8px] font-sans opacity-85 font-semibold">Tip</span>
                    </button>
                  );
                })}

                <button
                  id="tip-preset-other"
                  type="button"
                  onClick={() => {
                    const nextActive = !customTipActive;
                    setCustomTipActive(nextActive);
                    setTipAmount(0);
                    setCustomTipVal('');
                  }}
                  className={`py-3 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                    customTipActive
                      ? 'bg-[#c5a059] border-[#c09a56] text-black shadow-md'
                      : 'bg-[#151f37]/40 border-zinc-850 text-zinc-300 hover:border-[#c5a059]/50 hover:bg-[#151f37]/80'
                  }`}
                >
                  <span className="text-sm">Other</span>
                  <span className="text-[8px] font-sans opacity-85 font-semibold">Custom</span>
                </button>
              </div>

              <AnimatePresence>
                {customTipActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <div className="relative flex items-center bg-[#07122a] border border-zinc-800 rounded-xl px-3 py-2.5 text-[#e1e3e4]">
                        <span className="font-mono text-sm text-[#c5a059] mr-2">₹</span>
                        <input
                          id="custom-tip-input-field"
                          type="number"
                          min="0"
                          placeholder="Enter custom tip amount"
                          value={customTipVal}
                          onChange={(e) => handleCustomTipChange(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-xs font-mono font-bold w-full placeholder:text-zinc-600 outline-none p-0 text-white"
                        />
                        {customTipVal && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTipVal('');
                              setTipAmount(0);
                            }}
                            className="text-zinc-500 hover:text-white p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Summary Column */}
          <aside className="lg:col-span-4" id="aside-payment-summary">
            <div className="bg-[#111415] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="font-sans font-bold text-lg text-[#c5a059] tracking-tight text-left">Order Summary</h3>

              {/* Fee Breakdown list */}
              <div className="space-y-3.5 pb-4 border-b border-zinc-800 text-xs text-left">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Worker Estimated Visiting Fee</span>
                  <span className="font-mono text-zinc-200 font-bold">₹{baseFee}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Company Commission Fee</span>
                  <span className="font-mono text-[#e9c176] font-bold">₹{companyCommission}</span>
                </div>
                {dispatchMode === 'PERSONAL_SELECT' && (
                  <div className="flex justify-between items-center text-[#e9c176]">
                    <span>Personal Specialist Choice</span>
                    <span className="font-mono font-bold">+₹{personalSelectFee}</span>
                  </div>
                )}
                {isEmergency && (
                  <div className="flex justify-between items-center text-red-400">
                    <span>Emergency Instant Dispatch (15-30m)</span>
                    <span className="font-mono font-bold">+₹{emergencySurcharge}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Government GST Tax (18%)</span>
                  <span className="font-mono text-zinc-200 font-bold">₹{gstAmount}</span>
                </div>
                {hasWarranty && (
                  <div className="flex justify-between items-center text-[#e9c176] bg-[#c5a059]/10 p-1.5 rounded-lg border border-[#c5a059]/20">
                    <span className="flex items-center gap-1 font-bold">🛡️ 30-Day Guarantee</span>
                    <span className="font-mono font-bold">+₹99</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div id="summary-tip-item" className="flex justify-between items-center text-[#e9c176] font-medium font-sans">
                    <span>Specialist Tip (Optional)</span>
                    <span className="font-mono font-bold">₹{tipAmount}</span>
                  </div>
                )}
                {promoApplied && (
                  <div className="flex justify-between items-center text-emerald-400 py-1.5 border-t border-dashed border-zinc-800 font-mono">
                    <span>20% Promo Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
              </div>

              {/* Grand Total section */}
              <div className="flex justify-between items-center text-sm">
                <span className="font-sans font-extrabold text-white">Grand Total to Pay</span>
                <span className="font-bold font-mono text-[#c5a059] text-xl">₹{grandTotal}</span>
              </div>

              {/* Core Payments Trigger button */}
              <div className="space-y-4">
                <button
                  id="pay-proceed-now-btn"
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full bg-[#c5a059] hover:brightness-110 text-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-[#c5a059]/10 border border-[#ffdea5]/50"
                >
                  {paying ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Paying now...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      PROCEED TO PAY ₹{grandTotal}
                      <ArrowRight className="w-4 h-4 text-black" />
                    </span>
                  )}
                </button>

                <p className="text-center text-[10px] text-zinc-500 font-mono tracking-wider flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  SECURE PORT ACQUISITION GATEWAY
                </p>
              </div>

              {/* Promo Code section with coupon validation */}
              <div id="promo-code-box" className="p-1 bg-[#0c0f10] border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Ticket className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
                  <input
                    id="promo-code-text-field"
                    type="text"
                    placeholder="PROMO CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-xs font-mono font-bold uppercase w-full placeholder:text-zinc-600 outline-none p-0 text-white"
                  />
                  <button
                    id="promo-apply-submit-btn"
                    onClick={handleApplyPromoCode}
                    className="text-[#c5a059] font-bold text-xs hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    APPLY
                  </button>
                </div>
                {couponErr && (
                  <p className="text-[10px] text-red-400 p-2 font-mono leading-none">{couponErr}</p>
                )}
                {promoApplied && (
                  <p className="text-[10px] text-emerald-400 p-2 font-mono leading-none">✓ Coupon 'ELITE20' matched!</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Structured success overlay popup modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            id="success-matrix-overlay"
            className="fixed inset-0 z-[100] bg-[#07122a]/95 flex flex-col items-center justify-center px-6 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              id="success-card-content"
              className="max-w-sm text-center flex flex-col items-center"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-20 h-20 bg-[#c5a059]/10 rounded-full flex items-center justify-center mb-6 border border-[#c5a059]/40 animate-bounce">
                <ShieldCheck className="w-10 h-10 text-[#e9c176]" />
              </div>

              <h2 className="font-sans font-bold text-2xl text-white mb-2">Payment Successful</h2>
              <p className="text-[#e1e3e4] text-xs max-w-xs leading-relaxed mb-10">
                Your luxury service request has been verified. Elite engineer {selectedWorker ? selectedWorker.name : 'Rajesh Kumar'} is assigned and transit coordinates are logged.
              </p>

              <button
                id="payment-proceed-to-tracking-btn"
                onClick={() => onTransition('tracking')}
                className="w-full max-w-[280px] py-4 bg-[#c5a059] hover:bg-[#e9c176] text-[#07122a] font-extrabold rounded-xl transition-all shadow-xl shadow-[#c5a059]/10 uppercase tracking-widest text-xs cursor-pointer border border-[#ffdea5]/40"
              >
                GO TO DASHBOARD
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
