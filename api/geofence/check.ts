import type { VercelRequest, VercelResponse } from '@vercel/node';

const LARGE_CITIES = new Set([
  'kolkata','bengaluru','bangalore','mumbai','delhi','new delhi','hyderabad','chennai',
  'pune','ahmedabad','jaipur','lucknow','kanpur','nagpur','indore','bhopal','patna',
  'ranchi','bhubaneswar','cuttack','visakhapatnam','vizag','surat','vadodara','ludhiana',
  'agra','nashik','coimbatore','kochi','thiruvananthapuram','guwahati','mysuru','mysore',
  'noida','gurugram','gurgaon','faridabad','ghaziabad','durgapur','asansol','siliguri'
]);

function validPoint(point: any): boolean {
  return point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))
    && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const { origin, destination, city } = req.body || {};
  if (!validPoint(origin) || !validPoint(destination)) {
    return res.status(400).json({ success: false, serviceable: false, error: 'Valid origin and destination coordinates are required.' });
  }

  const normalizedCity = String(city || origin.city || origin.area || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const radiusKm: 4 | 8 = [...LARGE_CITIES].some(name => normalizedCity === name || normalizedCity.startsWith(name + ' ')) ? 8 : 4;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(Number(destination.lat) - Number(origin.lat));
  const dLng = toRad(Number(destination.lng) - Number(origin.lng));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(Number(origin.lat))) * Math.cos(toRad(Number(destination.lat))) * Math.sin(dLng / 2) ** 2;
  const distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
  const serviceable = distanceKm <= radiusKm;

  return res.status(200).json({
    success: true,
    serviceable,
    city: String(city || origin.city || origin.area || ''),
    distanceKm,
    radiusKm,
    message: serviceable ? 'Address is inside the PUNCHX service area.' : `Address is outside the ${radiusKm} km PUNCHX service area.`
  });
}
