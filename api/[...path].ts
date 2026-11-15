import type { VercelRequest, VercelResponse } from '@vercel/node';

import adminCatchAll from './_lib/handlers/admin/[...slug].js';
import adminHealth from './_lib/handlers/admin/health.js';
import adminIndex from './_lib/handlers/admin/index.js';
import authSession from './_lib/handlers/auth/session.js';
import gemini from './_lib/handlers/gemini.js';
import geofenceCheck from './_lib/handlers/geofence/check.js';
import locationServices from './_lib/handlers/location-services.js';
import distanceMatrix from './_lib/handlers/maps/distance-matrix.js';
import geocode from './_lib/handlers/maps/geocode.js';
import mapsRoutes from './_lib/handlers/maps/routes.js';
import namoidProxy from './_lib/handlers/namoid-proxy.js';
import namoidToken from './_lib/handlers/namoid-token.js';
import userProfile from './_lib/handlers/users/profile.js';
import workerLocationCustomers from './_lib/handlers/worker-location-customers.js';
import workerAvailability from './_lib/handlers/workers/availability.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

const exactRoutes: Record<string, Handler> = {
  '/api/admin': adminIndex as Handler,
  '/api/admin/health': adminHealth as Handler,
  '/api/auth/session': authSession as Handler,
  '/api/auth/namoid-token': namoidToken as Handler,
  '/api/gemini': gemini as Handler,
  '/api/geocode': geocode as Handler,
  '/api/geofence/check': geofenceCheck as Handler,
  '/api/location-services': locationServices as Handler,
  '/api/maps/distance-matrix': distanceMatrix as Handler,
  '/api/maps/geocode': geocode as Handler,
  '/api/maps/routes': mapsRoutes as Handler,
  '/api/namoid-proxy': namoidProxy as Handler,
  '/api/namoid-token': namoidToken as Handler,
  '/api/oauth/token': namoidProxy as Handler,
  '/api/users/profile': userProfile as Handler,
  '/api/worker-location-customers': workerLocationCustomers as Handler,
  '/api/workers/availability': workerAvailability as Handler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestUrl = new URL(req.url || '/', 'https://punchx.internal');
  let pathname = requestUrl.pathname;
  if (!pathname.startsWith('/api/')) {
    pathname = pathname === '/api' ? pathname : `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  }
  pathname = pathname.replace(/\/+$/, '') || '/api';

  const exactHandler = exactRoutes[pathname];
  if (exactHandler) return exactHandler(req, res);

  if (pathname.startsWith('/api/admin/')) {
    const slug = pathname.slice('/api/admin/'.length).split('/').filter(Boolean);
    req.query = { ...req.query, slug };
    return (adminCatchAll as Handler)(req, res);
  }

  return res.status(404).json({ success: false, error: 'API route not found' });
}
