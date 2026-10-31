import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { dbAdapter } from '../db/index.js';
import { logger } from '../logger.js';
import { UserProfile, WorkerApplication, OrderRecord, WarrantyClaim, ComplaintRecord } from '../../types.js';

export const adminRouter = Router();

// ─── Dynamic Platform Operational Controls ───
export interface DynamicPlatformSettings {
  convenienceFee: number;
  emergencySurcharge: number;
  defaultCommissionRate: number;
  gstRate: number;
  maintenanceMode: boolean;
  maintenanceNotice: string;
  announcementBanner: string;
  activeGeofences: {
    id: string;
    name: string;
    radiusKm: number;
    active: boolean;
  }[];
  updatedAt: string;
}

export const platformSettings: DynamicPlatformSettings = {
  convenienceFee: 29,
  emergencySurcharge: 99,
  defaultCommissionRate: 0.15,
  gstRate: 0.18,
  maintenanceMode: false,
  maintenanceNotice: 'Scheduled maintenance underway. Regular services resume shortly.',
  announcementBanner: 'PunchX Monsoon Coverage Active — 100% On-Time SLA Guarantee across Kolkata & Nabadwip',
  activeGeofences: [
    { id: 'geo_kolkata', name: 'Kolkata Metropolitan', radiusKm: 8, active: true },
    { id: 'geo_nabadwip', name: 'Nabadwip Circular Zone', radiusKm: 8, active: true },
    { id: 'geo_howrah', name: 'Howrah Central Hub', radiusKm: 10, active: true },
  ],
  updatedAt: new Date().toISOString(),
};

// ─── Dual-Repository Security Authentication ───
export const requireAdminApiKey = (req: Request, res: Response, next: NextFunction) => {
  const adminKey =
    (req.headers['x-admin-key'] as string) ||
    (req.headers['X-Admin-Key'] as string) ||
    req.headers['authorization']?.replace('Bearer ', '').trim();

  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey && process.env.NODE_ENV === 'production') {
    logger.error('ADMIN_API_KEY environment variable is not configured on the production server');
    return res.status(500).json({ success: false, error: 'Admin bridge authentication is not configured on server' });
  }
  const keyToCompare = expectedKey || 'punchx_admin_secure_live_key_2026_9941a8';

  if (!adminKey) {
    logger.security('Missing administrative key header', { ip: req.ip, path: req.originalUrl });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing x-admin-key authentication header',
    });
  }

  // Timing-safe constant-time comparison to prevent timing attacks
  const keyBuf = Buffer.from(adminKey);
  const expectedBuf = Buffer.from(keyToCompare);

  const isValid =
    keyBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(keyBuf, expectedBuf);

  if (!isValid) {
    logger.security('Invalid administrative key attempt', { ip: req.ip, path: req.originalUrl });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid admin key provided',
    });
  }

  next();
};

// All routes under adminRouter strictly enforce administrative authentication
adminRouter.use(requireAdminApiKey);

// ─── 1. Health & Connection Handshake ───
adminRouter.get('/health', async (_req: Request, res: Response) => {
  const isHealthy = await dbAdapter.isHealthy();
  return res.json({
    success: true,
    status: 'connected',
    platform: 'PunchX Core Production Backend',
    version: '1.0.0',
    dbProvider: dbAdapter.providerName,
    dbHealthy: isHealthy,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── 2. Operational Overview & Cockpit Metrics ───
adminRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [users, workers, orders, claims, complaints] = await Promise.all([
      dbAdapter.listUsers().catch(() => [] as UserProfile[]),
      dbAdapter.listWorkerApplications().catch(() => [] as WorkerApplication[]),
      dbAdapter.listOrders().catch(() => [] as OrderRecord[]),
      dbAdapter.listWarrantyClaims().catch(() => [] as WarrantyClaim[]),
      dbAdapter.listComplaints().catch(() => [] as ComplaintRecord[]),
    ]);

    const activeWorkers = workers.filter((w) => w.status === 'APPROVED').length;
    const pendingWorkers = workers.filter((w) => w.status === 'PENDING').length;
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'Done').length;
    const totalGmv = orders.reduce((sum, o) => sum + (o.totalAmountToPay || o.price || 0), 0);

    return res.json({
      success: true,
      metrics: {
        totalUsers: users.length,
        totalWorkers: workers.length,
        activeWorkers,
        pendingWorkers,
        totalOrders: orders.length,
        completedOrders,
        totalGmv,
        pendingClaims: claims.filter((c) => c.status === 'PENDING_ADMIN_REVIEW' || (c.status as string) === 'PENDING').length,
        pendingComplaints: complaints.filter((c) => c.status === 'CRITICAL_PENDING_ADMIN' || c.status === 'UNDER_REVIEW').length,
      },
      settings: platformSettings,
    });
  } catch (err: any) {
    logger.error('Admin overview metrics error:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate platform metrics' });
  }
});

// ─── 3. User & Citizen Directory ───
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const users = await dbAdapter.listUsers(role);
    return res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    logger.error('Admin list users error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

adminRouter.patch('/users/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const existing = await dbAdapter.getUser(uid);
    const updated = await dbAdapter.upsertUser({
      ...(existing || {}),
      ...req.body,
      uid,
    } as UserProfile);

    logger.info(`Admin updated user profile: ${uid}`);
    return res.json({ success: true, user: updated });
  } catch (err: any) {
    logger.error('Admin update user error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// ─── 4. Worker & Specialist Management ───
adminRouter.get('/workers', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const applications = await dbAdapter.listWorkerApplications(status);
    const workerUsers = await dbAdapter.listUsers('worker');

    return res.json({
      success: true,
      count: applications.length,
      applications,
      workerProfiles: workerUsers,
    });
  } catch (err: any) {
    logger.error('Admin list workers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch workers' });
  }
});

