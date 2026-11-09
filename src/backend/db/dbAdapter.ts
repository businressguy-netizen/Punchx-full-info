import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord, CustomerReview } from '../../types.js';

export interface IDatabaseAdapter {
  providerName: 'postgres' | 'firebase';

  // User Operations
  getUser(uid: string): Promise<UserProfile | null>;
  upsertUser(user: UserProfile): Promise<UserProfile>;
  listUsers(role?: string): Promise<UserProfile[]>;

  // Worker Application Operations
  createWorkerApplication(app: WorkerApplication): Promise<WorkerApplication>;
  getWorkerApplication(id: string): Promise<WorkerApplication | null>;
  getWorkerApplicationByUid(uid: string): Promise<WorkerApplication | null>;
  getWorkerApplicationByContact(contact: { phone?: string; email?: string }): Promise<WorkerApplication | null>;
  listWorkerApplications(status?: string): Promise<WorkerApplication[]>;
  updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<WorkerApplication | null>;

  // Order Operations
  createOrder(order: OrderRecord): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  listOrders(filters?: { customerId?: string; workerId?: string; status?: string }): Promise<OrderRecord[]>;
  updateOrderStatus(id: string, status: string, additionalDetails?: Partial<OrderRecord>): Promise<OrderRecord | null>;
  acceptOrder(id: string, workerId: string, additionalDetails: Partial<OrderRecord>): Promise<OrderRecord | null>;

  // Warranty Claims Operations
  createWarrantyClaim(claim: WarrantyClaim): Promise<WarrantyClaim>;
  listWarrantyClaims(status?: string): Promise<WarrantyClaim[]>;
  updateWarrantyClaimStatus(id: string, status: string, notes?: string): Promise<WarrantyClaim | null>;

  // Complaint Operations
  createComplaint(complaint: ComplaintRecord): Promise<ComplaintRecord>;
  listComplaints(status?: string): Promise<ComplaintRecord[]>;
  updateComplaintStatus(id: string, status: string, notes?: string): Promise<ComplaintRecord | null>;

  // Reviews Operations
  createReview(review: CustomerReview): Promise<CustomerReview>;
  listReviews(workerId?: string): Promise<CustomerReview[]>;

  // Persistent idempotency for payment gateway webhooks.
  claimPaymentWebhookEvent(eventId: string, eventType: string): Promise<boolean>;
  completePaymentWebhookEvent(eventId: string): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
}
