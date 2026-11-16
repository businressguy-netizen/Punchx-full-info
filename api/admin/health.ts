import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { dbAdapter } from '../../src/backend/db/index.js';
import { ensureFirebaseAdmin } from '../_lib/firebaseAdmin.js';

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
  return ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.github.io');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  if (isAllowedOrigin(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ') || !authorization.slice(7).trim()) {
    return res.status(401).json({ success: false, error: 'Admin sign-in required.' });
  }

  try {
    ensureFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(authorization.slice(7).trim());
    const profile = await dbAdapter.getUser(decoded.uid);
    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    const dbHealthy = await dbAdapter.isHealthy();
    return res.status(200).json({
      success: true,
      status: dbHealthy ? 'connected' : 'degraded',
      platform: 'PunchX Core Production Backend (Vercel Serverless)',
      version: '1.0.0',
      dbProvider: dbAdapter.providerName,
      dbHealthy,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Your admin session is invalid or expired.' });
  }
}
