import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const adminRoutes = read('../src/backend/routes/adminBridgeRoutes.ts');
const adminUi = read('../src/components/AdminCommandCenter.tsx');
const health = read('../api/admin/health.ts');
const firestoreRules = read('../firestore.rules');
const adminPortal = read('../src/components/AdminBridgePortal.tsx');
const server = read('../server.ts');
const authContext = read('../src/lib/authContext.tsx');
const signup = read('../src/components/WorkerSignup.tsx');
const pending = read('../src/components/WorkerPendingApproval.tsx');
const app = read('../src/App.tsx');
const locationSetup = read('../src/components/WorkerLocationSetup.tsx');
const otpPass = read('../src/components/WorkerOtpPass.tsx');

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

test('professional applications require authentication and start pending', () => {
  const start = server.indexOf('app.post("/api/worker-applications", requireFirebaseUser');
  const end = server.indexOf('// Public professional discovery:', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.match(route, /status: "PENDING"/);
  assert.doesNotMatch(route, /status: "APPROVED"|role: "worker"/);
  assert.doesNotMatch(route, /appData\.uid|applicant_\$\{Date\.now\(\)\}/);
});

test('client profile data cannot self-approve a professional', () => {
  assert.match(authContext, /existingData\.role === 'worker' && existingData\.status === 'APPROVED'/);
  assert.doesNotMatch(authContext, /hasWorkerDetails/);
  assert.match(authContext, /initialProfile: UserProfile = \{ \.\.\.fallbackProfile, role: 'citizen' \}/);
  assert.doesNotMatch(authContext, /setDoc\(userDocRef, \{ role: 'worker', status: 'APPROVED' \}/);
});

test('login session ignores client-requested professional role', () => {
  const start = server.indexOf('app.post("/api/auth/session", requireFirebaseUser');
  const end = server.indexOf('// ─── USER PROFILE CRUD APIS ───', start);
  const route = server.slice(start, end);
  assert.doesNotMatch(route, /requestedRole|req\.body\?\.role/);
  assert.match(route, /existing\.role === "worker" && existing\.status === "APPROVED"/);
  assert.match(route, /: "citizen"/);
});

test('Firestore clients cannot create a worker-role user profile', () => {
  const users = firestoreRules.slice(firestoreRules.indexOf('match /users/{userId}'), firestoreRules.indexOf('match /workerApplications/{appId}'));
  assert.match(users, /request\.resource\.data\.role == 'citizen'/);
  assert.doesNotMatch(users, /request\.resource\.data\.role in \['citizen', 'worker'\]/);
});

test('worker status endpoint requires Firebase authentication and returns stored application status', () => {
  const start = server.indexOf('app.get("/api/workers/status", requireFirebaseUser');
  const end = server.indexOf('// Authoritative worker availability endpoint.', start);
  const route = server.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /workerApp\.status === "APPROVED"/);
  assert.match(route, /workerApp\.status === "REJECTED"/);
  assert.doesNotMatch(route, /const status = "APPROVED"|APP-AUTO-APPROVED|getWorkerApplicationByContact|Buffer\.from\(parts\[1\]/);
});

test('professional signup cannot mark itself approved or bypass the server save', () => {
  assert.match(signup, /status: 'PENDING'/);
  assert.match(signup, /Authorization: `Bearer \$\{idToken\}`/);
  assert.match(signup, /onTransition\('worker-pending-approval'\)/);
  assert.doesNotMatch(signup, /status: 'APPROVED'/);
  assert.equal(signup.includes("localStorage.setItem('punchx_worker_approved', 'true')"), false);
});

test('professional pending screen cannot approve itself or read local approval cache', () => {
  assert.match(pending, /if \(appStatus !== 'APPROVED'\)/);
  assert.match(pending, /disabled=\{appStatus !== 'APPROVED'\}/);
  assert.match(pending, /fetch\('\/api\/workers\/status'/);
  assert.doesNotMatch(pending, /punchx_worker_approved|Admin Review Bypassed|setAppStatus\('APPROVED'\)|onSnapshot\(/);
});

test('worker dashboard route requires the server-approved profile role and status', () => {
  assert.match(app, /currentScreen === 'worker-dashboard'[\s\S]*?userProfile\?\.role !== 'worker'[\s\S]*?userProfile\?\.status !== 'APPROVED'/);
  const guardStart = app.indexOf("currentScreen === 'worker-dashboard'");
  const guardEnd = app.indexOf('const onboardingScreens', guardStart);
  const workerGuard = app.slice(guardStart, guardEnd);
  assert.doesNotMatch(workerGuard, /localStorage|punchx_worker_approved/);
});

test('legacy professional location setup cannot self-approve or enter dashboard', () => {
  assert.match(locationSetup, /status: 'PENDING'/);
  assert.match(locationSetup, /onTransition\('worker-pending-approval'\)/);
  assert.doesNotMatch(locationSetup, /status: 'APPROVED'|role: 'worker'/);
  assert.equal(locationSetup.includes("localStorage.setItem('punchx_worker_approved', 'true')"), false);
});

test('legacy OTP step never simulates verification or approval', () => {
  assert.match(otpPass, /OTP is not configured/);
  assert.doesNotMatch(otpPass, /status: 'APPROVED'|punchx_worker_approved|debugPhoneCode|debugEmailCode/);
});

test('OTP endpoint does not return static verification codes', () => {
  const start = server.indexOf('app.post("/api/auth/worker-signup-otp"');
  const end = server.indexOf('// ─── WORKER APPLICATIONS APIS ───', start);
  const route = server.slice(start, end);
  assert.match(route, /status\(410\)/);
  assert.doesNotMatch(route, /debugCodes|123456|success: true/);
});

test('worker customer directory never exposes fabricated customer identities', () => {
  const start = server.indexOf('app.post("/api/worker-location-customers", requireFirebaseUser');
  const end = server.indexOf('// BE-10: AUTH DECISION', start);
  const route = server.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /profile\.role !== "worker"/);
  assert.match(route, /application\?\.status !== "APPROVED"/);
  assert.match(route, /registeredCustomers: \[\]/);
  assert.doesNotMatch(route, /Priya Narayanan|Vikramaditya Rao|CUST-IN-|\+91 9[0-9]{4} •••••|totalPreviousBookings/);
});

test('professional availability cannot promote a pending applicant', () => {
  const start = server.indexOf('app.patch("/api/workers/availability", requireFirebaseUser');
  const end = server.indexOf('app.post("/api/worker-applications"', start);
  const route = server.slice(start, end);
  assert.match(route, /currentData\?\.role === "worker" && currentData\?\.status === "APPROVED"/);
  assert.match(route, /workerApp\?\.uid === uid && workerApp\?\.status === "APPROVED"/);
  assert.doesNotMatch(route, /hasWorkerProfileSignals/);
});
