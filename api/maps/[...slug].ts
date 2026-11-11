import type { VercelRequest, VercelResponse } from '@vercel/node';
import geocode from '../_lib/maps-geocode.js';
import routes from '../_lib/maps-routes.js';
import distanceMatrix from '../_lib/maps-distance-matrix.js';

// Keep the existing public endpoints while routing them through one Hobby-plan function.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = String(req.url || '').split('?')[0].replace(/\/$/, '');
  if (pathname.endsWith('/geocode')) return geocode(req, res);
  if (pathname.endsWith('/routes')) return routes(req, res);
  if (pathname.endsWith('/distance-matrix')) return distanceMatrix(req, res);
  return res.status(404).json({ error: 'Maps endpoint not found' });
}
