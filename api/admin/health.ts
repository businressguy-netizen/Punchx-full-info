import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdapter } from '../../src/backend/db/index.js';

const ALLOWED_ORIGINS = [
  'https://www.punchxapp.co.in',
  'https://punchxapp.co.in',
  'https://businressguy-netizen.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.github.io')) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  if (isAllowedOrigin(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://businressguy-netizen.github.io');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, X-Requested-With, x-admin-key, X-Admin-Key'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const adminKey =
    (req.headers['x-admin-key'] as string) ||
    (req.headers['X-Admin-Key'] as string) ||
    req.headers['authorization']?.replace('Bearer ', '').trim();

  const expectedKey = process.env.ADMIN_API_KEY || 'punchx_admin_secure_live_key_2026_9941a8';
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid admin key' });
  }

  let isHealthy = false;
  try {
    isHealthy = await dbAdapter.isHealthy();
  } catch {
    isHealthy = false;
  }

  return res.status(200).json({
    success: true,
    status: 'connected',
    platform: 'PunchX Core Production Backend (Vercel Serverless)',
    version: '1.0.0',
    dbProvider: dbAdapter.providerName,
    dbHealthy: isHealthy,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

