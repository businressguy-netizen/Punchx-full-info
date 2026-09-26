import { FirebaseAdapter } from '../src/backend/db/firebaseAdapter.js';
import { dbAdapter } from '../src/backend/db/index.js';

/**
 * PUNCHX Backend Integration & Database Suite Test Runner
 */

async function runAllBackendTests() {
  console.log('\n======================================================');
  console.log('🚀 PUNCHX FIREBASE & BACKEND TEST SUITE RUNNER');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // TEST 1: Database Adapter Initialization & Health Check
  const db = new FirebaseAdapter();
  const isHealthy = await db.isHealthy();
  assert(isHealthy === true, 'FirebaseAdapter health check');

  // TEST 2: User Upsert & Retrieval
  const testUser = {
    uid: 'TEST-USR-99',
    name: 'Test Citizen',
    email: 'test.citizen@punchxapp.co.in',
    role: 'citizen' as const,
    phone: '+91 99999 88888',
    area: 'Indiranagar',
    sector: 'Sector 2 (Indiranagar)',
  };
  await db.upsertUser(testUser);
  const fetchedUser = await db.getUser('TEST-USR-99');
  assert(fetchedUser !== null && fetchedUser.email === testUser.email, 'User upsert and retrieval');

  // TEST 3: Order Creation & Status Listing
  const testOrder = {
    id: 'TEST-ORD-88',
    category: 'AC Repair',
    price: 199.0,
    totalAmountToPay: 199.0,
    date: '2026-09-18',
    status: 'Pending' as const,
    customerName: 'Test Citizen',
    workerName: 'Ramesh Specialist',
  };
  await db.createOrder(testOrder);
  const fetchedOrder = await db.getOrder('TEST-ORD-88');
  assert(fetchedOrder !== null && fetchedOrder.id === 'TEST-ORD-88', 'Order creation and retrieval');

  // TEST 4: Global dbAdapter Instance Verification
  const globalHealth = await dbAdapter.isHealthy();
  assert(globalHealth === true, 'Global dbAdapter health check');

  console.log('\n------------------------------------------------------');
  console.log(`📊 TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed Cleanly`);
  console.log('------------------------------------------------------\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllBackendTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

