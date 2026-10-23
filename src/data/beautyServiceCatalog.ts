export type BeautyAudience = 'female' | 'male';

export interface BeautyServiceItem {
  id: string;
  name: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
}

export interface BeautyServiceGroup {
  id: string;
  gender: BeautyAudience;
  name: string;
  description: string;
  tag: string;
  image: string;
  productGroups: string[];
  services: BeautyServiceItem[];
}

export interface BeautyProductItem {
  id: string;
  name: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  specification: string;
  confidence: 'A/B' | 'B' | 'C';
  quoteRequired?: boolean;
  gender: BeautyAudience;
  groups: string[];
}

export const BEAUTY_SERVICE_GROUPS: BeautyServiceGroup[] = [
  {
    id: 'women-salon', gender: 'female', name: 'Salon for Women',
    description: 'Facials, cleanup, waxing, threading, nails and everyday salon essentials.',
    tag: 'Salon essentials',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['women-salon', 'skin-care', 'waxing', 'nails'],
    services: [
      { id: 'women-basic-facial', name: 'Basic Facial', description: 'Cleansing, exfoliation, facial massage and a suitable mask; confirm skin sensitivity before treatment.', minPrice: 399, maxPrice: 899, duration: '45–60 min' },
      { id: 'women-cleanup', name: 'Face Cleanup', description: 'Surface cleansing and basic skin care, tailored to the selected product range.', minPrice: 249, maxPrice: 599, duration: '30–45 min' },
      { id: 'women-eyebrow-threading', name: 'Eyebrow Threading', description: 'Shape and tidy eyebrows at home.', minPrice: 40, maxPrice: 100, duration: '10–15 min' },
      { id: 'women-upper-lip', name: 'Upper Lip Threading', description: 'Quick facial hair removal with thread.', minPrice: 30, maxPrice: 70, duration: '5–10 min' },
      { id: 'women-full-arms-wax', name: 'Full Arms Waxing', description: 'Waxing service; wax type and skin sensitivity are confirmed before starting.', minPrice: 199, maxPrice: 399, duration: '25–40 min' },
      { id: 'women-full-legs-wax', name: 'Full Legs Waxing', description: 'Full leg waxing using the agreed wax type.', minPrice: 299, maxPrice: 599, duration: '35–55 min' },
      { id: 'women-manicure', name: 'Manicure', description: 'Nail shaping, cuticle care and hand care; polish options may cost extra.', minPrice: 249, maxPrice: 599, duration: '30–45 min' },
      { id: 'women-pedicure', name: 'Pedicure', description: 'Foot soak, nail shaping and basic foot care; premium add-ons are quoted separately.', minPrice: 299, maxPrice: 699, duration: '35–55 min' },
    ],
  },
  {
    id: 'women-spa', gender: 'female', name: 'Spa for Women',
    description: 'Relaxation, head and foot massage, body scrub and spa-style self-care.',
    tag: 'Relax & recharge',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['women-spa', 'spa-care', 'massage-care', 'skin-care'],
    services: [
      { id: 'women-head-massage', name: 'Head & Shoulder Massage', description: 'Relaxation-focused massage with agreed oil or lotion preferences.', minPrice: 299, maxPrice: 599, duration: '25–40 min' },
      { id: 'women-foot-spa', name: 'Foot Spa & Care', description: 'Foot soak and care with product preferences confirmed before the session.', minPrice: 399, maxPrice: 899, duration: '35–50 min' },
      { id: 'women-relaxation-massage', name: 'Relaxation Body Massage', description: 'Non-medical relaxation massage; available technique and session duration are confirmed before booking.', minPrice: 999, maxPrice: 2499, duration: '60–90 min' },
      { id: 'women-body-scrub', name: 'Body Scrub Treatment', description: 'Body exfoliation using the selected skin-suitable product range.', minPrice: 699, maxPrice: 1599, duration: '45–60 min' },
      { id: 'women-spa-facial', name: 'Premium Spa Facial', description: 'Longer facial session with premium product choices after a skin-sensitivity check.', minPrice: 799, maxPrice: 1899, duration: '60–75 min' },
    ],
  },
  {
    id: 'women-hair-studio', gender: 'female', name: 'Hair Studio for Women',
    description: 'Haircuts, styling, hair spa, colouring and salon treatments at home.',
    tag: 'Hair care & styling',
    image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['women-hair-studio', 'hair-care', 'hair-styling'],
    services: [
      { id: 'women-haircut', name: 'Women’s Haircut', description: 'Consultation, haircut and finish based on hair length and requested style.', minPrice: 249, maxPrice: 799, duration: '30–60 min' },
      { id: 'women-wash-blowdry', name: 'Hair Wash & Blow Dry', description: 'Hair wash and basic blow-dry finish; extra-long hair may change the quote.', minPrice: 199, maxPrice: 499, duration: '25–45 min' },
      { id: 'women-hair-spa', name: 'Hair Spa', description: 'Hair and scalp care using the agreed treatment product.', minPrice: 599, maxPrice: 1599, duration: '45–75 min' },
      { id: 'women-hair-colour', name: 'Root Touch-up / Hair Colour', description: 'Colour service; shade, hair length, product brand and patch-test needs are confirmed first.', minPrice: 799, maxPrice: 2999, duration: '60–120 min' },
      { id: 'women-smoothing', name: 'Hair Smoothing', description: 'Chemical treatment requiring hair-condition consultation and a confirmed product quote.', minPrice: 2500, maxPrice: 8000, duration: '120–240 min' },
      { id: 'women-keratin', name: 'Keratin / Smoothening Treatment', description: 'Treatment selection depends on hair length, condition, product and stylist assessment.', minPrice: 2999, maxPrice: 9999, duration: '120–240 min' },
      { id: 'women-party-hairstyle', name: 'Party Hairstyling', description: 'Occasion hairstyle with pinned or accessory finish as agreed.', minPrice: 499, maxPrice: 1999, duration: '30–75 min' },
    ],
  },
  {
    id: 'women-makeup-styling', gender: 'female', name: 'Makeup, Saree & Styling',
    description: 'Party makeup, bridal/event looks, saree draping and occasion hair styling.',
    tag: 'Occasion ready',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['women-makeup-styling', 'makeup', 'styling'],
    services: [
      { id: 'women-party-makeup', name: 'Party Makeup', description: 'Occasion makeup with product finish and preferred look confirmed before booking.', minPrice: 999, maxPrice: 2999, duration: '45–90 min' },
      { id: 'women-engagement-makeup', name: 'Engagement / Event Makeup', description: 'Long-wear event makeup with agreed lashes and add-ons.', minPrice: 2499, maxPrice: 8999, duration: '75–150 min' },
      { id: 'women-bridal-makeup', name: 'Bridal Makeup', description: 'Bridal look quote depends on trial, products, draping, hair styling and event schedule.', minPrice: 4999, maxPrice: 25000, duration: '120–240 min' },
      { id: 'women-saree-draping', name: 'Saree Draping', description: 'Drape and pleat a saree with pins; garment type may affect the work.', minPrice: 299, maxPrice: 999, duration: '20–40 min' },
      { id: 'women-bridal-hairstyle', name: 'Bridal / Event Hairstyling', description: 'Occasion hairstyle; extensions and accessories are priced separately.', minPrice: 799, maxPrice: 2999, duration: '45–100 min' },
    ],
  },
  {
    id: 'men-salon', gender: 'male', name: 'Salon for Men',
    description: 'Haircuts, beard trims, shaving, hair styling and men’s facial grooming.',
    tag: 'Grooming essentials',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['men-salon', 'mens-grooming', 'shaving', 'hair-styling', 'skin-care'],
    services: [
      { id: 'men-basic-haircut', name: 'Basic Haircut', description: 'Haircut and finish based on the requested style.', minPrice: 99, maxPrice: 249, duration: '20–35 min' },
      { id: 'men-premium-haircut', name: 'Premium Haircut & Styling', description: 'Consultation, haircut and styling product finish.', minPrice: 199, maxPrice: 399, duration: '30–45 min' },
      { id: 'men-beard-trim', name: 'Beard Trim & Shape', description: 'Beard line-up and trim with preferred finish.', minPrice: 79, maxPrice: 199, duration: '15–25 min' },
      { id: 'men-clean-shave', name: 'Clean Shave', description: 'Shaving service with agreed aftercare product.', minPrice: 69, maxPrice: 179, duration: '15–25 min' },
      { id: 'men-face-cleanup', name: 'Face Cleanup', description: 'Basic cleansing and grooming skincare.', minPrice: 199, maxPrice: 499, duration: '25–40 min' },
      { id: 'men-facial', name: 'Men’s Facial', description: 'Facial treatment selected for skin type and sensitivity.', minPrice: 399, maxPrice: 999, duration: '45–60 min' },
      { id: 'men-hair-colour', name: 'Hair Colour / Grey Coverage', description: 'Colour service; product brand, hair length and patch-test needs are confirmed first.', minPrice: 399, maxPrice: 1499, duration: '40–90 min' },
    ],
  },
  {
    id: 'men-massage', gender: 'male', name: 'Massage for Men',
    description: 'Head, foot, back and relaxation massage sessions at home.',
    tag: 'Relax & recover',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=85',
    productGroups: ['men-massage', 'massage-care', 'spa-care'],
    services: [
      { id: 'men-head-massage', name: 'Head Massage', description: 'Relaxation head massage with agreed oil preferences.', minPrice: 199, maxPrice: 499, duration: '20–35 min' },
      { id: 'men-foot-massage', name: 'Foot Massage', description: 'Relaxation foot massage session.', minPrice: 299, maxPrice: 699, duration: '25–40 min' },
      { id: 'men-back-shoulder-massage', name: 'Back & Shoulder Massage', description: 'Non-medical relaxation massage; pressure and preferred technique are confirmed first.', minPrice: 499, maxPrice: 999, duration: '30–50 min' },
      { id: 'men-relaxation-massage', name: 'Full Body Relaxation Massage', description: 'Non-medical relaxation session with the chosen duration and oils confirmed before booking.', minPrice: 999, maxPrice: 2499, duration: '60–90 min' },
      { id: 'men-sports-massage', name: 'Sports / Deep Tissue Massage', description: 'Availability depends on professional training and suitability; this is not a substitute for medical care.', minPrice: 1299, maxPrice: 2999, duration: '60–90 min' },
    ],
  },
];