adminRouter.post('/workers', async (req: Request, res: Response) => {
  try {
    const appData = req.body as WorkerApplication;
    const created = await dbAdapter.createWorkerApplication({
      ...appData,
      id: appData.id || `app_${Date.now()}`,
      status: appData.status || 'PENDING',
      appliedAt: appData.appliedAt || new Date().toISOString(),
    });

    return res.status(201).json({ success: true, application: created });
  } catch (err: any) {
    logger.error('Admin create worker application error:', err);
    return res.status(500).json({ success: false, error: 'Failed to onboard worker' });
  }
});

adminRouter.patch('/workers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await dbAdapter.updateWorkerApplicationStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Worker application not found' });
    }

    // If approved, ensure user profile reflects worker role & approval
    if (status === 'APPROVED' && updated.uid) {
      const user = await dbAdapter.getUser(updated.uid);
      if (user) {
        await dbAdapter.upsertUser({
          ...user,
          role: 'worker',
          status: 'APPROVED',
          workerSkill: updated.skill,
          phone: updated.phone || user.phone,
          name: updated.legalName || user.name,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return res.json({ success: true, application: updated });
  } catch (err: any) {
    logger.error('Admin update worker status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update worker status' });
  }
});

adminRouter.post('/workers/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobData = req.body;

    const newOrder: OrderRecord = {
      id: jobData.id || `ord_dispatch_${Date.now()}`,
      category: jobData.category || jobData.trade || 'Emergency Repair',
      workerId: id,
      workerName: jobData.workerName || 'Assigned Specialist',
      price: jobData.price || 299,
      visitingFee: jobData.price || 299,
      customerPlatformFee: platformSettings.convenienceFee,
      gstAmount: Math.round(((jobData.price || 299) + platformSettings.convenienceFee) * platformSettings.gstRate),
      totalAmountToPay: Math.round(((jobData.price || 299) + platformSettings.convenienceFee) * (1 + platformSettings.gstRate)),
      status: 'IN_SERVICE',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      customerName: jobData.customerName || 'Direct Dispatch Citizen',
      customerAddress: jobData.customerAddress || 'Kolkata Metropolitan Area',
      customerPhone: jobData.customerPhone || '+91 98300 00000',
      createdAt: new Date().toISOString(),
    };

    const created = await dbAdapter.createOrder(newOrder);
    logger.info(`Admin dispatched job ${created.id} to worker ${id}`);
    return res.status(201).json({ success: true, order: created });
  } catch (err: any) {
    logger.error('Admin dispatch job error:', err);
    return res.status(500).json({ success: false, error: 'Failed to dispatch job to worker' });
  }
});

// ─── 5. Orders & Bookings Management ───
adminRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const filters = {
      customerId: req.query.customerId as string | undefined,
      workerId: req.query.workerId as string | undefined,
      status: req.query.status as string | undefined,
    };

    const orders = await dbAdapter.listOrders(filters);
    return res.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    logger.error('Admin list orders error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

adminRouter.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note, notes } = req.body;

    const updated = await dbAdapter.updateOrderStatus(id, status, {
      issueDescription: note || notes,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({ success: true, order: updated });
  } catch (err: any) {
    logger.error('Admin update order status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// ─── 6. Warranty Claims & Grievances Desk ───
adminRouter.get('/claims', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const claims = await dbAdapter.listWarrantyClaims(status);
    return res.json({ success: true, count: claims.length, claims });
  } catch (err: any) {
    logger.error('Admin list claims error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claims' });
  }
});

adminRouter.patch('/claims/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await dbAdapter.updateWarrantyClaimStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    return res.json({ success: true, claim: updated });
  } catch (err: any) {
    logger.error('Admin update claim error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update warranty claim' });
  }
});

// ─── 7. Customer Complaints Desk ───
adminRouter.get('/complaints', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const complaints = await dbAdapter.listComplaints(status);
    return res.json({ success: true, count: complaints.length, complaints });
  } catch (err: any) {
    logger.error('Admin list complaints error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
});

adminRouter.patch('/complaints/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await dbAdapter.updateComplaintStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    return res.json({ success: true, complaint: updated });
  } catch (err: any) {
    logger.error('Admin update complaint error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update complaint' });
  }
});

// ─── 8. Dynamic Operational Settings ───
adminRouter.get('/settings', (_req: Request, res: Response) => {
  return res.json({ success: true, settings: platformSettings });
});

adminRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<DynamicPlatformSettings>;
    if (updates.convenienceFee !== undefined) platformSettings.convenienceFee = Number(updates.convenienceFee);
    if (updates.emergencySurcharge !== undefined) platformSettings.emergencySurcharge = Number(updates.emergencySurcharge);
    if (updates.defaultCommissionRate !== undefined) platformSettings.defaultCommissionRate = Number(updates.defaultCommissionRate);
    if (updates.gstRate !== undefined) platformSettings.gstRate = Number(updates.gstRate);
    if (updates.maintenanceMode !== undefined) platformSettings.maintenanceMode = Boolean(updates.maintenanceMode);
    if (updates.maintenanceNotice !== undefined) platformSettings.maintenanceNotice = String(updates.maintenanceNotice);
    if (updates.announcementBanner !== undefined) platformSettings.announcementBanner = String(updates.announcementBanner);
    if (Array.isArray(updates.activeGeofences)) platformSettings.activeGeofences = updates.activeGeofences;
    platformSettings.updatedAt = new Date().toISOString();

    logger.info('Platform operational settings dynamically updated via admin bridge', platformSettings);
    return res.json({ success: true, settings: platformSettings });
  } catch (err: any) {
    logger.error('Admin update settings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update platform settings' });
  }
});
