import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const EDITABLE_FIELDS = [
  'name',
  'phone',
  'address',
  'streetAddress',
  'landmark',
  'area',
  'city',
  'sector',
  'workerSkill',
  'workerCategories',
  'categories',
  'customSkill',
  'workerExperience',
  'visitingFee',
  'minimumVisitingFee',
  'maximumVisitingFee',
  'bio',
  'photoURL',
] as const;

function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (encoded) {
    const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }

  throw new Error('Firebase Admin authentication is not configured on the server');
}

async function requireUid(req: VercelRequest) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }
  ensureFirebaseAdmin();
  const token = authorization.slice(7).trim();
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  const decoded = await getAuth().verifyIdToken(token);
  return decoded.uid;
}

function cleanPayload(body: any) {
  const output: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      output[field] = body[field];
    }
  }

  if (typeof output.name !== 'string' || !output.name.trim()) {
    throw Object.assign(new Error('Full name is required'), { status: 400 });
  }
  if (typeof output.phone !== 'string') throw Object.assign(new Error('Phone must be text'), { status: 400 });
  if (typeof output.address !== 'string') throw Object.assign(new Error('Address must be text'), { status: 400 });
  if (output.workerCategories !== undefined && (!Array.isArray(output.workerCategories) || output.workerCategories.some((x) => typeof x !== 'string'))) {
    throw Object.assign(new Error('Service categories must be a list of text values'), { status: 400 });
  }
  if (output.categories !== undefined && (!Array.isArray(output.categories) || output.categories.some((x) => typeof x !== 'string'))) {
    throw Object.assign(new Error('Categories must be a list of text values'), { status: 400 });
  }
  const hasMinimum = output.minimumVisitingFee !== undefined;
  const hasMaximum = output.maximumVisitingFee !== undefined;
  if (hasMinimum !== hasMaximum) throw Object.assign(new Error('Both minimum and maximum visiting fees are required'), { status: 400 });
  if (hasMinimum && hasMaximum) {
    const minFee = Number(output.minimumVisitingFee); const maxFee = Number(output.maximumVisitingFee);
    if (!Number.isFinite(minFee) || minFee < 49) throw Object.assign(new Error('Minimum visiting fee cannot be below ₹49. Enter ₹49 or more to continue.'), { status: 400 });
    if (!Number.isFinite(maxFee) || maxFee < 49 || maxFee > 349) throw Object.assign(new Error('Maximum visiting fee must be between ₹49 and ₹349.'), { status: 400 });
    if (minFee > maxFee) throw Object.assign(new Error('Minimum visiting fee cannot be greater than maximum visiting fee.'), { status: 400 });
    output.visitingFee = minFee;
  } else if (output.visitingFee !== undefined && output.visitingFee !== null && (!Number.isFinite(Number(output.visitingFee)) || Number(output.visitingFee) < 49 || Number(output.visitingFee) > 349)) {
    throw Object.assign(new Error('Visiting fee must be between ₹49 and ₹349'), { status: 400 });
  }
  if (typeof output.photoURL === 'string' && output.photoURL.length > 500000) {
    throw Object.assign(new Error('Profile photo is too large'), { status: 400 });
  }

  return output;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const uid = await requireUid(req);
    const firestore = getFirestore();
    const ref = firestore.collection('users').doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Worker profile not found' });
    }

    const existing = snap.data() || {};
    if (existing.role !== 'worker') {
      return res.status(403).json({ success: false, error: 'Worker profile authorization required' });
    }

    const editable = cleanPayload(req.body || {});
    const updatedAt = new Date().toISOString();

    await ref.set(
      {
        ...editable,
        uid,
        role: existing.role,
        updatedAt,
      },
      { merge: true },
    );

    return res.status(200).json({ success: true, uid, updatedAt });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    console.error('Worker profile update failed:', error);
    return res.status(status >= 400 && status < 500 ? status : 500).json({
      success: false,
      error: status >= 400 && status < 500 ? String(error?.message || 'Profile update rejected') : 'Unable to save worker profile right now',
    });
  }
}
