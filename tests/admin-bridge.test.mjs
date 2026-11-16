import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const adminRoutes = read('../src/backend/routes/adminBridgeRoutes.ts');
const adminUi = read('../src/components/AdminCommandCenter.tsx');
const health = read('../api/admin/health.ts');
const firestoreRules = read('../firestore.rules');
const adminPortal = read('../src/components/AdminBridgePortal.tsx');

test('admin API verifies Firebase bearer tokens and checks the database admin role', () => {
  assert.match(adminRoutes, /verifyIdToken\(/);
  assert.match(adminRoutes, /profile\.role !== 'admin'/);
  assert.match(adminRoutes, /status\(403\)/);
  assert.doesNotMatch(adminRoutes, /x-admin-key/i);
});

test('standalone admin health endpoint has no static fallback key', () => {
  assert.match(health, /verifyIdToken\(/);
  assert.match(health, /profile\.role !== 'admin'/);
  assert.doesNotMatch(health, /ADMIN_API_KEY|x-admin-key|punchx_admin_secure_live_key/i);
});

test('legacy admin portal uses the signed-in Firebase bearer token', () => {
  assert.match(adminPortal, /getIdToken\(/);
  assert.match(adminPortal, /Authorization: `Bearer/);
  assert.doesNotMatch(adminPortal, /x-admin-key|punchx_admin_secure_live_key/i);
});

test('professional applications are private to their owner and admins', () => {
  assert.equal((firestoreRules.match(/allow read: if isAdmin\(\) \|\| isApplicationOwner\(resource\.data\);/g) || []).length, 2);
  assert.doesNotMatch(firestoreRules, /allow read: if signedIn\(\) \|\| true/);
});

test('professional application creation requires its owner and pending status', () => {
  assert.match(firestoreRules, /function validApplicationCreate\(\)\s*\{\s*return signedIn\(\)/);
  assert.match(firestoreRules, /request\.resource\.data\.uid == request\.auth\.uid/);
  assert.match(firestoreRules, /request\.resource\.data\.status == 'PENDING'/);
  assert.doesNotMatch(firestoreRules, /request\.resource\.data\.status in \['PENDING', 'APPROVED'\]/);
});

test('users cannot self-edit their protected account status', () => {
  const userRules = firestoreRules.slice(firestoreRules.indexOf('match /users/{userId}'), firestoreRules.indexOf('match /workerApplications/{appId}'));
  assert.doesNotMatch(userRules, /'applicationId',\s*'status'/);
});

test('admin dispatch only accepts confirmed, unassigned orders and approved professionals', () => {
  assert.match(adminRoutes, /order\.status !== 'CUSTOMER_CONFIRMED' \|\| order\.workerId/);
  assert.match(adminRoutes, /professional\.status !== 'APPROVED'/);
  assert.match(adminRoutes, /updateOrderStatus\(order\.id, 'DISPATCHING'/);
});

test('admin refresh callback is stable when notification props change', () => {
  assert.match(adminUi, /useEffect\(\(\) => \{ notificationRef\.current = showNotification; \}, \[showNotification\]\)/);
  assert.match(adminUi, /\}, \[request\]\);/);
  assert.doesNotMatch(adminUi, /\}, \[request, showNotification\]\);/);
});
