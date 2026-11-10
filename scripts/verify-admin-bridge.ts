import express from 'express';
import { adminRouter, platformSettings } from '../src/backend/routes/adminBridgeRoutes.js';
import { calculateAuthoritativeQuote } from '../src/backend/pricingService.js';
import { dbAdapter } from '../src/backend/db/index.js';

async function runVerification() {
  console.log('🚀 [TEST 1/8] Setting up Test Express Harness for Admin Bridge...');
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/admin`;
  const validKey = process.env.ADMIN_API_KEY;
  if (!validKey || validKey.length < 32) throw new Error('Set a newly generated ADMIN_API_KEY (32+ characters) before running this verification.');

  try {
    // 1. Unauthorized check (No header)
    console.log('🔒 [TEST 2/8] Testing authentication: Missing x-admin-key header...');
    const unauthRes = await fetch(`${baseUrl}/health`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected status 401 for missing header, got ${unauthRes.status}`);
    }
    console.log('   ✅ Correctly rejected with 401 Unauthorized.');

    // 2. Unauthorized check (Wrong key)
    console.log('🔒 [TEST 3/8] Testing authentication: Invalid key...');
    const wrongKeyRes = await fetch(`${baseUrl}/health`, {
      headers: { 'x-admin-key': 'wrong_random_key_123' },
    });
    if (wrongKeyRes.status !== 401) {
      throw new Error(`Expected status 401 for wrong key, got ${wrongKeyRes.status}`);
    }
    console.log('   ✅ Correctly rejected with 401 Unauthorized.');

    // 3. Health & Handshake with valid key
    console.log('💓 [TEST 4/8] Testing health probe with valid x-admin-key...');
    const healthRes = await fetch(`${baseUrl}/health`, {
      headers: { 'x-admin-key': validKey },
    });
    if (healthRes.status !== 200) {
      throw new Error(`Expected status 200 for valid key, got ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    if (!healthData.success || healthData.status !== 'connected') {
      throw new Error(`Invalid health response: ${JSON.stringify(healthData)}`);
    }
    console.log('   ✅ Health Handshake Verified:', healthData.platform, `(DB: ${healthData.dbProvider})`);

    // 4. Operational Overview Metrics
    console.log('📊 [TEST 5/8] Testing /overview metrics aggregation...');
    const overviewRes = await fetch(`${baseUrl}/overview`, {
      headers: { 'x-admin-key': validKey },
    });
    if (overviewRes.status !== 200) {
      throw new Error(`Expected status 200 for overview, got ${overviewRes.status}`);
    }
    const overviewData = await overviewRes.json();
    if (!overviewData.success || !overviewData.metrics || !overviewData.settings) {
      throw new Error(`Malformed overview response: ${JSON.stringify(overviewData)}`);
    }
    console.log('   ✅ Overview Metrics Verified:', overviewData.metrics);

    // 5. Worker Onboarding & Dispatch Flow
    console.log('👷 [TEST 6/8] Testing worker onboarding, status update, and dispatch...');
    const workerPostRes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'x-admin-key': validKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: 'test_worker_101',
        legalName: 'Bikram Mondal',
        phone: '+91 98311 22334',
        skill: 'Electrical & Wiring',
        area: 'Salt Lake, Kolkata',
        experienceYears: '4',
        termsAccepted: true,
      }),
    });
    if (workerPostRes.status !== 201) {
      throw new Error(`Expected status 201 for worker creation, got ${workerPostRes.status}`);
    }
    const createdWorker = await workerPostRes.json();
    const workerId = createdWorker.application.id;
    console.log(`   ✅ Worker application created (ID: ${workerId})`);

    // Approve worker
    const patchWorkerRes = await fetch(`${baseUrl}/workers/${workerId}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': validKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', notes: 'Police verification & safety gear approved' }),
    });
    const approvedWorker = await patchWorkerRes.json();
    if (!approvedWorker.success || approvedWorker.application.status !== 'APPROVED') {
      throw new Error(`Failed to approve worker: ${JSON.stringify(approvedWorker)}`);
    }
    console.log('   ✅ Worker approved successfully.');

    // Dispatch job to worker
    const dispatchRes = await fetch(`${baseUrl}/workers/${workerId}/dispatch`, {
      method: 'POST',
      headers: { 'x-admin-key': validKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Somenath Roy',
        customerAddress: 'Sector V, Salt Lake, Kolkata',
        category: 'Emergency Electrical Fix',
        price: 349,
      }),
    });
    const dispatchedJob = await dispatchRes.json();
    if (dispatchRes.status !== 201 || !dispatchedJob.success) {
      throw new Error(`Failed to dispatch job: ${JSON.stringify(dispatchedJob)}`);
    }
    console.log(`   ✅ Job dispatched to worker (Order ID: ${dispatchedJob.order.id}, Status: ${dispatchedJob.order.status})`);

    // 6. Dynamic Platform Settings & Live Pricing Sync
    console.log('⚙️ [TEST 7/8] Testing Dynamic Platform Settings adjustment...');
    const initialQuote = calculateAuthoritativeQuote({ serviceId: 'ac', isEmergency: false });
    console.log(`   Initial quote platform fee: ₹${initialQuote.customerPlatformFee}`);

    // Update convenience fee from ₹29 to ₹45 via admin bridge
    const updateSettingsRes = await fetch(`${baseUrl}/settings`, {
      method: 'POST',
      headers: { 'x-admin-key': validKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenienceFee: 45, emergencySurcharge: 120 }),
    });
    const updatedSettings = await updateSettingsRes.json();
    if (!updatedSettings.success || updatedSettings.settings.convenienceFee !== 45) {
      throw new Error(`Failed to update platform settings: ${JSON.stringify(updatedSettings)}`);
    }
    console.log('   ✅ Settings updated: convenienceFee=₹45, emergencySurcharge=₹120');

    // Verify authoritative quote now uses the updated platform fee
    const updatedQuote = calculateAuthoritativeQuote({ serviceId: 'ac', isEmergency: false });
    if (updatedQuote.customerPlatformFee !== 45) {
      throw new Error(`Expected quote customerPlatformFee to be 45, got ${updatedQuote.customerPlatformFee}`);
    }
    console.log(`   ✅ Dynamic quote verified: New customer platform fee = ₹${updatedQuote.customerPlatformFee}`);

    // Restore default settings
    await fetch(`${baseUrl}/settings`, {
      method: 'POST',
      headers: { 'x-admin-key': validKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ convenienceFee: 29, emergencySurcharge: 99 }),
    });

    // 7. Orders, Claims, Complaints Queries
    console.log('📋 [TEST 8/8] Testing order, claims, and complaints queries...');
    const [ordersRes, claimsRes, complaintsRes] = await Promise.all([
      fetch(`${baseUrl}/orders`, { headers: { 'x-admin-key': validKey } }),
      fetch(`${baseUrl}/claims`, { headers: { 'x-admin-key': validKey } }),
      fetch(`${baseUrl}/complaints`, { headers: { 'x-admin-key': validKey } }),
    ]);

    const ordersData = await ordersRes.json();
    const claimsData = await claimsRes.json();
    const complaintsData = await complaintsRes.json();

    if (!ordersData.success || !claimsData.success || !complaintsData.success) {
      throw new Error('Failed to query orders, claims, or complaints');
    }
    console.log(`   ✅ Queries verified (Orders: ${ordersData.count}, Claims: ${claimsData.count}, Complaints: ${complaintsData.count})`);

    console.log('\n🎉 ALL 8 ADMIN BRIDGE VERIFICATION SUITES PASSED FLAWLESSLY!');
  } finally {
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
