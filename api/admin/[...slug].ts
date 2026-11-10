import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { adminRouter } from '../../src/backend/routes/adminBridgeRoutes.js';

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

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-admin-key', 'X-Admin-Key'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount adminRouter
app.use('/', adminRouter);
app.use('/api/admin', adminRouter);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  if (isAllowedOrigin(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://businressguy-netizen.github.io');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, X-Requested-With, x-admin-key, X-Admin-Key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Normalize req.url so Express router reliably matches regardless of Vercel serverless routing
  const slug = req.query?.slug;
  if (slug) {
    const slugPath = Array.isArray(slug) ? slug.join('/') : slug;
    const queryParams = new URLSearchParams();
    if (req.query && typeof req.query === 'object') {
      for (const [k, v] of Object.entries(req.query)) {
        if (k !== 'slug') {
          if (Array.isArray(v)) {
            v.forEach((val) => queryParams.append(k, val));
          } else if (v !== undefined) {
            queryParams.append(k, String(v));
          }
        }
      }
    }
    const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
    req.url = `/${slugPath}${qStr}`;
  } else if (req.url && req.url.startsWith('/api/admin')) {
    req.url = req.url.replace(/^\/api\/admin/, '') || '/';
  }

  return app(req as any, res as any);
}
