import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPunchxFirestore, requireFirebaseUid } from '../_lib/firebaseAdmin';

const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let uid = '';
  try {
    uid = await requireFirebaseUid(req);
  } catch (error: any) {
    return res.status(Number(error?.status) || 401).json({
      success: false,
      error: Number(error?.status) === 401 ? 'A valid sign-in session is required.' : 'Unable to authenticate this request.',
    });
  }

  const { orderId, sessionId, lat, lng, accuracy, heading, speed } = req.body || {};
  if (
    typeof orderId !== 'string' || !orderId.trim() || orderId.length > 180 ||
    typeof sessionId !== 'string' || !sessionId.trim() ||
    !finiteNumber(lat) || !finiteNumber(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    return res.status(400).json({ success: false, error: 'Valid booking, session and GPS coordinates are required.' });
  }
  if (accuracy !== undefined && accuracy !== null && (!finiteNumber(accuracy) || accuracy < 0 || accuracy > 10000)) {
    return res.status(400).json({ success: false, error: 'GPS accuracy must be a valid number of metres.' });
  }
  if (heading !== undefined && heading !== null && (!finiteNumber(heading) || heading < 0 || heading > 360)) {
    return res.status(400).json({ success: false, error: 'GPS heading must be between 0 and 360 degrees.' });
  }
  if (speed !== undefined && speed !== null && (!finiteNumber(speed) || speed < 0 || speed > 150)) {
    return res.status(400).json({ success: false, error: 'GPS speed is outside the accepted range.' });
  }

  try {
    const firestore = getPunchxFirestore();
    const orderRef = firestore.collection('orders').doc(orderId.trim());
    const result = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) return { statusCode: 404, success: false, error: 'Booking not found.' };

      const order = snapshot.data() as Record<string, any>;
      if (order.workerId !== uid) {
        return { statusCode: 403, success: false, error: 'Only the assigned professional can share this location.' };
      }
      if (
        order.status !== 'EN_ROUTE' ||
        order.workerOutForWork !== true ||
        order.trackingSessionId !== sessionId
      ) {
        return { statusCode: 409, success: false, error: 'This tracking session is no longer active.' };
      }

      const previousUpdate = Date.parse(String(order.workerLocation?.updatedAt || ''));
      const nowMs = Date.now();
      // Bound write frequency server-side as well as in the browser.
      if (Number.isFinite(previousUpdate) && nowMs - previousUpdate < 3000) {
        return {
          statusCode: 200,
          success: true,
          throttled: true,
          updatedAt: String(order.workerLocation.updatedAt),
        };
      }

      const updatedAt = new Date(nowMs).toISOString();
      const workerLocation: Record<string, number | string> = { lat, lng, updatedAt };
      if (finiteNumber(accuracy)) workerLocation.accuracy = accuracy;
      if (finiteNumber(heading)) workerLocation.heading = heading;
      if (finiteNumber(speed)) workerLocation.speed = speed;

      transaction.update(orderRef, {
        workerLocation,
        trackingLastLocationAt: updatedAt,
        updatedAt,
      });
      return { statusCode: 200, success: true, throttled: false, updatedAt };
    });

    const { statusCode, ...payload } = result;
    return res.status(statusCode).json(payload);
  } catch (error) {
    console.error('PunchX worker location update error:', error);
    return res.status(500).json({ success: false, error: 'Could not save this GPS update. Please retry.' });
  }
}
