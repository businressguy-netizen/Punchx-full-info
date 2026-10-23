import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = new Set([
  'https://www.punchxapp.co.in',
  'https://punchxapp.co.in',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function requestOrigin(req: VercelRequest): string {
  const origin = String(req.headers.origin || '').trim();
  if (origin) return origin;
  const referer = String(req.headers.referer || '').trim();
  try { return referer ? new URL(referer).origin : ''; } catch { return ''; }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Only publish a browser-restricted Maps key. Keep server routing/geocoding
  // credentials in GOOGLE_MAPS_PLATFORM_KEY and never return them from this API.
  const browserKey = process.env.GOOGLE_MAPS_BROWSER_KEY
    || process.env.VITE_GOOGLE_MAPS_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || '';
  const origin = requestOrigin(req);
  const allowed = ALLOWED_ORIGINS.has(origin);
  const mapId = process.env.GOOGLE_MAPS_MAP_ID || process.env.VITE_GOOGLE_MAP_ID || '';

  return res.status(200).json({
    enabled: Boolean(browserKey && allowed),
    hasKey: Boolean(browserKey && allowed),
    apiKey: allowed ? browserKey : '',
    mapId,
    attributionId: 'gmp_mcp_codeassist_v1_aistudio',
    defaultCenter: { lat: 22.9734, lng: 78.6569 },
    serviceAreaMode: 'india-named-areas',
  });
}
