import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord, CustomerReview } from '../../types.js';

export interface IDatabaseAdapter {
  providerName: 'postgres' | 'firebase';

  // User Operations
  getUser(uid: string): Promise<UserProfile | null>;
  upsertUser(user: UserProfile): Promise<UserProfile>;
  listUsers(role?: string): Promise<UserProfile[]>;

  // Worker Application Operations
  createWorkerApplication(app: WorkerApplication): Promise<WorkerApplication>;
  listWorkerApplications(status?: string): Promise<WorkerApplication[]>;
  updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<WorkerApplication | null>;

  // Order Operations
  createOrder(order: OrderRecord): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  listOrders(filters?: { customerId?: string; workerId?: string; status?: string }): Promise<OrderRecord[]>;
  updateOrderStatus(id: string, status: string, additionalDetails?: Partial<OrderRecord>): Promise<OrderRecord | null>;

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

  // Health check
  isHealthy(): Promise<boolean>;
}
