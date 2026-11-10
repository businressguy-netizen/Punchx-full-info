import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import { adminRouter, platformSettings } from '../src/backend/routes/adminBridgeRoutes.ts';

const ALLOWED_ORIGINS = [
  'https://www.punchxapp.co.in',
  'https://punchxapp.co.in',
  'https://businressguy-netizen.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.github.io')) return true;
  return false;
};

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedCorsOrigin(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-admin-key', 'X-Admin-Key'],
}));
app.use(express.json());
app.use('/api/admin', adminRouter);

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('OPTIONS preflight request from GitHub Pages origin is allowed with 204 and CORS headers', async () => {
  const res = await fetch(`${baseUrl}/api/admin/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://businressguy-netizen.github.io',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'x-admin-key',
    },
  });

  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://businressguy-netizen.github.io');
  assert.ok(res.headers.get('access-control-allow-headers')?.toLowerCase().includes('x-admin-key'));
});

test('GET /api/admin/health without x-admin-key is rejected with 401', async () => {
  const res = await fetch(`${baseUrl}/api/admin/health`, {
    method: 'GET',
    headers: {
      'Origin': 'https://businressguy-netizen.github.io',
    },
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('GET /api/admin/health with valid x-admin-key returns 200 connected handshake', async () => {
  const res = await fetch(`${baseUrl}/api/admin/health`, {
    method: 'GET',
    headers: {
      'Origin': 'https://businressguy-netizen.github.io',
      'x-admin-key': 'punchx_admin_secure_live_key_2026_9941a8',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://businressguy-netizen.github.io');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'connected');
  assert.ok(data.platform.includes('PunchX'));
});

test('GET and POST /api/admin/settings updates dynamic marketplace parameters', async () => {
  const getRes = await fetch(`${baseUrl}/api/admin/settings`, {
    headers: {
      'x-admin-key': 'punchx_admin_secure_live_key_2026_9941a8',
    },
  });
  assert.equal(getRes.status, 200);
  const initialData = await getRes.json();
  assert.equal(initialData.success, true);

  const updateRes = await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'punchx_admin_secure_live_key_2026_9941a8',
    },
    body: JSON.stringify({ convenienceFee: 35, emergencySurcharge: 120 }),
  });
  assert.equal(updateRes.status, 200);
  const updatedData = await updateRes.json();
  assert.equal(updatedData.success, true);
  assert.equal(updatedData.settings.convenienceFee, 35);
  assert.equal(updatedData.settings.emergencySurcharge, 120);

  // Restore defaults
  await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'punchx_admin_secure_live_key_2026_9941a8',
    },
    body: JSON.stringify({ convenienceFee: 29, emergencySurcharge: 99 }),
  });
});
