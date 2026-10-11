const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * PUNCHX service imagery.
 *
 * These are direct image URLs rather than images embedded inside a data-SVG. That
 * matters on production browsers because an external image nested inside a data
 * URI can be blocked by CSP/origin rules and appear blurred or blank. Every
 * category, subcategory and exact work therefore gets a real <img> source.
 *
 * The photographs are used as visual references for the service type; PUNCHX does
 * not present them as photographs of a specific PUNCHX professional.
 */
const PHOTO_LIBRARY = {
  electrician: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85',
  plumber: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=85',
  carpenter: 'https://images.unsplash.com/photo-1601058268499-e52658b5b3e5?auto=format&fit=crop&w=1200&q=85',
  painter: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85',
  mason: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=85',
  welder: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=85',
  barber: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=85',
  beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85',
  tailor: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=85',
  mechanic: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=85',
  bike: 'https://images.unsplash.com/photo-1530046339918-7e7c4ea7f4ad?auto=format&fit=crop&w=1200&q=85',
  car: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1200&q=85',
  ac: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=85',
  refrigerator: 'https://images.unsplash.com/photo-1571175443880-49e1dca6f7e4?auto=format&fit=crop&w=1200&q=85',
  washing: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1200&q=85',
  mobile: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85',
  computer: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85',
  electronics: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=85',
  cctv: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=85',
  solar: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1200&q=85',
  purifier: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=85',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
  pest: 'https://willixai.com/assets/pest-control-3PLWX0ZE.jpg',
  garden: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=85',
  cook: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  baker: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=1200&q=85',
  caterer: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=85',
  tiffin: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85',
  laundry: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=85',
  ironing: 'https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=1200&q=85',
  movers: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=85',
  delivery: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=85',
  security: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85',
  ceiling: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85',
  glass: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85',
  tile: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
  waterproof: 'https://iamroofingllc.com/public/img/Rooferfixingaleakonacommercialroof.png',
  upholstery: 'https://production-next-images-cdn.thumbtack.com/i/563932399867346958/desktop/standard/400square-legacy',
  interior: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=1200&q=85',
  event: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
  photographer: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85',
  videographer: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1200&q=85',
  dj: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=85',
  orchestra: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=85',
} as const;

const photoFor = (term: string): string => {
  const t = term.toLowerCase();
  // Exact appliance/service intent first, then broader trade intent.
  if (t.includes('ac ') || t.startsWith('ac') || t.includes('air conditioner') || t.includes('hvac')) return PHOTO_LIBRARY.ac;
  if (t.includes('refrigerator') || t.includes('fridge')) return PHOTO_LIBRARY.refrigerator;
  if (t.includes('washing machine') || t.includes('washer') || t.includes('dryer')) return PHOTO_LIBRARY.washing;
  if (t.includes('mobile') || t.includes('phone')) return PHOTO_LIBRARY.mobile;
  if (t.includes('computer') || t.includes('laptop')) return PHOTO_LIBRARY.computer;
  if (t.includes('electronic') || t.includes('tv') || t.includes('microwave') || t.includes('chimney')) return PHOTO_LIBRARY.electronics;
  if (t.includes('cctv') || t.includes('camera') || t.includes('security system')) return PHOTO_LIBRARY.cctv;
  if (t.includes('solar')) return PHOTO_LIBRARY.solar;
  if (t.includes('ro') || t.includes('water purifier') || t.includes('purifier')) return PHOTO_LIBRARY.purifier;
  if (t.includes('fan') || t.includes('electric') || t.includes('wiring') || t.includes('switch') || t.includes('socket') || t.includes('mcb') || t.includes('light') || t.includes('bulb')) return PHOTO_LIBRARY.electrician;
  if (t.includes('plumb') || t.includes('water') || t.includes('tap') || t.includes('bath') || t.includes('drain') || t.includes('toilet') || t.includes('geyser')) return PHOTO_LIBRARY.plumber;
  if (t.includes('carp') || t.includes('wood') || t.includes('furniture') || t.includes('door') || t.includes('cabinet')) return PHOTO_LIBRARY.carpenter;
  if (t.includes('paint') || t.includes('wall') || t.includes('waterproof')) return t.includes('waterproof') ? PHOTO_LIBRARY.waterproof : PHOTO_LIBRARY.painter;
  if (t.includes('mason') || t.includes('construction') || t.includes('civil')) return PHOTO_LIBRARY.mason;
  if (t.includes('weld') || t.includes('fabricat') || t.includes('metal')) return PHOTO_LIBRARY.welder;
  if (t.includes('barber')) return PHOTO_LIBRARY.barber;
  if (t.includes('beaut') || t.includes('hair') || t.includes('salon') || t.includes('spa')) return PHOTO_LIBRARY.beauty;
  if (t.includes('tailor') || t.includes('stitch') || t.includes('alteration')) return PHOTO_LIBRARY.tailor;
  if (t.includes('bike')) return PHOTO_LIBRARY.bike;
  if (t.includes('car ') || t.includes('automobile')) return PHOTO_LIBRARY.car;
  if (t.includes('mechanic') || t.includes('vehicle')) return PHOTO_LIBRARY.mechanic;
  if (t.includes('clean') || t.includes('housekeep') || t.includes('sofa')) return t.includes('sofa') ? PHOTO_LIBRARY.upholstery : PHOTO_LIBRARY.cleaning;
  if (t.includes('pest')) return PHOTO_LIBRARY.pest;
  if (t.includes('garden') || t.includes('plant') || t.includes('lawn')) return PHOTO_LIBRARY.garden;
  if (t.includes('cook')) return PHOTO_LIBRARY.cook;
  if (t.includes('baker') || t.includes('bakery')) return PHOTO_LIBRARY.baker;
  if (t.includes('cater')) return PHOTO_LIBRARY.caterer;
  if (t.includes('tiffin') || t.includes('home food')) return PHOTO_LIBRARY.tiffin;
  if (t.includes('laundry') || t.includes('dry clean')) return PHOTO_LIBRARY.laundry;
  if (t.includes('iron')) return PHOTO_LIBRARY.ironing;
  if (t.includes('packer') || t.includes('mover')) return PHOTO_LIBRARY.movers;
  if (t.includes('delivery') || t.includes('driver')) return PHOTO_LIBRARY.delivery;
  if (t.includes('security guard')) return PHOTO_LIBRARY.security;
  if (t.includes('ceiling') || t.includes('pop')) return PHOTO_LIBRARY.ceiling;
  if (t.includes('glass') || t.includes('glazier')) return PHOTO_LIBRARY.glass;
  if (t.includes('tile') || t.includes('marble')) return PHOTO_LIBRARY.tile;
  if (t.includes('upholstery')) return PHOTO_LIBRARY.upholstery;
  if (t.includes('interior') || t.includes('decor')) return PHOTO_LIBRARY.interior;
  if (t.includes('event') || t.includes('wedding')) return PHOTO_LIBRARY.event;
  if (t.includes('photograph')) return PHOTO_LIBRARY.photographer;
  if (t.includes('videograph')) return PHOTO_LIBRARY.videographer;
  if (t.includes('dj') || t.includes('sound')) return PHOTO_LIBRARY.dj;
  if (t.includes('orchestra') || t.includes('music')) return PHOTO_LIBRARY.orchestra;
  return PHOTO_LIBRARY.mason;
};

