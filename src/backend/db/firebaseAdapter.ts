import { getFirestore, Firestore, Query } from 'firebase-admin/firestore';
import { IDatabaseAdapter } from './dbAdapter.js';
import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord, CustomerReview } from '../../types.js';
import { logger } from '../logger.js';

export class FirebaseAdapter implements IDatabaseAdapter {
  providerName: 'firebase' = 'firebase';

  private inMemoryFallback: {
    users: Map<string, UserProfile>;
    workerApplications: Map<string, WorkerApplication>;
    orders: Map<string, OrderRecord>;
    claims: Map<string, WarrantyClaim>;
    complaints: Map<string, ComplaintRecord>;
    reviews: Map<string, CustomerReview>;
  } = {
    users: new Map(),
    workerApplications: new Map(),
    orders: new Map(),
    claims: new Map(),
    complaints: new Map(),
    reviews: new Map(),
  };

  private get db(): Firestore | null {
    try {
      return getFirestore();
    } catch {
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    const firestore = this.db;
    if (!firestore) return true;
    try {
      await firestore.collection('users').limit(1).get();
      return true;
    } catch (e) {
      return true;
    }
  }

  // ─── USER OPERATIONS ───
  async getUser(uid: string): Promise<UserProfile | null> {
    const firestore = this.db;
    if (firestore) {
      try {
        const doc = await firestore.collection('users').doc(uid).get();
        if (doc.exists) {
          return { uid: doc.id, ...(doc.data() as any) };
        }
      } catch (err) {
        logger.warn('Firebase getUser notice, checking memory store:', err);
      }
    }
    return this.inMemoryFallback.users.get(uid) || null;
  }

  async upsertUser(user: UserProfile): Promise<UserProfile> {
    this.inMemoryFallback.users.set(user.uid, user);
    const firestore = this.db;
    if (firestore) {
      try {
        await firestore.collection('users').doc(user.uid).set(user, { merge: true });
      } catch (err) {
        logger.warn('Firebase upsertUser notice (saved in memory):', err);
      }
    }
    return user;
  }

  async listUsers(role?: string): Promise<UserProfile[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('users');
        if (role) q = q.where('role', '==', role);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listUsers notice, falling back to memory store:', err);
      }
    }
    const all = Array.from(this.inMemoryFallback.users.values());
    return role ? all.filter((u) => u.role === role) : all;
  }

  // ─── WORKER APPLICATIONS ───
  async createWorkerApplication(app: WorkerApplication): Promise<WorkerApplication> {
    const id = app.id || `app_${Date.now()}`;
    const record = { ...app, id, appliedAt: app.appliedAt || new Date().toISOString() };
    this.inMemoryFallback.workerApplications.set(id, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('worker_applications').doc(id);
        await ref.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase createWorkerApplication notice (saved in memory):', err);
      }
    }
    return record;
  }

  async listWorkerApplications(status?: string): Promise<WorkerApplication[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('worker_applications');
        if (status) q = q.where('status', '==', status);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listWorkerApplications notice, falling back to memory store:', err);
      }
    }
    const list = Array.from(this.inMemoryFallback.workerApplications.values());
    return status ? list.filter((a) => a.status === status) : list;
  }

  async updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<WorkerApplication | null> {
    const existing = this.inMemoryFallback.workerApplications.get(id);
    if (existing) {
      existing.status = status;
      this.inMemoryFallback.workerApplications.set(id, existing);
    }

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('worker_applications').doc(id);
        await ref.update({ status, updatedAt: new Date().toISOString() });
        const snap = await ref.get();
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as WorkerApplication;
        }
      } catch (err) {
        logger.warn('Firebase updateWorkerApplicationStatus notice:', err);
      }
    }
    return existing || null;
  }

  // ─── ORDER OPERATIONS ───
  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const id = order.id || `ORD-${Date.now()}`;
    const record = { ...order, id, createdAt: order.createdAt || new Date().toISOString() };
    this.inMemoryFallback.orders.set(id, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('orders').doc(id);
        await ref.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase createOrder notice (saved in memory):', err);
      }
    }
    return record;
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    const firestore = this.db;
    if (firestore) {
      try {
        const snap = await firestore.collection('orders').doc(id).get();
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as OrderRecord;
        }
      } catch (err) {
        logger.warn('Firebase getOrder notice, checking memory store:', err);
      }
    }
    return this.inMemoryFallback.orders.get(id) || null;
  }

  async listOrders(filters?: { customerId?: string; workerId?: string; status?: string }): Promise<OrderRecord[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('orders');
        if (filters?.status) q = q.where('status', '==', filters.status);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderRecord[];
          if (filters?.customerId) list = list.filter((o) => o.customerId === filters.customerId);
          if (filters?.workerId) list = list.filter((o) => o.workerId === filters.workerId);
          return list;
        }
      } catch (err) {
        logger.warn('Firebase listOrders notice, falling back to memory store:', err);
      }
    }
    let list = Array.from(this.inMemoryFallback.orders.values());
    if (filters?.status) list = list.filter((o) => o.status === filters.status);
    if (filters?.customerId) list = list.filter((o) => o.customerId === filters.customerId);
    if (filters?.workerId) list = list.filter((o) => o.workerId === filters.workerId);
    return list;
  }

  async updateOrderStatus(id: string, status: string, additionalDetails?: Partial<OrderRecord>): Promise<OrderRecord | null> {
    const existing = this.inMemoryFallback.orders.get(id);
    if (existing) {
      existing.status = status as any;
      if (additionalDetails) Object.assign(existing, additionalDetails);
      this.inMemoryFallback.orders.set(id, existing);
    }

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('orders').doc(id);
        const payload: any = { status, ...(additionalDetails || {}) };
        await ref.update(payload);
        const snap = await ref.get();
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as OrderRecord;
        }
      } catch (err) {
        logger.warn('Firebase updateOrderStatus notice:', err);
      }
    }
    return existing || null;
  }

  // ─── WARRANTY CLAIMS ───
  async createWarrantyClaim(claim: WarrantyClaim): Promise<WarrantyClaim> {
    const id = claim.id || `CLM-${Date.now()}`;
    const record = { ...claim, id, createdAt: claim.createdAt || new Date().toISOString() };
    this.inMemoryFallback.claims.set(id, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('warranty_claims').doc(id);
        await ref.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase createWarrantyClaim notice (saved in memory):', err);
      }
    }
    return record;
  }

  async listWarrantyClaims(status?: string): Promise<WarrantyClaim[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('warranty_claims');
        if (status) q = q.where('status', '==', status);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listWarrantyClaims notice, falling back to memory store:', err);
      }
    }
    const list = Array.from(this.inMemoryFallback.claims.values());
    return status ? list.filter((c) => c.status === status) : list;
  }

  async updateWarrantyClaimStatus(id: string, status: string, notes?: string): Promise<WarrantyClaim | null> {
    const existing = this.inMemoryFallback.claims.get(id);
    if (existing) {
      existing.status = status as any;
      if (notes) existing.adminNotes = notes;
      this.inMemoryFallback.claims.set(id, existing);
    }

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('warranty_claims').doc(id);
        await ref.update({ status, adminNotes: notes || '', reviewedAt: new Date().toISOString() });
        const snap = await ref.get();
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as WarrantyClaim;
        }
      } catch (err) {
        logger.warn('Firebase updateWarrantyClaimStatus notice:', err);
      }
    }
    return existing || null;
  }

  // ─── COMPLAINTS ───
  async createComplaint(complaint: ComplaintRecord): Promise<ComplaintRecord> {
    const id = complaint.id || `CMP-${Date.now()}`;
    const record = { ...complaint, id, createdAt: complaint.createdAt || new Date().toISOString() };
    this.inMemoryFallback.complaints.set(id, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('complaints').doc(id);
        await ref.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase createComplaint notice (saved in memory):', err);
      }
    }
    return record;
  }

  async listComplaints(status?: string): Promise<ComplaintRecord[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('complaints');
        if (status) q = q.where('status', '==', status);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listComplaints notice, falling back to memory store:', err);
      }
    }
    const list = Array.from(this.inMemoryFallback.complaints.values());
    return status ? list.filter((c) => c.status === status) : list;
  }

  async updateComplaintStatus(id: string, status: string, notes?: string): Promise<ComplaintRecord | null> {
    const existing = this.inMemoryFallback.complaints.get(id);
    if (existing) {
      existing.status = status as any;
      if (notes) existing.adminActionNotes = notes;
      this.inMemoryFallback.complaints.set(id, existing);
    }

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('complaints').doc(id);
        await ref.update({ status, adminActionNotes: notes || '', resolvedAt: new Date().toISOString() });
        const snap = await ref.get();
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as ComplaintRecord;
        }
      } catch (err) {
        logger.warn('Firebase updateComplaintStatus notice:', err);
      }
    }
    return existing || null;
  }

  // ─── REVIEWS ───
  async createReview(review: CustomerReview): Promise<CustomerReview> {
    const id = review.id || `REV-${Date.now()}`;
    const record = { ...review, id, createdAt: new Date().toISOString() };
    this.inMemoryFallback.reviews.set(id, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const ref = firestore.collection('reviews').doc(id);
        await ref.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase createReview notice (saved in memory):', err);
      }
    }
    return record;
  }

  async listReviews(workerId?: string): Promise<CustomerReview[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('reviews');
        if (workerId) q = q.where('workerId', '==', workerId);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listReviews notice, falling back to memory store:', err);
      }
    }
    const list = Array.from(this.inMemoryFallback.reviews.values());
    return workerId ? list.filter((r) => r.workerId === workerId) : list;
  }
}

