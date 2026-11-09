import { getFirestore, Firestore, Query, FieldValue } from 'firebase-admin/firestore';

// Keep server-side Admin SDK writes in the exact Firestore database used by the web client.
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-punchxservicecus-c71be4cc-9ee1-4ae7-b718-125aa03bcd38';
import { IDatabaseAdapter } from './dbAdapter.js';
import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord, CustomerReview } from '../../types.js';
import { logger } from '../logger.js';

export class FirebaseAdapter implements IDatabaseAdapter {
  providerName: 'firebase' = 'firebase';
  private localWebhookEvents = new Set<string>();

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
      return getFirestore(undefined, FIRESTORE_DATABASE_ID);
    } catch {
      return null;
    }
  }

  async claimPaymentWebhookEvent(eventId: string, eventType: string): Promise<'CLAIMED' | 'PROCESSED' | 'BUSY'> {
    const firestore = this.db;
    if (!firestore) {
      if (this.localWebhookEvents.has(eventId)) return 'PROCESSED';
      this.localWebhookEvents.add(eventId);
      return 'CLAIMED';
    }

    const docId = Buffer.from(eventId).toString('base64url');
    const eventRef = firestore.collection('payment_webhook_events').doc(docId);
    const now = Date.now();
    try {
      return await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(eventRef);
        const existing = snapshot.exists ? snapshot.data() || {} : {};
        if (existing.status === 'PROCESSED') return 'PROCESSED';
        if (Number(existing.lockedUntilMs || 0) > now) return 'BUSY';
        transaction.set(eventRef, {
          eventId,
          eventType,
          status: 'PROCESSING',
          lockedUntilMs: now + 5 * 60 * 1000,
          createdAt: existing.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        return 'CLAIMED';
      });
    } catch (error) {
      logger.error('Firebase webhook idempotency claim failed:', error);
      throw new Error('Payment webhook idempotency could not be verified');
    }
  }

  async completePaymentWebhookEvent(eventId: string): Promise<void> {
    const firestore = this.db;
    if (!firestore) {
      this.localWebhookEvents.add(eventId);
      return;
    }
    const docId = Buffer.from(eventId).toString('base64url');
    try {
      await firestore.collection('payment_webhook_events').doc(docId).set({
        eventId,
        status: 'PROCESSED',
        lockedUntilMs: null,
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      logger.error('Firebase webhook completion update failed:', error);
      throw new Error('Payment webhook completion could not be recorded');
    }
  }

  async isHealthy(): Promise<boolean> {
    const firestore = this.db;
    if (!firestore) return false;
    try {
      await firestore.collection('users').limit(1).get();
      return true;
    } catch (e) {
      logger.error('Firebase health check failed:', e);
      return false;
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
    const now = new Date().toISOString();
    const existing = this.inMemoryFallback.users.get(user.uid);
    const record = {
      ...user,
      uid: user.uid,
      createdAt: existing?.createdAt || user.createdAt || now,
      updatedAt: now,
    };
    this.inMemoryFallback.users.set(user.uid, record);

    const firestore = this.db;
    if (firestore) {
      try {
        const userRef = firestore.collection('users').doc(user.uid);
        await userRef.set(record, { merge: true });
      } catch (err) {
        logger.warn('Firebase upsertUser notice (saved in memory):', err);
      }
    }
    return record;
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
    const existing = await this.getWorkerApplication(id);
    const now = new Date().toISOString();
    const record = {
      ...app,
      id,
      status: app.status || 'PENDING',
      appliedAt: app.appliedAt || now,
      createdAt: (existing as any)?.createdAt || now,
      updatedAt: now,
    };
    const firestore = this.db;
    if (!firestore) {
      this.inMemoryFallback.workerApplications.set(id, record);
      return record;
    }

    try {
      // The canonical collection is required. The legacy collection is a best-effort mirror.
      await firestore.collection('workerApplications').doc(id).set(record, { merge: true });
      if (app.uid) {
        try {
          await firestore.collection('workerApplications').doc(app.uid).set(record, { merge: true });
        } catch {}
      }
      try {
        await firestore.collection('worker_applications').doc(id).set(record, { merge: true });
        if (app.uid) {
          await firestore.collection('worker_applications').doc(app.uid).set(record, { merge: true });
        }
      } catch (mirrorError) {
        logger.warn('Legacy worker application mirror was not updated:', mirrorError);
      }
      this.inMemoryFallback.workerApplications.set(id, record);
      return record;
    } catch (err) {
      logger.error('Firebase createWorkerApplication failed; application was NOT persisted:', err);
      throw new Error('Failed to save worker application to Firebase. Please retry.');
    }
  }

  async getWorkerApplication(id: string): Promise<WorkerApplication | null> {
    const inMem = this.inMemoryFallback.workerApplications.get(id);
    if (inMem) return inMem;

    const firestore = this.db;
    if (firestore) {
      try {
        let snap = await firestore.collection('workerApplications').doc(id).get();
        if (!snap.exists) {
          snap = await firestore.collection('worker_applications').doc(id).get();
        }
        if (snap.exists) {
          return { id: snap.id, ...(snap.data() as any) } as WorkerApplication;
        }
      } catch (err) {
        logger.warn('Firebase getWorkerApplication error:', err);
      }
    }
    return null;
  }

  async getWorkerApplicationByUid(uid: string): Promise<WorkerApplication | null> {
    for (const app of this.inMemoryFallback.workerApplications.values()) {
      if (app.uid === uid) return app;
    }

    const firestore = this.db;
    if (firestore) {
      try {
        let qSnap = await firestore.collection('workerApplications').where('uid', '==', uid).limit(1).get();
        if (qSnap.empty) {
          qSnap = await firestore.collection('worker_applications').where('uid', '==', uid).limit(1).get();
        }
        if (!qSnap.empty) {
          const doc = qSnap.docs[0];
          return { id: doc.id, ...(doc.data() as any) } as WorkerApplication;
        }
      } catch (err) {
        logger.warn('Firebase getWorkerApplicationByUid error:', err);
      }
    }
    return null;
  }

  async getWorkerApplicationByContact(contact: { phone?: string; email?: string }): Promise<WorkerApplication | null> {
    for (const app of this.inMemoryFallback.workerApplications.values()) {
      if ((contact.phone && app.phone === contact.phone) || (contact.email && app.email === contact.email)) {
        return app;
      }
    }

    const firestore = this.db;
    if (firestore) {
      try {
        if (contact.phone) {
          let snap = await firestore.collection('workerApplications').where('phone', '==', contact.phone).limit(1).get();
          if (snap.empty) {
            snap = await firestore.collection('worker_applications').where('phone', '==', contact.phone).limit(1).get();
          }
          if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...(doc.data() as any) } as WorkerApplication;
          }
        }
        if (contact.email) {
          let snap = await firestore.collection('workerApplications').where('email', '==', contact.email).limit(1).get();
          if (snap.empty) {
            snap = await firestore.collection('worker_applications').where('email', '==', contact.email).limit(1).get();
          }
          if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...(doc.data() as any) } as WorkerApplication;
          }
        }
      } catch (err) {
        logger.warn('Firebase getWorkerApplicationByContact error:', err);
      }
    }
    return null;
  }

  async listWorkerApplications(status?: string): Promise<WorkerApplication[]> {
    const firestore = this.db;
    if (firestore) {
      try {
        let q: Query = firestore.collection('workerApplications');
        if (status) q = q.where('status', '==', status);
        const snap = await q.get();
        if (snap.docs.length > 0) {
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }

        // Fallback to worker_applications if workerApplications is empty
        let q2: Query = firestore.collection('worker_applications');
        if (status) q2 = q2.where('status', '==', status);
        const snap2 = await q2.get();
        if (snap2.docs.length > 0) {
          return snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        logger.warn('Firebase listWorkerApplications notice, falling back to memory store:', err);
      }
    }
    const list = Array.from(this.inMemoryFallback.workerApplications.values());
    return status ? list.filter((a) => a.status === status) : list;
  }

  async updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<WorkerApplication | null> {
    const existing = this.inMemoryFallback.workerApplications.get(id);
    if (existing) {
      existing.status = status;
      this.inMemoryFallback.workerApplications.set(id, existing);
    }

    const firestore = this.db;
    let updatedRecord: WorkerApplication | null = existing || null;

    if (firestore) {
      try {
        const updateData: any = { status, updatedAt: new Date().toISOString() };
        if (notes) updateData.notes = notes;

        await Promise.allSettled([
          firestore.collection('workerApplications').doc(id).set(updateData, { merge: true }),
          firestore.collection('worker_applications').doc(id).set(updateData, { merge: true })
        ]);

        let snap = await firestore.collection('workerApplications').doc(id).get();
        if (!snap.exists) {
          snap = await firestore.collection('worker_applications').doc(id).get();
        }
        if (snap.exists) {
          updatedRecord = { id: snap.id, ...(snap.data() as any) } as WorkerApplication;
        }

        // When approved or rejected, sync to the corresponding user in 'users' collection
        if (updatedRecord && updatedRecord.uid) {
          const userRef = firestore.collection('users').doc(updatedRecord.uid);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            if (status === 'APPROVED') {
              await userRef.set({
                role: 'worker',
                status: 'APPROVED',
                workerSkill: updatedRecord.skill || 'Electrician',
                workerCategories: updatedRecord.categories || [updatedRecord.skill || 'Electrician'],
                visitingFee: updatedRecord.visitingFee || 199,
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } else {
              await userRef.set({
                status: 'REJECTED',
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        }
      } catch (err) {
        logger.warn('Firebase updateWorkerApplicationStatus notice:', err);
      }
    }
    return updatedRecord;
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
        // Keep a readable ISO timestamp and a server-authoritative Firestore timestamp.
        await ref.set({
          ...record,
          createdAtServerTimestamp: FieldValue.serverTimestamp(),
        }, { merge: true });
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

  async acceptOrder(id: string, workerId: string, additionalDetails: Partial<OrderRecord>): Promise<OrderRecord | null> {
    const firestore = this.db;
    if (!firestore) {
      const existing = this.inMemoryFallback.orders.get(id);
      if (!existing || !['DISPATCHING', 'Pending'].includes(String(existing.status))) return null;
      if (existing.workerId && existing.workerId !== workerId) return null;
      const updated = { ...existing, ...additionalDetails, id, workerId, status: 'ACCEPTED' as const };
      this.inMemoryFallback.orders.set(id, updated);
      return updated;
    }

    const ref = firestore.collection('orders').doc(id);
    try {
      return await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return null;
        const existing = { id: snapshot.id, ...(snapshot.data() as any) } as OrderRecord;
        if (!['DISPATCHING', 'Pending'].includes(String(existing.status))) return null;
        if (existing.workerId && existing.workerId !== workerId) return null;

        const updated = {
          ...existing,
          ...additionalDetails,
          id,
          workerId,
          status: 'ACCEPTED' as const,
          updatedAt: new Date().toISOString(),
        };
        transaction.update(ref, {
          ...additionalDetails,
          workerId,
          status: 'ACCEPTED',
          updatedAt: updated.updatedAt,
        });
        return updated;
      });
    } catch (error) {
      logger.error('Firebase atomic booking acceptance failed:', error);
      throw new Error('Booking acceptance could not be committed');
    }
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

