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
    const largeCities = new Set(['kolkata','bengaluru','bangalore','mumbai','delhi','new delhi','hyderabad','chennai','pune','ahmedabad','jaipur','lucknow','kanpur','nagpur','indore','bhopal','patna','ranchi','bhubaneswar','cuttack','visakhapatnam','vizag','surat','vadodara','ludhiana','agra','nashik','coimbatore','kochi','thiruvananthapuram','guwahati','mysuru','mysore','noida','gurugram','gurgaon','faridabad','ghaziabad','durgapur','asansol','siliguri']);
    const radiusKm = largeCities.has(city) || [...largeCities].some(name => city.startsWith(name + ' ')) ? 8 : 4;

    const results = destinations.map((dest: any, index: number) => {
      const destLat = dest.lat || 12.9716;
      const destLng = dest.lng || 77.5946;

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
      const isWithin15Km = distanceKm <= radiusKm;
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
        isWithin15Km,
        durationMinutes: etaMins,
        etaText: `${etaMins} mins`,
        bearingDeg
      };
    });

    // Filter and sort by distance
    const within15KmList = results.filter(r => r.isWithin15Km).sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      success: true,
      origin: { lat: originLat, lng: originLng },
      totalChecked: destinations.length,
      totalWithin15Km: within15KmList.length,
      maxRadiusKm: radiusKm,
      radiusKm,
      city,
      results: within15KmList,
      allResults: results
    });
  } catch (err: any) {
    console.error("Distance matrix error:", err);
    return res.status(500).json({ error: "Distance matrix calculation failed" });
  }
}
