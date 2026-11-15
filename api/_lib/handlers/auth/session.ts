import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getPunchxFirestore, requireFirebaseUid } from '../../firebaseAdmin.js';

const PROFILE_FIELDS = [
  'name', 'email', 'phone', 'photoURL', 'dob', 'birthdate', 'address',
  'streetAddress', 'landmark', 'area', 'sector', 'city', 'isProfileCompleted',
  'workerSkill', 'workerCategories', 'workerExperience', 'visitingFee',
  'applicationId', 'location', 'geofenceArea', 'geofenceAreas', 'serviceAreas',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const uid = await requireFirebaseUid(req);
    const firestore = getPunchxFirestore();
    const userRef = firestore.collection('users').doc(uid);
    const historyRef = userRef.collection('loginHistory').doc();
    const body = req.body || {};
    const submitted = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const safeProfile: Record<string, unknown> = {};

    for (const field of PROFILE_FIELDS) {
      const value = submitted[field];
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (field === 'isProfileCompleted' && value === false) continue;
      safeProfile[field] = value;
    }

    const decoded = await (await import('firebase-admin/auth')).getAuth().verifyIdToken(
      String(req.headers.authorization).slice(7).trim(),
    );
    const email = String(decoded.email || body.email || '').trim().slice(0, 320);
    const phone = String(decoded.phone_number || body.phone || '').trim().slice(0, 40);
    const loginMethod = String(body.loginMethod || 'namoid').toLowerCase();
    const allowedMethods = new Set([
      'namoid-email', 'namoid-phone', 'namoid', 'firebase-email-password',
      'firebase-phone', 'google', 'anonymous',
    ]);
    const method = allowedMethods.has(loginMethod) ? loginMethod : 'namoid';
    const now = new Date().toISOString();

    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      const existing = snapshot.data() || {};
      const role = existing.role === 'admin' ? 'admin'
        : existing.role === 'worker' && existing.status === 'APPROVED' ? 'worker'
        : (existing.role || 'citizen');
      transaction.set(userRef, {
        ...safeProfile,
        uid,
        name: existing.name || safeProfile.name || String(body.name || decoded.name || email.split('@')[0] || 'PunchX Member'),
        email: existing.email || email || safeProfile.email || '',
        phone: existing.phone || phone || safeProfile.phone || '',
        role,
        createdAt: existing.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        lastSeen: FieldValue.serverTimestamp(),
        lastLoginAtIso: now,
        loginCount: Number(existing.loginCount || 0) + 1,
        lastLoginMethod: method,
        authProvider: method.startsWith('firebase-') ? 'Firebase' : method === 'google' ? 'Google' : method === 'anonymous' ? 'Firebase Anonymous' : 'NamoID',
      }, { merge: true });

      transaction.set(historyRef, {
        id: historyRef.id,
        uid,
        role,
        loginMethod: method,
        email,
        phone,
        timestamp: FieldValue.serverTimestamp(),
        timestampIso: now,
      });
    });

    return res.status(200).json({ success: true, uid });
  } catch (error: any) {
    console.error('Firebase session audit failed:', error);
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 500 ? status : 503).json({
      success: false,
      error: status >= 400 && status < 500
        ? String(error?.message || 'Authentication required')
        : 'Firebase could not save the sign-in session. Check Firebase Admin credentials and Firestore access.',
    });
  }
}