export const BEAUTY_PRODUCTS: BeautyProductItem[] = [
  { id: 'beauty-women-wax', name: 'Wax Tub / Cartridge', unit: 'piece', minPrice: 120, maxPrice: 850, specification: 'Wax type, weight and brand; confirm skin suitability', confidence: 'C', gender: 'female', groups: ['waxing', 'women-salon'] },
  { id: 'beauty-women-facial-kit', name: 'Facial & Cleanup Product Kit', unit: 'kit', minPrice: 250, maxPrice: 2500, specification: 'Brand and skin suitability; confirm ingredients before treatment', confidence: 'C', gender: 'female', groups: ['women-salon', 'women-spa', 'skin-care'] },
  { id: 'beauty-women-nail-kit', name: 'Manicure / Pedicure Kit', unit: 'kit', minPrice: 180, maxPrice: 1800, specification: 'Tool count, hygiene packaging and included consumables', confidence: 'C', gender: 'female', groups: ['nails', 'women-salon'] },
  { id: 'beauty-women-shampoo', name: 'Shampoo & Conditioner Pair', unit: 'set', minPrice: 250, maxPrice: 1800, specification: 'Hair type, formula and brand', confidence: 'B', gender: 'female', groups: ['hair-care', 'women-hair-studio'] },
  { id: 'beauty-women-hair-mask', name: 'Hair Spa / Hair Mask', unit: 'jar', minPrice: 250, maxPrice: 2200, specification: 'Hair type, ingredients and pack size', confidence: 'C', gender: 'female', groups: ['hair-care', 'women-hair-studio'] },
  { id: 'beauty-women-colour', name: 'Hair Colour Kit', unit: 'kit', minPrice: 250, maxPrice: 2200, specification: 'Shade, brand, hair length and patch test', confidence: 'C', gender: 'female', groups: ['hair-care', 'women-hair-studio'] },
  { id: 'beauty-women-makeup', name: 'Party Makeup Kit', unit: 'kit', minPrice: 600, maxPrice: 6500, specification: 'Brand tier, shade matching and products included', confidence: 'C', gender: 'female', groups: ['makeup', 'women-makeup-styling'] },
  { id: 'beauty-women-brushes', name: 'Makeup Brush Set', unit: 'set', minPrice: 250, maxPrice: 2500, specification: 'Brush count, material and quality', confidence: 'C', gender: 'female', groups: ['makeup', 'styling', 'women-makeup-styling'] },
  { id: 'beauty-women-saree', name: 'Saree Pins & Pleating Kit', unit: 'kit', minPrice: 80, maxPrice: 500, specification: 'Pin type and kit contents', confidence: 'B', gender: 'female', groups: ['styling', 'women-makeup-styling'] },
  { id: 'beauty-women-styling', name: 'Hair Styling Tool / Accessory Kit', unit: 'set', minPrice: 350, maxPrice: 4500, specification: 'Tool type, heat settings and included accessories', confidence: 'C', gender: 'female', groups: ['hair-styling', 'styling', 'women-hair-studio', 'women-makeup-styling'] },
  { id: 'beauty-women-spa-oil', name: 'Spa Massage Oil', unit: 'bottle', minPrice: 250, maxPrice: 1200, specification: 'Ingredients, fragrance and volume', confidence: 'C', gender: 'female', groups: ['spa-care', 'massage-care', 'women-spa'] },
  { id: 'beauty-women-body-scrub', name: 'Body Scrub', unit: 'jar', minPrice: 180, maxPrice: 1000, specification: 'Ingredients, skin sensitivity and pack size', confidence: 'C', gender: 'female', groups: ['spa-care', 'women-spa'] },
  { id: 'beauty-men-beard-oil', name: 'Beard Oil', unit: 'bottle', minPrice: 150, maxPrice: 900, specification: 'Ingredients, fragrance and pack size', confidence: 'B', gender: 'male', groups: ['mens-grooming', 'men-salon'] },
  { id: 'beauty-men-pomade', name: 'Hair Pomade / Styling Cream', unit: 'jar', minPrice: 150, maxPrice: 850, specification: 'Hold level, finish and hair type', confidence: 'B', gender: 'male', groups: ['mens-grooming', 'hair-styling', 'men-salon'] },
  { id: 'beauty-men-shave-kit', name: 'Shaving / Beard Grooming Kit', unit: 'kit', minPrice: 180, maxPrice: 1500, specification: 'Razor, brush, comb and aftercare items included', confidence: 'C', gender: 'male', groups: ['shaving', 'mens-grooming', 'men-salon'] },
  { id: 'beauty-men-aftershave', name: 'Aftershave Balm', unit: 'bottle', minPrice: 120, maxPrice: 750, specification: 'Formula, fragrance and skin sensitivity', confidence: 'B', gender: 'male', groups: ['shaving', 'mens-grooming', 'skin-care', 'men-salon'] },
  { id: 'beauty-men-facial-kit', name: 'Men’s Facial Kit', unit: 'kit', minPrice: 250, maxPrice: 1800, specification: 'Ingredients, skin suitability and pack size', confidence: 'C', gender: 'male', groups: ['skin-care', 'men-salon'] },
  { id: 'beauty-men-massage-oil', name: 'Massage Oil 500 ml', unit: 'bottle', minPrice: 250, maxPrice: 1200, specification: 'Ingredients, fragrance and volume', confidence: 'C', gender: 'male', groups: ['massage-care', 'men-massage'] },
  { id: 'beauty-men-foot-care', name: 'Foot Care / Massage Cream', unit: 'tube', minPrice: 180, maxPrice: 900, specification: 'Ingredients, skin sensitivity and pack size', confidence: 'B', gender: 'male', groups: ['men-massage', 'massage-care'] },
];
