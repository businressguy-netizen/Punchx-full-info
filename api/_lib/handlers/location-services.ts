import type { VercelRequest, VercelResponse } from '@vercel/node';

type GeoPoint = { lat: number; lng: number };
type GeofenceZone = {
  id?: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: GeoPoint;
  radiusKm?: number;
  coordinates?: GeoPoint[];
};

function validPoint(point: any): point is GeoPoint {
  return point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) &&
    Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const intersects = ((a.lng > point.lng) !== (b.lng > point.lng)) &&
      (point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / ((b.lng - a.lng) || Number.EPSILON) + a.lat);
    if (intersects) inside = !inside;
  }
  return inside;
}

function loadGeofenceZones(): GeofenceZone[] {
  const raw = process.env.PUNCHX_GEOFENCE_ZONES;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((zone: any) => {
      if (!zone || typeof zone.name !== 'string') return false;
      if (zone.type === 'circle') return validPoint(zone.center) && Number.isFinite(zone.radiusKm) && zone.radiusKm > 0 && zone.radiusKm <= 100;
      if (zone.type === 'polygon') return Array.isArray(zone.coordinates) && zone.coordinates.length >= 3 && zone.coordinates.every(validPoint);
      return false;
    });
  } catch {
    console.error('PUNCHX_GEOFENCE_ZONES must be valid JSON with circle or polygon zones.');
    return [];
  }
}

