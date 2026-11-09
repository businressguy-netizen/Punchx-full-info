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
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    try {
      if (connectionString) {
        this.pool = new pg.Pool({
          connectionString,
          ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
          max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 1 : 5)),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
      } else if (process.env.POSTGRES_HOST) {
        this.pool = new pg.Pool({
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT || 5432),
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || '',
          database: process.env.POSTGRES_DB || 'punchx',
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
          max: Number(process.env.PG_POOL_MAX || 5),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
      } else {
        logger.error('Supabase PostgreSQL is selected but no database connection URL is configured.');
      }
    } catch (err) {
      logger.error('Failed to initialize PostgreSQL pool:', err);
      throw err;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.pool) return false;
    let client: any = null;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      return true;
    } catch (e) {
      logger.error('Supabase database health check failed:', e);
      return false;
    } finally {
      client?.release();
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
        status: row.status || undefined,
        applicationId: row.application_id || undefined,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString(),
      };
    } catch (err) {
      logger.error('Supabase getUser failed:', err);
      throw new Error('Supabase user lookup failed');
    }
  }

  async upsertUser(user: UserProfile): Promise<UserProfile> {
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.users.set(user.uid, user);
      return user;
    }

    try {
      const query = `
        INSERT INTO users (id, name, email, photo_url, role, phone, dob, is_profile_completed, address, landmark, area, sector, visiting_fee, worker_skill, worker_categories, worker_experience, worker_rating, worker_completed_jobs, status, application_id, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
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
          status = EXCLUDED.status,
          application_id = EXCLUDED.application_id,
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
        user.status || null,
        user.applicationId || null,
      ];
      await this.pool.query(query, values);
      return user;
    } catch (err) {
      logger.error('Supabase upsertUser failed:', err);
      throw new Error('Supabase user profile could not be saved');
    }
  }

  async listUsers(role?: string): Promise<UserProfile[]> {
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
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
        status: row.status || undefined,
        applicationId: row.application_id || undefined,
      }));
    } catch (e) {
      logger.error('Supabase listUsers failed:', e);
      throw new Error('Supabase user list could not be loaded');
    }
  }

  // ─── WORKER APPLICATION OPERATIONS ───
  async createWorkerApplication(app: WorkerApplication): Promise<WorkerApplication> {
    const id = app.id || `app_${Date.now()}`;
    const record = { ...app, id };
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.workerApplications.set(id, record);
      return record;
    }

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
      logger.error('Supabase createWorkerApplication failed:', err);
      throw new Error('Professional application could not be saved');
    }
  }

  async getWorkerApplication(id: string): Promise<WorkerApplication | null> {
    const inMem = this.inMemoryFallback.workerApplications.get(id);
    if (inMem) return inMem;
    if (!this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM worker_applications WHERE id = $1 LIMIT 1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
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
      };
    } catch (err) {
      logger.error('Supabase getWorkerApplication failed:', err);
      throw new Error('Professional application lookup failed');
    }
  }

  async getWorkerApplicationByUid(uid: string): Promise<WorkerApplication | null> {
    for (const app of this.inMemoryFallback.workerApplications.values()) {
      if (app.uid === uid) return app;
    }
    if (!this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM worker_applications WHERE uid = $1 ORDER BY applied_at DESC LIMIT 1', [uid]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
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
      };
    } catch (err) {
      logger.error('Supabase getWorkerApplicationByUid failed:', err);
      throw new Error('Professional application lookup failed');
    }
  }

  async getWorkerApplicationByContact(contact: { phone?: string; email?: string }): Promise<WorkerApplication | null> {
    for (const app of this.inMemoryFallback.workerApplications.values()) {
      if ((contact.phone && app.phone === contact.phone) || (contact.email && app.email === contact.email)) {
        return app;
      }
    }
    if (!this.pool) return null;
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      if (contact.phone) {
        values.push(contact.phone);
        conditions.push(`phone = $${values.length}`);
      }
      if (contact.email) {
        values.push(contact.email);
        conditions.push(`email = $${values.length}`);
      }
      if (conditions.length === 0) return null;
      const res = await this.pool.query(`SELECT * FROM worker_applications WHERE ${conditions.join(' OR ')} ORDER BY applied_at DESC LIMIT 1`, values);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
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
      };
    } catch (err) {
      logger.error('Supabase getWorkerApplicationByContact failed:', err);
      throw new Error('Professional application lookup failed');
    }
  }

  async listWorkerApplications(status?: string): Promise<WorkerApplication[]> {
    if (!this.pool) {
      logger.error('Supabase listWorkerApplications failed:', err);
      throw new Error('Professional applications could not be loaded');
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
      logger.error('Supabase listWorkerApplications failed:', err);
      throw new Error('Professional applications could not be loaded');
    }
  }

  async updateWorkerApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<WorkerApplication | null> {
    const existing = this.inMemoryFallback.workerApplications.get(id);
    if (existing) {
      existing.status = status;
      this.inMemoryFallback.workerApplications.set(id, existing);
    }

    if (!this.pool) return existing || null;

    try {
      const q = 'UPDATE worker_applications SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3 RETURNING *';
      const res = await this.pool.query(q, [status, notes || null, id]);
      if (res.rows.length === 0) return existing || null;
      const row = res.rows[0];
      const updatedApp: WorkerApplication = {
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
      };

      if (row.uid) {
        await this.pool.query(
          `UPDATE users SET role = $1, status = $2, updated_at = NOW() WHERE id = $3`,
          [status === 'APPROVED' ? 'worker' : 'citizen', status, row.uid]
        );
      }

      return updatedApp;
    } catch (e) {
      logger.error('Supabase updateWorkerApplicationStatus failed:', e);
      throw new Error('Professional application status could not be updated');
    }
  }

  // ─── ORDER OPERATIONS ───
  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const id = order.id || `ORD-${Date.now()}`;
    const record = { ...order, id };
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.orders.set(id, record);
      return record;
    }

    try {
      const q = `
        INSERT INTO orders (id, category, customer_id, worker_id, customer_name, customer_address, customer_phone, customer_lat, customer_lng, worker_name, worker_phone, worker_avatar, worker_rating, price, original_price, discount_applied, coupon_used, visiting_fee, platform_commission, gst_amount, total_amount_to_pay, date, time, status, area, sector, otp_code, issue_description, photo_proof, payment_method, has_warranty_guarantee, warranty_fee, warranty_expiry_date, emergency_eta, emergency_surcharge, base_fee, arrival_quality, quality_discount_applied, prepaid_refund_amount, prepaid_refund_status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, worker_id = EXCLUDED.worker_id, worker_name = EXCLUDED.worker_name, worker_phone = EXCLUDED.worker_phone, metadata = EXCLUDED.metadata;
      `;
      const values = [
        id,
        order.category,
        order.customerId || order.bookingCreatedByUid || null,
        order.workerId || null,
        order.customerName || 'Customer',
        order.customerAddress || order.address || 'Address',
        order.customerPhone || '',
        order.customerLocation?.lat ?? order.addressCoordinates?.lat ?? null,
        order.customerLocation?.lng ?? order.addressCoordinates?.lng ?? null,
        order.workerName || 'Worker',
        order.workerPhone || '',
        order.workerAvatar || null,
        order.workerRating ?? null,
        order.price || 0,
        order.originalPrice ?? null,
        order.discountApplied || 0,
        order.couponUsed || null,
        order.visitingFee || 0,
        order.platformCommission || 0,
        order.gstAmount || 0,
        order.totalAmountToPay || order.price || 0,
        order.date || new Date().toISOString().slice(0, 10),
        order.time || '10:00 AM',
        order.status || 'Pending',
        order.area || null,
        order.sector || null,
        order.otpCode || null,
        order.issueDescription || order.description || null,
        order.photoProof || null,
        order.paymentMethod || 'COD',
        order.hasWarrantyGuarantee ?? true,
        order.warrantyFee || 0,
        order.warrantyExpiryDate || null,
        order.emergencyETA || null,
        order.emergencySurcharge || 0,
        order.baseFee || 0,
        order.arrivalQuality ? JSON.stringify(order.arrivalQuality) : null,
        order.qualityDiscountApplied || 0,
        order.prepaidRefundAmount || 0,
        order.prepaidRefundStatus || 'NONE',
        JSON.stringify(order),
      ];
      await this.pool.query(q, values);
      return (await this.getOrder(id)) || record;
    } catch (err) {
      logger.error('Supabase createOrder failed:', err);
      throw new Error('Booking could not be saved');
    }
  }

  async getOrder(id: string): Promise<OrderRecord | null> {
    if (!this.pool) return this.inMemoryFallback.orders.get(id) || null;
    try {
      const res = await this.pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (res.rows.length === 0) return this.inMemoryFallback.orders.get(id) || null;
      const row = res.rows[0];
      return {
        ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
        id: row.id,
        category: row.category,
        customerId: row.customer_id || undefined,
        workerId: row.worker_id || undefined,
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
      logger.error('Supabase getOrder failed:', err);
      throw new Error('Booking lookup failed');
    }
  }

  async listOrders(filters?: { customerId?: string; workerId?: string; status?: string }): Promise<OrderRecord[]> {
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      let list = Array.from(this.inMemoryFallback.orders.values());
      if (filters?.customerId) list = list.filter((order) => order.customerId === filters.customerId);
      if (filters?.workerId) list = list.filter((order) => order.workerId === filters.workerId);
      if (filters?.status) list = list.filter((order) => order.status === filters.status);
      return list;
    }
    try {
      const conditions: string[] = [];
      const values: string[] = [];
      if (filters?.customerId) { values.push(filters.customerId); conditions.push(`customer_id = $${values.length}`); }
      if (filters?.workerId) { values.push(filters.workerId); conditions.push(`worker_id = $${values.length}`); }
      if (filters?.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const res = await this.pool.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, values);
      const list: OrderRecord[] = res.rows.map((row) => ({
        ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
        id: row.id,
        category: row.category,
        customerId: row.customer_id || undefined,
        workerId: row.worker_id || undefined,
        workerName: row.worker_name,
        workerPhone: row.worker_phone,
        workerAvatar: row.worker_avatar,
        workerRating: row.worker_rating == null ? undefined : Number(row.worker_rating),
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
      return list;
    } catch (e) {
      logger.error('Supabase listOrders failed:', e);
      throw new Error('Bookings could not be loaded');
    }
  }

  async updateOrderStatus(id: string, status: string, additionalDetails?: Partial<OrderRecord>): Promise<OrderRecord | null> {
    if (!this.pool) {
      const existing = this.inMemoryFallback.orders.get(id);
      if (!existing) return null;
      existing.status = status as any;
      if (additionalDetails) Object.assign(existing, additionalDetails);
      this.inMemoryFallback.orders.set(id, existing);
      return existing;
    }

    try {
      const details = additionalDetails || {};
      const result = await this.pool.query(
        `UPDATE orders
         SET status = $1,
             worker_id = COALESCE($2, worker_id),
             worker_name = COALESCE($3, worker_name),
             worker_phone = COALESCE($4, worker_phone),
             photo_proof = COALESCE($5, photo_proof),
             metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb
         WHERE id = $7
         RETURNING id`,
        [
          status,
          details.workerId || null,
          details.workerName || null,
          details.workerPhone || null,
          details.photoProof || null,
          JSON.stringify(details),
          id,
        ]
      );
      if (result.rowCount === 0) return null;
      return await this.getOrder(id);
    } catch (e) {
      logger.error('Supabase updateOrderStatus failed:', e);
      throw new Error('Booking status could not be updated');
    }
  }

  // ─── WARRANTY CLAIMS OPERATIONS ───
  async createWarrantyClaim(claim: WarrantyClaim): Promise<WarrantyClaim> {
    const id = claim.id || `CLM-${Date.now()}`;
    const record = { ...claim, id };
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.claims.set(id, record);
      return record;
    }

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
      logger.error('Supabase createWarrantyClaim failed:', e);
      throw new Error('Warranty claim could not be saved');
    }
  }

  async listWarrantyClaims(status?: string): Promise<WarrantyClaim[]> {
    if (!this.pool) {
      logger.error('Supabase listWarrantyClaims failed:', e);
      throw new Error('Warranty claims could not be loaded');
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
      logger.error('Supabase listWarrantyClaims failed:', e);
      throw new Error('Warranty claims could not be loaded');
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
      logger.error('Supabase updateWarrantyClaimStatus failed:', e);
      throw new Error('Warranty claim status could not be updated');
    }
  }

  // ─── COMPLAINT OPERATIONS ───
  async createComplaint(complaint: ComplaintRecord): Promise<ComplaintRecord> {
    const id = complaint.id || `CMP-${Date.now()}`;
    const record = { ...complaint, id };
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.complaints.set(id, record);
      return record;
    }

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
      logger.error('Supabase createComplaint failed:', e);
      throw new Error('Complaint could not be saved');
    }
  }

  async listComplaints(status?: string): Promise<ComplaintRecord[]> {
    if (!this.pool) {
      logger.error('Supabase listComplaints failed:', e);
      throw new Error('Complaints could not be loaded');
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
      logger.error('Supabase listComplaints failed:', e);
      throw new Error('Complaints could not be loaded');
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
      logger.error('Supabase updateComplaintStatus failed:', e);
      throw new Error('Complaint status could not be updated');
    }
  }

  // ─── REVIEWS OPERATIONS ───
  async createReview(review: CustomerReview): Promise<CustomerReview> {
    const id = review.id || `REV-${Date.now()}`;
    const record = { ...review, id };
    if (!this.pool) {
      if (process.env.NODE_ENV === 'production') throw new Error('Supabase database connection is not configured.');
      this.inMemoryFallback.reviews.set(id, record);
      return record;
    }

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
      logger.error('Supabase createReview failed:', e);
      throw new Error('Review could not be saved');
    }
  }

  async listReviews(workerId?: string): Promise<CustomerReview[]> {
    if (!this.pool) {
      logger.error('Supabase listReviews failed:', e);
      throw new Error('Reviews could not be loaded');
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
      logger.error('Supabase listReviews failed:', e);
      throw new Error('Reviews could not be loaded');
    }
  }
}
