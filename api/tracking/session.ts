import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPunchxFirestore, requireFirebaseUid } from '../_lib/firebaseAdmin';

type TrackingAction = 'start_journey' | 'arrived' | 'start_service' | 'complete_service' | 'cancel_booking';

const allowedActions: TrackingAction[] = ['start_journey', 'arrived', 'start_service', 'complete_service', 'cancel_booking'];

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

  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
  const action = req.body?.action as TrackingAction;
  const requestedSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';

  if (!orderId || orderId.length > 180 || !allowedActions.includes(action)) {
    return res.status(400).json({ success: false, error: 'A valid booking ID and tracking action are required.' });
  }

  try {
    const firestore = getPunchxFirestore();
    const orderRef = firestore.collection('orders').doc(orderId);
    const result = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) return { statusCode: 404, success: false, error: 'Booking not found.' };

      const order = snapshot.data() as Record<string, any>;
      const now = new Date().toISOString();
      const history = Array.isArray(order.stateHistory) ? order.stateHistory.slice(-99) : [];
      const appendHistory = (to: string, reason: string, actorRole: 'worker' | 'citizen' = 'worker') => [
        ...history,
        { from: String(order.status || 'UNKNOWN'), to, timestamp: now, actorUid: uid, actorRole, reason },
      ];

      // Cancellation is authorized against the booking customer, not the
      // assigned worker. It also terminates any live GPS session immediately.
      if (action === 'cancel_booking') {
        if (order.customerId !== uid) {
          return { statusCode: 403, success: false, error: 'Only the customer who owns this booking can cancel it.' };
        }
        if (['Done', 'COMPLETED', 'Completed', 'Cancelled', 'CANCELLED'].includes(String(order.status))) {
          return { statusCode: 409, success: false, error: 'This booking can no longer be cancelled.' };
        }
        transaction.update(orderRef, {
          status: 'Cancelled',
          workerOutForWork: false,
          trackingSessionId: FieldValue.delete(),
          workerLocation: FieldValue.delete(),
          trackingLastLocationAt: FieldValue.delete(),
          trackingEndedAt: now,
          cancelledAt: now,
          updatedAt: now,
          stateHistory: appendHistory('Cancelled', 'Customer cancelled the booking and GPS sharing was stopped.', 'citizen'),
        });
        return { statusCode: 200, success: true, status: 'Cancelled' };
      }

      if (order.workerId !== uid) {
        return { statusCode: 403, success: false, error: 'Only the assigned professional can change this tracking session.' };
      }

      if (action === 'start_journey') {
        // Idempotent retry: do not create a second session when the first
        // request succeeded but the response was lost.
        if (order.status === 'EN_ROUTE' && order.workerOutForWork === true && order.trackingSessionId) {
          return { statusCode: 200, success: true, sessionId: String(order.trackingSessionId), status: 'EN_ROUTE' };
        }
        if (!['ACCEPTED', 'In-Progress', 'In Progress'].includes(String(order.status))) {
          return { statusCode: 409, success: false, error: 'Start Journey is available only for an accepted booking.' };
        }

        const sessionId = randomUUID();
        transaction.update(orderRef, {
          status: 'EN_ROUTE',
          workerOutForWork: true,
          trackingSessionId: sessionId,
          trackingStartedAt: now,
          trackingEndedAt: FieldValue.delete(),
          trackingLastLocationAt: FieldValue.delete(),
          workerLocation: FieldValue.delete(),
          updatedAt: now,
          stateHistory: appendHistory('EN_ROUTE', 'Professional started journey; booking-scoped GPS sharing enabled.'),
        });
        return { statusCode: 200, success: true, sessionId, status: 'EN_ROUTE' };
      }

      if (action === 'arrived') {
        if (order.status !== 'EN_ROUTE' || order.workerOutForWork !== true) {
          return { statusCode: 409, success: false, error: 'This booking is not currently tracking an active journey.' };
        }
        if (!requestedSessionId || requestedSessionId !== order.trackingSessionId) {
          return { statusCode: 409, success: false, error: 'Tracking session expired. Refresh the booking and try again.' };
        }
        transaction.update(orderRef, {
          status: 'ARRIVED',
          workerOutForWork: false,
          trackingSessionId: FieldValue.delete(),
          workerLocation: FieldValue.delete(),
          trackingLastLocationAt: FieldValue.delete(),
          trackingEndedAt: now,
          updatedAt: now,
          stateHistory: appendHistory('ARRIVED', 'Professional confirmed arrival; live GPS sharing stopped.'),
        });
        return { statusCode: 200, success: true, status: 'ARRIVED' };
      }

      if (action === 'start_service') {
        if (order.status !== 'ARRIVED') {
          return { statusCode: 409, success: false, error: 'Confirm arrival before starting the service.' };
        }
        transaction.update(orderRef, {
          status: 'IN_SERVICE',
          workerOutForWork: false,
          trackingSessionId: FieldValue.delete(),
          workerLocation: FieldValue.delete(),
          trackingLastLocationAt: FieldValue.delete(),
          trackingEndedAt: now,
          updatedAt: now,
          stateHistory: appendHistory('IN_SERVICE', 'Professional started the service.'),
        });
        return { statusCode: 200, success: true, status: 'IN_SERVICE' };
      }

      if (action === 'complete_service') {
        if (order.status !== 'IN_SERVICE') {
          return { statusCode: 409, success: false, error: 'Start the service before completing this booking.' };
        }
        transaction.update(orderRef, {
          status: 'Done',
          workerOutForWork: false,
          trackingSessionId: FieldValue.delete(),
          workerLocation: FieldValue.delete(),
          trackingLastLocationAt: FieldValue.delete(),
          trackingEndedAt: now,
          completedAt: now,
          updatedAt: now,
          stateHistory: appendHistory('Done', 'Professional marked the service completed.'),
        });
        return { statusCode: 200, success: true, status: 'Done' };
      }

      return { statusCode: 400, success: false, error: 'Unsupported tracking action.' };
    });

    const { statusCode, ...payload } = result;
    return res.status(statusCode).json(payload);
  } catch (error) {
    console.error('PunchX tracking session error:', error);
    return res.status(500).json({ success: false, error: 'Could not update the tracking session. Please retry.' });
  }
}
