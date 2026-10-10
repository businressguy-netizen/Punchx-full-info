import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only expose the explicitly public browser key. Server-only keys must never be returned to the client.
  const browserKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    enabled: Boolean(browserKey),
    hasKey: Boolean(browserKey),
    apiKey: browserKey,
    mapId: process.env.PUNCHX_MAP_ID || '',
    attributionId: 'gmp_mcp_codeassist_v1_aistudio',
    defaultCenter: { lat: 22.9734, lng: 78.6569 },
    serviceAreaMode: 'india-named-areas'
  });
}
