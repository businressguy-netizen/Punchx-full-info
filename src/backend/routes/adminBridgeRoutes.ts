import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { ensureFirebaseAdmin } from '../../../api/_lib/firebaseAdmin.js';
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
export const requireAdminApiKey = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') return next();
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Admin sign-in required.' });
  }
  try {
    ensureFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(authorization.slice(7).trim());
    const profile = await dbAdapter.getUser(decoded.uid);
    if (!profile || profile.role !== 'admin') {
      logger.security('Rejected non-admin access to admin bridge', { uid: decoded.uid, path: req.originalUrl });
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }
    (req as any).adminUid = decoded.uid;
    return next();
  } catch (error) {
    const status = (error as any)?.status === 401 ? 401 : 401;
    logger.security('Admin bridge authentication failed', { path: req.originalUrl });
    return res.status(status).json({ success: false, error: 'Your admin session is invalid or expired.' });
  }
};

// Ensure CORS headers on all admin bridge requests
adminRouter.use((req: Request, res: Response, next: NextFunction) => {
  const origin = (req.headers.origin as string) || '';
  const isAllowedOrigin =
    origin === 'https://businressguy-netizen.github.io' ||
    
    origin === 'https://www.punchxapp.co.in' ||
    origin === 'https://punchxapp.co.in' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

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
    const allowedReviewStatuses = new Set(['AWAITING_CUSTOMER_CONFIRMATION', 'REJECTED', 'CUSTOMER_CONFIRMED', 'DISPATCHING', 'EN_ROUTE', 'ARRIVED', 'IN_SERVICE', 'COMPLETION_PENDING', 'COMPLETED', 'CANCELLED']);
    if (!allowedReviewStatuses.has(String(status))) {
      return res.status(400).json({ success: false, error: 'Unsupported order status' });
    }
    const existing = await dbAdapter.getOrder(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Order not found' });
    const now = new Date().toISOString();
    if ((status === 'AWAITING_CUSTOMER_CONFIRMATION' || status === 'REJECTED') && existing.status !== 'PENDING_ADMIN_REVIEW') {
      return res.status(409).json({ success: false, error: 'Only a pending admin-review order can be accepted or rejected' });
    }
    if (status === 'CUSTOMER_CONFIRMED' && existing.status !== 'AWAITING_CUSTOMER_CONFIRMATION') {
      return res.status(409).json({ success: false, error: 'Order is not awaiting customer confirmation' });
    }
    const updated = await dbAdapter.updateOrderStatus(id, status, {
      issueDescription: note || notes,
      ...(status === 'AWAITING_CUSTOMER_CONFIRMATION' || status === 'REJECTED' ? { adminReviewedAt: now, adminReviewNotes: String(note || notes || '') } : {}),
      ...(status === 'CUSTOMER_CONFIRMED' ? { customerConfirmedAt: now } : {}),
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

// ─── Admin-controlled professional assignment ───
adminRouter.patch('/orders/:id/assign', async (req: Request, res: Response) => {
  try {
    const order = await dbAdapter.getOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status !== 'CUSTOMER_CONFIRMED' || order.workerId) {
      return res.status(409).json({ success: false, error: 'Only confirmed, unassigned orders can be dispatched.' });
    }
    const applicationId = String(req.body?.professionalApplicationId || '');
    if (!applicationId) return res.status(400).json({ success: false, error: 'Select an approved professional.' });
    const professional = await dbAdapter.getWorkerApplication(applicationId);
    if (!professional || professional.status !== 'APPROVED' || !professional.uid) {
      return res.status(400).json({ success: false, error: 'Selected professional is not approved.' });
    }
    const updated = await dbAdapter.updateOrderStatus(order.id, 'DISPATCHING', {
      workerId: professional.uid,
      workerName: professional.legalName || 'Assigned professional',
      workerPhone: professional.phone || '',
      assignedAt: new Date().toISOString(),
      assignedBy: (req as any).adminUid || 'admin',
    });
    if (!updated) return res.status(500).json({ success: false, error: 'Order assignment could not be saved.' });
    logger.info('Admin assigned order to approved professional', { orderId: order.id, professionalUid: professional.uid });
    return res.json({ success: true, order: updated });
  } catch (error) {
    logger.error('Admin order assignment failed', error);
    return res.status(500).json({ success: false, error: 'Could not assign this order.' });
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
