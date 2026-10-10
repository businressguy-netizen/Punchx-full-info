export type AppScreen = 
  | 'splash'
  | 'landing'
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
  | 'services-categories' 
  | 'catalogue'
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
  dob?: string;
  address: string;
  area?: string;
  city?: string;
  sector?: string;
  landmark?: string;
  skill: string;
  categories?: string[];
  customSkill?: string;
  experienceYears: string;
  visitingFee?: number;
  minimumVisitingFee?: number;
  maximumVisitingFee?: number;
  phone: string;
  email: string;
  termsAccepted: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
}

export type UserRole = 'citizen' | 'worker' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  avatar?: string;
  role: UserRole;
  dob?: string;
  birthdate?: string;
  isProfileCompleted?: boolean;
  address?: string;
  landmark?: string;
  area?: string;
  sector?: string;
  phone?: string;
  city?: string;
  bio?: string;
  workerAvailability?: boolean;
  isOnline?: boolean;
  location?: { lat: number; lng: number };
  geofenceRadiusKm?: number;
  geofenceArea?: string;
  geofenceUpdatedAt?: string;
  workerStatus?: 'ONLINE' | 'OFFLINE';
  visitingFee?: number;
  minimumVisitingFee?: number;
  maximumVisitingFee?: number;
  workerSkill?: string;
  workerCategories?: string[];
  workerExperience?: string;
  workerRating?: number;
  workerCompletedJobs?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  applicationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Worker {
  id: string;
  uid?: string;
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
  isOnline?: boolean;
  phone?: string;
  address?: string;
  area?: string;
  sector?: string;
  location?: { lat: number; lng: number };
  areaMatch?: boolean;
  distanceKm?: number;
  completedJobs?: number;
  earningsToday?: number;
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

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'DISPATCHING'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_SERVICE'
  | 'COMPLETION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'Pending'
  | 'In Progress'
  | 'In-Progress'
  | 'Done'
  | 'Cancelled';

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
  commissionRate?: number;
  customerPlatformFee?: number;
  professionalPayout?: number;
  punchXGrossRevenue?: number;
  gstAmount?: number;
  totalAmountToPay?: number;
  personalSelectionFee?: number;
  personalSelectionRate?: number;
  priorCompletedBookingsWithWorker?: number;
  dispatchMode?: 'PERSONAL_SELECT' | 'AUTO_MATCH' | 'BROADCAST_15KM' | 'RANDOM_15KM';
  bookingTiming?: 'instant' | 'later';
  bookingType?: 'INSTANT' | 'SCHEDULED';
  isInstantOrder?: boolean;
  isPersonalSelection?: boolean;
  date: string;
  time?: string;
  status: OrderStatus;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number };
  customerId?: string;
  workerId?: string;
  workerPhone?: string;
  workerIsDemo?: boolean;
  area?: string;
  sector?: string;
  otpCode?: string;
  issueDescription?: string;
  photoProof?: string;
  isRated?: boolean;
  userRating?: number;
  userBehaviour?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: string;
  completedAt?: string;
  hasWarrantyGuarantee?: boolean;
  warrantyFee?: number;
  warrantyExpiryDate?: string;
  warrantyClaimId?: string;
  warrantyClaimStatus?: string;
  dispatchModeLegacy?: 'PERSONAL_SELECT' | 'BROADCAST_15KM' | 'RANDOM_15KM';
  emergencyETA?: string;
  emergencySurcharge?: number;
  baseFee?: number;
  isRebooking?: boolean;
  createdTimestamp?: number;
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
  isWarrantyRebooking?: boolean;
  originalWarrantyOrderId?: string;
  originalWarrantyClaimId?: string;
  workerPayoutFee?: number;
  warrantyRebookingFeeCovered?: number;
  additionalWorkRequests?: Array<{
    id: string;
    description: string;
    labour: number;
    materials: number;
    total: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
  }>;
  serviceProof?: {
    beforePhoto?: string;
    afterPhoto?: string;
    completionNotes?: string;
    completionOtpVerified?: boolean;
  };
  startOtpHash?: string;
  startOtpSalt?: string;
  startOtpExpiresAt?: string;
  startOtpAttempts?: number;
  completionOtpHash?: string;
  completionOtpSalt?: string;
  completionOtpExpiresAt?: string;
  completionOtpAttempts?: number;
  workerLocation?: {
    lat: number;
    lng: number;
    updatedAt?: string;
    heading?: number;
    accuracy?: number;
    speed?: number;
  };
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    signature?: string;
    method?: string;
    paidAt?: string;
    amount?: number;
    currency?: string;
    status?: string;
  };
  stateHistory?: Array<{
    from: string;
    to: string;
    timestamp: string;
    actorUid: string;
    actorRole: string;
    reason?: string;
  }>;
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
  workerPayoutFee?: number;
  servicePersonVisitingCharge?: number;
  customerCharge?: number;
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
  discountAmount: number;
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
  date: string;
  time: string;
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
