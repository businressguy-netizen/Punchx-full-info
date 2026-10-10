import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let { lat, lng, address, landmark } = req.body || {};
    const mapsKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    let fullAddress = address || '';
    let area = '';
    let city = '';
    let district = '';
    let state = '';
    let postalCode = '';

    if ((!lat || !lng) && address && address.trim().length > 2) {
      if (mapsKey) {
        try {
          const query = encodeURIComponent(address + (landmark ? ' ' + landmark : ''));
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${mapsKey}`);
          const data = await response.json();
          if (data.status === 'OK' && data.results?.[0]) {
            const result = data.results[0];
            fullAddress = result.formatted_address || fullAddress;
            lat = result.geometry?.location?.lat;
            lng = result.geometry?.location?.lng;
            for (const comp of result.address_components || []) {
              if (!area && (comp.types.includes('sublocality') || comp.types.includes('neighborhood'))) area = comp.long_name;
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

      if (!lat || !lng) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + (landmark ? ' ' + landmark : ''))}&format=json&addressdetails=1&limit=1`, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' }
          });
          if (response.ok) {
            const results = await response.json();
            const result = results?.[0];
            if (result) {
              lat = Number(result.lat);
              lng = Number(result.lon);
              fullAddress = result.display_name || fullAddress;
              const a = result.address || {};
              area = a.sublocality || a.neighbourhood || a.suburb || a.residential || a.road || a.quarter || a.city_district || area;
              city = a.city || a.town || a.village || city;
              district = a.state_district || a.district || a.county || district;
              state = a.state || state;
              postalCode = a.postcode || postalCode;
            }
          }
        } catch (error) {
          console.warn('Nominatim forward geocoding warning:', error);
        }
      }
    }

    if ((!lat || !lng) && !address) {
      try {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
        const ipUrl = clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.')
          ? `https://freeipapi.com/api/json/${clientIp}`
          : 'https://freeipapi.com/api/json/';
        const response = await fetch(ipUrl, { headers: { 'User-Agent': 'PunchX-Service-App/1.0' } });
        if (response.ok) {
          const data = await response.json();
          if (data?.latitude && data?.longitude) {
            lat = data.latitude;
            lng = data.longitude;
            city = data.cityName || data.regionName || '';
            area = data.cityName || '';
          }
        }
      } catch (error) {
        console.warn('IP geolocation fallback warning:', error);
      }
    }

    if (lat && lng && mapsKey && (!fullAddress || fullAddress.length < 5)) {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const result = data.results[0];
          fullAddress = result.formatted_address || fullAddress;
          for (const comp of result.address_components || []) {
            if (!area && (comp.types.includes('sublocality') || comp.types.includes('neighborhood'))) area = comp.long_name;
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

    if ((!fullAddress || !area) && lat && lng) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'PunchX-Service-App/1.0' }
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

    if ((!fullAddress || !area) && lat && lng) {
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (response.ok) {
          const data = await response.json();
          const locality = data?.locality || data?.principalSubdivision || '';
          city = city || data?.city || locality;
          area = area || locality;
          fullAddress = fullAddress || [locality, city, data?.countryName].filter(Boolean).join(', ');
        }
      } catch (error) {
        console.warn('BigDataCloud reverse geocoding warning:', error);
      }
    }

    // Never invent a real address or coordinates. Return empty values when location could not be resolved.
    const rawArea = (area || '').trim();
    const normalizedCity = (city || '').trim();
    const normalizedAddress = (fullAddress || '').trim();

    let sector = '';
    const lower = `${normalizedAddress} ${rawArea}`.toLowerCase();
    if (lower.includes('hsr')) sector = 'HSR Layout';
    else if (lower.includes('indiranagar')) sector = 'Indiranagar';
    else if (lower.includes('koramangala')) sector = 'Koramangala';
    else if (lower.includes('whitefield')) sector = 'Whitefield';
    else if (lower.includes('jayanagar')) sector = 'Jayanagar';
    else if (lower.includes('jp nagar')) sector = 'JP Nagar';
    else if (lower.includes('electronic city')) sector = 'Electronic City';
    else if (lower.includes('bellandur')) sector = 'Bellandur';
    else sector = rawArea;

    return res.json({
      address: normalizedAddress,
      area: rawArea,
      city: normalizedCity,
      district,
      state,
      postalCode,
      sector,
      lat: typeof lat === 'number' && Number.isFinite(lat) ? lat : null,
      lng: typeof lng === 'number' && Number.isFinite(lng) ? lng : null,
      resolved: Boolean(normalizedAddress || (lat && lng))
    });
  } catch (error) {
    console.error('Geocode backend error:', error);
    return res.status(500).json({ error: 'Geocoding failed' });
  }
}
