import type { VercelRequest, VercelResponse } from '@vercel/node';

import adminCatchAll from './admin/[...slug].js';
import adminHealth from './admin/health.js';
import adminIndex from './admin/index.js';
import authSession from './auth/session.js';
import gemini from './gemini.js';
import geofenceCheck from './geofence/check.js';
import locationServices from './location-services.js';
import distanceMatrix from './maps/distance-matrix.js';
import geocode from './maps/geocode.js';
import mapsRoutes from './maps/routes.js';
import namoidProxy from './namoid-proxy.js';
import namoidToken from './namoid-token.js';
import userProfile from './users/profile.js';
import workerLocationCustomers from './worker-location-customers.js';
import workerAvailability from './workers/availability.js';

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
  if (exactHandler) {
    return exactHandler(req, res);
  }

  if (pathname.startsWith('/api/admin/')) {
    const slug = pathname.slice('/api/admin/'.length).split('/').filter(Boolean);
    req.query = { ...req.query, slug };
    return (adminCatchAll as Handler)(req, res);
  }

  return res.status(404).json({ success: false, error: 'API route not found' });
}
