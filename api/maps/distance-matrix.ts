import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { origin, destinations } = req.body || {};
    if (!origin || !Array.isArray(destinations)) {
      return res.status(400).json({ error: "Origin and destinations array are required" });
    }

    const originLat = Number(origin.lat);
    const originLng = Number(origin.lng);
    if (!Number.isFinite(originLat) || !Number.isFinite(originLng) || Math.abs(originLat) > 90 || Math.abs(originLng) > 180) return res.status(400).json({ error: 'Valid origin coordinates are required' });
    const city = String(origin.city || origin.area || req.body?.city || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const normalizeArea = (value: unknown) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      .replace(/^(pin code|pincode)\s+/, 'pin ').replace(/^(area|locality|neighbourhood|neighborhood)\s+/, 'locality ');
    const expandArea = (value: unknown): string[] => {
      const raw=String(value||'').trim(); if(!raw)return [];
      if(/^(pin(?:\s*code|code)?|state|district|city|locality|area|village|ward|sector)\s*:/i.test(raw))return [normalizeArea(raw)];
      return raw.split(/[,;|\n]+/).map(normalizeArea).filter(Boolean);
    };
    const labels = (point:any):string[] => {
      const out:string[]=[];
      const add=(v:any,q?:string)=>{const t=String(v||'').trim();if(t){out.push(t);if(q)out.push(q+': '+t);}};
      add(point?.area,'AREA');add(point?.locality,'LOCALITY');add(point?.sector,'SECTOR');add(point?.city,'CITY');
      add(point?.district,'DISTRICT');add(point?.state,'STATE');
      const pin=String(point?.postalCode||point?.pinCode||'').trim();if(/^\d{6}$/.test(pin))out.push(pin,'PIN: '+pin);
      const c=String(point?.city||'').trim(),st=String(point?.state||'').trim(),d=String(point?.district||'').trim();
      if(c&&st)out.push('CITY: '+c+', '+st);if(d&&st)out.push('DISTRICT: '+d+', '+st);
      if(point?.address)out.push(String(point.address));
      return out;
    };
    const matchesArea = (customer:any, worker:any):boolean|null => {
      const workerAreas=Array.isArray(worker?.serviceAreas)?worker.serviceAreas:Array.isArray(worker?.geofenceAreas)?worker.geofenceAreas:[];
      if(!workerAreas.length)return null;
      const candidates=new Set(labels(customer).flatMap(expandArea));
      return workerAreas.flatMap(expandArea).some((area:string)=>candidates.has(area));
    };

    const results = destinations.map((dest: any, index: number) => {
      const destLat = Number(dest.lat);
      const destLng = Number(dest.lng);
      if (!Number.isFinite(destLat) || !Number.isFinite(destLng) || Math.abs(destLat) > 90 || Math.abs(destLng) > 180) {
        return { id: dest.id || `dest_${index}`, name: dest.name || dest.workerName || dest.customerName || `Target ${index + 1}`, category: dest.category || dest.skill || 'Specialist', lat: null, lng: null, distanceKm: null, serviceableByArea: matchesArea(origin, dest), isWithin15Km: null, durationMinutes: null, etaText: 'Location unavailable', bearingDeg: null };
      }

      const dLat = ((destLat - originLat) * Math.PI) / 180;
      const dLon = ((destLng - originLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originLat * Math.PI) / 180) *
          Math.cos((destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(6371 * c * 10) / 10;
      const serviceableByArea = matchesArea(origin, dest);
      const etaMins = Math.max(4, Math.round(distanceKm * 3.2));

      // Bearing angle in degrees (-180 to 180)
      const y = Math.sin(dLon) * Math.cos((destLat * Math.PI) / 180);
      const x =
        Math.cos((originLat * Math.PI) / 180) * Math.sin((destLat * Math.PI) / 180) -
        Math.sin((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.cos(dLon);
      const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

      return {
        id: dest.id || `dest_${index}`,
        name: dest.name || dest.workerName || dest.customerName || `Target ${index + 1}`,
        category: dest.category || dest.skill || 'Specialist',
        lat: destLat,
        lng: destLng,
        distanceKm,
        serviceableByArea,
        isWithin15Km: serviceableByArea,
        durationMinutes: etaMins,
        etaText: `${etaMins} mins`,
        bearingDeg
      };
    });

    // Keep all valid targets; distance is for navigation only and never gates serviceability.
    const allResults = results.sort((a:any, b:any) => (Number(a.distanceKm) || Number.POSITIVE_INFINITY) - (Number(b.distanceKm) || Number.POSITIVE_INFINITY));
    const serviceableCount = allResults.filter((r:any) => r.serviceableByArea === true).length;

    return res.json({
      success: true,
      origin: { lat: originLat, lng: originLng },
      totalChecked: destinations.length,
      totalServiceableByArea: serviceableCount,
      serviceAreaMode: 'named-area',
      city,
      results: allResults,
      allResults
    });
  } catch (err: any) {
    console.error("Distance matrix error:", err);
    return res.status(500).json({ error: "Distance matrix calculation failed" });
  }
}
