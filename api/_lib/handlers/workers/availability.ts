import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPunchxFirestore, requireFirebaseUid } from '../../firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.setHeader('Allow', 'PATCH, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const uid = await requireFirebaseUid(req);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const nextOnline = Boolean(body.online);
    const updatedAt = new Date().toISOString();

    const firestore = getPunchxFirestore();
    const userRef = firestore.collection('users').doc(uid);

    await userRef.set(
      {
        uid,
        workerAvailability: nextOnline,
        isOnline: nextOnline,
        workerStatus: nextOnline ? 'ONLINE' : 'OFFLINE',
        availabilityUpdatedAt: updatedAt,
        updatedAt,
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      online: nextOnline,
      availabilityUpdatedAt: updatedAt,
    });
  } catch (error: any) {
    console.error('Worker availability API error:', error);
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 500 ? status : 500).json({
      success: false,
      error: error?.message || 'Could not save availability.',
    });
  }
}
