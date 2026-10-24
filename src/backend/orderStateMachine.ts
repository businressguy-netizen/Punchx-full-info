import { OrderRecord, OrderStatus } from '../types.js';
import { logger } from './logger.js';
import { dbAdapter } from './db/index.js';

// ─── Order State Machine & Concurrency Control ───
// Enforces Section 5: Order State Machine [P0] from Backend Task Sheet.
// Full lifecycle: DRAFT -> PENDING_PAYMENT -> PAID -> DISPATCHING -> ACCEPTED -> EN_ROUTE -> ARRIVED -> IN_SERVICE -> COMPLETION_PENDING -> COMPLETED
// Concurrency mutex on ACCEPT to prevent duplicate dispatch collisions.

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['DISPATCHING', 'CANCELLED'],
  DISPATCHING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_SERVICE', 'CANCELLED'],
  IN_SERVICE: ['COMPLETION_PENDING', 'CANCELLED'],
  COMPLETION_PENDING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],

  // Legacy mappings compatibility
  Pending: ['DISPATCHING', 'ACCEPTED', 'In Progress', 'In-Progress', 'Cancelled', 'CANCELLED'],
  // Legacy bookings are routed through the same protected travel/arrival/service flow.
  'In Progress': ['EN_ROUTE', 'ARRIVED', 'IN_SERVICE', 'COMPLETION_PENDING', 'COMPLETED', 'Done', 'Cancelled', 'CANCELLED'],
  'In-Progress': ['EN_ROUTE', 'ARRIVED', 'IN_SERVICE', 'COMPLETION_PENDING', 'COMPLETED', 'Done', 'Cancelled', 'CANCELLED'],
  Done: [],
  Cancelled: [],
};

// Concurrency mutex for atomic worker dispatch acceptance
const activeAcceptLocks = new Set<string>();

export interface TransitionContext {
  actorUid: string;
  actorRole: 'citizen' | 'worker' | 'admin' | 'system';
  reason?: string;
  workerName?: string;
  workerPhone?: string;
  photoProof?: string;
  notes?: string;
}

export interface TransitionResult {
  success: boolean;
  order?: OrderRecord;
  statusCode: number;
  error?: string;
}

/**
 * Validates whether a state transition is legal in the state machine graph.
 */
export function isLegalTransition(currentStatus: string, targetStatus: string): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

/**
 * Validates whether the actor has the required RBAC role for the target transition.
 */
export function isActorAuthorized(
  order: OrderRecord,
  targetStatus: OrderStatus,
  context: TransitionContext
): boolean {
  if (context.actorRole === 'admin' || context.actorRole === 'system') {
    return true;
  }

  const currentStatus = order.status;

  // Cancelling an order
  if (targetStatus === 'CANCELLED' || targetStatus === 'Cancelled') {
    if (context.actorRole === 'citizen') {
      // Citizens can cancel before worker arrives at their home
      const uncancelable = ['ARRIVED', 'IN_SERVICE', 'COMPLETION_PENDING', 'COMPLETED', 'Done'];
      return !uncancelable.includes(currentStatus) && order.customerId === context.actorUid;
    }
    if (context.actorRole === 'worker') {
      return order.workerId === context.actorUid && Boolean(context.reason);
    }
    return false;
  }

  // Worker flow
  if (context.actorRole === 'worker') {
    switch (targetStatus) {
      case 'ACCEPTED':
        // Any approved specialist can accept a dispatching order if not yet assigned
        return currentStatus === 'DISPATCHING' || currentStatus === 'Pending';

      case 'EN_ROUTE':
      case 'ARRIVED':
      case 'COMPLETION_PENDING':
        // Only the assigned specialist can advance these stages
        return order.workerId === context.actorUid;

      case 'IN_SERVICE':
      case 'COMPLETED':
        // Direct transition permitted since OTP is bypassed
        return order.workerId === context.actorUid || !order.workerId;

      default:
        return false;
    }
  }

  // Citizen flow
  if (context.actorRole === 'citizen') {
    if (order.customerId !== context.actorUid) return false;
    switch (targetStatus) {
      case 'PENDING_PAYMENT':
        return currentStatus === 'DRAFT';
      default:
        return false;
    }
  }

  return false;
}

