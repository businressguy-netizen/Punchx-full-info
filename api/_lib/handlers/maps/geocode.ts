import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { lat, lng, address, landmark, area: requestedArea } = req.body || {};
    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';

    let fullAddress = typeof address === 'string' ? address.trim() : '';
    let area = typeof requestedArea === 'string' ? requestedArea.trim() : '';
    let city = '';
    let district = '';
    let state = '';
    let postalCode = '';
    let plusCode = '';
    let locationType = 'APPROXIMATE';

    const hasCoordinates = () => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

    // Forward geocode only when the user supplied an address.
    if (!hasCoordinates() && fullAddress.length > 1) {
      if (mapsKey) {
        try {
          const indiaAddress = /india/i.test(fullAddress) ? fullAddress : `${fullAddress}, India`;
          const query = encodeURIComponent(`${indiaAddress}${landmark ? ` near ${landmark}` : ''}`);
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&region=in&key=${mapsKey}`);
          const data = await response.json();
          if (data.status === 'OK' && data.results?.[0]) {
            const result = data.results[0];
            fullAddress = result.formatted_address || fullAddress;
            lat = result.geometry?.location?.lat;
            lng = result.geometry?.location?.lng;
            locationType = result.geometry?.location_type || 'APPROXIMATE';
            plusCode = result.plus_code?.global_code || '';
            for (const comp of result.address_components || []) {
              if (!area && (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1') || comp.types.includes('neighborhood'))) area = comp.long_name;
              if (!city && comp.types.includes('locality')) city = comp.long_name;
              if (!district && comp.types.includes('administrative_area_level_2')) district = comp.long_name;
              if (!state && comp.types.includes('administrative_area_level_1')) state = comp.long_name;
              if (!postalCode && comp.types.includes('postal_code')) postalCode = comp.long_name;
            }
          }
        } catch (error) {
          console.warn('Google forward geocoding warning:', error);
        }
      }

      if (!hasCoordinates()) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${fullAddress}${landmark ? ` ${landmark}` : ''}, India`)}&format=json&addressdetails=1&countrycodes=in&limit=1`, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-Platform/2.0' }
          });
          if (response.ok) {
            const result = (await response.json())?.[0];
            if (result) {
              lat = Number(result.lat);
              lng = Number(result.lon);
              fullAddress = result.display_name || fullAddress;
              const a = result.address || {};
              area = area || a.sublocality || a.neighbourhood || a.suburb || a.residential || a.road || '';
              city = city || a.city || a.town || a.village || '';
              district = district || a.state_district || a.district || a.county || '';
              state = state || a.state || '';
              postalCode = postalCode || a.postcode || '';
              locationType = 'GEOMETRIC_CENTER';
            }
          }
        } catch (error) {
          console.warn('Nominatim forward geocoding warning:', error);
        }
      }
    }

    // Reverse geocode coordinates supplied by the browser/GPS.
    if (hasCoordinates()) {
      lat = Number(lat);
      lng = Number(lng);

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      if (mapsKey) {
        try {
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
          const data = await response.json();
          if (data.status === 'OK' && data.results?.[0]) {
            const result = data.results[0];
            fullAddress = result.formatted_address || fullAddress;
            locationType = result.geometry?.location_type || locationType;
            plusCode = result.plus_code?.global_code || plusCode;
            for (const comp of result.address_components || []) {
              if (!area && (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1') || comp.types.includes('neighborhood'))) area = comp.long_name;
              if (!city && comp.types.includes('locality')) city = comp.long_name;
              if (!district && comp.types.includes('administrative_area_level_2')) district = comp.long_name;
              if (!state && comp.types.includes('administrative_area_level_1')) state = comp.long_name;
              if (!postalCode && comp.types.includes('postal_code')) postalCode = comp.long_name;
            }
          }
        } catch (error) {
          console.warn('Google reverse geocoding warning:', error);
        }
      }

      if (!fullAddress || !area || !city) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-Platform/2.0' }
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.display_name) {
              fullAddress = fullAddress || data.display_name;
              const a = data.address || {};
              area = area || a.sublocality || a.neighbourhood || a.suburb || a.residential || a.road || '';
              city = city || a.city || a.town || a.village || '';
              district = district || a.state_district || a.district || a.county || '';
              state = state || a.state || '';
              postalCode = postalCode || a.postcode || '';
            }
          }
        } catch (error) {
          console.warn('Nominatim reverse geocoding warning:', error);
        }
      }
    }

    // Do not fabricate a location. The UI can ask the user for permission/address again.
    if (!hasCoordinates() && !fullAddress) {
      return res.status(400).json({
        success: false,
        resolved: false,
        error: 'Location could not be resolved. Please provide an address or allow location access.'
      });
    }

    const rawArea = area.trim();
    const normalizedCity = city.trim();
    const normalizedAddress = fullAddress.trim();

    return res.json({
      success: true,
      resolved: Boolean(normalizedAddress || hasCoordinates()),
      address: normalizedAddress,
      area: rawArea,
      city: normalizedCity,
      district,
      state,
      postalCode,
      plusCode,
      sector: rawArea,
      lat: hasCoordinates() ? Number(lat) : null,
      lng: hasCoordinates() ? Number(lng) : null,
      locationType
    });
  } catch (error) {
    console.error('Maps geocode backend error:', error);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
