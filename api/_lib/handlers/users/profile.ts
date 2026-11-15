import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPunchxFirestore, requireFirebaseUid } from '../../firebaseAdmin.js';

const EDITABLE_FIELDS = [
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
    const ref = firestore.collection('users').doc(uid);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field];
    }
    if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (updates.workerCategories !== undefined &&
      (!Array.isArray(updates.workerCategories) || updates.workerCategories.some((value) => typeof value !== 'string'))) {
      return res.status(400).json({ success: false, error: 'Worker categories must be a list of text values.' });
    }

    const snapshot = await ref.get();
    const existing = snapshot.data() || {};
    const updatedAt = new Date().toISOString();
    const saved = {
      ...updates,
      uid,
      role: existing.role || 'citizen',
      status: existing.status,
      updatedAt,
    };
    await ref.set(saved, { merge: true });
    const finalSnapshot = await ref.get();
    return res.status(200).json({ success: true, user: { uid, ...(finalSnapshot.data() || {}) } });
  } catch (error: any) {
    console.error('Firebase profile update failed:', error);
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 500 ? status : 503).json({
      success: false,
      error: status >= 400 && status < 500
        ? String(error?.message || 'Authentication required')
        : 'Firebase could not save your profile. Check Firebase Admin credentials and Firestore access.',
    });
  }
}
