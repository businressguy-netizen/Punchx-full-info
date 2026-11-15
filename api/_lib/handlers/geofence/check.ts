import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeArea(value: unknown): string {
  return String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/^(pin code|pincode)\s+/, 'pin ')
    .replace(/^(area|locality|neighbourhood|neighborhood)\s+/, 'locality ');
}

function expandArea(value: unknown): string[] {
  const text=String(value||'').trim();
  if(!text)return [];
  if(/^(pin(?:\s*code|code)?|state|district|city|locality|area|village|ward|sector)\s*:/i.test(text))return [normalizeArea(text)];
  return text.split(/[,;|\n]+/).map(normalizeArea).filter(Boolean);
}

function buildCustomerLabels(body:any):string[] {
  const labels:string[]=[];
  const add=(value:unknown,qualifier?:string)=>{const text=String(value||'').trim();if(text){labels.push(text);if(qualifier)labels.push(qualifier+': '+text);}};
  add(body.customerArea,'AREA');add(body.customerLocality,'LOCALITY');add(body.customerSector,'SECTOR');
  add(body.customerCity,'CITY');add(body.customerDistrict,'DISTRICT');add(body.customerState,'STATE');
  const pin=String(body.customerPinCode||'').trim();if(/^\d{6}$/.test(pin))labels.push(pin,'PIN: '+pin,'PINCODE: '+pin);
  const city=String(body.customerCity||'').trim(),state=String(body.customerState||'').trim(),district=String(body.customerDistrict||'').trim();
  if(city&&state)labels.push('CITY: '+city+', '+state);if(district&&state)labels.push('DISTRICT: '+district+', '+state);
  add(body.customerAddress);
  return labels;
}

function matchesArea(customerLabels: string[], workerAreas: string[]): boolean {
  const candidates = new Set(customerLabels.flatMap(expandArea));
  const areas = new Set(workerAreas.flatMap(expandArea));
  if (!candidates.size || !areas.size) return false;
  return Array.from(areas).some(area => candidates.has(area));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, serviceable: false, error: 'Method not allowed' });
  }
  const body = req.body || {};
  const customerLabels = buildCustomerLabels(body);
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
