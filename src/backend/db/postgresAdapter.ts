import pg from 'pg';
import { IDatabaseAdapter } from './dbAdapter.js';
import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord, CustomerReview } from '../../types.js';
import { logger } from '../logger.js';

export class PostgresAdapter implements IDatabaseAdapter {
  providerName: 'postgres' = 'postgres';
  private pool: pg.Pool | null = null;
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

  constructor() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    try {
      if (connectionString) {
        this.pool = new pg.Pool({ connectionString });
      } else if (process.env.POSTGRES_HOST) {
        this.pool = new pg.Pool({
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT || 5432),
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || '',
          database: process.env.POSTGRES_DB || 'punchx',
        });
      } else {
        logger.info('No PostgreSQL env config provided; using PostgresAdapter with fallback memory pool.');
      }
    } catch (err) {
      logger.warn('Failed to initialize PostgreSQL pool, enabling fallback store:', err);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.pool) return true; // Fallback mode active
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (e) {
      return false;
    }
  }

  // ─── USER OPERATIONS ───
  async getUser(uid: string): Promise<UserProfile | null> {
    if (!this.pool) {
      return this.inMemoryFallback.users.get(uid) || null;
    }
    try {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [uid]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        uid: row.id,
        name: row.name,
        email: row.email,
        photoURL: row.photo_url,
        role: row.role,
        dob: row.dob,
        isProfileCompleted: row.is_profile_completed,
        address: row.address,
        landmark: row.landmark,
        area: row.area,
        sector: row.sector,
        phone: row.phone,
        visitingFee: row.visiting_fee ? Number(row.visiting_fee) : 0,
        workerSkill: row.worker_skill,
        workerCategories: row.worker_categories,
        workerExperience: row.worker_experience,
        workerRating: row.worker_rating ? Number(row.worker_rating) : 5.0,
        workerCompletedJobs: row.worker_completed_jobs || 0,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
      };
    } catch (err) {
      logger.error('Postgres getUser failed, falling back:', err);
      return this.inMemoryFallback.users.get(uid) || null;
    }
  }

  async upsertUser(user: UserProfile): Promise<UserProfile> {
    this.inMemoryFallback.users.set(user.uid, user);
    if (!this.pool) return user;

    try {
      const query = `
        INSERT INTO users (id, name, email, photo_url, role, phone, dob, is_profile_completed, address, landmark, area, sector, visiting_fee, worker_skill, worker_categories, worker_experience, worker_rating, worker_completed_jobs, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          photo_url = EXCLUDED.photo_url,
          role = EXCLUDED.role,
          phone = EXCLUDED.phone,
          dob = EXCLUDED.dob,
          is_profile_completed = EXCLUDED.is_profile_completed,
          address = EXCLUDED.address,
          landmark = EXCLUDED.landmark,
          area = EXCLUDED.area,
          sector = EXCLUDED.sector,
          visiting_fee = EXCLUDED.visiting_fee,
          worker_skill = EXCLUDED.worker_skill,
          worker_categories = EXCLUDED.worker_categories,
          worker_experience = EXCLUDED.worker_experience,
          worker_rating = EXCLUDED.worker_rating,
          worker_completed_jobs = EXCLUDED.worker_completed_jobs,
          updated_at = NOW()
        RETURNING *;
      `;
      const values = [
        user.uid,
        user.name,
        user.email,
        user.photoURL || null,
        user.role || 'citizen',
        user.phone || null,
        user.dob || null,
        user.isProfileCompleted ?? false,
        user.address || null,
        user.landmark || null,
        user.area || null,
        user.sector || null,
        user.visitingFee || 0,
        user.workerSkill || null,
        user.workerCategories || [],
        user.workerExperience || null,
        user.workerRating || 5.0,
        user.workerCompletedJobs || 0,
      ];
      await this.pool.query(query, values);
      return user;
    } catch (err) {
      logger.error('Postgres upsertUser error:', err);
      return user;
    }
  }

  async listUsers(role?: string): Promise<UserProfile[]> {
    if (!this.pool) {
      const all = Array.from(this.inMemoryFallback.users.values());
      return role ? all.filter((u) => u.role === role) : all;
    }
    try {
      const q = role ? 'SELECT * FROM users WHERE role = $1' : 'SELECT * FROM users';
      const p = role ? [role] : [];
      const res = await this.pool.query(q, p);
      return res.rows.map((row) => ({
        uid: row.id,
        name: row.name,
        email: row.email,
        photoURL: row.photo_url,
        role: row.role,
        phone: row.phone,
        area: row.area,
        sector: row.sector,
        workerSkill: row.worker_skill,
        workerRating: row.worker_rating ? Number(row.worker_rating) : 5.0,
        workerCompletedJobs: row.worker_completed_jobs || 0,
      }));
    } catch (e) {
      const all = Array.from(this.inMemoryFallback.users.values());
      return role ? all.filter((u) => u.role === role) : all;
    }
  }

  // ─── WORKER APPLICATION OPERATIONS ───
  async createWorkerApplication(app: WorkerApplication): Promise<WorkerApplication> {
    const id = app.id || `app_${Date.now()}`;
    const record = { ...app, id };
    this.inMemoryFallback.workerApplications.set(id, record);

    if (!this.pool) return record;

    try {
      const q = `
        INSERT INTO worker_applications (uid, legal_name, address, area, sector, skill, categories, custom_skill, experience_years, phone, email, visiting_fee, terms_accepted, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id;
      `;
      const values = [
        app.uid,
        app.legalName,
        app.address,
        app.area || null,
        app.sector || null,
        app.skill,
        app.categories || [],
        app.customSkill || null,
        app.experienceYears,
        app.phone,
        app.email,
        app.visitingFee || 0,
        app.termsAccepted ?? true,
        app.status || 'PENDING',
      ];
      const res = await this.pool.query(q, values);
      record.id = res.rows[0].id;
      return record;
    } catch (err) {
      logger.error('Postgres createWorkerApplication error:', err);
      return record;
    }
  }

  async listWorkerApplications(status?: string): Promise<WorkerApplication[]> {
    if (!this.pool) {
      const list = Array.from(this.inMemoryFallback.workerApplications.values());
      return status ? list.filter((a) => a.status === status) : list;
    }
    try {
      const q = status
        ? 'SELECT * FROM worker_applications WHERE status = $1 ORDER BY applied_at DESC'
        : 'SELECT * FROM worker_applications ORDER BY applied_at DESC';
      const p = status ? [status] : [];
      const res = await this.pool.query(q, p);
      return res.rows.map((row) => ({
        id: row.id,
        uid: row.uid,
        legalName: row.legal_name,
        address: row.address,
        area: row.area,
        sector: row.sector,
        skill: row.skill,
        categories: row.categories,
        customSkill: row.custom_skill,
        experienceYears: row.experience_years,
        phone: row.phone,
        email: row.email,
        visitingFee: row.visiting_fee ? Number(row.visiting_fee) : 0,
        termsAccepted: row.terms_accepted,
        status: row.status,
        appliedAt: row.applied_at?.toISOString(),
      }));
    } catch (err) {
      const list = Array.from(this.inMemoryFallback.workerApplications.values());
      return status ? list.filter((a) => a.status === status) : list;
    }
  }

  async updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<WorkerApplication | null> {
    const existing = this.inMemoryFallback.workerApplications.get(id);
    if (existing) {
      existing.status = status;
      this.inMemoryFallback.workerApplications.set(id, existing);
    }

    if (!this.pool) return existing || null;

    try {
      const q = 'UPDATE worker_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      const res = await this.pool.query(q, [status, id]);
      if (res.rows.length === 0) return existing || null;
      return existing || null;
    } catch (e) {
      return existing || null;
    }
  }

  // ─── ORDER OPERATIONS ───
  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const id = order.id || `ORD-${Date.now()}`;
    const record = { ...order, id };
    this.inMemoryFallback.orders.set(id, record);

    if (!this.pool) return record;

    try {
      const q = `
        INSERT INTO orders (id, category, customer_name, customer_address, customer_phone, worker_name, worker_phone, price, total_amount_to_pay, date, time, status, area, sector, payment_method, has_warranty_guarantee)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
      `;
      const values = [
        id,
        order.category,
        order.customerName || 'Customer',
        order.customerAddress || 'Address',
        order.customerPhone || '',
        order.workerName || 'Worker',
        order.workerPhone || '',
        order.price || 0,
        order.totalAmountToPay || order.price || 0,
        order.date || new Date().toISOString().slice(0, 10),
        order.time || '10:00 AM',
        order.status || 'Pending',
        order.area || null,
        order.sector || null,
        order.paymentMethod || 'COD',
        order.hasWarrantyGuarantee ?? true,
      ];
      await this.pool.query(q, values);
      return record;
    } catch (err) {
      logger.error('Postgres createOrder error:', err);
      return record;
    }
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    if (!this.pool) return this.inMemoryFallback.orders.get(id) || null;
    try {
      const res = await this.pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (res.rows.length === 0) return this.inMemoryFallback.orders.get(id) || null;
      const row = res.rows[0];
      return {
        id: row.id,
        category: row.category,
        workerName: row.worker_name,
        workerPhone: row.worker_phone,
        price: Number(row.price),
        totalAmountToPay: Number(row.total_amount_to_pay),
        date: row.date,
        time: row.time,
        status: row.status,
        customerName: row.customer_name,
        customerAddress: row.customer_address,
        customerPhone: row.customer_phone,
        area: row.area,
        sector: row.sector,
        paymentMethod: row.payment_method,
        createdAt: row.created_at?.toISOString(),
      };
    } catch (err) {
      return this.inMemoryFallback.orders.get(id) || null;
    }
  }

  async listOrders(filters?: { customerId?: string; workerId?: string; status?: string }): Promise<OrderRecord[]> {
    if (!this.pool) {
      let list = Array.from(this.inMemoryFallback.orders.values());
      if (filters?.status) list = list.filter((o) => o.status === filters.status);
      return list;
    }
    try {
      const res = await this.pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      let list: OrderRecord[] = res.rows.map((row) => ({
        id: row.id,
        category: row.category,
        workerName: row.worker_name,
        workerPhone: row.worker_phone,
        price: Number(row.price),
        totalAmountToPay: Number(row.total_amount_to_pay),
        date: row.date,
        time: row.time,
        status: row.status,
        customerName: row.customer_name,
        customerAddress: row.customer_address,
        customerPhone: row.customer_phone,
        area: row.area,
        sector: row.sector,
        paymentMethod: row.payment_method,
        createdAt: row.created_at?.toISOString(),
      }));
      if (filters?.status) list = list.filter((o) => o.status === filters.status);
      return list;
    } catch (e) {
      let list = Array.from(this.inMemoryFallback.orders.values());
      if (filters?.status) list = list.filter((o) => o.status === filters.status);
      return list;
    }
  }

  async updateOrderStatus(id: string, status: string, additionalDetails?: Partial<OrderRecord>): Promise<OrderRecord | null> {
    const existing = this.inMemoryFallback.orders.get(id);
    if (existing) {
      existing.status = status as any;
      if (additionalDetails) Object.assign(existing, additionalDetails);
      this.inMemoryFallback.orders.set(id, existing);
    }

    if (!this.pool) return existing || null;

    try {
      await this.pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
      return existing || null;
    } catch (e) {
      return existing || null;
    }
  }

  // ─── WARRANTY CLAIMS OPERATIONS ───
  async createWarrantyClaim(claim: WarrantyClaim): Promise<WarrantyClaim> {
    const id = claim.id || `CLM-${Date.now()}`;
    const record = { ...claim, id };
    this.inMemoryFallback.claims.set(id, record);
    if (!this.pool) return record;

    try {
      const q = `
        INSERT INTO warranty_claims (id, order_id, customer_name, customer_phone, customer_address, worker_name, category, problem_description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `;
      await this.pool.query(q, [
        id,
        claim.orderId,
        claim.customerName,
        claim.customerPhone,
        claim.customerAddress,
        claim.workerName || null,
        claim.category,
        claim.problemDescription || null,
        claim.status || 'PENDING_ADMIN_REVIEW',
      ]);
      return record;
    } catch (e) {
      return record;
    }
  }

  async listWarrantyClaims(status?: string): Promise<WarrantyClaim[]> {
    if (!this.pool) {
      const list = Array.from(this.inMemoryFallback.claims.values());
      return status ? list.filter((c) => c.status === status) : list;
    }
    try {
      const res = await this.pool.query('SELECT * FROM warranty_claims ORDER BY created_at DESC');
      const list = res.rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerAddress: row.customer_address,
        workerName: row.worker_name,
        category: row.category,
        problemDescription: row.problem_description,
        status: row.status,
        createdAt: row.created_at?.toISOString(),
      }));
      return status ? list.filter((c) => c.status === status) : list;
    } catch (e) {
      const list = Array.from(this.inMemoryFallback.claims.values());
      return status ? list.filter((c) => c.status === status) : list;
    }
  }

  async updateWarrantyClaimStatus(id: string, status: string, notes?: string): Promise<WarrantyClaim | null> {
    const existing = this.inMemoryFallback.claims.get(id);
    if (existing) {
      existing.status = status as any;
      if (notes) existing.adminNotes = notes;
      this.inMemoryFallback.claims.set(id, existing);
    }
    if (!this.pool) return existing || null;
    try {
      await this.pool.query('UPDATE warranty_claims SET status = $1, admin_notes = $2 WHERE id = $3', [status, notes || null, id]);
      return existing || null;
    } catch (e) {
      return existing || null;
    }
  }

  // ─── COMPLAINT OPERATIONS ───
  async createComplaint(complaint: ComplaintRecord): Promise<ComplaintRecord> {
    const id = complaint.id || `CMP-${Date.now()}`;
    const record = { ...complaint, id };
    this.inMemoryFallback.complaints.set(id, record);
    if (!this.pool) return record;

    try {
      const q = `
        INSERT INTO complaints (id, order_id, customer_name, customer_phone, customer_address, worker_name, correct_equipment, equipment_working, behaviour_rating, comment, status, discount_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;
      await this.pool.query(q, [
        id,
        complaint.orderId,
        complaint.customerName,
        complaint.customerPhone,
        complaint.customerAddress,
        complaint.workerName,
        complaint.correctEquipment ?? true,
        complaint.equipmentWorking ?? true,
        complaint.behaviourRating || 'EXCELLENT',
        complaint.comment || null,
        complaint.status || 'CRITICAL_PENDING_ADMIN',
        complaint.discountAmount || 0,
      ]);
      return record;
    } catch (e) {
      return record;
    }
  }

  async listComplaints(status?: string): Promise<ComplaintRecord[]> {
    if (!this.pool) {
      const list = Array.from(this.inMemoryFallback.complaints.values());
      return status ? list.filter((c) => c.status === status) : list;
    }
    try {
      const res = await this.pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
      const list = res.rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        customerAddress: row.customer_address,
        workerName: row.worker_name,
        correctEquipment: row.correct_equipment,
        equipmentWorking: row.equipment_working,
        behaviourRating: row.behaviour_rating,
        comment: row.comment,
        status: row.status,
        discountAmount: Number(row.discount_amount),
        refundType: row.refund_type,
        createdAt: row.created_at?.toISOString(),
      }));
      return status ? list.filter((c) => c.status === status) : list;
    } catch (e) {
      const list = Array.from(this.inMemoryFallback.complaints.values());
      return status ? list.filter((c) => c.status === status) : list;
    }
  }

  async updateComplaintStatus(id: string, status: string, notes?: string): Promise<ComplaintRecord | null> {
    const existing = this.inMemoryFallback.complaints.get(id);
    if (existing) {
      existing.status = status as any;
      if (notes) existing.adminActionNotes = notes;
      this.inMemoryFallback.complaints.set(id, existing);
    }
    if (!this.pool) return existing || null;
    try {
      await this.pool.query('UPDATE complaints SET status = $1, admin_action_notes = $2 WHERE id = $3', [status, notes || null, id]);
      return existing || null;
    } catch (e) {
      return existing || null;
    }
  }

  // ─── REVIEWS OPERATIONS ───
  async createReview(review: CustomerReview): Promise<CustomerReview> {
    const id = review.id || `REV-${Date.now()}`;
    const record = { ...review, id };
    this.inMemoryFallback.reviews.set(id, record);
    if (!this.pool) return record;

    try {
      const q = `
        INSERT INTO reviews (id, order_id, customer_name, worker_id, worker_name, category, rating, comment)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      await this.pool.query(q, [
        id,
        review.orderId || null,
        review.customer,
        review.workerId || null,
        review.workerName,
        review.category,
        review.rating || 5.0,
        review.comment || null,
      ]);
      return record;
    } catch (e) {
      return record;
    }
  }

  async listReviews(workerId?: string): Promise<CustomerReview[]> {
    if (!this.pool) {
      const list = Array.from(this.inMemoryFallback.reviews.values());
      return workerId ? list.filter((r) => r.workerId === workerId) : list;
    }
    try {
      const q = workerId ? 'SELECT * FROM reviews WHERE worker_id = $1 ORDER BY created_at DESC' : 'SELECT * FROM reviews ORDER BY created_at DESC';
      const p = workerId ? [workerId] : [];
      const res = await this.pool.query(q, p);
      return res.rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        customer: row.customer_name,
        workerId: row.worker_id,
        workerName: row.worker_name,
        category: row.category,
        rating: Number(row.rating),
        comment: row.comment,
        date: row.created_at?.toISOString() || new Date().toISOString(),
      }));
    } catch (e) {
      const list = Array.from(this.inMemoryFallback.reviews.values());
      return workerId ? list.filter((r) => r.workerId === workerId) : list;
    }
  }
}
