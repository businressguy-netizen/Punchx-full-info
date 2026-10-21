import assert from 'assert';
import crypto from 'crypto';
import { calculateAuthoritativeQuote } from '../src/backend/pricingService.js';
import {
  isLegalTransition,
  isActorAuthorized,
  atomicAcceptOrder,
  executeOrderTransition,
} from '../src/backend/orderStateMachine.js';
import { generateSecureOtp, verifyOtpChallenge } from '../src/backend/otpService.js';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
  isEventProcessed,
  recordProcessedEvent,
} from '../src/backend/paymentService.js';
import { updateWorkerLocationTelemetry, getOrderTrackingStatus } from '../src/backend/trackingService.js';
import { dbAdapter } from '../src/backend/db/index.js';
import { OrderRecord } from '../src/types.js';

console.log('─── RUNNING PUNCHX BACKEND SECURITY & INTEGRATION TEST SUITE ───\n');

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err?.message || err}`);
    failedTests++;
  }
}

async function runTests() {
  // ─── 1. AUTHORITATIVE PRICING ENGINE TESTS ───
  console.log('\n[Suite 1: Authoritative Pricing & Quotes - Task Sheet Section 6]');

  await test('Calculates baseline quote for standard service', () => {
    const quote = calculateAuthoritativeQuote({ serviceId: 'ac' });
    assert.strictEqual(quote.baseVisitingFee, 199);
    assert.strictEqual(quote.customerPlatformFee, 29);
    assert.strictEqual(quote.emergencySurcharge, 0);
    // Subtotal: 199, Taxable: 199 + 29 = 228, GST 18%: 41.04, Total: 269
    assert.strictEqual(quote.totalAmountToPay, 269);
    assert.strictEqual(quote.platformCommission, 30); // 15% of 199 = 29.85 -> 30
    assert.strictEqual(quote.professionalPayout, 169); // 199 - 30 = 169
  });

  await test('Calculates emergency surcharge correctly', () => {
    const quote = calculateAuthoritativeQuote({ serviceId: 'electrical', isEmergency: true });
    assert.strictEqual(quote.baseVisitingFee, 179);
    assert.strictEqual(quote.emergencySurcharge, 99);
    assert.strictEqual(quote.subtotalBeforeDiscount, 278);
  });

  await test('Applies FIRST50 welcome coupon server-side', () => {
    const quote = calculateAuthoritativeQuote({ serviceId: 'ac', couponCode: 'FIRST50' });
    assert.strictEqual(quote.couponValid, true);
    assert.strictEqual(quote.couponUsed, 'FIRST50');
    // 50% of 199 is 99.5 capped at 100 -> 100
    assert.strictEqual(quote.discountApplied, 100);
    assert.strictEqual(quote.subtotalAfterDiscount, 99);
  });

  await test('Rejects invalid promo code and maintains authoritative total', () => {
    const quote = calculateAuthoritativeQuote({ serviceId: 'plumbing', couponCode: 'FAKE_CODE' });
    assert.strictEqual(quote.couponValid, false);
    assert.strictEqual(quote.discountApplied, 0);
    assert.strictEqual(quote.couponUsed, null);
  });

  // ─── 2. ORDER STATE MACHINE & RBAC TESTS ───
  console.log('\n[Suite 2: Order State Machine & RBAC - Task Sheet Section 5]');

  await test('Allows legal forward state transitions', () => {
    assert.strictEqual(isLegalTransition('DRAFT', 'PENDING_PAYMENT'), true);
    assert.strictEqual(isLegalTransition('PENDING_PAYMENT', 'PAID'), true);
    assert.strictEqual(isLegalTransition('PAID', 'DISPATCHING'), true);
    assert.strictEqual(isLegalTransition('DISPATCHING', 'ACCEPTED'), true);
    assert.strictEqual(isLegalTransition('ACCEPTED', 'EN_ROUTE'), true);
    assert.strictEqual(isLegalTransition('EN_ROUTE', 'ARRIVED'), true);
    assert.strictEqual(isLegalTransition('ARRIVED', 'IN_SERVICE'), true);
    assert.strictEqual(isLegalTransition('IN_SERVICE', 'COMPLETION_PENDING'), true);
    assert.strictEqual(isLegalTransition('COMPLETION_PENDING', 'COMPLETED'), true);
  });

  await test('Blocks illegal jump transitions (e.g. DRAFT to COMPLETED)', () => {
    assert.strictEqual(isLegalTransition('DRAFT', 'COMPLETED'), false);
    assert.strictEqual(isLegalTransition('PENDING_PAYMENT', 'IN_SERVICE'), false);
    assert.strictEqual(isLegalTransition('DISPATCHING', 'COMPLETED'), false);
    assert.strictEqual(isLegalTransition('COMPLETED', 'DISPATCHING'), false); // Cannot rewind completed order
  });

  await test('Enforces role permissions on transitions', () => {
    const dummyOrder: OrderRecord = {
      id: 'ORD-TEST-1',
      category: 'AC',
      workerName: 'Specialist A',
      price: 199,
      date: '2026-10-04',
      status: 'ARRIVED',
      customerId: 'citizen_123',
      workerId: 'worker_456',
    };

    // Citizen cannot force an order directly to COMPLETED
    const citizenCanComplete = isActorAuthorized(dummyOrder, 'COMPLETED', {
      actorUid: 'citizen_123',
      actorRole: 'citizen',
    });
    assert.strictEqual(citizenCanComplete, false);

    // Unassigned worker cannot modify order
    const randomWorkerCanModify = isActorAuthorized(dummyOrder, 'COMPLETION_PENDING', {
      actorUid: 'random_worker_999',
      actorRole: 'worker',
    });
    assert.strictEqual(randomWorkerCanModify, false);

    // A worker cannot start service without an OTP verification context.
    const assignedWorkerWithoutOtpCanStart = isActorAuthorized(dummyOrder, 'IN_SERVICE', {
      actorUid: 'worker_456',
      actorRole: 'worker',
    });
    assert.strictEqual(assignedWorkerWithoutOtpCanStart, false);

    const assignedWorkerWithOtpCanStart = isActorAuthorized(dummyOrder, 'IN_SERVICE', {
      actorUid: 'worker_456',
      actorRole: 'worker',
      otpVerified: true,
    });
    assert.strictEqual(assignedWorkerWithOtpCanStart, true);

    // An unassigned worker cannot start service even with a verified challenge.
    const unassignedWorkerCanStart = isActorAuthorized({ ...dummyOrder, workerId: undefined }, 'IN_SERVICE', {
      actorUid: 'worker_456',
      actorRole: 'worker',
      otpVerified: true,
    });
    assert.strictEqual(unassignedWorkerCanStart, false);

    // Citizen can cancel order before arrival
    const orderBeforeArrival: OrderRecord = { ...dummyOrder, status: 'DISPATCHING' };
    const citizenCanCancel = isActorAuthorized(orderBeforeArrival, 'CANCELLED', {
      actorUid: 'citizen_123',
      actorRole: 'citizen',
    });
    assert.strictEqual(citizenCanCancel, true);

    // Citizen cannot cancel order after worker has arrived
    const citizenCanCancelAfterArrival = isActorAuthorized(dummyOrder, 'CANCELLED', {
      actorUid: 'citizen_123',
      actorRole: 'citizen',
    });
    assert.strictEqual(citizenCanCancelAfterArrival, false);
  });

  await test('Atomic worker acceptance prevents double-booking collision (concurrency lock)', async () => {
    const orderId = `ORD-COLLISION-${Date.now()}`;
    await dbAdapter.createOrder({
      id: orderId,
      category: 'AC Repair',
      workerName: 'Matching Specialist...',
      price: 199,
      date: '2026-10-04',
      status: 'DISPATCHING',
      customerId: 'user_cust_1',
    });

    // Worker 1 accepts
    const res1 = await atomicAcceptOrder(orderId, {
      actorUid: 'worker_1',
      actorRole: 'worker',
      workerName: 'Specialist Rahul',
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.statusCode, 200);

    // Worker 2 attempts to accept the same order
    const res2 = await atomicAcceptOrder(orderId, {
      actorUid: 'worker_2',
      actorRole: 'worker',
      workerName: 'Specialist Suresh',
    });
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.statusCode, 409); // Conflict
  });

  // ─── 3. CRYPTOGRAPHIC DYNAMIC OTP TESTS ───
  console.log('\n[Suite 3: Cryptographic Dynamic OTP - Task Sheet Section 8]');

  await test('Generates cryptographically random 6-digit OTP with salt & hash', () => {
    const otp = generateSecureOtp();
    assert.strictEqual(otp.code.length, 6);
    assert.match(otp.code, /^\d{6}$/);
    assert.strictEqual(typeof otp.hash, 'string');
    assert.strictEqual(otp.hash.length, 64); // SHA-256 is 64 hex chars
    assert.strictEqual(typeof otp.salt, 'string');
    assert.ok(new Date(otp.expiresAt).getTime() > Date.now());
  });

  await test('Verifies matching OTP successfully with constant-time comparison', () => {
    const otp = generateSecureOtp();
    const result = verifyOtpChallenge(otp.code, {
      hash: otp.hash,
      salt: otp.salt,
      expiresAt: otp.expiresAt,
      attempts: 0,
    });
    assert.strictEqual(result.valid, true);
  });

  await test('Rejects incorrect OTP and reports remaining attempts', () => {
    const otp = generateSecureOtp();
    const result = verifyOtpChallenge('000000', {
      hash: otp.hash,
      salt: otp.salt,
      expiresAt: otp.expiresAt,
      attempts: 0,
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.attemptsRemaining, 2);
    assert.strictEqual(result.locked, false);
  });

  await test('Locks out challenge after 3 failed attempts', () => {
    const otp = generateSecureOtp();
    const result = verifyOtpChallenge('111111', {
      hash: otp.hash,
      salt: otp.salt,
      expiresAt: otp.expiresAt,
      attempts: 3, // Already failed 3 times
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.locked, true);
  });

  await test('Rejects expired OTP', () => {
    const otp = generateSecureOtp();
    const expiredRecord = {
      hash: otp.hash,
      salt: otp.salt,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      attempts: 0,
    };
    const result = verifyOtpChallenge(otp.code, expiredRecord);
    assert.strictEqual(result.valid, false);
    assert.match(result.error || '', /expired/i);
  });

  // ─── 4. PAYMENT GATEWAY & SIGNATURE TESTS ───
  console.log('\n[Suite 4: Payment Gateway & Webhook Signature - Task Sheet Section 7]');

  await test('Verifies valid HMAC-SHA256 payment signature', () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_12345';
    const orderId = 'order_987654';
    const paymentId = 'pay_123456';
    const signature = crypto
      .createHmac('sha256', 'test_secret_12345')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = verifyPaymentSignature(orderId, paymentId, signature);
    assert.strictEqual(isValid, true);
  });

  await test('Rejects forged or tampered payment signature', () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_12345';
    const isValid = verifyPaymentSignature('order_987654', 'pay_123456', 'bad_forged_signature_hex');
    assert.strictEqual(isValid, false);
  });

  await test('Enforces idempotency to reject duplicate webhook replay', () => {
    const eventId = `evt_test_${Date.now()}`;
    assert.strictEqual(isEventProcessed(eventId), false);
    recordProcessedEvent(eventId, 'payment.captured');
    assert.strictEqual(isEventProcessed(eventId), true);
  });

  // ─── 5. LIVE TRACKING & GEOFENCING TESTS ───
  console.log('\n[Suite 5: Live Location Tracking & Geofencing - Task Sheet Section 9]');

  await test('Ingests worker telemetry and calculates distance and ETA', async () => {
    const orderId = `ORD-TRACK-${Date.now()}`;
    await dbAdapter.createOrder({
      id: orderId,
      category: 'Electrical Systems',
      workerName: 'Specialist Arjun',
      price: 179,
      date: '2026-10-04',
      status: 'EN_ROUTE',
      customerId: 'cust_bengaluru',
      workerId: 'worker_arjun',
      customerLocation: { lat: 12.9716, lng: 77.5946 }, // Bengaluru center
    });

    // Update worker location 1km away
    const updateRes = await updateWorkerLocationTelemetry({
      orderId,
      workerUid: 'worker_arjun',
      lat: 12.9800,
      lng: 77.5946,
      heading: 180,
      accuracy: 5,
    });
    assert.strictEqual(updateRes.success, true);

    // Query tracking
    const trackingRes = await getOrderTrackingStatus(orderId, 'cust_bengaluru', 'citizen');
    assert.strictEqual(trackingRes.success, true);
    assert.ok(trackingRes.tracking);
    assert.ok(trackingRes.tracking.distanceKm > 0 && trackingRes.tracking.distanceKm < 2.0);
    assert.ok(trackingRes.tracking.etaMinutes >= 2);
  });

  await test('Rejects telemetry from unassigned specialist (IDOR guard)', async () => {
    const orderId = `ORD-IDOR-TRACK-${Date.now()}`;
    await dbAdapter.createOrder({
      id: orderId,
      category: 'Plumbing',
      workerName: 'Specialist Ramesh',
      price: 159,
      date: '2026-10-04',
      status: 'EN_ROUTE',
      customerId: 'cust_1',
      workerId: 'worker_legit',
    });

    const res = await updateWorkerLocationTelemetry({
      orderId,
      workerUid: 'worker_imposter',
      lat: 12.97,
      lng: 77.59,
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.statusCode, 403);
  });

  console.log(`\n────────────────────────────────────────────────────────────`);
  console.log(`RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`────────────────────────────────────────────────────────────\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
