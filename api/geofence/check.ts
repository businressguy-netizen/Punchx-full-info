import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeArea(value: unknown): string {
  return String(value || '').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/^(area|locality|neighbourhood|neighborhood)\s+/, '');
}

function matchesArea(customerLabels: string[], workerAreas: string[]): boolean {
  const candidates = customerLabels.map(normalizeArea).filter(Boolean);
  const areas = workerAreas.map(normalizeArea).filter(Boolean);
  if (!candidates.length || !areas.length) return false;
  return areas.some(area => candidates.some(candidate =>
    candidate === area ||
    (' ' + candidate + ' ').includes(' ' + area + ' ') ||
    (' ' + area + ' ').includes(' ' + candidate + ' ')
  ));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, serviceable: false, error: 'Method not allowed' });
  }
  const body = req.body || {};
  const customerLabels = [body.customerArea, body.customerCity, body.customerSector, body.customerAddress]
    .filter((value: unknown) => typeof value === 'string' && value.trim());
  const workerAreas = Array.isArray(body.workerServiceAreas)
    ? body.workerServiceAreas.filter((value: unknown) => typeof value === 'string' && value.trim())
    : [];

  if (!customerLabels.length || !workerAreas.length) {
    return res.status(400).json({
      success: false,
      serviceable: false,
      error: 'A verified customer locality and configured worker service areas are required.'
    });
  }

  const serviceable = matchesArea(customerLabels, workerAreas);
  return res.status(200).json({
    success: true,
    serviceable,
    matchType: 'named-area',
    matchedArea: serviceable ? workerAreas.find((area: string) => matchesArea(customerLabels, [area])) : null,
    message: serviceable
      ? 'The address matches the professional’s configured service areas.'
      : 'This address is outside the professional’s configured service areas.'
  });
}