function matchGeofence(point: GeoPoint): { configured: boolean; inside: boolean; zoneName?: string; distanceKm?: number } {
  const zones = loadGeofenceZones();
  if (!zones.length) return { configured: false, inside: false };
  for (const zone of zones) {
    if (zone.type === 'circle' && zone.center && typeof zone.radiusKm === 'number') {
      const distance = distanceKm(point, zone.center);
      if (distance <= zone.radiusKm) return { configured: true, inside: true, zoneName: zone.name, distanceKm: Math.round(distance * 100) / 100 };
    }
    if (zone.type === 'polygon' && zone.coordinates && pointInPolygon(point, zone.coordinates)) {
      return { configured: true, inside: true, zoneName: zone.name };
    }
  }
  return { configured: true, inside: false };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { lat, lng, address, landmark } = req.body || {};
    // Geofence decisions must use coordinates from a device GPS fix, never a typed-address
    // geocode or an IP/default fallback. The client supplies these coordinates explicitly.
    if (!validPoint({ lat, lng })) {
      return res.status(400).json({ success: false, error: 'A valid device GPS fix is required for geofence verification.' });
    }
    lat = Number(lat);
    lng = Number(lng);
    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
    let fullAddress = address || "";
    let area = "";
    let city = "";

    // 1. Forward Geocoding if text address is provided
    if ((!lat || !lng) && address && address.trim().length > 2) {
      if (mapsKey) {
        try {
          const gForward = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + (landmark ? ' near ' + landmark : ''))}&key=${mapsKey}`);
          const gData = await gForward.json();
          if (gData.status === "OK" && gData.results && gData.results[0]) {
            fullAddress = gData.results[0].formatted_address;
            lat = gData.results[0].geometry.location.lat;
            lng = gData.results[0].geometry.location.lng;
            for (const comp of gData.results[0].address_components) {
              if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                if (!area) area = comp.long_name;
              }
              if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                if (!city) city = comp.long_name;
              }
            }
          }
        } catch (e) {
          console.warn("Forward Google Geocode error:", e);
        }
      }

      if (!lat || !lng) {
        try {
          const nomSearch = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&format=json&addressdetails=1&limit=1`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
          );
          if (nomSearch.ok) {
            const nomArr = await nomSearch.json();
            if (nomArr && nomArr[0]) {
              lat = parseFloat(nomArr[0].lat);
              lng = parseFloat(nomArr[0].lon);
              fullAddress = nomArr[0].display_name;
              const addrObj = nomArr[0].address || {};
              area = addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
              city = addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
            }
          }
        } catch (e) {
          console.warn("Nominatim forward search error:", e);
        }
      }
    }

    // 2. Reverse Geocoding if lat/lng available but address is empty
    if (lat && lng && (!fullAddress || fullAddress.length < 5)) {
      if (mapsKey) {
        try {
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
          const gData = await gRes.json();
          if (gData.status === "OK" && gData.results && gData.results[0]) {
            fullAddress = gData.results[0].formatted_address;
            for (const comp of gData.results[0].address_components) {
              if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                if (!area) area = comp.long_name;
              }
              if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                if (!city) city = comp.long_name;
              }
            }
          }
        } catch (e) {
          console.warn("Reverse geocode error:", e);
        }
      }

      if (!fullAddress && lat && lng) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' } }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.display_name) {
              fullAddress = nomData.display_name;
              const addrObj = nomData.address || {};
              area = area || addrObj.sublocality || addrObj.neighbourhood || addrObj.suburb || addrObj.residential || addrObj.road || addrObj.quarter || addrObj.city_district || "";
              city = city || addrObj.city || addrObj.town || addrObj.village || addrObj.county || addrObj.state || "";
            }
          }
        } catch (e) {
          console.warn("Nominatim reverse error:", e);
        }
      }
    }

    if (!fullAddress) {
      fullAddress = address || (validPoint({ lat: Number(lat), lng: Number(lng) }) ? `GPS Position (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})` : '');
    }

    // Compute standardized Sector
    const rawArea = (area || fullAddress.split(',')[0] || '').trim();
    let sectorName = "";
    const lowerStr = (fullAddress + " " + rawArea + " " + (landmark || "")).toLowerCase();
    
    if (lowerStr.includes("hsr")) {
      sectorName = "Sector 1 (HSR Layout)";
    } else if (lowerStr.includes("indiranagar")) {
      sectorName = "Sector 2 (Indiranagar)";
    } else if (lowerStr.includes("koramangala")) {
      sectorName = "Sector 3 (Koramangala)";
    } else if (lowerStr.includes("whitefield")) {
      sectorName = "Sector 4 (Whitefield)";
    } else if (lowerStr.includes("jayanagar")) {
      sectorName = "Sector 5 (Jayanagar)";
    } else if (lowerStr.includes("jp nagar")) {
      sectorName = "Sector 6 (JP Nagar)";
    } else if (lowerStr.includes("electronic city")) {
      sectorName = "Sector 7 (Electronic City)";
    } else if (lowerStr.includes("bellandur")) {
      sectorName = "Sector 8 (Bellandur)";
    } else {
      const cleanSub = rawArea.replace(/sector|layout|stage|phase|block/gi, "").trim();
      sectorName = cleanSub ? `Sector (${cleanSub})` : 'Unresolved area';
    }

    const hasCoordinates = validPoint({ lat: Number(lat), lng: Number(lng) });
    if (!hasCoordinates) {
      return res.status(400).json({ success: false, error: 'A valid GPS position is required to check geofence coverage.' });
    }
    const geofence = matchGeofence({ lat: Number(lat), lng: Number(lng) });

    // Service catalogue is only marked available when the exact GPS point is inside a configured zone.
    // Master Registered Service Catalog with Sector-specific active capacities
    const MASTER_SERVICES = [
      {
        id: 'ac',
        name: 'AC Repair',
        category: 'AC Repair',
        icon: 'ac_unit',
        activeSpecialists: 14,
        avgRating: 4.9,
        startingPrice: 199,
        slaMinutes: 15,
        available: geofence.configured && geofence.inside,
        description: 'PCB diagnostics, gas charging, filter sanitization & cooling overhaul'
      },
      {
        id: 'electrical',
        name: 'Electrical Systems',
        category: 'Electrical Systems',
        icon: 'electrical_services',
        activeSpecialists: 19,
        avgRating: 4.8,
        startingPrice: 179,
        slaMinutes: 12,
        available: geofence.configured && geofence.inside,
        description: 'Short-circuit repair, MCB panel installation, heavy cabling & UPS/Inverter'
      },
      {
        id: 'plumbing',
        name: 'Plumbing & Drainage',
        category: 'Plumbing & Drainage',
        icon: 'plumbing',
        activeSpecialists: 16,
        avgRating: 4.9,
        startingPrice: 159,
        slaMinutes: 18,
        available: geofence.configured && geofence.inside,
        description: 'High-pressure leaks, concealed line repairs, fixture replacement & drain unclog'
      },
      {
        id: 'cleaning',
        name: 'Deep Cleaning',
        category: 'Deep Cleaning & Sanitization',
        icon: 'cleaning_services',
        activeSpecialists: 11,
        avgRating: 4.85,
        startingPrice: 249,
        slaMinutes: 25,
        available: geofence.configured && geofence.inside,
        description: 'Hospital-grade sanitization, kitchen chimney degrease & bathroom restoration'
      },
      {
        id: 'painting',
        name: 'Painting & Walls',
        category: 'Painting',
        icon: 'format_paint',
        activeSpecialists: 8,
        avgRating: 4.75,
        startingPrice: 299,
        slaMinutes: 30,
        available: geofence.configured && geofence.inside,
        description: 'Interior luxury emulsion, moisture barrier waterproofing & touch-ups'
      },
      {
        id: 'carpentry',
        name: 'Carpentry & Locks',
        category: 'Carpentry & Security Locks',
        icon: 'carpenter',
        activeSpecialists: 10,
        avgRating: 4.8,
        startingPrice: 189,
        slaMinutes: 20,
        available: geofence.configured && geofence.inside,
        description: 'Smart digital lock installation, bespoke woodwork, hinges & modular kitchen repair'
      },
      {
        id: 'pest',
        name: 'Pest Control',
        category: 'Pest Control',
        icon: 'pest_control',
        activeSpecialists: 7,
        avgRating: 4.9,
        startingPrice: 219,
        slaMinutes: 20,
        available: geofence.configured && geofence.inside,
        description: 'Odorless herbal pest eradication, anti-termite and gel bait treatments'
      },
      {
        id: 'appliance',
        name: 'Appliance Maintenance',
        category: 'Appliance Maintenance',
        icon: 'build',
        activeSpecialists: 12,
        avgRating: 4.8,
        startingPrice: 199,
        slaMinutes: 15,
        available: geofence.configured && geofence.inside,
        description: 'Washing machines, microwave ovens, refrigerators & water purifiers'
      },
      {
        id: 'moving',
        name: 'Moving & Logistics',
        category: 'Moving',
        icon: 'local_shipping',
        activeSpecialists: 6,
        avgRating: 4.7,
        startingPrice: 499,
        slaMinutes: 45,
        available: geofence.configured && geofence.inside,
        description: 'High-care furniture packaging, express tempo dispatch & cargo handling'
      }
    ];

    // Custom availability customization for zones if needed
    const registeredServices = MASTER_SERVICES.map(srv => {
      // Adjust specialist count dynamically according to sector hash
      const hash = (sectorName.length + srv.name.length) % 5;
      return {
        ...srv,
        activeSpecialists: Math.max(3, srv.activeSpecialists - hash),
        sectorCoverage: sectorName,
        landmarkNote: landmark ? `Near ${landmark}` : (geofence.configured && geofence.inside ? `Inside ${geofence.zoneName}` : "Coverage not confirmed")
      };
    });

    return res.json({
      success: true,
      address: fullAddress,
      area: rawArea,
      city: city || "",
      sector: sectorName,
      landmark: landmark || "",
      lat: Number(lat),
      lng: Number(lng),
      geofence: { configured: geofence.configured, inside: geofence.inside, zoneName: geofence.zoneName || null, distanceKm: geofence.distanceKm ?? null },
      coverageStatus: !geofence.configured ? "Service boundary not configured" : geofence.inside ? `Inside service zone: ${geofence.zoneName}` : "Outside PunchX service coverage",
      totalRegisteredServices: registeredServices.length,
      registeredServices
    });
  } catch (err: any) {
    console.error("Location services backend error:", err);
    return res.status(500).json({ error: "Failed to resolve location services" });
  }
}