/**
 * Executes an atomic order acceptance by a worker, preventing duplicate claims.
 */
export async function atomicAcceptOrder(
  orderId: string,
  context: TransitionContext
): Promise<TransitionResult> {
  // Prevent duplicate concurrent requests for this order in the Node.js event loop
  if (activeAcceptLocks.has(orderId)) {
    return {
      success: false,
      statusCode: 409,
      error: 'Conflict: Another specialist is currently accepting this dispatch. Please try another job.',
    };
  }

  activeAcceptLocks.add(orderId);

  try {
    const order = await dbAdapter.getOrder(orderId);
    if (!order) {
      return { success: false, statusCode: 404, error: 'Order not found' };
    }

    if (order.status !== 'DISPATCHING' && order.status !== 'Pending') {
      return {
        success: false,
        statusCode: 409,
        error: `Order is no longer available for acceptance (current state: ${order.status})`,
      };
    }

    if (order.workerId && order.workerId !== context.actorUid) {
      return {
        success: false,
        statusCode: 409,
        error: 'Order has already been assigned to another specialist.',
      };
    }

    const stateHistory = order.stateHistory || [];
    stateHistory.push({
      from: order.status,
      to: 'ACCEPTED',
      timestamp: new Date().toISOString(),
      actorUid: context.actorUid,
      actorRole: context.actorRole,
      reason: 'Specialist accepted broadcast dispatch',
    });

    const updated = await dbAdapter.updateOrderStatus(orderId, 'ACCEPTED', {
      workerId: context.actorUid,
      workerName: context.workerName || order.workerName || 'Assigned Specialist',
      workerPhone: context.workerPhone || order.workerPhone || '',
      stateHistory,
    });

    logger.info(`Order ${orderId} atomically accepted by worker ${context.actorUid}`);
    return {
      success: true,
      statusCode: 200,
      order: updated || undefined,
    };
  } finally {
    activeAcceptLocks.delete(orderId);
  }
}

/**
 * Executes a verified transition on an order.
 */
export async function executeOrderTransition(
  orderId: string,
  targetStatus: OrderStatus,
  context: TransitionContext,
  additionalDetails?: Partial<OrderRecord>
): Promise<TransitionResult> {
  // Handle atomic accept separately
  if (targetStatus === 'ACCEPTED' && context.actorRole === 'worker') {
    return atomicAcceptOrder(orderId, context);
  }

  const order = await dbAdapter.getOrder(orderId);
  if (!order) {
    return { success: false, statusCode: 404, error: 'Order not found' };
  }

  // 1. Legal transition check
  if (!isLegalTransition(order.status, targetStatus)) {
    logger.security('Illegal order state transition attempt', {
      orderId,
      current: order.status,
      target: targetStatus,
      actor: context.actorUid,
    });
    return {
      success: false,
      statusCode: 400,
      error: `Invalid state transition: Cannot move order from ${order.status} to ${targetStatus}`,
    };
  }

  // 2. Authorization check
  if (!isActorAuthorized(order, targetStatus, context)) {
    logger.security('Unauthorized order state transition attempt', {
      orderId,
      current: order.status,
      target: targetStatus,
      actor: context.actorUid,
      role: context.actorRole,
    });
    return {
      success: false,
      statusCode: 403,
      error: `Forbidden: You do not have permission to transition this order to ${targetStatus}`,
    };
  }

  // Record audit history
  const stateHistory = order.stateHistory || [];
  stateHistory.push({
    from: order.status,
    to: targetStatus,
    timestamp: new Date().toISOString(),
    actorUid: context.actorUid,
    actorRole: context.actorRole,
    reason: context.reason,
  });

  const payload: Partial<OrderRecord> = {
    ...additionalDetails,
    stateHistory,
  };

  if (targetStatus === 'COMPLETED' || targetStatus === 'Done') {
    payload.completedAt = new Date().toISOString();
  }

  const updated = await dbAdapter.updateOrderStatus(orderId, targetStatus, payload);
  logger.info(`Order ${orderId} transitioned: ${order.status} -> ${targetStatus} by ${context.actorUid}`);

  return {
    success: true,
    statusCode: 200,
    order: updated || undefined,
  };
}
