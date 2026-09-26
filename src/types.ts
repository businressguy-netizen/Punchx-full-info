export type AppScreen = 
  | 'splash' 
  | 'panel-select'
  | 'auth' 
  | 'auth-callback'
  | 'otp' 
  | 'customer-setup'
  | 'worker-setup'
  | 'worker-signup'
  | 'worker-otp-pass'
  | 'worker-pending-approval'
  | 'home' 
  | 'providers' 
  | 'provider-details' 
  | 'booking' 
  | 'payment' 
  | 'tracking' 
  | 'worker-dashboard' 
  | 'admin-dashboard'
  | 'privacy-policy'
  | 'terms-and-conditions'
  | 'founder';

export interface WorkerApplication {
  id: string;
  uid: string;
  legalName: string;
  address: string;
  area?: string;
  sector?: string;
  skill: string;
  categories?: string[];
  customSkill?: string;
  experienceYears: string;
  phone: string;
  email: string;
  visitingFee?: number;
  termsAccepted: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
}

/* Use 'admin' consistently (matches current code usage) */
export type UserRole = 'citizen' | 'worker' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  dob?: string;
  birthdate?: string;
  isProfileCompleted?: boolean;
  address?: string;
  landmark?: string;
  area?: string;
  sector?: string;
  phone?: string;
  visitingFee?: number;
  workerSkill?: string;
  workerCategories?: string[];
  workerExperience?: string;
  workerRating?: number;
  workerCompletedJobs?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Worker {
  id: string;
  name: string;
  category: string;
  categories?: string[];
  rating: number;
  reviewsCount: number;
  avatar: string;
  proBadge: 'PRO' | 'TOP' | 'VET' | 'AUTHORIZED';
  price: number;
  visitingFee?: number;
  available?: boolean;
  phone?: string;
  address?: string;
  area?: string;
  sector?: string;
  location?: { lat: number; lng: number };
  areaMatch?: boolean;
  distanceKm?: number;
  completedJobs?: number;
  earningsToday?: number;
  // 6-Tier Verification Data
  identityVerified?: boolean;
  skillVerified?: boolean;
  backgroundChecked?: boolean;
  trainingCertified?: boolean;
  insuranceCovered?: boolean;
  insuranceAmount?: string;
  jobsCompletedCount?: number;
  onTimeRate?: string;
  continuousRating?: number;
}

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  basePrice?: number;
  emergencyETA?: string;
  emergencySurcharge?: number;
};

export interface OrderRecord {
  id: string;
  category: string;
  workerName: string;
  workerAvatar?: string;
  workerRating?: number;
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  couponUsed?: string | null;
  visitingFee?: number;
  platformCommission?: number;
  gstAmount?: number;
  totalAmountToPay?: number;
  date: string;
  time?: string;
  status: 'Pending' | 'In Progress' | 'In-Progress' | 'Done' | 'Cancelled';
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number };
  customerId?: string;
  workerId?: string;
  area?: string;
  sector?: string;
  otpCode?: string;
  issueDescription?: string;
  photoProof?: string;
  isRated?: boolean;
  userRating?: number;
  userBehaviour?: string;
  paymentMethod?: string;
  createdAt?: string;
  completedAt?: string;
  // 30-Day Guarantee
  hasWarrantyGuarantee?: boolean;
  warrantyFee?: number;
  warrantyExpiryDate?: string;
  warrantyClaimId?: string;
  warrantyClaimStatus?: string;
  // Dispatch & Emergency
  dispatchMode?: 'PERSONAL_SELECT' | 'BROADCAST_15KM' | 'RANDOM_15KM';
  personalSelectFee?: number;
  isEmergency?: boolean;
  emergencyETA?: string;
  emergencySurcharge?: number;
  baseFee?: number;
  workerPhone?: string;
  isRebooking?: boolean;
  createdTimestamp?: number;
  // Arrival Quality & Complaints
  arrivalFeedbackSubmitted?: boolean;
  arrivalQuality?: {
    correctEquipment: boolean;
    equipmentWorking: boolean;
    behaviour: 'good' | 'poor' | 'unprofessional' | 'EXCELLENT' | 'NEEDS_IMPROVEMENT' | 'UNACCEPTABLE';
    comment?: string;
    submittedAt?: string;
  };
  qualityDiscountApplied?: number;
  prepaidRefundAmount?: number;
  prepaidRefundStatus?: 'NONE' | 'PENDING' | 'REFUNDED';
  // Warranty rebooking metadata
  isWarrantyRebooking?: boolean;
  originalWarrantyOrderId?: string;
  originalWarrantyClaimId?: string;
  workerPayoutFee?: number;
  warrantyRebookingFeeCovered?: number;
}

export interface WarrantyClaim {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  workerName?: string;
  workerId?: string;
  originalWorkerName?: string;
  category: string;
  recurringIssue?: string;
  problemDescription?: string;
  daysRecurring?: string | number;
  problemDurationDays?: string | number;
  photoProof?: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
  status: 'PENDING_ADMIN_REVIEW' | 'ACCEPTED_SELECT_SLOT' | 'REBOOKING_CONFIRMED' | 'REJECTED' | 'APPROVED';
  adminNotes?: string;
  rebookingDate?: string;
  rebookingTime?: string;
  rebookingOrderId?: string;
  workerPayoutFee?: number; // ₹59
  servicePersonVisitingCharge?: number; // ₹59
  customerCharge?: number; // ₹0
  createdAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ComplaintRecord {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  workerName: string;
  workerPhone?: string;
  workerCategory?: string;
  correctEquipment: boolean;
  equipmentWorking: boolean;
  behaviourRating: 'good' | 'poor' | 'unprofessional' | 'EXCELLENT' | 'NEEDS_IMPROVEMENT' | 'UNACCEPTABLE';
  comment?: string;
  status: 'CRITICAL_PENDING_ADMIN' | 'UNDER_REVIEW' | 'RESOLVED';
  discountAmount: number; // 10% of main service
  paymentMethod?: string;
  refundType: 'COD_DISCOUNT' | 'PREPAID_REFUND' | 'CASH_DISCOUNT' | 'PREPAID_GATEWAY_REFUND';
  refundStatus?: 'DISCOUNT_APPLIED' | 'REFUND_QUEUED' | 'REFUND_COMPLETED';
  adminActionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CustomerReview {
  id: string;
  orderId?: string;
  customer: string;
  workerName: string;
  workerId?: string;
  category: string;
  rating: number;
  comment: string;
  punctuality?: string;
  professionalism?: string;
  cleanliness?: string;
  tags?: string[];
  date: string;
  createdAt?: string;
}

export interface BookingDetails {
  date: string; // e.g., "MON 12"
  time: string; // e.g., "11:30 AM"
  address: string;
  description: string;
  uploadedPhoto: string | null;
  baseFee: number;
  visitingFee: number;
  totalCost: number;
  selectedWorker: Worker | null;
  paymentMethod: string;
  paymentStatus: 'pending' | 'success';
}

export interface AiMessage {
  sender: 'user' | 'drago' | 'worker';
  text: string;
  timestamp: string;
}
