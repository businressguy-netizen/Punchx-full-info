// ─── Authoritative Server-Side Pricing Engine ───
// Enforces Section 6: Pricing & Quotes [P0] from Backend Task Sheet.
// Client totals are NEVER trusted; all prices, GST, discounts, and payouts are calculated server-side.

export interface PricingQuoteRequest {
  serviceId?: string;
  category?: string;
  isEmergency?: boolean;
  couponCode?: string;
  customVisitingFee?: number;
  workerVisitingFee?: number;
  waivePlatformFee?: boolean;
}

export interface PricingQuoteResult {
  baseVisitingFee: number;
  emergencySurcharge: number;
  subtotalBeforeDiscount: number;
  discountApplied: number;
  couponUsed: string | null;
  couponValid: boolean;
  couponMessage?: string;
  subtotalAfterDiscount: number;
  customerPlatformFee: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmountToPay: number;
  professionalPayout: number;
  platformCommission: number;
  commissionRate: number;
}

const BASE_SERVICE_PRICES: Record<string, number> = {
  ac: 199,
  electrical: 179,
  plumbing: 159,
  cleaning: 249,
  painting: 299,
  carpentry: 189,
  pest: 219,
  appliance: 199,
  moving: 499,
};

const CATEGORY_TO_ID: Record<string, string> = {
  'ac repair': 'ac',
  'electrical systems': 'electrical',
  'plumbing & drainage': 'plumbing',
  'plumbing': 'plumbing',
  'deep cleaning': 'cleaning',
  'deep cleaning & sanitization': 'cleaning',
  'painting': 'painting',
  'painting & walls': 'painting',
  'carpentry & locks': 'carpentry',
  'carpentry': 'carpentry',
  'pest control': 'pest',
  'pest': 'pest',
  'appliance maintenance': 'appliance',
  'appliance': 'appliance',
  'moving & logistics': 'moving',
  'moving': 'moving',
};

const PLATFORM_FEE = 10;
const GST_RATE = 0.18; // 18% GST
const DEFAULT_COMMISSION_RATE = 0.15; // 15% platform commission
const EMERGENCY_SURCHARGE_AMOUNT = 99;

export function calculateAuthoritativeQuote(request: PricingQuoteRequest): PricingQuoteResult {
  // 1. Determine base visiting fee
  let serviceKey = (request.serviceId || '').toLowerCase().trim();
  if (!serviceKey && request.category) {
    serviceKey = CATEGORY_TO_ID[request.category.toLowerCase().trim()] || '';
  }

  let baseVisitingFee = BASE_SERVICE_PRICES[serviceKey];
  if (!baseVisitingFee) {
    if (request.workerVisitingFee && request.workerVisitingFee >= 99 && request.workerVisitingFee <= 999) {
      baseVisitingFee = Math.round(request.workerVisitingFee);
    } else {
      baseVisitingFee = 199; // Standard baseline visiting charge
    }
  }

  const emergencySurcharge = request.isEmergency ? EMERGENCY_SURCHARGE_AMOUNT : 0;
  const subtotalBeforeDiscount = baseVisitingFee + emergencySurcharge;

  // 2. Validate Coupon Server-Side
  let discountApplied = 0;
  let couponUsed: string | null = null;
  let couponValid = false;
  let couponMessage: string | undefined = undefined;

  const rawCoupon = (request.couponCode || '').trim().toUpperCase();
  if (rawCoupon) {
    switch (rawCoupon) {
      case 'FIRST50':
        discountApplied = Math.min(Math.round(subtotalBeforeDiscount * 0.5), 100);
        couponValid = true;
        couponUsed = 'FIRST50';
        couponMessage = '50% Welcome Discount applied (Max ₹100)';
        break;

      case 'PUNCHX100':
        if (subtotalBeforeDiscount >= 150) {
          discountApplied = 100;
          couponValid = true;
          couponUsed = 'PUNCHX100';
          couponMessage = 'Flat ₹100 Discount applied';
        } else {
          couponMessage = 'Coupon requires minimum order of ₹150';
        }
        break;

      case 'SAVE20':
        discountApplied = Math.min(Math.round(subtotalBeforeDiscount * 0.2), 150);
        couponValid = true;
        couponUsed = 'SAVE20';
        couponMessage = '20% Special Savings applied (Max ₹150)';
        break;

      case 'FREESHIP':
        discountApplied = PLATFORM_FEE;
        couponValid = true;
        couponUsed = 'FREESHIP';
        couponMessage = 'Platform convenience fee waived';
        break;

      case 'WELCOME10':
        discountApplied = Math.min(Math.round(subtotalBeforeDiscount * 0.1), 50);
        couponValid = true;
        couponUsed = 'WELCOME10';
        couponMessage = '10% Welcome Discount applied';
        break;

      default:
        couponMessage = 'Invalid or expired promo code';
        break;
    }
  }

  // Ensure discount does not exceed subtotal
  discountApplied = Math.min(discountApplied, subtotalBeforeDiscount);
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountApplied;

  // 3. Platform Fee
  const customerPlatformFee = request.waivePlatformFee === true || rawCoupon === 'FREESHIP' ? 0 : PLATFORM_FEE;

  // 4. GST Calculation (18% on discounted services + convenience fee)
  const taxableAmount = subtotalAfterDiscount + customerPlatformFee;
  const gstAmount = Math.round(taxableAmount * GST_RATE * 100) / 100;

  // 5. Total Customer Charge
  const totalAmountToPay = Math.round(taxableAmount + gstAmount);

  // 6. Professional Payout & Platform Commission
  // Worker earns (1 - commissionRate) of base fee + 100% of emergency surcharge
  const commissionRate = DEFAULT_COMMISSION_RATE;
  const platformCommission = Math.round(baseVisitingFee * commissionRate);
  const professionalPayout = Math.max(0, (baseVisitingFee - platformCommission) + emergencySurcharge);

  return {
    baseVisitingFee,
    emergencySurcharge,
    subtotalBeforeDiscount,
    discountApplied,
    couponUsed: couponValid ? couponUsed : null,
    couponValid,
    couponMessage,
    subtotalAfterDiscount,
    customerPlatformFee,
    taxableAmount,
    gstAmount,
    totalAmountToPay,
    professionalPayout,
    platformCommission,
    commissionRate,
  };
}
