import type { VercelRequest, VercelResponse } from '@vercel/node';
import locationServices from '../location-services.js';
import workerLocationCustomers from '../worker-location-customers.js';

// Keep both legacy location endpoints while sharing one serverless function.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = String(req.url || '').split('?')[0].replace(/\/$/, '');
  if (pathname.endsWith('/location-services')) return locationServices(req, res);
  if (pathname.endsWith('/worker-location-customers')) return workerLocationCustomers(req, res);
  return res.status(404).json({ error: 'Location endpoint not found' });
}
