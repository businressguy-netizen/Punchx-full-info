import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { origin, destination, travelMode = 'DRIVE' } = req.body || {};
    // Route distance/ETA is informational only; serviceability is checked by named areas at booking time.
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const valid = (p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng));
    if (!valid(origin) || !valid(destination)) {
      return res.status(400).json({ error: 'Valid numeric coordinates are required for origin and destination' });
    }

    const originLat = Number(origin.lat);
    const originLng = Number(origin.lng);
    const destLat = Number(destination.lat);
    const destLng = Number(destination.lng);

    if (originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90 || originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180) {
      return res.status(400).json({ error: 'Coordinates are outside valid ranges' });
    }

    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';

    const dLat = ((destLat - originLat) * Math.PI) / 180;
    const dLon = ((destLng - originLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((originLat * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directKm = Math.round(6371 * c * 10) / 10;

    let routeDistanceKm = directKm;
    let durationMinutes = 0;
    let etaText = 'Live route unavailable';
    let polylinePoints: { lat: number; lng: number }[] = [
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    ];
    let isLiveGoogleRoute = false;

    if (mapsKey) {
      try {
        const mode = String(travelMode).toLowerCase() === 'two_wheeler' ? 'driving' : String(travelMode).toLowerCase() === 'walking' ? 'walking' : 'driving';
        const gDirRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${mode}&key=${mapsKey}`);
        const gDirData = await gDirRes.json();
        const leg = gDirData?.routes?.[0]?.legs?.[0];

        if (gDirData.status === 'OK' && leg) {
          routeDistanceKm = Math.round((leg.distance.value / 1000) * 10) / 10;
          durationMinutes = Math.max(1, Math.ceil(leg.duration.value / 60));
          etaText = `${durationMinutes} mins`;
          isLiveGoogleRoute = true;

          if (Array.isArray(leg.steps) && leg.steps.length) {
            polylinePoints = leg.steps.map((step: any) => ({
              lat: Number(step.end_location.lat),
              lng: Number(step.end_location.lng)
            })).filter((p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
            polylinePoints.unshift({ lat: originLat, lng: originLng });
            polylinePoints.push({ lat: destLat, lng: destLng });
          }
        }
      } catch (error) {
        console.warn('Google Maps route warning:', error);
      }
    }

    return res.json({
      success: true,
      distanceKm: routeDistanceKm,
      directDistanceKm: directKm,
      durationMinutes,
      etaText,
      // Deprecated compatibility field: null means this route calculation did not decide serviceability.
      isWithin15Km: null,
      serviceableByArea: null,
      matchType: 'named-area',
      isLiveGoogleRoute,
      waypoints: polylinePoints,
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng }
    });
  } catch (error) {
    console.error('Maps routes error:', error);
    return res.status(500).json({ error: 'Failed to compute route' });
  }
}