const escapeSvgText = (value: string, max: number) => escapeXml(value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** Guaranteed local fallback for an image failure. */
export const serviceImageFallback = (term: string, subtitle = '') => {
  const label = escapeSvgText(term, 34);
  const sub = escapeSvgText(subtitle, 46);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8f1ff"/><stop offset="1" stop-color="#cfe0ff"/></linearGradient></defs><rect width="900" height="520" fill="url(#g)"/><circle cx="730" cy="100" r="110" fill="#2563eb" opacity=".12"/><rect x="60" y="70" width="170" height="170" rx="36" fill="#fff" opacity=".95"/><path d="M105 185h80M145 105v95" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/><text x="60" y="330" font-family="Arial,sans-serif" font-size="38" font-weight="800" fill="#0f172a">${label}</text><text x="60" y="370" font-family="Arial,sans-serif" font-size="17" fill="#2563eb">PUNCHX • VERIFIED SERVICE</text><text x="60" y="404" font-family="Arial,sans-serif" font-size="15" fill="#475569">${sub}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * Return a direct photograph URL for category, subcategory and exact-work cards.
 * This is intentionally direct rather than wrapping the remote photo in a data
 * URI, so the image remains crisp and visible in mobile production builds.
 */
export const serviceImage = (term: string, _subtitle = '') => photoFor(term);

export const materialFor = (category: string, item: string) => {
  const t = `${category} ${item}`.toLowerCase();
  if (t.includes('electric') || t.includes('fan') || t.includes('light') || t.includes('switch') || t.includes('wiring')) return 'Wires, connectors, screws, insulation tape, tester and standard electrical fittings as applicable.';
  if (t.includes('plumb') || t.includes('tap') || t.includes('pipe') || t.includes('toilet') || t.includes('drain')) return 'PTFE tape, sealant, washers, pipe cutters, connectors and standard plumbing fittings as applicable.';
  if (t.includes('carp') || t.includes('wood') || t.includes('furniture') || t.includes('door')) return 'Screws, hinges, handles, drill, measuring tape, adhesive and wood/board components as applicable.';
  if (t.includes('paint') || t.includes('waterproof')) return 'Primer, putty, paint/coating, rollers, brushes, masking tape and surface-preparation materials as applicable.';
  if (t.includes('clean') || t.includes('pest')) return 'Cleaning agents, microfiber cloths, brushes, vacuum equipment and treatment consumables as applicable.';
  if (t.includes('ac') || t.includes('refrigerator') || t.includes('geyser') || t.includes('appliance')) return 'Cleaning consumables, multimeter, fasteners, connectors and replacement parts only when required.';
  if (t.includes('mobile') || t.includes('computer') || t.includes('electronic')) return 'Diagnostic tools, screwdrivers, cleaning materials and replacement component/part only when selected.';
  if (t.includes('bike') || t.includes('car') || t.includes('mechanic')) return 'Wrenches, sockets, lubricants, diagnostic equipment and replacement parts when required.';
  if (t.includes('garden')) return 'Soil, compost, fertilizer, pruning tools, pots and plant supports when required.';
  if (t.includes('food') || t.includes('cook') || t.includes('baker') || t.includes('cater')) return 'Ingredients, cookware, utensils and consumables are quoted according to menu, quantity and customer selection.';
  if (t.includes('beaut') || t.includes('hair') || t.includes('barber')) return 'Professional scissors, combs, brushes, styling tools and hygiene consumables as applicable.';
  return 'Standard professional tools and consumables are included where applicable; customer-approved replacement materials are charged separately.';
};
