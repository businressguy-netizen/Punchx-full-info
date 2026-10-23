import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Search, X, MapPin, Home, Clock3, ShieldCheck, Wrench, Zap, Sparkles, Package, Droplet, CalendarDays, ShoppingBasket, ChefHat, CookingPot , Paintbrush, Ruler, Bug } from 'lucide-react';
import { PUNCHX_50_CATEGORIES, ServiceCategoryItem } from '../data/categories';
import { PunchXLeafService, PunchXServiceBranch, PunchXSubcategory, getPunchXServiceBranch } from '../data/serviceHierarchy';
import { serviceImage, serviceImageFallback } from '../data/serviceVisuals';
import { serviceCategories } from '../data/serviceCatalogs';
import { getProductsForCategory } from '../data/expandedPriceCatalogue';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (category: string) => void;
  onTransition: (target: any) => void;
  citizenAddress: string;
}

type Level = 'categories' | 'subcategories' | 'services';
const ELECTRICIAN_GROUP_COPY: Record<string, { description: string; image: string; tag: string }> = {
  'switch & socket': {
    description: 'Loose switches, damaged sockets, plug points and smart-switch installs.',
    image: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1000&q=85',
    tag: 'Switches & plugs',
  },
  fan: {
    description: 'Fan repair, installation, replacement, regulator and BLDC fan help.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Fans & regulators',
  },
  light: {
    description: 'Bulbs, LED battens, ceiling lights and decorative fixture installation.',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=1000&q=85',
    tag: 'Lights & fixtures',
  },
  'wiring & power': {
    description: 'Power faults, wiring checks, MCB trips and fuse replacement.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Wiring & safety',
  },
  'doorbell & security': {
    description: 'Doorbells, video doorbells and basic electrical security-device fitting.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1000&q=85',
    tag: 'Home security',
  },
  appliances: {
    description: 'Electrical connections for geysers, exhaust fans and home appliances.',
    image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1000&q=85',
    tag: 'Appliance connections',
  },
};

const electricianGroupVisual = (name: string) => {
  const key = name.toLowerCase();
  const entry = Object.entries(ELECTRICIAN_GROUP_COPY).find(([match]) =>
    key.includes(match) || match.includes(key)
  );
  return entry?.[1] || {
    description: 'Get help with a household electrical repair, installation or replacement.',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85',
    tag: 'Electrical service',
  };
};


type BeautyServiceSeed = { name: string; minPrice: number; maxPrice: number; duration: string; description: string };
type BeautyServiceGroup = { id: string; gender: 'female'|'male'; name: string; description: string; tag: string; image: string; productGroups: string[]; services: BeautyServiceSeed[] };
const BEAUTY_SERVICE_GROUPS: BeautyServiceGroup[] = [
 {id:'women-salon',gender:'female',name:'Salon for Women',description:'Waxing, threading, facials, cleanup and nail care',tag:'Everyday salon',image:'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',productGroups:['skin-care','waxing','nails'],services:[
  {name:'Express Face Cleanup',minPrice:299,maxPrice:599,duration:'30–45 min',description:'Basic cleanse and skin refresh. Products and technique are selected after discussing your skin preferences.'},
  {name:'Basic Facial',minPrice:399,maxPrice:899,duration:'40–60 min',description:'A basic facial session using suitable salon products; confirm the steps and product brand before starting.'},
  {name:'Premium / Brightening Facial',minPrice:899,maxPrice:2199,duration:'50–75 min',description:'Premium facial options vary by product line and steps. Results vary by skin type; not a medical skin treatment.'},
  {name:'Eyebrow Threading',minPrice:49,maxPrice:99,duration:'10–15 min',description:'Shape eyebrows to your preferred style with clean thread and suitable hygiene practices.'},
  {name:'Upper Lip Threading',minPrice:39,maxPrice:79,duration:'5–10 min',description:'Facial hair removal using threading.'},
  {name:'Full Face Threading',minPrice:149,maxPrice:299,duration:'15–25 min',description:'Face threading, with areas confirmed before the service.'},
  {name:'Underarm Waxing',minPrice:149,maxPrice:299,duration:'15–25 min',description:'Waxing using a suitable wax type, after checking your preference and skin sensitivity.'},
  {name:'Full Arms Waxing',minPrice:249,maxPrice:499,duration:'25–40 min',description:'Hair removal for both arms. Wax type and service area affect the final price.'},
  {name:'Full Legs Waxing',minPrice:399,maxPrice:799,duration:'35–55 min',description:'Hair removal for both legs using the selected wax option.'},
  {name:'Full Arms, Legs & Underarms Waxing',minPrice:699,maxPrice:1199,duration:'60–90 min',description:'Combined waxing package; confirm the wax type and included areas before booking.'},
  {name:'Manicure',minPrice:299,maxPrice:599,duration:'30–45 min',description:'Nail shaping, cuticle care and hand grooming; polish or upgrades may be additional.'},
  {name:'Pedicure',minPrice:399,maxPrice:799,duration:'35–60 min',description:'Foot soak, nail care and routine foot grooming; selected treatment determines the price.'},
  {name:'Bleach / De-tan',minPrice:299,maxPrice:699,duration:'20–40 min',description:'A product-based beauty service. Patch testing and suitability checks are recommended before use.'}
 ]},
 {id:'women-spa',gender:'female',name:'Spa for Women',description:'Relaxation massage, body care and mini spa experiences',tag:'Relax & unwind',image:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=85',productGroups:['spa-care','massage-care'],services:[
  {name:'Head, Neck & Shoulder Massage',minPrice:299,maxPrice:599,duration:'20–30 min',description:'A relaxation-focused massage for head, neck and shoulder areas.'},
  {name:'Quick Comfort Massage',minPrice:899,maxPrice:1299,duration:'30–45 min',description:'Short wellness massage session. Not a substitute for medical diagnosis or treatment.'},
  {name:'Swedish Relaxation Massage',minPrice:1299,maxPrice:1799,duration:'60 min',description:'Full-body relaxation massage using a chosen massage oil and agreed pressure.'},
  {name:'Deep Tissue Wellness Massage',minPrice:1499,maxPrice:2199,duration:'60–75 min',description:'A firmer massage option for general relaxation; disclose injuries or health concerns to the provider first.'},
  {name:'Leg & Foot Relief Massage',minPrice:699,maxPrice:999,duration:'30–40 min',description:'Relaxation massage focused on feet and lower legs.'},
  {name:'Body Scrub & Care',minPrice:1299,maxPrice:1999,duration:'60–75 min',description:'Body-care treatment using suitable products; confirm any skin sensitivities and included areas.'},
  {name:'Back Relaxation Massage',minPrice:699,maxPrice:1099,duration:'30–40 min',description:'A focused relaxation massage for the back area.'}
 ]},
 {id:'women-hair',gender:'female',name:'Hair Studio for Women',description:'Haircuts, styling, hair spa, colour and treatments',tag:'Hair care & styling',image:'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1000&q=85',productGroups:['hair-care','hair-styling','hair-colour'],services:[
  {name:'Women’s Haircut',minPrice:299,maxPrice:699,duration:'30–50 min',description:'Haircut based on preferred length and style; long-hair or complex cuts may cost more.'},
  {name:'Wash & Blow-dry',minPrice:299,maxPrice:699,duration:'30–45 min',description:'Hair wash and blow-dry finish; length and desired styling affect duration.'},
  {name:'Hair Spa',minPrice:699,maxPrice:1499,duration:'45–75 min',description:'Conditioning-focused hair spa using an agreed product range.'},
  {name:'Hair Mask / Conditioning Treatment',minPrice:499,maxPrice:1199,duration:'30–60 min',description:'Product-based conditioning treatment selected for your hair needs.'},
  {name:'Root Touch-up Colour',minPrice:599,maxPrice:1499,duration:'45–75 min',description:'Root colour service; shade, hair length and colour product affect the estimate.'},
  {name:'Full Hair Colour',minPrice:999,maxPrice:2999,duration:'60–120 min',description:'Colour range depends on hair length, shade, product and application complexity.'},
  {name:'Hair Straightening / Smoothening',minPrice:1799,maxPrice:4999,duration:'2–4 hours',description:'Chemical hair services need a consultation and strand/sensitivity assessment; exact price depends on length and product.'},
  {name:'Party Hair Styling',minPrice:499,maxPrice:1499,duration:'30–60 min',description:'Curls, waves, blowout or an agreed occasion style; accessories may be extra.'}
 ]},
 {id:'women-makeup',gender:'female',name:'Makeup, Saree & Styling',description:'Party makeup, bridal looks, saree draping and occasion styling',tag:'Occasion ready',image:'https://images.unsplash.com/photo-1487412947147-5cebf100ffc8?auto=format&fit=crop&w=1000&q=85',productGroups:['makeup','styling','hair-styling'],services:[
  {name:'Basic / Natural Makeup',minPrice:799,maxPrice:1999,duration:'45–75 min',description:'Natural makeup for an everyday event; product range and add-ons determine price.'},
  {name:'Party Makeup',minPrice:1499,maxPrice:3999,duration:'60–100 min',description:'Makeup for parties or celebrations; lashes, premium products and hairstyling may be extra.'},
  {name:'Engagement / Occasion Makeup',minPrice:2499,maxPrice:6999,duration:'75–120 min',description:'Event makeup tailored to the chosen look. Trial, hair styling and travel may be charged separately.'},
  {name:'Bridal Makeup',minPrice:4999,maxPrice:17999,duration:'2–4 hours',description:'Bridal packages vary by artist, products, trial and included styling. Confirm inclusions in writing.'},
  {name:'Saree Draping',minPrice:399,maxPrice:999,duration:'20–40 min',description:'Drape a customer-provided saree in the selected style; pleating complexity affects timing.'},
  {name:'Hairdo with Saree Styling',minPrice:999,maxPrice:2999,duration:'60–100 min',description:'Combined hairstyle and saree draping; confirm accessory and pin requirements.'},
  {name:'Mehendi for Hands',minPrice:299,maxPrice:1499,duration:'30–90 min',description:'Decorative henna application; price depends on design detail and coverage.'},
  {name:'Pre-bridal Grooming Package',minPrice:2999,maxPrice:8999,duration:'2–4 hours',description:'A customised combination of grooming services; choose included services and confirm final package pricing.'}
 ]},
 {id:'men-salon',gender:'male',name:'Salon for Men',description:'Haircuts, beard grooming, facials and grooming essentials',tag:'Grooming essentials',image:'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85',productGroups:['mens-grooming','shaving','hair-care','skin-care','nails'],services:[
  {name:'Haircut for Men',minPrice:199,maxPrice:399,duration:'25–40 min',description:'Haircut based on preferred style and length.'},
  {name:'Haircut + Beard Styling',minPrice:299,maxPrice:599,duration:'40–60 min',description:'Combined haircut and beard shaping in one session.'},
  {name:'Beard Trimming & Styling',minPrice:99,maxPrice:249,duration:'15–25 min',description:'Trim and shape the beard to your preferred style.'},
  {name:'Clean Shave',minPrice:99,maxPrice:249,duration:'15–25 min',description:'Shaving service using hygienic tools and a fresh blade.'},
  {name:'Beard Colour',minPrice:199,maxPrice:499,duration:'20–35 min',description:'Beard-colour application using an agreed shade and product; patch testing is recommended.'},
  {name:'Hair Colour / Grey Coverage',minPrice:399,maxPrice:999,duration:'30–60 min',description:'Hair-colour service; shade, product and hair length affect pricing.'},
  {name:'Hair Spa for Men',minPrice:499,maxPrice:1199,duration:'35–60 min',description:'Hair and scalp conditioning service with an agreed product.'},
  {name:'Face Cleanup / Detan',minPrice:299,maxPrice:799,duration:'25–45 min',description:'Facial cleansing or de-tan service; products are chosen based on customer preference.'},
  {name:'Express Manicure',minPrice:249,maxPrice:499,duration:'25–40 min',description:'Routine nail and hand grooming.'},
  {name:'Express Pedicure',minPrice:349,maxPrice:699,duration:'30–50 min',description:'Routine nail and foot grooming.'},
  {name:'Head Massage with Oil',minPrice:149,maxPrice:399,duration:'10–20 min',description:'Short relaxation massage; oil preference can be discussed before starting.'}
 ]},
 {id:'men-massage',gender:'male',name:'Massage for Men',description:'Relaxation massage options for back, feet and full body',tag:'Relax & recover',image:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=85',productGroups:['massage-care','spa-care'],services:[
  {name:'Head, Neck & Shoulder Massage',minPrice:299,maxPrice:599,duration:'20–30 min',description:'A relaxation-focused massage for head, neck and shoulder areas.'},
  {name:'Quick Comfort Massage',minPrice:899,maxPrice:1299,duration:'30–45 min',description:'A short wellness massage session, subject to provider availability.'},
  {name:'Swedish Relaxation Massage',minPrice:1299,maxPrice:1799,duration:'60 min',description:'Full-body relaxation massage with agreed pressure and massage oil.'},
  {name:'Deep Tissue Wellness Massage',minPrice:1499,maxPrice:2199,duration:'60–75 min',description:'A firmer massage option for relaxation; not a medical treatment.'},
  {name:'Back Relief Massage',minPrice:699,maxPrice:1099,duration:'30–40 min',description:'Focused back massage for relaxation and comfort.'},
  {name:'Foot & Calf Massage',minPrice:699,maxPrice:999,duration:'30–40 min',description:'Relaxation massage focused on lower legs and feet.'},
  {name:'Full Body Massage & Scrub',minPrice:1699,maxPrice:2499,duration:'75–100 min',description:'Combined wellness massage and body-care session; confirm included areas and products.'}
 ]}
];
const BEAUTY_PRODUCTS = [
 {id:'beauty-cleanser',name:'Facial Cleanser',unit:'bottle',minPrice:150,maxPrice:900,specification:'Skin type, ingredient list and brand tier',groups:['skin-care']},
 {id:'beauty-moisturiser',name:'Face Moisturiser',unit:'bottle',minPrice:180,maxPrice:1200,specification:'Skin type, ingredients and pack size',groups:['skin-care']},
 {id:'beauty-sunscreen',name:'Face Sunscreen',unit:'tube',minPrice:200,maxPrice:1200,specification:'SPF, finish and pack size',groups:['skin-care']},
 {id:'beauty-facial-kit',name:'Facial / Cleanup Kit',unit:'kit',minPrice:250,maxPrice:2500,specification:'Brand, treatment steps and number of uses',groups:['skin-care']},
 {id:'beauty-wax',name:'Wax Tub / Wax Cartridge',unit:'piece',minPrice:120,maxPrice:850,specification:'Wax type, weight and skin suitability',groups:['waxing']},
 {id:'beauty-wax-strips',name:'Wax Strips',unit:'pack',minPrice:80,maxPrice:450,specification:'Pack count and intended use',groups:['waxing']},
 {id:'beauty-thread',name:'Threading Thread Pack',unit:'pack',minPrice:40,maxPrice:250,specification:'Thread type and pack size',groups:['waxing']},
 {id:'beauty-nail-kit',name:'Manicure / Pedicure Kit',unit:'kit',minPrice:180,maxPrice:1200,specification:'Tool set, quality and sanitation requirements',groups:['nails']},
 {id:'beauty-nail-polish',name:'Nail Polish',unit:'bottle',minPrice:60,maxPrice:500,specification:'Brand and finish',groups:['nails']},
 {id:'beauty-shampoo',name:'Shampoo',unit:'bottle',minPrice:150,maxPrice:900,specification:'Hair type, ingredients and pack size',groups:['hair-care']},
 {id:'beauty-conditioner',name:'Conditioner / Hair Mask',unit:'jar',minPrice:180,maxPrice:1200,specification:'Formula, hair length and pack size',groups:['hair-care']},
 {id:'beauty-serum',name:'Hair Serum',unit:'bottle',minPrice:180,maxPrice:1100,specification:'Formula, finish and pack size',groups:['hair-care','hair-styling']},
 {id:'beauty-hair-colour',name:'Hair Colour / Root Touch-up Kit',unit:'kit',minPrice:180,maxPrice:1200,specification:'Shade, product type and pack size',groups:['hair-colour','hair-care','mens-grooming']},
 {id:'beauty-styling-spray',name:'Hair Styling Spray / Wax',unit:'piece',minPrice:180,maxPrice:900,specification:'Hold level, finish and brand tier',groups:['hair-styling','mens-grooming']},
 {id:'beauty-foundation',name:'Foundation / Base Makeup',unit:'piece',minPrice:250,maxPrice:2500,specification:'Shade match, brand and finish',groups:['makeup']},
 {id:'beauty-lipstick',name:'Lipstick',unit:'piece',minPrice:120,maxPrice:1800,specification:'Brand, formula and finish',groups:['makeup']},
 {id:'beauty-makeup-brush',name:'Makeup Brush Set',unit:'set',minPrice:250,maxPrice:2500,specification:'Brush count, material and quality',groups:['makeup','styling']},
 {id:'beauty-saree-kit',name:'Saree Pins & Pleating Kit',unit:'kit',minPrice:80,maxPrice:500,specification:'Pin type and kit contents',groups:['styling']},
 {id:'beauty-beard-oil',name:'Beard Oil',unit:'bottle',minPrice:150,maxPrice:900,specification:'Ingredients, fragrance and pack size',groups:['mens-grooming']},
 {id:'beauty-pomade',name:'Hair Pomade / Styling Cream',unit:'jar',minPrice:150,maxPrice:850,specification:'Hold level, finish and hair type',groups:['mens-grooming','hair-styling']},
 {id:'beauty-shaving-kit',name:'Shaving / Beard Grooming Kit',unit:'kit',minPrice:180,maxPrice:1500,specification:'Razor, brush, comb and aftercare items included',groups:['shaving','mens-grooming']},
 {id:'beauty-aftershave',name:'Aftershave Balm',unit:'bottle',minPrice:120,maxPrice:750,specification:'Formula, fragrance and skin sensitivity',groups:['shaving','mens-grooming','skin-care']},
 {id:'beauty-massage-oil',name:'Massage Oil',unit:'bottle',minPrice:250,maxPrice:1200,specification:'Ingredients, fragrance and volume',groups:['massage-care']},
 {id:'beauty-body-scrub',name:'Body Scrub',unit:'jar',minPrice:180,maxPrice:1000,specification:'Ingredients, skin sensitivity and pack size',groups:['spa-care']},
 {id:'beauty-spa-lotion',name:'Body Lotion / Massage Lotion',unit:'bottle',minPrice:180,maxPrice:900,specification:'Formula, skin sensitivity and pack size',groups:['spa-care','massage-care']},
];
const beautyServiceRange = (serviceName: string, groupName?: string) => {
 const group=BEAUTY_SERVICE_GROUPS.find(item=>item.name===groupName);
 const service=group?.services.find(item=>item.name===serviceName);
 return service?{min:service.minPrice,max:service.maxPrice}:null;
};
const beautyProductCartAdd = (product: typeof BEAUTY_PRODUCTS[number]) => {
 try {
  const current=JSON.parse(localStorage.getItem('punchx_catalogue_cart')||'[]');
  const cart=Array.isArray(current)?current:[];
  const index=cart.findIndex((item:{id?:string;category?:string})=>item.id===product.id&&item.category==='Beauty & Salon at Home');
  if(index>=0) cart[index]={...cart[index],qty:Math.min(99,Number(cart[index].qty||1)+1)};
  else cart.push({id:product.id,name:product.name,category:'Beauty & Salon at Home',kind:'product',unit:product.unit,min:product.minPrice,max:product.maxPrice,qty:1,notes:product.specification,quote:false});
  localStorage.setItem('punchx_catalogue_cart',JSON.stringify(cart));return true;
 } catch {return false;}
};
const PLUMBING_SERVICE_GROUPS = [
  { id: 'tap-mixer', name: 'Taps & Mixers', description: 'Tap leaks, mixer repairs, new taps and fittings', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1000&q=85' },
  { id: 'toilet-flush', name: 'Toilet & Flush', description: 'Flush tanks, jet sprays, toilet seats and blockages', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=85' },
  { id: 'bath-shower', name: 'Bath & Shower', description: 'Shower repairs, fittings and bathroom accessories', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1000&q=85' },
  { id: 'basin-sink', name: 'Basin & Kitchen Sink', description: 'Basin installation, sink leaks and waste pipes', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85' },
  { id: 'drainage', name: 'Drainage & Leakage', description: 'Blocked drains, pipe leaks and water-flow issues', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1000&q=85' },
  { id: 'tank-motor', name: 'Water Tank & Motor', description: 'Water tanks, pumps, motors and water connections', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1000&q=85' },
];
const matchesPlumbingGroup = (groupId: string, text: string) => {
  const value = text.toLowerCase();
  if (groupId === 'tap-mixer') return /tap|mixer|angle cock|faucet/.test(value);
  if (groupId === 'toilet-flush') return /toilet|flush|jet spray|health faucet|pot blockage|cistern/.test(value);
  if (groupId === 'bath-shower') return /shower|bath|health faucet|bathroom accessory/.test(value);
  if (groupId === 'basin-sink') return /basin|sink|waste pipe|waste coupling/.test(value);
  if (groupId === 'drainage') return /drain|blockage|leak|pipe/.test(value);
  return /water tank|overhead tank|tank cleaning|water pump|water motor|water meter|motor connection/.test(value);
};
const plumbingProductMatches = (groupId: string, text: string) => {
  const value = text.toLowerCase();
  if (groupId === 'tap-mixer') return /tap|mixer|faucet|angle cock/.test(value);
  if (groupId === 'toilet-flush') return /flush|toilet|cistern|jet spray/.test(value);
  if (groupId === 'bath-shower') return /shower|bath|faucet|health/.test(value);
  if (groupId === 'basin-sink') return /basin|sink|waste pipe|waste coupling/.test(value);
  if (groupId === 'drainage') return /pipe|swr|cpvc|upvc|gi |drain|leak/.test(value);
  return /tank|pump|motor|water meter/.test(value);
};
const plumbingPriceRange = (price: number, serviceName: string) => {
  const name = serviceName.toLowerCase();
  let minimumFactor = 0.8;
  let maximumFactor = 1.45;
  if (/tap repair|minor|jet spray|faucet repair|flush tank repair/.test(name)) { minimumFactor = 0.9; maximumFactor = 1.35; }
  if (/installation|replacement|toilet|blockage|overhead tank|tank cleaning|water pump|pipeline/.test(name)) { minimumFactor = 0.8; maximumFactor = 1.8; }
  const minimum = Math.max(49, Math.floor((price * minimumFactor) / 10) * 10);
  const maximum = Math.max(minimum + 20, Math.ceil((price * maximumFactor) / 10) * 10);
  return { minimum, maximum };
};
const PLUMBING_QUICK_TASKS = [
  { label: 'Leaking tap', group: 'tap-mixer', detail: 'Repair or replace' },
  { label: 'Toilet / flush issue', group: 'toilet-flush', detail: 'Flush and fittings' },
  { label: 'Blocked drain', group: 'drainage', detail: 'Drain and pipe checks' },
  { label: 'Low water flow', group: 'tank-motor', detail: 'Pump and connections' },
];

const CLEANING_SERVICE_GROUPS = [
  { id: 'hourly-house-help', name: 'Hourly House Help', description: 'Flexible everyday chores, prioritised by you', tag: 'Flexible duration', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85', products: ['everyday-cleaning','floor-care','tools'], services: [
    { name: 'Hourly House Help', price: 149, duration: 'per hour', description: 'Choose the chores you want done during your booked time: dusting, sweeping, mopping and everyday tidying.' },
    { name: 'Sweeping & Mopping', price: 149, duration: '30–60 min', description: 'Routine floor care for accessible areas using your preferred household supplies.' },
    { name: 'Dusting & Surface Wiping', price: 149, duration: '30–60 min', description: 'Dust reachable furniture, shelves, counters and frequently used surfaces.' },
  ] },
  { id: 'full-home', name: 'Full Home Routine Cleaning', description: 'Floors, surfaces, furniture and everyday tidying', tag: 'Everyday cleaning', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85', products: ['everyday-cleaning','floor-care','tools'], services: [
    { name: 'Living Room Cleaning', price: 249, duration: '45–60 min', description: 'Dust accessible furniture, wipe surfaces, tidy the room and clean accessible floors.' },
    { name: 'Bedroom Cleaning & Tidying', price: 249, duration: '45–60 min', description: 'Dusting, surface wiping, bed straightening and floor care.' },
    { name: 'Full Home Routine Cleaning', price: 499, duration: '2–3 hours', description: 'Routine cleaning for a home; exact scope depends on the home size and booked time.' },
  ] },
  { id: 'bathroom', name: 'Bathroom Cleaning', description: 'Fixtures, sink, toilet, tiles and accessible surfaces', tag: 'Bathroom care', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=85', products: ['bathroom-care','tools'], services: [
    { name: 'Bathroom Routine Cleaning', price: 199, duration: '30–45 min', description: 'Clean accessible fixtures, counters, mirror and floor; scope depends on buildup.' },
    { name: 'Toilet & Washbasin Cleaning', price: 149, duration: '20–35 min', description: 'Routine cleaning of toilet, washbasin and nearby accessible surfaces.' },
    { name: 'Tile & Grout Cleaning', price: 299, duration: '45–90 min', description: 'Targeted scrubbing of accessible tiles and grout; heavy buildup may need a confirmed quote.' },
  ] },
  { id: 'kitchen', name: 'Kitchen Cleaning', description: 'Counters, sink, hob exterior and cabinet surfaces', tag: 'Kitchen care', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85', products: ['kitchen-care','tools'], services: [
    { name: 'Kitchen Surface Cleaning', price: 199, duration: '30–45 min', description: 'Wipe accessible counters, sink exterior and commonly used surfaces.' },
    { name: 'Kitchen Deep Cleaning', price: 499, duration: '60–120 min', description: 'More detailed cleaning of accessible shelves, counters and greasy surfaces; appliances may be extra.' },
    { name: 'Chimney Exterior & Hob Cleaning', price: 299, duration: '45–60 min', description: 'External wipe-down and accessible hob cleaning; dismantling or specialist servicing is excluded.' },
  ] },
  { id: 'dishwashing', name: 'Dishwashing', description: 'Utensils, sink and kitchen work area', tag: 'Daily chores', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1000&q=85', products: ['kitchen-care','tools'], services: [
    { name: 'Dishwashing Assistance', price: 149, duration: '30–60 min', description: 'Wash everyday utensils, rinse the sink and organise dishes in the available rack.' },
    { name: 'Dishwashing + Kitchen Wipe-down', price: 199, duration: '45–60 min', description: 'Dishwashing with a wipe-down of accessible counters and the sink area.' },
  ] },
  { id: 'laundry-ironing', name: 'Laundry & Ironing', description: 'Hand-wash help, folding, sorting and ironing', tag: 'Laundry care', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1000&q=85', products: ['laundry-care','tools'], services: [
    { name: 'Clothes Folding & Sorting', price: 149, duration: '30–60 min', description: 'Fold and sort clean laundry by household preference.' },
    { name: 'Hand-Wash Laundry Assistance', price: 199, duration: '30–60 min', description: 'Hand-wash suitable everyday garments using customer-provided detergent.' },
    { name: 'Ironing Assistance', price: 199, duration: '30–60 min', description: 'Iron suitable garments with the customer’s available iron and ironing surface.' },
  ] },
  { id: 'dusting-fans', name: 'Dusting & Fan Cleaning', description: 'Reachable fans, shelves, grills and surface care', tag: 'Dust & wipe', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85', products: ['everyday-cleaning','tools'], services: [
    { name: 'Furniture & Shelf Dusting', price: 149, duration: '30–45 min', description: 'Dust and wipe reachable furniture, shelves, sills and decor.' },
    { name: 'Reachable Fan Cleaning', price: 199, duration: '30–45 min', description: 'Clean accessible fans only where safe to reach without ladders or risky working at height.' },
    { name: 'Window Sill & Grill Wiping', price: 199, duration: '30–45 min', description: 'Wipe accessible window sills and reachable grill surfaces.' },
  ] },
  { id: 'organising', name: 'Organising & Tidying', description: 'Wardrobes, shelves, beds and everyday home reset', tag: 'Home reset', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=85', products: ['everyday-cleaning','tools'], services: [
    { name: 'Wardrobe & Shelf Organising', price: 249, duration: '45–90 min', description: 'Arrange accessible clothes and household items according to your instructions.' },
    { name: 'Bed Making & Room Reset', price: 149, duration: '20–40 min', description: 'Straighten existing bedding, organise surfaces and tidy the room.' },
  ] },
  { id: 'sofa-mattress', name: 'Sofa, Mattress & Carpet Care', description: 'Fabric refresh and targeted upholstery cleaning', tag: 'Specialised care', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85', products: ['upholstery-care','tools'], services: [
    { name: 'Sofa Surface Cleaning', price: 499, duration: '60–90 min', description: 'Surface-level cleaning; extraction or professional equipment is subject to availability.' },
    { name: 'Mattress Surface Cleaning', price: 399, duration: '45–90 min', description: 'Surface refresh; stain treatment and equipment-dependent jobs require confirmation.' },
    { name: 'Carpet Cleaning', price: 399, duration: '45–90 min', description: 'Price varies by area, fabric and cleaning method; confirm before booking.' },
  ] },
  { id: 'move-cleaning', name: 'Move-in / Move-out Cleaning', description: 'A room-by-room refresh before or after shifting', tag: 'Special clean', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85', products: ['everyday-cleaning','bathroom-care','kitchen-care','tools'], services: [
    { name: 'Move-in Routine Clean', price: 799, duration: '2–4 hours', description: 'Routine accessible-surface cleaning before settling in; home size affects scope and price.' },
    { name: 'Move-out Routine Clean', price: 799, duration: '2–4 hours', description: 'Routine cleaning of accessible surfaces and floors before handover.' },
  ] },
];
const CLEANING_LEAF_SERVICES = CLEANING_SERVICE_GROUPS.flatMap(group => group.services.map((service, index) => ({
  id: `cleaning-${group.id}-${index}`,
  name: service.name,
  categoryId: 'cleaner-housekeeper',
  category: 'Home Cleaning',
  subcategory: group.name,
  description: service.description,
  price: service.price,
  duration: service.duration,
})));
const CLEANING_PRODUCTS = [
  { id: 'clean-floor-concentrate', name: 'Floor Cleaner Concentrate', unit: 'litre', minPrice: 120, maxPrice: 650, specification: 'Concentration and floor-surface compatibility', groups: ['everyday-cleaning','floor-care'] },
  { id: 'clean-microfibre-set', name: 'Microfibre Cloth Set', unit: 'set', minPrice: 100, maxPrice: 650, specification: 'Pack size and fabric GSM', groups: ['everyday-cleaning','tools','kitchen-care'] },
  { id: 'clean-mop-wiper', name: 'Mop / Floor Wiper', unit: 'piece', minPrice: 120, maxPrice: 1200, specification: 'Mop head, handle material and refill type', groups: ['floor-care','tools'] },
  { id: 'clean-broom', name: 'Broom & Dustpan Set', unit: 'set', minPrice: 80, maxPrice: 450, specification: 'Bristle type, handle and set contents', groups: ['floor-care','tools'] },
  { id: 'clean-gloves', name: 'Household Cleaning Gloves', unit: 'pair', minPrice: 60, maxPrice: 300, specification: 'Material, size and reusable/disposable type', groups: ['tools','bathroom-care','kitchen-care'] },
  { id: 'clean-bath-descaler', name: 'Bathroom Descaler', unit: 'litre', minPrice: 100, maxPrice: 500, specification: 'Choose a surface-safe formula; follow label directions', groups: ['bathroom-care'] },
  { id: 'clean-toilet-brush', name: 'Toilet Brush Set', unit: 'set', minPrice: 80, maxPrice: 450, specification: 'Brush head, handle and holder quality', groups: ['bathroom-care','tools'] },
  { id: 'clean-scrub-brush', name: 'Scrub Brush Set', unit: 'set', minPrice: 50, maxPrice: 300, specification: 'Brush stiffness and intended surface', groups: ['bathroom-care','kitchen-care','tools'] },
  { id: 'clean-dish-liquid', name: 'Dishwashing Liquid', unit: 'litre', minPrice: 60, maxPrice: 300, specification: 'Concentration and brand/pack size', groups: ['kitchen-care'] },
  { id: 'clean-degreaser', name: 'Kitchen Degreaser', unit: 'litre', minPrice: 120, maxPrice: 650, specification: 'Surface-safe formula and pack size', groups: ['kitchen-care'] },
  { id: 'clean-sponge', name: 'Dish Sponge / Scrubber Pack', unit: 'pack', minPrice: 40, maxPrice: 250, specification: 'Pack count and scrubber material', groups: ['kitchen-care','tools'] },
  { id: 'clean-detergent', name: 'Laundry Detergent', unit: 'kg/litre', minPrice: 80, maxPrice: 550, specification: 'Powder/liquid type and pack size', groups: ['laundry-care'] },
  { id: 'clean-lint-roller', name: 'Lint Roller', unit: 'piece', minPrice: 80, maxPrice: 350, specification: 'Reusable or refillable style', groups: ['laundry-care','upholstery-care'] },
  { id: 'clean-fabric-shampoo', name: 'Upholstery Shampoo', unit: 'litre', minPrice: 250, maxPrice: 1200, specification: 'Fabric-safe concentrate; spot-test before use', groups: ['upholstery-care'] },
  { id: 'clean-stain-remover', name: 'Fabric Stain Remover', unit: 'bottle', minPrice: 180, maxPrice: 900, specification: 'Check fabric compatibility and colour-fastness', groups: ['upholstery-care'] },
  { id: 'clean-vacuum-filter', name: 'Vacuum Filter / Bag', unit: 'piece', minPrice: 250, maxPrice: 1800, specification: 'Confirm vacuum model compatibility', groups: ['upholstery-care','tools'] },
];
const cleanPriceRange = (price: number, name: string) => {
  const value = name.toLowerCase();
  let low = 0.8, high = 1.45;
  if (/hourly|sweeping|mopping|dusting|folding|dishwashing|tidying|wiping/.test(value)) { low = 0.85; high = 1.25; }
  if (/deep|move|mattress|sofa|carpet|chimney/.test(value)) { low = 0.75; high = 1.65; }
  return { min: Math.max(49, Math.floor(price * low / 10) * 10), max: Math.max(Math.floor(price * low / 10) * 10 + 20, Math.ceil(price * high / 10) * 10) };
};
const cleanProductCartAdd = (product: typeof CLEANING_PRODUCTS[number]) => {
  try {
    const current = JSON.parse(localStorage.getItem('punchx_catalogue_cart') || '[]');
    const cart = Array.isArray(current) ? current : [];
    const idx = cart.findIndex((item: {id?:string;category?:string}) => item.id === product.id && item.category === 'Home Cleaning');
    if (idx >= 0) cart[idx] = { ...cart[idx], qty: Math.min(99, Number(cart[idx].qty || 1) + 1) };
    else cart.push({ id: product.id, name: product.name, category: 'Home Cleaning', kind: 'product', unit: product.unit, min: product.minPrice, max: product.maxPrice, qty: 1, notes: product.specification, quote: false });
    localStorage.setItem('punchx_catalogue_cart', JSON.stringify(cart));
    return true;
  } catch { return false; }
};

type CookTaskSeed = { name: string; price: number; duration: string; description: string };
type CookServiceGroup = { id: string; name: string; description: string; section: 'Cooking services' | 'Home assistance'; tag: string; image: string; products: string[]; services: CookTaskSeed[] };
const COOK_SERVICE_GROUPS: CookServiceGroup[] = [
  { id:'daily-cook',name:'Daily Home Cook',description:'Breakfast, lunch or dinner prepared at your home',section:'Cooking services',tag:'Everyday cooking',image:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','proteins','spices'],services:[
    {name:'Breakfast Cooking',price:199,duration:'30–60 min',description:'Prepare selected breakfast dishes using available ingredients.'},
    {name:'Lunch Cooking',price:299,duration:'45–75 min',description:'Prepare a home-style lunch from your selected dish list.'},
    {name:'Dinner Cooking',price:299,duration:'45–75 min',description:'Prepare dinner using customer-provided ingredients or an agreed ingredient plan.'},
    {name:'Multi-meal Cooking',price:499,duration:'90–150 min',description:'Prepare dishes for more than one meal; confirm the menu and time before booking.'},
  ]},
  {id:'breakfast-snacks',name:'Breakfast & Snacks',description:'Parathas, poha, upma, tea-time snacks and simple favourites',section:'Cooking services',tag:'Morning favourites',image:'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','spices'],services:[
    {name:'Breakfast Preparation',price:199,duration:'30–60 min',description:'Prepare selected breakfast dishes such as poha, upma, parathas or simple hot meals.'},
    {name:'Tea-time Snacks',price:199,duration:'30–60 min',description:'Prepare agreed snacks or light bites from ingredients available in the kitchen.'},
    {name:'Roti & Dough Preparation',price:149,duration:'20–45 min',description:'Knead dough and prepare rotis or parathas as agreed.'},
  ]},
  {id:'lunch-dinner',name:'Lunch, Dinner & Full Meals',description:'Home-style dal, sabzi, rice, roti and family menus',section:'Cooking services',tag:'Home-style meals',image:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','proteins','spices'],services:[
    {name:'Dal & Sabzi Preparation',price:249,duration:'45–75 min',description:'Prepare selected dal and vegetable dishes according to your preferences.'},
    {name:'Rice, Roti & Accompaniments',price:199,duration:'30–60 min',description:'Prepare rice, rotis and simple meal accompaniments.'},
    {name:'Complete Home-style Meal',price:349,duration:'60–90 min',description:'Prepare an agreed combination of dishes; portions and recipe complexity affect timing.'},
    {name:'Family Meal Preparation',price:499,duration:'90–150 min',description:'Prepare a family meal plan; confirm servings, dishes and timing before booking.'},
  ]},
  {id:'meal-prep',name:'Meal Prep & Ingredient Preparation',description:'Wash, chop, knead, marinate and organise ingredients',section:'Cooking services',tag:'Prep smarter',image:'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85',products:['vegetables','staples','proteins','spices'],services:[
    {name:'Vegetable Washing & Chopping',price:149,duration:'30–45 min',description:'Wash and chop vegetables to your preferred size and organise them for cooking.'},
    {name:'Dough, Batter & Basic Prep',price:149,duration:'30–45 min',description:'Prepare dough, batter and basic mise-en-place from customer-provided ingredients.'},
    {name:'Marination & Portioning',price:199,duration:'30–60 min',description:'Prepare and portion ingredients using your recipe and instructions.'},
    {name:'Batch Meal Prep',price:399,duration:'60–120 min',description:'Prep several ingredients or dishes for planned meals; containers are not included unless agreed.'},
  ]},
  {id:'regional-cuisine',name:'Regional & Favourite Cuisines',description:'Bengali, North Indian, South Indian and other home-style cooking',section:'Cooking services',tag:'Cook your way',image:'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','proteins','spices'],services:[
    {name:'Bengali Home-style Cooking',price:299,duration:'45–90 min',description:'Home-style Bengali dishes selected by you, including agreed vegetarian or fish options.'},
    {name:'North Indian Home-style Cooking',price:299,duration:'45–90 min',description:'Home-style dal, sabzi, roti, rice and agreed dishes.'},
    {name:'South Indian Home-style Cooking',price:299,duration:'45–90 min',description:'Prepare agreed rice-based meals, breakfast dishes or accompaniments when the required tools are available.'},
    {name:'Custom Regional Menu',price:399,duration:'60–120 min',description:'Request a regional menu; specialised recipes may require more time or a separate quote.'},
  ]},
  {id:'diet-preferences',name:'Diet & Meal Preferences',description:'Vegetarian, non-vegetarian, Jain-style and less-oil preferences',section:'Cooking services',tag:'Your preferences',image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85',products:['vegetables','staples','proteins','spices'],services:[
    {name:'Vegetarian Meal Preparation',price:249,duration:'45–75 min',description:'Prepare a vegetarian menu from the ingredients and cooking instructions you select.'},
    {name:'Non-vegetarian Meal Preparation',price:349,duration:'60–90 min',description:'Prepare an agreed non-vegetarian menu when the professional supports it and safe ingredients are available.'},
    {name:'Jain-style / No Onion-No Garlic Menu',price:299,duration:'45–90 min',description:'Follow customer-specified ingredient restrictions; confirm details with the cook before starting.'},
    {name:'Less-oil Home-style Menu',price:299,duration:'45–90 min',description:'Follow your preferred cooking method; this is not a medical or dietitian service.'},
  ]},
  {id:'party-cook',name:'Party & Small Gathering Cook',description:'Help preparing a menu for family gatherings and small events',section:'Cooking services',tag:'Special occasions',image:'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','proteins','spices','serveware'],services:[
    {name:'Small Gathering Cook',price:799,duration:'2–3 hours',description:'Prepare an agreed menu for a small gathering; guest count and dishes must be confirmed.'},
    {name:'Party Prep & Chopping',price:499,duration:'90–150 min',description:'Wash, chop, portion and organise ingredients for an event menu.'},
    {name:'Event Cooking Assistance',price:699,duration:'2–3 hours',description:'Cooking support for a small event, subject to menu complexity and professional availability.'},
  ]},
  {id:'kitchen-assistant',name:'Kitchen Assistant',description:'Practical kitchen help before, during and after cooking',section:'Home assistance',tag:'Kitchen support',image:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85',products:['kitchen-tools','serveware','staples'],services:[
    {name:'Kitchen Preparation Assistance',price:199,duration:'30–60 min',description:'Organise ingredients, utensils and the work surface before a meal.'},
    {name:'Kitchen Reset After Cooking',price:199,duration:'30–45 min',description:'Wipe the cooking counter and hob exterior and put away items used in the session; deep cleaning is separate.'},
    {name:'Grocery Sorting & Pantry Setup',price:199,duration:'30–60 min',description:'Sort customer-provided groceries and arrange pantry items; shopping and delivery are not included.'},
    {name:'Meal Plan & Ingredient Checklist',price:149,duration:'20–40 min',description:'Create a simple ingredient checklist around the meals you plan to cook.'},
  ]},
  {id:'utensils-dishes',name:'Utensils & Dishwashing',description:'Wash utensils used in the cooking session and tidy the sink area',section:'Home assistance',tag:'After-cooking help',image:'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1000&q=85',products:['kitchen-tools'],services:[
    {name:'Cooking Utensils Wash-up',price:149,duration:'20–40 min',description:'Wash utensils used during the booked cooking session and place them in the drying area.'},
    {name:'Dishes & Sink Reset',price:199,duration:'30–45 min',description:'Wash a reasonable set of dishes and wipe the sink area; large pre-existing piles may require extra time.'},
  ]},
  {id:'ingredient-support',name:'Ingredient & Grocery Prep',description:'Lists, produce washing, portioning and pantry organisation',section:'Home assistance',tag:'Ready to cook',image:'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=85',products:['vegetables','staples','proteins','spices'],services:[
    {name:'Ingredient Checklist for Meals',price:99,duration:'15–30 min',description:'Create a shopping list for selected dishes; shopping and delivery are not included.'},
    {name:'Wash & Portion Produce',price:149,duration:'30–45 min',description:'Wash and portion customer-provided produce using appropriate food-handling practices.'},
    {name:'Weekly Ingredient Sorting',price:199,duration:'30–60 min',description:'Sort and organise customer-provided ingredients for upcoming meals.'},
  ]},
  {id:'recurring-home-help',name:'Daily & Recurring Home Help',description:'Set a preferred schedule for regular cooking or kitchen assistance',section:'Home assistance',tag:'Repeat visits',image:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85',products:['staples','vegetables','proteins','spices','kitchen-tools'],services:[
    {name:'Daily Cooking Visit',price:299,duration:'45–90 min',description:'Request a regular cooking visit using your preferred meal slots and cuisine.'},
    {name:'Weekly Meal Prep Visit',price:599,duration:'90–180 min',description:'Request a weekly preparation session; dishes and duration are confirmed before the visit.'},
    {name:'Routine Kitchen Assistance',price:249,duration:'45–75 min',description:'Request recurring practical kitchen help, including ingredient prep and post-cooking tidying.'},
  ]},
];
const COOK_LEAF_SERVICES = COOK_SERVICE_GROUPS.flatMap(group => group.services.map((service,index)=>({
  id:`cook-${group.id}-${index}`,
  name:service.name,
  categoryId:'cook',
  category:'Cook & Home Assistance',
  subcategory:group.name,
  description:service.description,
  price:service.price,
  duration:service.duration
})));
const COOK_PRODUCTS = [
 {id:'cook-rice',name:'Rice',unit:'kg',minPrice:45,maxPrice:120,specification:'Local rice varieties through branded and premium options',groups:['staples']},
 {id:'cook-atta',name:'Atta / Flour',unit:'kg',minPrice:35,maxPrice:100,specification:'Whole wheat, multigrain and brand/quality tiers',groups:['staples']},
 {id:'cook-dal',name:'Dal & Pulses',unit:'kg',minPrice:80,maxPrice:240,specification:'Variety, grade and brand affect the range',groups:['staples']},
 {id:'cook-oil',name:'Cooking Oil',unit:'litre',minPrice:120,maxPrice:280,specification:'Mustard, sunflower, groundnut and other varieties',groups:['staples']},
 {id:'cook-spices',name:'Spices & Masala Basics',unit:'pack',minPrice:60,maxPrice:450,specification:'Pack size, whole spices and regional masala mixes',groups:['spices','staples']},
 {id:'cook-onions-tomatoes',name:'Onions & Tomatoes',unit:'kg',minPrice:25,maxPrice:100,specification:'Seasonal prices vary; confirm the local rate before purchase',groups:['vegetables']},
 {id:'cook-mixed-vegetables',name:'Seasonal Vegetables',unit:'kg',minPrice:30,maxPrice:160,specification:'Season, variety and quantity change the range',groups:['vegetables']},
 {id:'cook-herbs',name:'Fresh Herbs & Green Chilli',unit:'bunch',minPrice:10,maxPrice:80,specification:'Seasonal produce and pack size',groups:['vegetables']},
 {id:'cook-eggs',name:'Eggs',unit:'piece',minPrice:6,maxPrice:15,specification:'Pack size and grade; availability varies',groups:['proteins']},
 {id:'cook-paneer',name:'Paneer',unit:'kg',minPrice:200,maxPrice:500,specification:'Milk quality, brand and pack size',groups:['proteins']},
 {id:'cook-chicken',name:'Chicken',unit:'kg',minPrice:180,maxPrice:380,specification:'Cut, freshness and local rate; confirm before purchase',groups:['proteins']},
 {id:'cook-fish',name:'Fish',unit:'kg',minPrice:180,maxPrice:750,specification:'Fish type, size and seasonal market rates',groups:['proteins']},
 {id:'cook-milk',name:'Milk & Curd',unit:'litre / kg',minPrice:35,maxPrice:130,specification:'Brand, fat percentage and pack size',groups:['staples','proteins']},
 {id:'cook-dish-liquid',name:'Dishwashing Liquid',unit:'litre',minPrice:60,maxPrice:320,specification:'Pack size and brand tier',groups:['kitchen-tools']},
 {id:'cook-scrub',name:'Scrub Sponge & Brush Set',unit:'set',minPrice:50,maxPrice:300,specification:'Pack count and material',groups:['kitchen-tools']},
 {id:'cook-containers',name:'Food Storage Containers',unit:'set',minPrice:150,maxPrice:900,specification:'Capacity, material and food-safe suitability',groups:['kitchen-tools','serveware']},
 {id:'cook-serving-set',name:'Serving Bowls & Utensils',unit:'set',minPrice:180,maxPrice:1500,specification:'Material, number of pieces and finish',groups:['serveware']},
 {id:'cook-gloves',name:'Kitchen Cleaning Gloves',unit:'pair',minPrice:60,maxPrice:300,specification:'Material, fit and reusable/disposable type',groups:['kitchen-tools']},
];
const cookPriceRange = (price: number, name: string) => {
 const value=name.toLowerCase(); let low=0.8, high=1.4;
 if(/prep|checklist|chopping|washing|sorting|simple/.test(value)){low=0.85;high=1.25;}
 if(/party|gathering|family|custom|full|multiple|weekly/.test(value)){low=0.8;high=1.7;}
 return {min:Math.max(49,Math.floor(price*low/10)*10),max:Math.max(Math.floor(price*low/10)*10+20,Math.ceil(price*high/10)*10)};
};
const cookProductCartAdd = (product: typeof COOK_PRODUCTS[number]) => {
 try {
  const existing=JSON.parse(localStorage.getItem('punchx_catalogue_cart')||'[]'); const cart=Array.isArray(existing)?existing:[];
  const index=cart.findIndex((item:{id?:string;category?:string})=>item.id===product.id&&item.category==='Cook & Home Assistance');
  if(index>=0) cart[index]={...cart[index],qty:Math.min(99,Number(cart[index].qty||1)+1)};
  else cart.push({id:product.id,name:product.name,category:'Cook & Home Assistance',kind:'product',unit:product.unit,min:product.minPrice,max:product.maxPrice,qty:1,notes:product.specification,quote:false});
  localStorage.setItem('punchx_catalogue_cart',JSON.stringify(cart)); return true;
 } catch { return false; }
};

type PaintTaskSeed = { name: string; minPrice: number; maxPrice: number; duration: string; description: string; unit?: string; quoteRequired?: boolean };
type PaintServiceGroup = { id: string; name: string; description: string; section: 'Painting & finishes' | 'Repair & improvement'; tag: string; image: string; products: string[]; services: PaintTaskSeed[] };
const PAINT_SERVICE_GROUPS: PaintServiceGroup[] = [
 {id:'interior-painting',name:'Interior Walls & Rooms',description:'Single walls, bedrooms, living rooms and room refresh projects',section:'Painting & finishes',tag:'Most requested',image:'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1000&q=85',products:['interior-paint','primer-putty','tools-masking'],services:[
  {name:'Single Wall Repainting',minPrice:1499,maxPrice:3499,duration:'Half to 1 day',description:'Prepare and repaint one standard wall. Wall size, existing finish and paint grade affect the quote.'},
  {name:'Bedroom Painting',minPrice:3999,maxPrice:7999,duration:'1–2 days',description:'Room walls with basic surface preparation; ceiling, extensive repairs and premium paint may cost extra.'},
  {name:'Living Room Painting',minPrice:4999,maxPrice:9999,duration:'1–2 days',description:'Refresh living-room walls with an agreed shade and finish. Room dimensions and furniture protection affect scope.'},
  {name:'Two or More Walls',minPrice:2999,maxPrice:6999,duration:'1–2 days',description:'Repaint a selected set of walls; final price depends on wall area and surface preparation.'},
  {name:'Ceiling Painting',minPrice:2499,maxPrice:5999,duration:'1 day',description:'Ceiling repainting for a defined area; dampness, cracks and height can require separate work.'}
 ]},
 {id:'full-home-painting',name:'Full Home & Room Packages',description:'Room combinations and 1, 2 or 3 BHK repainting projects',section:'Painting & finishes',tag:'Plan a project',image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85',products:['interior-paint','primer-putty','tools-masking'],services:[
  {name:'Any 2 Rooms Painting',minPrice:8999,maxPrice:16999,duration:'2–3 days',description:'Painting for two agreed rooms. Furnishing, wall condition and paint grade are confirmed during assessment.'},
  {name:'Any 3 Rooms Painting',minPrice:12999,maxPrice:22999,duration:'3–4 days',description:'Painting for three agreed rooms; excludes unapproved repairs, special finishes and extra surfaces.'},
  {name:'Unfurnished 1 BHK Painting',minPrice:9999,maxPrice:17999,duration:'2–4 days',description:'Indicative package for a standard unfurnished 1 BHK. Exact wall area and materials are confirmed first.'},
  {name:'2 BHK Home Painting',minPrice:14999,maxPrice:26999,duration:'3–5 days',description:'Indicative full-home package; number of coats, premium finishes, ceiling coverage and repairs change the estimate.'},
  {name:'3 BHK Home Painting',minPrice:19999,maxPrice:35999,duration:'4–6 days',description:'Indicative full-home package for a typical 3 BHK; a site measurement is required for a confirmed quote.'}
 ]},
 {id:'exterior-painting',name:'Exterior, Balcony & Terrace Painting',description:'Weather-facing walls, balconies, parapets and exterior surfaces',section:'Painting & finishes',tag:'Weather protection',image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85',products:['exterior-paint','waterproofing','tools-masking'],services:[
  {name:'Exterior Wall Painting',minPrice:18,maxPrice:45,duration:'Site assessment required',unit:'sq ft',description:'Indicative painting cost per square foot. Height, access, surface repairs and weather-resistant paint affect the quote.'},
  {name:'Balcony & Parapet Painting',minPrice:1499,maxPrice:4999,duration:'1 day',description:'Paint a defined balcony or parapet area; waterproofing and unsafe-height access are separately assessed.'},
  {name:'Terrace Floor Coating',minPrice:25,maxPrice:85,duration:'1–3 days',unit:'sq ft',description:'Protective coating estimate per square foot; substrate condition, drainage and product system need inspection.'},
  {name:'Exterior Surface Preparation',minPrice:12,maxPrice:30,duration:'Site assessment required',unit:'sq ft',description:'Scraping, cleaning and preparation estimate per square foot; extensive repairs are separate.'}
 ]},
 {id:'wall-repair-prep',name:'Wall Repair, Putty & Surface Prep',description:'Cracks, peeling paint, dents, plaster patches and sanding',section:'Repair & improvement',tag:'Fix before paint',image:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=85',products:['primer-putty','repair-materials','tools-masking'],services:[
  {name:'Small Wall Patch & Touch-up',minPrice:499,maxPrice:1499,duration:'1–3 hours',description:'Repair a small damaged patch and touch up nearby paint; exact colour matching is not guaranteed.'},
  {name:'Crack Filling & Sanding',minPrice:799,maxPrice:2999,duration:'Half to 1 day',description:'Fill minor non-structural surface cracks and sand for repainting. Structural cracks need expert assessment.'},
  {name:'Wall Putty & Primer Application',minPrice:12,maxPrice:35,duration:'Site assessment required',unit:'sq ft',description:'Indicative prep-work range per square foot; number of coats and surface condition determine the quote.'},
  {name:'Peeling Paint / Flaking Surface Repair',minPrice:999,maxPrice:3999,duration:'Half to 1 day',description:'Remove loose paint and prepare the affected area. The cause of moisture or seepage must be addressed separately.'},
  {name:'Plaster Repair & Wall Levelling',minPrice:25,maxPrice:75,duration:'Site assessment required',unit:'sq ft',description:'Minor plaster patching and levelling estimate. Extensive masonry or structural damage requires assessment.'}
 ]},
 {id:'waterproofing-damp',name:'Waterproofing & Dampness',description:'Terrace leakage, bathroom dampness, seepage and exterior cracks',section:'Repair & improvement',tag:'Solve the cause',image:'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=85',products:['waterproofing','repair-materials'],services:[
  {name:'Dampness / Seepage Inspection',minPrice:299,maxPrice:799,duration:'30–60 min',description:'Initial assessment of visible dampness and likely causes. Hidden leaks or structural defects may need a specialist.'},
  {name:'Interior Wall Dampness Treatment',minPrice:2999,maxPrice:8999,duration:'1–3 days',description:'Treatment of a defined wall area after identifying the moisture source; active leaks are not covered by repainting alone.'},
  {name:'Bathroom Waterproofing',minPrice:4999,maxPrice:14999,duration:'2–4 days',description:'Indicative treatment for a defined bathroom area. Tile removal, plumbing leaks and reinstatement can be extra.'},
  {name:'Terrace Waterproofing',minPrice:35,maxPrice:110,duration:'Site assessment required',unit:'sq ft',description:'Indicative terrace waterproofing range per square foot; cracks, slope, drainage and coating system affect price.'},
  {name:'Exterior Crack Sealing',minPrice:1499,maxPrice:5999,duration:'1–2 days',description:'Seal eligible exterior surface cracks before protective coating. Structural cracks require expert evaluation.'}
 ]},
 {id:'texture-wallpaper',name:'Designer Texture, Feature Walls & Wallpaper',description:'Decorative finishes, feature walls, stencils and wallpaper fitting',section:'Painting & finishes',tag:'Make it personal',image:'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=1000&q=85',products:['texture-wallpaper','interior-paint','tools-masking'],services:[
  {name:'Feature Wall / Accent Colour',minPrice:1999,maxPrice:5499,duration:'1 day',description:'Create a single accent wall using an agreed colour; premium paint and wall preparation affect price.'},
  {name:'Decorative Texture Finish',minPrice:75,maxPrice:220,duration:'Site assessment required',unit:'sq ft',description:'Indicative textured finish range per square foot; design, number of coats and material brand determine the quote.'},
  {name:'Wallpaper Installation',minPrice:35,maxPrice:100,duration:'Site assessment required',unit:'sq ft',description:'Indicative fitting labour per square foot. Wallpaper material, pattern matching, wall prep and wastage are separate.'},
  {name:'Stencil / Pattern Painting',minPrice:60,maxPrice:180,duration:'Site assessment required',unit:'sq ft',description:'Decorative pattern application per square foot based on pattern detail and layout.'},
  {name:'Colour Consultation',minPrice:199,maxPrice:799,duration:'30–60 min',description:'Discuss shade combinations and finishes. Physical samples, designer drawings or extensive consultation may be extra.'}
 ]},
 {id:'doors-grills',name:'Doors, Grills, Gates & Cabinets',description:'Repaint metal grills, gates, doors and built-in cabinets',section:'Painting & finishes',tag:'Detail work',image:'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1000&q=85',products:['wood-finish','metal-finish','primer-putty','tools-masking'],services:[
  {name:'Interior Door Painting',minPrice:999,maxPrice:2999,duration:'Half to 1 day',description:'Repaint one standard door; sanding, hardware removal and premium finishes affect cost.'},
  {name:'Metal Grill Painting',minPrice:799,maxPrice:2499,duration:'Half to 1 day',description:'Prepare and paint a defined grill; rust removal and access needs affect the quote.'},
  {name:'Metal Gate / Shutter Painting',minPrice:1499,maxPrice:4999,duration:'1 day',description:'Paint a standard gate or shutter after surface preparation; size, rust and paint system are assessed.'},
  {name:'Kitchen Cabinet Repainting',minPrice:1999,maxPrice:7999,duration:'1–3 days',description:'Repaint a defined set of cabinet fronts; laminate compatibility, sanding and hardware are checked first.'}
 ]},
 {id:'wood-polish',name:'Wood Polish & Furniture Finishing',description:'Wooden doors, frames, cabinets and furniture refresh',section:'Painting & finishes',tag:'Wood care',image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',products:['wood-finish','tools-masking'],services:[
  {name:'Wood Polish / Varnish',minPrice:35,maxPrice:120,duration:'Site assessment required',unit:'sq ft',description:'Indicative polish range per square foot. Wood species, existing coating and finish type affect price.'},
  {name:'Wood Door Polish',minPrice:1499,maxPrice:3999,duration:'1 day',description:'Polish one standard door; stripping old layers or repairing veneer may cost extra.'},
  {name:'Furniture Refinish',minPrice:999,maxPrice:6999,duration:'1–3 days',description:'Refinish a small-to-medium piece; size, condition and chosen finish require assessment.'}
 ]},
 {id:'tiles-grouting-renovation',name:'Tile Grouting & Small Improvements',description:'Regrouting, minor tile repairs, plaster and finishing work',section:'Repair & improvement',tag:'Small renovations',image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85',products:['repair-materials','tile-grout','tools-masking'],services:[
  {name:'Tile Regrouting',minPrice:35,maxPrice:100,duration:'Site assessment required',unit:'sq ft',description:'Remove and refill compatible grout joints; tile type, joint depth and affected area matter.'},
  {name:'Small Tile Replacement',minPrice:799,maxPrice:2999,duration:'Half to 1 day',description:'Replace a small number of tiles if matching tiles are available; material and plumbing repairs may be extra.'},
  {name:'Minor Plaster / Patch Work',minPrice:799,maxPrice:3999,duration:'Half to 1 day',description:'Small wall or ceiling patch work before finishing; large areas need a site quote.'},
  {name:'Minor Home Improvement Inspection',minPrice:199,maxPrice:699,duration:'30–60 min',description:'Review a small painting or finishing job and scope the work before giving a quote.'}
 ]},
 {id:'painting-consultation',name:'Site Visit, Colour Plan & Project Estimate',description:'Plan your project before materials and labour are finalised',section:'Repair & improvement',tag:'Plan with confidence',image:'https://images.unsplash.com/photo-1616486338812-3dadae4b4771?auto=format&fit=crop&w=1000&q=85',products:['interior-paint','exterior-paint','primer-putty','texture-wallpaper'],services:[
  {name:'Painting Site Visit & Estimate',minPrice:99,maxPrice:499,duration:'30–60 min',description:'Preliminary site visit estimate; any free consultation offer must be confirmed by the assigned provider.'},
  {name:'Full Home Measurement & Scope',minPrice:199,maxPrice:799,duration:'45–90 min',description:'Measure agreed areas and document surface prep, coats, finish and materials before a written quote.'},
  {name:'Shade & Finish Planning',minPrice:199,maxPrice:799,duration:'30–60 min',description:'Review preferred colours and finishes. Physical shade cards and premium design services may be separate.'}
 ]}
];
const PAINT_PRODUCTS = [
 {id:'paint-interior-1l',name:'Interior Emulsion Paint',unit:'litre',minPrice:180,maxPrice:950,specification:'Economy through premium washable finish; brand and sheen affect price',groups:['interior-paint','texture-wallpaper','painting-consultation']},
 {id:'paint-interior-20l',name:'Interior Paint 20 L Bucket',unit:'bucket',minPrice:1800,maxPrice:12500,specification:'Coverage and finish tier; check expected coats and surface area',groups:['interior-paint','full-home-painting','painting-consultation']},
 {id:'paint-exterior-1l',name:'Exterior Weatherproof Paint',unit:'litre',minPrice:250,maxPrice:1200,specification:'Weather resistance, finish and brand tier',groups:['exterior-paint']},
 {id:'paint-primer',name:'Wall Primer',unit:'litre',minPrice:120,maxPrice:600,specification:'Interior/exterior compatibility and substrate determine selection',groups:['primer-putty','interior-paint','exterior-paint']},
 {id:'paint-putty-20kg',name:'Wall Putty 20 kg',unit:'bag',minPrice:450,maxPrice:1100,specification:'Brand, grade and application coverage',groups:['primer-putty','repair-materials']},
 {id:'paint-crack-filler',name:'Crack Filler / Wall Repair Compound',unit:'pack',minPrice:120,maxPrice:650,specification:'Pack size and suitability for hairline or larger surface cracks',groups:['repair-materials','waterproofing']},
 {id:'paint-waterproof-1l',name:'Waterproofing Coating',unit:'litre',minPrice:180,maxPrice:950,specification:'Interior/exterior system and coverage; choose after identifying moisture source',groups:['waterproofing','exterior-paint']},
 {id:'paint-roof-coating',name:'Terrace Waterproofing Membrane',unit:'bucket',minPrice:1200,maxPrice:6500,specification:'Coverage, layers, substrate preparation and product system',groups:['waterproofing']},
 {id:'paint-texture',name:'Texture Paint / Finish Compound',unit:'kg',minPrice:180,maxPrice:900,specification:'Pattern, texture type and coverage per pack',groups:['texture-wallpaper']},
 {id:'paint-wallpaper-roll',name:'Decorative Wallpaper Roll',unit:'roll',minPrice:700,maxPrice:4500,specification:'Roll size, material, pattern and washability',groups:['texture-wallpaper']},
 {id:'paint-wood-polish',name:'Wood Polish / Clear Varnish',unit:'litre',minPrice:350,maxPrice:1800,specification:'Water/solvent-based finish, gloss and wood compatibility',groups:['wood-finish']},
 {id:'paint-wood-stain',name:'Wood Stain / Coloured Finish',unit:'litre',minPrice:300,maxPrice:1600,specification:'Shade and finish type; sample patch recommended',groups:['wood-finish']},
 {id:'paint-metal-primer',name:'Anti-rust Metal Primer',unit:'litre',minPrice:180,maxPrice:850,specification:'Metal type, corrosion level and coating compatibility',groups:['metal-finish']},
 {id:'paint-enamel',name:'Metal / Wood Enamel Paint',unit:'litre',minPrice:250,maxPrice:1100,specification:'Finish, application surface and brand tier',groups:['metal-finish','wood-finish']},
 {id:'paint-tile-grout',name:'Tile Grout / Grouting Compound',unit:'kg',minPrice:80,maxPrice:500,specification:'Cementitious/epoxy type, colour and joint width',groups:['tile-grout']},
 {id:'paint-cement-plaster',name:'Cement / Repair Mortar',unit:'bag',minPrice:250,maxPrice:650,specification:'Bag size, application and grade',groups:['repair-materials','tile-grout']},
 {id:'paint-roller-kit',name:'Roller, Brush & Tray Kit',unit:'set',minPrice:180,maxPrice:900,specification:'Roller nap, brush type and kit contents',groups:['tools-masking']},
 {id:'paint-masking',name:'Masking Tape & Protective Sheets',unit:'set',minPrice:120,maxPrice:800,specification:'Tape width, cover area and reusable/disposable type',groups:['tools-masking']},
 {id:'paint-sandpaper',name:'Sandpaper / Surface Prep Pack',unit:'pack',minPrice:80,maxPrice:450,specification:'Grit size and quantity',groups:['tools-masking','primer-putty']},
 {id:'paint-safety-kit',name:'Painter Safety & Cleanup Kit',unit:'set',minPrice:150,maxPrice:900,specification:'Gloves, mask, goggles and cleanup accessories',groups:['tools-masking']}
];
const paintServiceRange = (serviceName: string, groupName?: string) => {
 const group = PAINT_SERVICE_GROUPS.find(item=>item.name===groupName);
 const service = group?.services.find(item=>item.name===serviceName);
 return service ? { min: service.minPrice, max: service.maxPrice, unit: service.unit || 'job', quoteRequired: Boolean(service.quoteRequired) } : null;
};
const paintProductCartAdd = (product: typeof PAINT_PRODUCTS[number]) => {
 try {
  const current = JSON.parse(localStorage.getItem('punchx_catalogue_cart') || '[]');
  const cart = Array.isArray(current) ? current : [];
  const index = cart.findIndex((item: {id?:string;category?:string})=>item.id===product.id&&item.category==='Painting & Home Improvement');
  if(index>=0) cart[index]={...cart[index],qty:Math.min(99,Number(cart[index].qty||1)+1)};
  else cart.push({id:product.id,name:product.name,category:'Painting & Home Improvement',kind:'product',unit:product.unit,min:product.minPrice,max:product.maxPrice,qty:1,notes:product.specification,quote:false});
  localStorage.setItem('punchx_catalogue_cart',JSON.stringify(cart)); return true;
 } catch { return false; }
};


type PestTaskSeed = { name: string; minPrice: number; maxPrice: number; duration: string; description: string; unit?: string; quoteRequired?: boolean };
type PestServiceGroup = { id: string; name: string; description: string; section: 'Home pest control' | 'Specialist & commercial'; tag: string; image: string; products: string[]; services: PestTaskSeed[] };
const PEST_SERVICE_GROUPS: PestServiceGroup[] = [
 {id:'cockroach-ant',name:'Cockroach & Ant Control',description:'Kitchen, bathroom, drain and crawling-insect treatment',section:'Home pest control',tag:'Common household pests',image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1000&q=85',products:['cockroach-ant','monitoring','exclusion'],services:[
  {name:'Kitchen / Bathroom Cockroach Control',minPrice:699,maxPrice:1600,duration:'45–90 min',description:'Targeted treatment for common kitchen and bathroom infestations. Visit count and preparation requirements are confirmed before booking.'},
  {name:'1 BHK Cockroach & Ant Control',minPrice:699,maxPrice:1200,duration:'60–90 min',description:'Indicative home package. Infestation severity, property layout and treatment approach affect the final quote.'},
  {name:'2 BHK Cockroach & Ant Control',minPrice:1000,maxPrice:1800,duration:'60–120 min',description:'Home treatment estimate for common crawling pests; extra rooms or heavy infestation may require a revised quote.'},
  {name:'3 BHK / Larger Home Treatment',minPrice:1600,maxPrice:3000,duration:'90–150 min',description:'Coverage and treatment method are confirmed after checking the property and infestation level.'},
  {name:'Cockroach Follow-up Visit',minPrice:399,maxPrice:999,duration:'30–60 min',description:'Follow-up treatment when recommended in the original plan. Eligibility and timing are confirmed by the provider.'}
 ]},
 {id:'termite-wood-borer',name:'Termite & Wood Borer',description:'Wood damage, mud tubes, discarded wings and structural protection',section:'Home pest control',tag:'Protect wood & property',image:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=85',products:['termite','wood-protection','inspection'],services:[
  {name:'Termite / Wood Damage Inspection',minPrice:299,maxPrice:799,duration:'30–60 min',description:'Inspect visible signs and recommend a suitable treatment; hidden damage may require further assessment.'},
  {name:'Post-construction Termite Treatment',minPrice:2000,maxPrice:10000,duration:'Site inspection required',description:'Indicative residential treatment range. Area, access, infestation and treatment system determine the written quote.'},
  {name:'Wood Borer / Furniture Treatment',minPrice:1499,maxPrice:6000,duration:'1–3 hours',description:'Treatment for eligible wooden furniture or fittings; item size, damage and treatment method affect cost.'},
  {name:'Pre-construction Anti-termite Treatment',minPrice:5,maxPrice:12,duration:'Site inspection required',unit:'sq ft',description:'Indicative per-square-foot range for suitable pre-construction work. Requires project scope and professional quotation.'}
 ]},
 {id:'bed-bug',name:'Bed Bug Treatment',description:'Mattress seams, bed frames, upholstered furniture and room treatment',section:'Home pest control',tag:'Sleep-space care',image:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=85',products:['bed-bug','monitoring','encasement'],services:[
  {name:'Single Room Bed Bug Treatment',minPrice:1900,maxPrice:3500,duration:'45–90 min',description:'Treatment for one room or defined area. Preparation, fabric suitability and follow-up needs are confirmed first.'},
  {name:'1 BHK Bed Bug Treatment Plan',minPrice:1900,maxPrice:3000,duration:'60–120 min',description:'Indicative plan for a smaller home; bed bugs often require a follow-up round based on the technician’s assessment.'},
  {name:'2 BHK Bed Bug Treatment Plan',minPrice:3500,maxPrice:4800,duration:'90–150 min',description:'Estimate for a larger treated area; number of rooms, furniture and repeat visit requirements change pricing.'},
  {name:'Follow-up Bed Bug Visit',minPrice:999,maxPrice:2500,duration:'45–90 min',description:'Follow-up scope and price depend on the original treatment plan and provider terms.'}
 ]},
 {id:'mosquito-fly',name:'Mosquito & Fly Control',description:'Indoor mosquitoes, breeding areas, flies and seasonal nuisance',section:'Home pest control',tag:'Seasonal protection',image:'https://images.unsplash.com/photo-1527489377706-5bf97e608852?auto=format&fit=crop&w=1000&q=85',products:['mosquito','monitoring','exclusion'],services:[
  {name:'Mosquito Control for 1 BHK',minPrice:900,maxPrice:1500,duration:'45–90 min',description:'Treatment plan for indoor nuisance with focus on suitable areas. Source reduction and standing-water checks are important.'},
  {name:'Mosquito Control for 2–3 BHK',minPrice:1300,maxPrice:2300,duration:'60–120 min',description:'Price depends on treated area, outdoor spaces and selected method.'},
  {name:'Fly Control / Breeding-source Inspection',minPrice:499,maxPrice:1499,duration:'30–60 min',description:'Identify common fly sources and recommend appropriate treatment and hygiene improvements.'},
  {name:'Outdoor / Common-area Fogging Assessment',minPrice:999,maxPrice:2999,duration:'Site assessment required',description:'Suitable for eligible outdoor/common areas only; area, access, local rules and method are assessed before booking.'}
 ]},
 {id:'rodent',name:'Rat & Rodent Control',description:'Droppings, gnaw marks, scratching sounds and entry-point checks',section:'Home pest control',tag:'Remove & prevent entry',image:'https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=1000&q=85',products:['rodent','exclusion','monitoring'],services:[
  {name:'Rodent Inspection & Entry-point Check',minPrice:299,maxPrice:799,duration:'30–60 min',description:'Inspect signs of activity and likely access points, with recommendations for exclusion and monitoring.'},
  {name:'1–2 BHK Rodent Control',minPrice:650,maxPrice:1500,duration:'45–90 min',description:'Treatment and monitoring estimate based on activity and layout. Trapping, bait stations or sealing are selected by the professional.'},
  {name:'3 BHK / House Rodent Programme',minPrice:1000,maxPrice:2500,duration:'60–120 min',description:'Larger home estimate, subject to infestation, property access and required monitoring.'},
  {name:'Entry-point Sealing & Prevention',minPrice:499,maxPrice:2499,duration:'Site assessment required',description:'Seal suitable small gaps and advise on exclusion; civil work, damaged wiring and large openings are quoted separately.'}
 ]},
 {id:'lizard-spider-ant',name:'Lizard, Spider & Crawling Insects',description:'House lizards, spiders, silverfish and other crawling pests',section:'Home pest control',tag:'Everyday nuisance',image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85',products:['monitoring','exclusion','mesh'],services:[
  {name:'Lizard Prevention & Entry-point Review',minPrice:499,maxPrice:1299,duration:'30–60 min',description:'Review entry points, lights and insect sources and recommend appropriate prevention options.'},
  {name:'Spider & Silverfish Treatment',minPrice:699,maxPrice:1800,duration:'45–90 min',description:'Treatment for suitable indoor areas with prevention guidance based on moisture, clutter and access points.'},
  {name:'Mixed Crawling Pest Treatment',minPrice:799,maxPrice:2000,duration:'60–120 min',description:'For more than one common crawling pest. Exact pests, rooms and severity are confirmed before work begins.'}
 ]},
 {id:'general-home',name:'General Home Pest Protection',description:'Combined package for common household pests in an apartment or house',section:'Home pest control',tag:'Whole-home option',image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',products:['cockroach-ant','mosquito','monitoring','exclusion'],services:[
  {name:'General Pest Control · 1 BHK',minPrice:699,maxPrice:1500,duration:'60–120 min',description:'Indicative plan for common household pests; excluded pests and included areas must be confirmed.'},
  {name:'General Pest Control · 2 BHK',minPrice:999,maxPrice:1800,duration:'60–150 min',description:'Common-pest treatment estimate for a typical 2 BHK; infestation and chosen treatment method affect price.'},
  {name:'General Pest Control · 3 BHK',minPrice:1299,maxPrice:2500,duration:'90–180 min',description:'Indicative multi-room package. Termites, bed bugs and severe/structural infestations may need specialist plans.'},
  {name:'General Pest Inspection',minPrice:199,maxPrice:699,duration:'30–60 min',description:'Review pest signs and property conditions to help choose the right service; confirm any inspection fee before booking.'}
 ]},
 {id:'commercial',name:'Office, Shop & Commercial Pest Control',description:'Business premises, food-service spaces, storage areas and recurring plans',section:'Specialist & commercial',tag:'Business protection',image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',products:['monitoring','exclusion','inspection'],services:[
  {name:'Office / Shop Pest Inspection',minPrice:499,maxPrice:1999,duration:'Site assessment required',description:'Assess premise size, pest evidence and operational requirements before pricing a treatment programme.'},
  {name:'Commercial Pest Treatment',minPrice:1500,maxPrice:10000,duration:'Site assessment required',description:'Indicative scope only. Floor area, operating hours, food-safety needs and pest type require a written quote.'},
  {name:'Recurring Pest Management Plan',minPrice:4000,maxPrice:18000,duration:'Monthly / quarterly plan',description:'Indicative annual/recurring service range; included visits, monitoring and response terms must be written into the plan.'},
  {name:'Pest Monitoring & Service Report',minPrice:499,maxPrice:2499,duration:'30–90 min',description:'Monitoring visit and service notes for a defined premise; certificates and compliance documentation depend on scope.'}
 ]},
 {id:'inspection-prevention',name:'Inspection, Prevention & Follow-up',description:'Not sure what pest it is? Start with assessment and practical prevention',section:'Specialist & commercial',tag:'Choose with confidence',image:'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85',products:['inspection','monitoring','exclusion'],services:[
  {name:'Identify the Pest & Recommend Treatment',minPrice:199,maxPrice:699,duration:'30–60 min',description:'A professional reviews visible signs and recommends suitable options; confirm any inspection charge before booking.'},
  {name:'Prevention & Entry-point Assessment',minPrice:299,maxPrice:899,duration:'30–60 min',description:'Check suitable access points, moisture and sanitation risk factors and recommend preventive action.'},
  {name:'Post-treatment Follow-up',minPrice:299,maxPrice:999,duration:'30–60 min',description:'Revisit eligibility and charges depend on the original treatment, written service terms and provider policy.'},
  {name:'Annual Pest Management Plan',minPrice:2500,maxPrice:12000,duration:'Plan based on property',description:'Indicative recurring plan range; included visits, pests, service windows and warranty terms must be confirmed in writing.'}
 ]}
];
const PEST_PRODUCTS = [
 {id:'pest-insect-screen',name:'Insect Window Mesh',unit:'sq ft',minPrice:35,maxPrice:150,specification:'Mesh material, frame and installation are priced separately',groups:['mesh','exclusion']},
 {id:'pest-door-sweep',name:'Door Bottom Seal / Sweep',unit:'piece',minPrice:120,maxPrice:650,specification:'Door width and material; useful for reducing some entry gaps',groups:['exclusion']},
 {id:'pest-gap-seal',name:'Pest Entry Gap Sealant',unit:'tube',minPrice:120,maxPrice:550,specification:'Product compatibility depends on gap, surface and exposure',groups:['exclusion','termite']},
 {id:'pest-sticky-monitor',name:'Pest Monitoring Glue Traps',unit:'pack',minPrice:80,maxPrice:450,specification:'Monitoring only; not a substitute for an infestation treatment',groups:['monitoring','cockroach-ant','rodent']},
 {id:'pest-rodent-station',name:'Lockable Rodent Monitoring Station',unit:'piece',minPrice:250,maxPrice:1200,specification:'Station type and tamper resistance; bait placement should follow professional guidance',groups:['rodent','monitoring']},
 {id:'pest-mosquito-net',name:'Mosquito Net / Screen',unit:'piece',minPrice:250,maxPrice:2500,specification:'Opening size, mesh grade and frame/installation affect price',groups:['mosquito','mesh']},
 {id:'pest-drain-cover',name:'Drain Cover / Mesh Insert',unit:'piece',minPrice:60,maxPrice:450,specification:'Drain dimensions and material; does not replace drainage maintenance',groups:['cockroach-ant','exclusion']},
 {id:'pest-bed-encasement',name:'Bed Bug Mattress Encasement',unit:'piece',minPrice:900,maxPrice:4500,specification:'Mattress dimensions, fabric and zip construction',groups:['bed-bug']},
 {id:'pest-bed-monitor',name:'Bed Bug Interceptor / Monitor',unit:'set',minPrice:250,maxPrice:1100,specification:'Bed/frame compatibility; monitoring does not eradicate an infestation',groups:['bed-bug','monitoring']},
 {id:'pest-ant-bait-station',name:'Enclosed Ant Monitoring / Bait Station',unit:'pack',minPrice:120,maxPrice:650,specification:'Select only products appropriate for the location and keep away from children and pets as directed',groups:['cockroach-ant','monitoring']},
 {id:'pest-wood-inspection',name:'Wood / Termite Inspection Kit',unit:'service',minPrice:299,maxPrice:799,specification:'Professional inspection is recommended when there are termite signs; DIY kit is not a substitute',groups:['termite','inspection']},
 {id:'pest-monitor-log',name:'Pest Monitoring & Prevention Log',unit:'set',minPrice:80,maxPrice:350,specification:'Record activity, treatment dates and follow-up observations',groups:['monitoring','inspection']},
];
const pestProductCartAdd = (product: typeof PEST_PRODUCTS[number]) => {
 try {
  const current=JSON.parse(localStorage.getItem('punchx_catalogue_cart')||'[]');
  const cart=Array.isArray(current)?current:[];
  const index=cart.findIndex((item:{id?:string;category?:string})=>item.id===product.id&&item.category==='Pest Control');
  if(index>=0) cart[index]={...cart[index],qty:Math.min(99,Number(cart[index].qty||1)+1)};
  else cart.push({id:product.id,name:product.name,category:'Pest Control',kind:'product',unit:product.unit,min:product.minPrice,max:product.maxPrice,qty:1,notes:product.specification,quote:false});
  localStorage.setItem('punchx_catalogue_cart',JSON.stringify(cart));return true;
 } catch {return false;}
};
const pestServiceRange = (serviceName: string, groupName?: string) => {
 const group=PEST_SERVICE_GROUPS.find(item=>item.name===groupName);
 const service=group?.services.find(item=>item.name===serviceName);
 return service?{min:service.minPrice,max:service.maxPrice,unit:service.unit||'job',quoteRequired:Boolean(service.quoteRequired)}:null;
};

const APPLIANCE_SERVICE_GROUPS = [
  { id: 'ac-service', name: 'AC Service & Deep Cleaning', description: 'Routine servicing, filter cleaning, foam cleaning and seasonal care', tag: 'Cooling care', image: 'https://images.unsplash.com/photo-1631545806609-4d07a1bd7b30?auto=format&fit=crop&w=1000&q=85', products: ['ac-service','ac-repair-gas'], services: [
    { name: 'AC General Service', price: 399, duration: '45–60 min', description: 'Routine inspection, filter cleaning and accessible unit cleaning for split or window ACs.' },
    { name: 'Foam & Jet Deep Cleaning', price: 649, duration: '60–90 min', description: 'Deeper cleaning of eligible indoor-unit coils and drain areas; method depends on unit and site.' },
    { name: 'AC Filter Cleaning', price: 199, duration: '20–30 min', description: 'Clean accessible filters and check airflow; replacement filters are charged separately.' },
    { name: 'AC Drain & Performance Check', price: 299, duration: '30–45 min', description: 'Check drainage and basic operating performance; repair work is quoted after diagnosis.' },
    { name: 'Seasonal AC Care Plan · 2 Visits', price: 1198, duration: 'Two scheduled visits', description: 'Indicative two-visit maintenance package. Coverage, visit dates and final terms must be confirmed before purchase.' },
  ] },
  { id: 'ac-repair-gas', name: 'AC Repair & Gas Check', description: 'Cooling issues, leaks, unusual noise and refrigerant diagnosis', tag: 'Repair & diagnosis', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85', products: ['ac-repair-gas','ac-install'], services: [
    { name: 'AC Inspection & Diagnosis', price: 299, duration: '30–45 min', description: 'Identify likely causes before any repair is authorised. The inspection fee and repair scope are confirmed before work begins.' },
    { name: 'Low / No Cooling Diagnosis', price: 299, duration: '30–60 min', description: 'Check filters, airflow, settings and operating symptoms before recommending a repair.' },
    { name: 'Water Leakage Diagnosis', price: 399, duration: '30–60 min', description: 'Inspect drain flow and likely leak points; parts and larger repairs are separate.' },
    { name: 'Noise & Vibration Diagnosis', price: 399, duration: '30–60 min', description: 'Inspect common mounting, fan and operating issues before repair approval.' },
    { name: 'Refrigerant Leak Test', price: 499, duration: '45–90 min', description: 'Inspect suspected refrigerant leaks; leak repair and recharge are quoted separately after testing.' },
    { name: 'Gas Refill / Refrigerant Recharge', price: 3000, duration: '90–150 min', description: 'Price varies by refrigerant type, required quantity and leak status. Confirm the written quote before authorising.' },
  ] },
  { id: 'ac-install', name: 'AC Installation & Uninstallation', description: 'New installation, removal, relocation and reinstallation', tag: 'Install & shift', image: 'https://images.unsplash.com/photo-1631545806609-4d07a1bd7b30?auto=format&fit=crop&w=1000&q=85', products: ['ac-install','ac-service'], services: [
    { name: 'Split AC Installation', price: 1599, duration: '90–150 min', description: 'Installation of indoor and outdoor units for a suitable site; extra piping, drilling or brackets are quoted separately.' },
    { name: 'Window AC Installation', price: 799, duration: '60–90 min', description: 'Install a compatible window AC into an existing suitable opening; carpentry or civil modifications are extra.' },
    { name: 'AC Uninstallation', price: 699, duration: '45–75 min', description: 'Careful removal of an existing unit; transport and relocation are not included unless agreed.' },
    { name: 'AC Reinstallation / Relocation', price: 1799, duration: '90–180 min', description: 'Reinstall a relocated unit; additional copper piping, wiring and structural work require a separate estimate.' },
  ] },
  { id: 'refrigerator', name: 'Refrigerator Service & Repair', description: 'Cooling problems, unusual sounds, water leaks and door sealing', tag: 'Fridge care', image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1000&q=85', products: ['refrigerator'], services: [
    { name: 'Refrigerator Inspection', price: 249, duration: '30–45 min', description: 'Initial checks for common cooling, electrical and drainage issues; parts are separate.' },
    { name: 'Cooling Problem Diagnosis', price: 349, duration: '30–60 min', description: 'Inspect common temperature, airflow and thermostat symptoms before repair approval.' },
    { name: 'Water Leakage / Drain Check', price: 299, duration: '30–45 min', description: 'Check accessible drainage and water collection areas.' },
    { name: 'Door Seal & Hinge Check', price: 299, duration: '30–45 min', description: 'Inspect door alignment and seal condition; replacement parts are quoted separately.' },
  ] },
  { id: 'washing-machine', name: 'Washing Machine Service & Repair', description: 'Drainage, spin, vibration, inlet and installation support', tag: 'Laundry appliance', image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1000&q=85', products: ['washing-machine'], services: [
    { name: 'Washing Machine Inspection', price: 249, duration: '30–45 min', description: 'Initial checks for power, water inlet, drainage and basic operation.' },
    { name: 'Drainage / Water Inlet Diagnosis', price: 299, duration: '30–60 min', description: 'Check common water-fill or drain symptoms; replacement parts are separate.' },
    { name: 'Spin / Vibration Diagnosis', price: 399, duration: '30–60 min', description: 'Inspect load balance and accessible drive or suspension symptoms.' },
    { name: 'Washing Machine Installation', price: 399, duration: '45–75 min', description: 'Connect a compatible machine to existing power and water points; plumbing changes are extra.' },
  ] },
  { id: 'geyser', name: 'Geyser & Water Heater', description: 'No hot water, heating element, thermostat and installation', tag: 'Hot water', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=85', products: ['geyser'], services: [
    { name: 'Geyser Inspection', price: 249, duration: '30–45 min', description: 'Initial checks for power, heating and visible leakage symptoms.' },
    { name: 'Heating Problem Diagnosis', price: 299, duration: '30–60 min', description: 'Check likely thermostat, element and supply issues before repair approval.' },
    { name: 'Geyser Installation', price: 799, duration: '60–120 min', description: 'Install on a suitable existing point. Plumbing, electrical upgrades and mounting changes are separate.' },
    { name: 'Geyser Uninstallation', price: 499, duration: '30–60 min', description: 'Safe disconnection and removal; relocation or transport is separate.' },
  ] },
  { id: 'ro-water', name: 'Water Purifier & RO', description: 'Filter service, low flow, leaks and installation', tag: 'Water purifier', image: 'https://images.unsplash.com/photo-1585687433148-8f8f4b4e7b42?auto=format&fit=crop&w=1000&q=85', products: ['ro-water'], services: [
    { name: 'RO Inspection & Service', price: 249, duration: '30–60 min', description: 'Inspect water flow, visible leaks and service needs; replacement cartridges are separate.' },
    { name: 'Filter Replacement Labour', price: 199, duration: '20–45 min', description: 'Replace compatible filters supplied by the customer or separately quoted.' },
    { name: 'Low Water Flow Diagnosis', price: 299, duration: '30–60 min', description: 'Check common filter, pressure and pump symptoms before recommending parts.' },
    { name: 'RO Installation', price: 399, duration: '45–75 min', description: 'Install at a suitable existing inlet, outlet and power point; additional piping is quoted separately.' },
  ] },
  { id: 'chimney-kitchen', name: 'Chimney & Kitchen Appliances', description: 'Chimney cleaning, filter, motor and cooktop troubleshooting', tag: 'Kitchen appliances', image: 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=1000&q=85', products: ['chimney-kitchen'], services: [
    { name: 'Kitchen Chimney Inspection', price: 249, duration: '30–45 min', description: 'Check airflow and visible filter or motor symptoms before repair approval.' },
    { name: 'Chimney Deep Cleaning', price: 599, duration: '60–90 min', description: 'Clean eligible accessible components; dismantling or replacement parts are quoted separately.' },
    { name: 'Chimney Motor / Suction Diagnosis', price: 299, duration: '30–60 min', description: 'Inspect common suction, noise and power issues.' },
    { name: 'Induction Cooktop Diagnosis', price: 249, duration: '30–45 min', description: 'Check basic power and operating symptoms; components are separate.' },
  ] },
  { id: 'microwave-oven', name: 'Microwave & Oven', description: 'Heating faults, turntable issues and safety diagnosis', tag: 'Cooking appliances', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=1000&q=85', products: ['microwave-oven'], services: [
    { name: 'Microwave Inspection', price: 249, duration: '30–45 min', description: 'Initial inspection of common power, control and heating symptoms.' },
    { name: 'Heating Problem Diagnosis', price: 299, duration: '30–60 min', description: 'Inspect likely component or control issues before repair approval.' },
    { name: 'Turntable / Door Switch Diagnosis', price: 299, duration: '30–45 min', description: 'Check compatible mechanisms and switches; parts are extra.' },
  ] },
  { id: 'tv-electronics', name: 'TV & Home Electronics', description: 'Power, display, audio and connectivity troubleshooting', tag: 'Electronics', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1000&q=85', products: ['tv-electronics'], services: [
    { name: 'TV Inspection', price: 249, duration: '30–45 min', description: 'Initial check for power, display and connection symptoms.' },
    { name: 'Power / Sound Diagnosis', price: 299, duration: '30–60 min', description: 'Identify likely power, audio or connection faults before repair approval.' },
    { name: 'Wall Mount & Setup', price: 399, duration: '45–75 min', description: 'Setup for a compatible mounting surface; wall brackets and civil work may be extra.' },
  ] },
  { id: 'air-cooler', name: 'Air Cooler Service & Repair', description: 'Pump, fan motor, water flow and seasonal checks', tag: 'Cooling appliances', image: 'https://images.unsplash.com/photo-1581275112236-4eab43d0b1b4?auto=format&fit=crop&w=1000&q=85', products: ['air-cooler'], services: [
    { name: 'Air Cooler Inspection', price: 199, duration: '30–45 min', description: 'Check pump, water flow, fan and basic electrical symptoms.' },
    { name: 'Pump / Water Flow Diagnosis', price: 249, duration: '30–45 min', description: 'Inspect pump operation and water distribution.' },
    { name: 'Fan / Motor Diagnosis', price: 299, duration: '30–60 min', description: 'Inspect fan operation and likely motor symptoms; parts are separate.' },
    { name: 'Seasonal Cooler Cleaning', price: 299, duration: '30–60 min', description: 'Clean accessible surfaces and pads where appropriate; replacement pads are separate.' },
  ] },

  { id: 'stove', name: 'Stove & Hob Service', description: 'Burner, ignition, knobs and cooktop troubleshooting', tag: 'Kitchen appliance', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1000&q=85', products: ['stove'], services: [
    { name: 'Gas Stove / Hob Inspection', price: 249, duration: '30–45 min', description: 'Inspect visible burner, knob and ignition symptoms. Gas-line changes and regulated work are separate and must be handled by a qualified professional.' },
    { name: 'Burner Cleaning & Alignment', price: 299, duration: '30–45 min', description: 'Clean accessible removable burners and check seating; no work on pressurised gas connections is included.' },
    { name: 'Auto-Ignition Diagnosis', price: 299, duration: '30–45 min', description: 'Check common ignition-switch and spark symptoms; spare parts are separate.' },
    { name: 'Cooktop Knob / Support Replacement Labour', price: 199, duration: '20–40 min', description: 'Labour estimate for compatible knobs or supports; parts are priced separately.' },
  ] },
  { id: 'laptop', name: 'Laptop Service & Repair', description: 'Slow performance, overheating, battery, screen and charging issues', tag: 'Computers', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=85', products: ['laptop'], services: [
    { name: 'Laptop Inspection & Diagnosis', price: 299, duration: '30–60 min', description: 'Initial checks for power, charging, display and performance symptoms; parts are separate.' },
    { name: 'Laptop Overheating / Fan Cleaning', price: 499, duration: '45–90 min', description: 'Inspection and cleaning where accessible; full disassembly, thermal compound and parts may cost extra.' },
    { name: 'Laptop Battery / Charging Diagnosis', price: 299, duration: '30–60 min', description: 'Check charger, port and battery symptoms before a replacement is recommended.' },
    { name: 'Laptop Screen / Keyboard Diagnosis', price: 299, duration: '30–60 min', description: 'Inspect display, keyboard or connector symptoms; replacement parts require a model-specific quote.' },
    { name: 'SSD / RAM Upgrade Labour', price: 399, duration: '30–60 min', description: 'Labour estimate for compatible upgrades; backup, OS migration and components are separate.' },
    { name: 'Laptop Software Setup', price: 399, duration: '30–60 min', description: 'Basic driver and software setup; licences, data recovery and operating-system licences are not included.' },
  ] },
];
const APPLIANCE_PRODUCTS = [
  { id: 'ac-remote', name: 'AC Remote Control', unit: 'piece', minPrice: 250, maxPrice: 1800, specification: 'Universal or model-specific; confirm compatibility', groups: ['ac-service','ac-repair-gas'] },
  { id: 'ac-capacitor', name: 'AC Capacitor 25–60 µF', unit: 'piece', minPrice: 250, maxPrice: 1800, specification: 'Match capacitance, voltage and unit model', groups: ['ac-repair-gas'] },
  { id: 'ac-sensor', name: 'AC Temperature Sensor', unit: 'piece', minPrice: 250, maxPrice: 1400, specification: 'Model and connector compatibility', groups: ['ac-repair-gas'] },
  { id: 'ac-pcb', name: 'AC PCB / Control Board', unit: 'piece', minPrice: 1800, maxPrice: 12000, specification: 'Exact model and inverter type; written quote required', quoteRequired: true, groups: ['ac-repair-gas'] },
  { id: 'ac-motor', name: 'AC Fan Motor', unit: 'piece', minPrice: 1800, maxPrice: 8500, specification: 'OEM/compatible part and exact model; quote required', quoteRequired: true, groups: ['ac-repair-gas'] },
  { id: 'ac-copper-pipe', name: 'Copper Piping with Insulation', unit: 'metre', minPrice: 450, maxPrice: 1400, specification: 'Pipe diameter, length and insulation thickness', groups: ['ac-install'] },
  { id: 'ac-refrigerant', name: 'Refrigerant / Gas Recharge', unit: 'service', minPrice: 1800, maxPrice: 6500, specification: 'Gas type, measured quantity and leak status; inspect before approval', quoteRequired: true, groups: ['ac-repair-gas'] },
  { id: 'fridge-thermostat', name: 'Refrigerator Thermostat / Sensor', unit: 'piece', minPrice: 500, maxPrice: 2500, specification: 'Exact model and part revision', groups: ['refrigerator'] },
  { id: 'fridge-compressor', name: 'Refrigerator Compressor', unit: 'piece', minPrice: 3500, maxPrice: 14000, specification: 'Capacity, refrigerant and compatible model; quote required', quoteRequired: true, groups: ['refrigerator'] },
  { id: 'fridge-gasket', name: 'Refrigerator Door Gasket', unit: 'piece', minPrice: 400, maxPrice: 1800, specification: 'Door dimensions and model compatibility', groups: ['refrigerator'] },
  { id: 'fridge-relay', name: 'Compressor Start Relay', unit: 'piece', minPrice: 250, maxPrice: 900, specification: 'Compatibility must be confirmed', groups: ['refrigerator'] },
  { id: 'washer-drain-pump', name: 'Washing Machine Drain Pump', unit: 'piece', minPrice: 1200, maxPrice: 2200, specification: 'Model-compatible replacement; confirm exact part', quoteRequired: true, groups: ['washing-machine'] },
  { id: 'washer-inlet-valve', name: 'Washing Machine Inlet Valve', unit: 'piece', minPrice: 700, maxPrice: 1400, specification: 'Single/dual inlet and model compatibility', groups: ['washing-machine'] },
  { id: 'washer-belt', name: 'Washer Belt / Coupler', unit: 'piece', minPrice: 500, maxPrice: 1100, specification: 'Model and part number', groups: ['washing-machine'] },
  { id: 'washer-bearing', name: 'Washing Machine Bearing Kit', unit: 'kit', minPrice: 2500, maxPrice: 4800, specification: 'Drum design and model; written quote required', quoteRequired: true, groups: ['washing-machine'] },
  { id: 'geyser-element', name: 'Geyser Heating Element', unit: 'piece', minPrice: 450, maxPrice: 2200, specification: 'Wattage, length and flange type', groups: ['geyser'] },
  { id: 'geyser-thermostat', name: 'Geyser Thermostat', unit: 'piece', minPrice: 350, maxPrice: 1600, specification: 'Model, power rating and cut-off rating', groups: ['geyser'] },
  { id: 'geyser-valve', name: 'Geyser Safety Valve', unit: 'piece', minPrice: 250, maxPrice: 1200, specification: 'Pressure rating and connection size', groups: ['geyser'] },
  { id: 'ro-sediment-filter', name: 'RO Sediment Filter', unit: 'piece', minPrice: 120, maxPrice: 500, specification: 'Size, micron rating and fitting style', groups: ['ro-water'] },
  { id: 'ro-carbon-filter', name: 'RO Carbon Filter', unit: 'piece', minPrice: 180, maxPrice: 900, specification: 'Inline/block type and model compatibility', groups: ['ro-water'] },
  { id: 'ro-membrane', name: 'RO Membrane 75–100 GPD', unit: 'piece', minPrice: 700, maxPrice: 2500, specification: 'Membrane capacity and compatible housing', groups: ['ro-water'] },
  { id: 'ro-pump', name: 'RO Booster Pump', unit: 'piece', minPrice: 900, maxPrice: 2800, specification: 'Pressure rating, voltage and connector', groups: ['ro-water'] },
  { id: 'chimney-filter', name: 'Chimney Filter', unit: 'piece', minPrice: 200, maxPrice: 2200, specification: 'Mesh/baffle/carbon type and dimensions', groups: ['chimney-kitchen'] },
  { id: 'chimney-motor', name: 'Chimney Motor', unit: 'piece', minPrice: 1800, maxPrice: 6500, specification: 'Model, suction capacity and compatible part; quote required', quoteRequired: true, groups: ['chimney-kitchen'] },
  { id: 'induction-board', name: 'Induction Cooktop Control Board', unit: 'piece', minPrice: 900, maxPrice: 3500, specification: 'Exact model and board code', quoteRequired: true, groups: ['chimney-kitchen'] },
  { id: 'microwave-magnetron', name: 'Microwave Magnetron', unit: 'piece', minPrice: 1200, maxPrice: 4200, specification: 'Model-specific part; quote required', quoteRequired: true, groups: ['microwave-oven'] },
  { id: 'microwave-turntable', name: 'Microwave Turntable Motor', unit: 'piece', minPrice: 300, maxPrice: 1000, specification: 'Shaft and model compatibility', groups: ['microwave-oven'] },
  { id: 'microwave-switch', name: 'Microwave Door Switch', unit: 'piece', minPrice: 150, maxPrice: 700, specification: 'Exact switch rating and compatible model', groups: ['microwave-oven'] },
  { id: 'tv-power-board', name: 'TV Power Board', unit: 'piece', minPrice: 900, maxPrice: 4500, specification: 'Exact TV model and board number; quote required', quoteRequired: true, groups: ['tv-electronics'] },
  { id: 'tv-mainboard', name: 'TV Mainboard / Logic Board', unit: 'piece', minPrice: 1800, maxPrice: 9500, specification: 'Exact model; confirm repair vs replacement', quoteRequired: true, groups: ['tv-electronics'] },
  { id: 'tv-backlight', name: 'TV LED Backlight Strip Kit', unit: 'set', minPrice: 500, maxPrice: 3000, specification: 'Screen size and panel model', groups: ['tv-electronics'] },
  { id: 'cooler-pump', name: 'Air Cooler Water Pump', unit: 'piece', minPrice: 250, maxPrice: 1200, specification: 'Flow rate and fitment type', groups: ['air-cooler'] },
  { id: 'cooler-motor', name: 'Air Cooler Fan Motor', unit: 'piece', minPrice: 900, maxPrice: 3500, specification: 'Shaft, speed and mounting type', groups: ['air-cooler'] },
  { id: 'cooler-pad', name: 'Air Cooler Honeycomb Pad', unit: 'set', minPrice: 300, maxPrice: 1800, specification: 'Dimensions and pad thickness', groups: ['air-cooler'] },
  { id: 'stove-burner', name: 'Gas Stove Burner Set', unit: 'set', minPrice: 250, maxPrice: 1800, specification: 'Stove model, burner size and metal type', groups: ['stove'] },
  { id: 'stove-ignition', name: 'Stove Ignition / Switch Kit', unit: 'kit', minPrice: 250, maxPrice: 1200, specification: 'Ignition type and model compatibility', groups: ['stove'] },
  { id: 'stove-knob', name: 'Cooktop Control Knob', unit: 'piece', minPrice: 80, maxPrice: 450, specification: 'Stem shape, size and model compatibility', groups: ['stove'] },
  { id: 'laptop-battery', name: 'Laptop Battery', unit: 'piece', minPrice: 1800, maxPrice: 7500, specification: 'Exact laptop model and battery compatibility; written quote recommended', quoteRequired: true, groups: ['laptop'] },
  { id: 'laptop-charger', name: 'Laptop Charger / Adapter', unit: 'piece', minPrice: 700, maxPrice: 3500, specification: 'Voltage, wattage, connector and OEM/compatible tier', groups: ['laptop'] },
  { id: 'laptop-keyboard', name: 'Laptop Keyboard', unit: 'piece', minPrice: 800, maxPrice: 3800, specification: 'Exact model, backlight and layout', groups: ['laptop'] },
  { id: 'laptop-screen', name: 'Laptop Display Panel', unit: 'piece', minPrice: 2800, maxPrice: 12000, specification: 'Screen size, resolution, connector and refresh rate; exact model quote required', quoteRequired: true, groups: ['laptop'] },
  { id: 'laptop-ram', name: 'Laptop RAM Module', unit: 'module', minPrice: 1200, maxPrice: 6500, specification: 'DDR generation, capacity and device compatibility', groups: ['laptop'] },
  { id: 'laptop-ssd', name: 'Laptop SSD', unit: 'piece', minPrice: 1800, maxPrice: 11000, specification: 'Capacity, SATA/NVMe interface and device compatibility', groups: ['laptop'] },

];
const APPLIANCE_SELECTOR_GROUPS = [
  { id: 'air-conditioner', name: 'AC', description: 'Service, repair, gas diagnosis and installation', section: 'Large appliances', image: 'https://images.unsplash.com/photo-1631545806609-4d07a1bd7b30?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['ac-service','ac-repair-gas','ac-install'] },
  { id: 'washing-machine', name: 'Washing Machine', description: 'Drainage, spin, vibration and installation', section: 'Large appliances', image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['washing-machine'] },
  { id: 'refrigerator', name: 'Refrigerator', description: 'Cooling, water leaks, door seals and diagnosis', section: 'Large appliances', image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['refrigerator'] },
  { id: 'tv-electronics', name: 'Television', description: 'Power, display, audio and mounting support', section: 'Large appliances', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['tv-electronics'] },
  { id: 'chimney-kitchen', name: 'Chimney', description: 'Cleaning, filter, suction and motor diagnosis', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['chimney-kitchen'] },
  { id: 'microwave-oven', name: 'Microwave', description: 'Heating, power, turntable and door-switch diagnosis', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['microwave-oven'] },
  { id: 'stove', name: 'Stove', description: 'Burners, ignition and cooktop controls', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['stove'] },
  { id: 'laptop', name: 'Laptop', description: 'Performance, battery, screen and upgrade support', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['laptop'] },
  { id: 'ro-water', name: 'RO / Water Purifier', description: 'Filters, water flow, leaks and installation', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1585687433148-8f8f4b4e7b42?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['ro-water'] },
  { id: 'geyser', name: 'Geyser', description: 'Heating, thermostat, safety valve and installation', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['geyser'] },
  { id: 'air-cooler', name: 'Air Cooler', description: 'Water pump, airflow, fan and seasonal servicing', section: 'Other appliances', image: 'https://images.unsplash.com/photo-1581275112236-4eab43d0b1b4?auto=format&fit=crop&w=800&q=80', serviceGroupIds: ['air-cooler'] },
] as const;
const applianceProductGroupIds = (selectorId?: string) =>
  APPLIANCE_SELECTOR_GROUPS.find(group => group.id === selectorId)?.serviceGroupIds || [];

const applianceServiceRange = (price: number, name: string) => {
  const value = name.toLowerCase();
  let low = 0.8, high = 1.35;
  if (/inspection|diagnosis|check/.test(value)) { low = 0.8; high = 1.2; }
  if (/installation|uninstallation|relocation|gas refill|refrigerant|deep cleaning|annual/.test(value)) { low = 0.8; high = 1.65; }
  return { min: Math.max(99, Math.floor(price * low / 50) * 50), max: Math.max(Math.floor(price * low / 50) * 50 + 50, Math.ceil(price * high / 50) * 50) };
};
const applianceProductCartAdd = (product: typeof APPLIANCE_PRODUCTS[number]) => {
  try {
    const existing = JSON.parse(localStorage.getItem('punchx_catalogue_cart') || '[]');
    const cart = Array.isArray(existing) ? existing : [];
    const index = cart.findIndex((item: { id?: string; category?: string }) => item.id === product.id && item.category === 'AC & Appliance Repair');
    if (index >= 0) cart[index] = { ...cart[index], qty: Math.min(99, Number(cart[index].qty || 1) + 1) };
    else cart.push({ id: product.id, name: product.name, category: 'AC & Appliance Repair', kind: 'product', unit: product.unit, min: product.minPrice, max: product.maxPrice, qty: 1, notes: product.specification, quote: Boolean(product.quoteRequired) });
    localStorage.setItem('punchx_catalogue_cart', JSON.stringify(cart));
    return true;
  } catch { return false; }
};

const ELECTRICIAN_QUICK_TASKS = [
  { label: 'Fan not working', group: 'Fan', detail: 'Repair or replace' },
  { label: 'Lights out', group: 'Light', detail: 'Bulb or fixture' },
  { label: 'Socket problem', group: 'Switch & socket', detail: 'Switches and plugs' },
  { label: 'Power keeps tripping', group: 'Wiring & power', detail: 'MCB and wiring checks' },
];

export default function PunchXServiceBrowser({ open, onClose, onSelectCategory, onTransition, citizenAddress }: Props) {
  const [level, setLevel] = useState<Level>('categories');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<PunchXServiceBranch | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<PunchXSubcategory | null>(null);
  const [query, setQuery] = useState('');
  const [detailTab, setDetailTab] = useState<'services' | 'products'>('services');
  const [cleaningDuration, setCleaningDuration] = useState(2);
  const [cleaningMode, setCleaningMode] = useState<'instant' | 'scheduled' | 'recurring'>('instant');
  const [cleaningCadence, setCleaningCadence] = useState<'daily' | 'weekly' | 'custom'>('weekly');
  const [cleaningPricingMode, setCleaningPricingMode] = useState<'hourly' | 'per-task'>('hourly');
  const [selectedCleaningTasks, setSelectedCleaningTasks] = useState<string[]>([]);
  const [cleaningProductAdded, setCleaningProductAdded] = useState<string | null>(null);
  const [cleaningDate, setCleaningDate] = useState('');
  const [cleaningTime, setCleaningTime] = useState('');
  const [applianceAddedProduct, setApplianceAddedProduct] = useState<string | null>(null);
  const [applianceBrandModel, setApplianceBrandModel] = useState('');
  const [applianceIssueNotes, setApplianceIssueNotes] = useState('');
  const [applianceBookingMode, setApplianceBookingMode] = useState<'earliest' | 'scheduled'>('earliest');
  const [appliancePreferredDate, setAppliancePreferredDate] = useState('');
  const [appliancePreferredTime, setAppliancePreferredTime] = useState('');
  const [cookBookingMode, setCookBookingMode] = useState<'instant'|'scheduled'|'recurring'>('instant');
  const [cookCadence, setCookCadence] = useState<'daily'|'weekly'|'custom'>('weekly');
  const [cookPricingMode, setCookPricingMode] = useState<'hourly'|'per-task'>('hourly');
  const [cookDuration, setCookDuration] = useState(2);
  const [cookSelectedTasks, setCookSelectedTasks] = useState<string[]>([]);
  const [cookMealSlots, setCookMealSlots] = useState<string[]>(['lunch','dinner']);
  const [cookCuisine, setCookCuisine] = useState('Bengali');
  const [cookDiet, setCookDiet] = useState('No restriction');
  const [cookServings, setCookServings] = useState(2);
  const [cookIngredientMode, setCookIngredientMode] = useState<'customer-provided'|'ingredient-planning'>('customer-provided');
  const [cookDate, setCookDate] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [cookProductAdded, setCookProductAdded] = useState<string|null>(null);
  const [paintBookingMode, setPaintBookingMode] = useState<'earliest'|'scheduled'>('earliest');
  const [paintDate, setPaintDate] = useState('');
  const [paintTime, setPaintTime] = useState('');
  const [pestPropertyType, setPestPropertyType] = useState<'residential'|'commercial'>('residential');
  const [pestPropertySize, setPestPropertySize] = useState('2 BHK');
  const [pestAreaSqFt, setPestAreaSqFt] = useState('900');
  const [pestSeverity, setPestSeverity] = useState<'light'|'moderate'|'heavy'>('moderate');
  const [pestVisitMode, setPestVisitMode] = useState<'earliest'|'scheduled'>('earliest');
  const [pestPreferredDate, setPestPreferredDate] = useState('');
  const [pestPreferredTime, setPestPreferredTime] = useState('');
  const [pestFrequency, setPestFrequency] = useState<'one-time'|'follow-up'|'annual-plan'>('one-time');
  const [pestNotes, setPestNotes] = useState('');
  const [pestProductAdded, setPestProductAdded] = useState<string|null>(null);

  const [paintProjectSize, setPaintProjectSize] = useState('one-room');
  const [paintSurfaceCondition, setPaintSurfaceCondition] = useState('minor-prep');
  const [paintFinishTier, setPaintFinishTier] = useState('standard');
  const [paintMaterialMode, setPaintMaterialMode] = useState<'professional-supply'|'customer-supply'>('professional-supply');
  const [paintWallArea, setPaintWallArea] = useState('300');
  const [paintProductAdded, setPaintProductAdded] = useState<string|null>(null);
  const [beautyGender, setBeautyGender] = useState<'female'|'male'|null>(null);
  const [beautyProductAdded, setBeautyProductAdded] = useState<string|null>(null);
  const [beautyBookingMode, setBeautyBookingMode] = useState<'earliest'|'scheduled'>('earliest');
  const [beautyPreferredDate, setBeautyPreferredDate] = useState('');
  const [beautyPreferredTime, setBeautyPreferredTime] = useState('');





  const categories = useMemo(() => PUNCHX_50_CATEGORIES.filter(item => `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const subcategories = selectedBranch?.subcategories || [];
  const services = selectedSubcategory?.services || [];
  const selectedCookServices = COOK_LEAF_SERVICES.filter(service => cookSelectedTasks.includes(service.id));
  const selectedCookMinimum = cookPricingMode === 'hourly'
    ? Math.round(cookDuration * 199)
    : selectedCookServices.reduce((sum,service)=>sum+cookPriceRange(service.price,service.name).min,0);
  const selectedCookMaximum = cookPricingMode === 'hourly'
    ? Math.round(cookDuration * 299)
    : selectedCookServices.reduce((sum,service)=>sum+cookPriceRange(service.price,service.name).max,0);
  const toggleCookTask = (taskId: string) => setCookSelectedTasks(current =>
    current.includes(taskId) ? current.filter(id=>id!==taskId) : [...current,taskId]
  );
  const selectedCleaningServices = CLEANING_LEAF_SERVICES.filter(service => selectedCleaningTasks.includes(service.id));
  const selectedCleaningMinimum = cleaningPricingMode === 'hourly'
    ? Math.round(cleaningDuration * 149)
    : selectedCleaningServices.reduce((sum, service) => sum + cleanPriceRange(service.price, service.name).min, 0);
  const selectedCleaningMaximum = cleaningPricingMode === 'hourly'
    ? Math.round(cleaningDuration * 249)
    : selectedCleaningServices.reduce((sum, service) => sum + cleanPriceRange(service.price, service.name).max, 0);
  const toggleCleaningTask = (taskId: string) => setSelectedCleaningTasks(current =>
    current.includes(taskId) ? current.filter(id => id !== taskId) : [...current, taskId]
  );
  const durationLabel = (hours: number) => hours === 0.5 ? '30 minutes' : hours === 1.5 ? '90 minutes' : hours === 1 ? '1 hour' : `${hours} hours`;


  const reset = () => { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); setSelectedSubcategory(null); setQuery(''); setSelectedCleaningTasks([]); setCleaningProductAdded(null); setApplianceAddedProduct(null); setApplianceBrandModel(''); setApplianceIssueNotes(''); setApplianceBookingMode('earliest'); setAppliancePreferredDate(''); setAppliancePreferredTime(''); setCookSelectedTasks([]); setCookProductAdded(null); setCookDate(''); setCookTime(''); setPaintProductAdded(null); setPaintDate(''); setPaintTime(''); setPestProductAdded(null); setBeautyGender(null); setBeautyProductAdded(null); setBeautyBookingMode('earliest'); setBeautyPreferredDate(''); setBeautyPreferredTime(''); setPestNotes(''); setPestPreferredDate(''); setPestPreferredTime(''); };
  const close = () => { reset(); onClose(); };
  const openCategory = (category: ServiceCategoryItem) => {
    setBeautyGender(null);
    setBeautyProductAdded(null);
    setBeautyBookingMode('earliest');
    setBeautyPreferredDate('');
    setBeautyPreferredTime('');
    setDetailTab('services');
    setSelectedCategory(category);
    setSelectedBranch(getPunchXServiceBranch(category));
    setSelectedSubcategory(null);
    setLevel('subcategories');
    setQuery('');
  };
  const openSubcategory = (group: PunchXSubcategory) => {
    setSelectedSubcategory(group);
    setLevel('services');
    setQuery('');
  };
  const openApplianceGroup = (selector: typeof APPLIANCE_SELECTOR_GROUPS[number]) => {
    const categoryName = selectedCategory?.name || 'AC & Appliance Repair';
    const sourceGroups = APPLIANCE_SERVICE_GROUPS.filter(group => (selector.serviceGroupIds as readonly string[]).includes(group.id));
    setSelectedSubcategory({
      id: selector.id,
      name: selector.name,
      services: sourceGroups.flatMap(group => group.services.map((service, index) => ({
        id: `appliance-${selector.id}-${group.id}-${index}`,
        name: service.name,
        categoryId: 'ac-technician',
        category: categoryName,
        subcategory: group.name,
        description: service.description,
        price: service.price,
        duration: service.duration
      })))
    });
    setLevel('services');
    setDetailTab('services');
    setApplianceAddedProduct(null);
    setApplianceBrandModel('');
    setApplianceIssueNotes('');
    setApplianceBookingMode('earliest');
    setAppliancePreferredDate('');
    setAppliancePreferredTime('');
    setQuery('');
  };
  const openCookGroup = (group: CookServiceGroup) => {
    setSelectedSubcategory({
      id: group.id,
      name: group.name,
      services: COOK_LEAF_SERVICES.filter(service=>service.subcategory===group.name)
    });
    setLevel('services');
    setDetailTab('services');
    setCookProductAdded(null);
    setQuery('');
  };
  const openBeautyGender = (gender: 'female'|'male') => {
    setBeautyGender(gender);
    setSelectedSubcategory({ id: 'beauty-' + gender + '-root', name: gender === 'female' ? 'Women’s Salon & Spa' : 'Men’s Salon & Massage', services: [] });
    setLevel('subcategories');
    setDetailTab('services');
    setBeautyProductAdded(null);
    setQuery('');
  };
  const openBeautyGroup = (group: BeautyServiceGroup) => {
    setSelectedSubcategory({
      id: group.id,
      name: group.name,
      services: group.services.map((service,index)=>({
        id: 'beauty-' + group.id + '-' + index,
        name: service.name,
        categoryId: 'beautician',
        category: selectedCategory?.name || 'Beauty & Salon at Home',
        subcategory: group.name,
        description: service.description,
        price: Math.round((service.minPrice + service.maxPrice) / 2),
        duration: service.duration
      }))
    });
    setLevel('services');
    setDetailTab('services');
    setBeautyProductAdded(null);
    setBeautyBookingMode('earliest');
    setBeautyPreferredDate('');
    setBeautyPreferredTime('');
    setQuery('');
  };
  const openPaintGroup = (group: PaintServiceGroup) => {
    setSelectedSubcategory({
      id: group.id,
      name: group.name,
      services: group.services.map((service,index)=>({
        id:`paint-${group.id}-${index}`,
        name:service.name,
        categoryId:'painter',
        category:selectedCategory?.name||'Painting & Home Improvement',
        subcategory:group.name,
        description:service.description,
        price:Math.round((service.minPrice+service.maxPrice)/2),
        duration:service.duration,
      }))
    });
    setLevel('services');
    setDetailTab('services');
    setPaintProductAdded(null);
    setPaintDate('');
    setPaintTime('');
    setQuery('');
  };
  const openPestGroup = (group: PestServiceGroup) => {
    setSelectedSubcategory({
      id:group.id,
      name:group.name,
      services:group.services.map((service,index)=>({
        id:`pest-${group.id}-${index}`,
        name:service.name,
        categoryId:'pest-control-worker',
        category:selectedCategory?.name||'Pest Control',
        subcategory:group.name,
        description:service.description,
        price:Math.round((service.minPrice+service.maxPrice)/2),
        duration:service.duration
      }))
    });
    setLevel('services');
    setDetailTab('services');
    setPestProductAdded(null);
    setPestNotes('');
    setQuery('');
  };
  const selectLeaf = (service: PunchXLeafService) => {
    const applianceRange = service.categoryId === 'ac-technician' ? applianceServiceRange(service.price, service.name) : null;
    const paintingRange = service.categoryId === 'painter' ? paintServiceRange(service.name, service.subcategory) : null;
    const pestRange = service.categoryId === 'pest-control-worker' ? pestServiceRange(service.name, service.subcategory) : null;
    const beautyRange = service.categoryId === 'beautician' ? beautyServiceRange(service.name, service.subcategory) : null;
    const savedLeaf = applianceRange
      ? { ...service, minPrice: applianceRange.min, maxPrice: applianceRange.max, priceIsIndicativeRange: true }
      : paintingRange
        ? { ...service, minPrice: paintingRange.min, maxPrice: paintingRange.max, priceUnit: paintingRange.unit, quoteRequired: paintingRange.quoteRequired, priceIsIndicativeRange: true }
        : pestRange
          ? { ...service, minPrice: pestRange.min, maxPrice: pestRange.max, priceUnit: pestRange.unit, quoteRequired: pestRange.quoteRequired, priceIsIndicativeRange: true }
          : beautyRange
            ? { ...service, minPrice: beautyRange.min, maxPrice: beautyRange.max, priceIsIndicativeRange: true }
            : service;
    localStorage.setItem('punchx_selected_leaf_service', JSON.stringify(savedLeaf));
    localStorage.setItem('punchx_selected_service_path', JSON.stringify({ category: service.category, subcategory: service.subcategory, service: service.name }));
    if (paintingRange) {
      try {
        localStorage.setItem('punchx_painting_request_details', JSON.stringify({
          projectSize: paintProjectSize, approximateWallAreaSqFt: paintWallArea ? Number(paintWallArea) : null,
          surfaceCondition: paintSurfaceCondition, finishTier: paintFinishTier, materialMode: paintMaterialMode,
          bookingMode: paintBookingMode, preferredDate: paintBookingMode === 'scheduled' ? paintDate : null,
          preferredTime: paintBookingMode === 'scheduled' ? paintTime : null,
          selectedService: service.name, category: service.subcategory,
          minPrice: paintingRange.min, maxPrice: paintingRange.max, priceUnit: paintingRange.unit,
          createdAt: new Date().toISOString()
        }));
      } catch {}
    }
    if (beautyRange) {
      try {
        localStorage.setItem('punchx_beauty_request_details', JSON.stringify({
          gender: beautyGender,
          category: service.subcategory,
          service: service.name,
          bookingMode: beautyBookingMode,
          preferredDate: beautyBookingMode === 'scheduled' ? beautyPreferredDate : null,
          preferredTime: beautyBookingMode === 'scheduled' ? beautyPreferredTime : null,
          minPrice: beautyRange.min,
          maxPrice: beautyRange.max,
          createdAt: new Date().toISOString()
        }));
      } catch {}
    }
    onSelectCategory(service.category);
    close();
    onTransition('providers');
  };
  if (!open) return null;

  const title = level === 'categories' ? 'All 10 PUNCHX service categories' : level === 'subcategories' ? selectedCategory?.name || 'Services' : selectedSubcategory?.name || 'Select a service';
  const countText = level === 'categories' ? `${PUNCHX_50_CATEGORIES.length} main categories` : level === 'subcategories' ? `${subcategories.length} service groups` : `${services.length} service options`;

  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true">
    <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white text-[#17191d] sm:max-w-5xl sm:rounded-[28px]">
      <header className="border-b border-black/5 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {level !== 'categories' && <button onClick={() => { if (level === 'services') { if (selectedCategory?.id === 'beautician') { setSelectedSubcategory(beautyGender ? { id: 'beauty-' + beautyGender + '-root', name: beautyGender === 'female' ? 'Women’s Salon & Spa' : 'Men’s Salon & Massage', services: [] } : null); setDetailTab('services'); setBeautyProductAdded(null); } else { setSelectedSubcategory(null); } setLevel('subcategories'); } else if (selectedCategory?.id === 'beautician' && beautyGender) { setBeautyGender(null); setSelectedSubcategory(null); setLevel('subcategories'); } else { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); } }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8]"><ArrowLeft className="h-5 w-5"/></button>}
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7358d7]">PUNCHX catalogue</p><h2 className="truncate text-xl font-black">{title}</h2><p className="text-[11px] text-[#858a93]">{countText}</p></div>
          <button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8]"><X className="h-5 w-5"/></button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#f5f6f8] px-3 py-2.5"><Search className="h-4 w-4 text-[#858a93]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={level === 'categories' ? 'Search electrician, plumbing, cleaning...' : 'Search this level...'} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"/></div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6">
        {level === 'categories' && <>
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#7358d7]/10 bg-[#f0ecff] p-3 text-xs"><MapPin className="h-4 w-4 text-[#7358d7]"/><span className="font-bold">Geofence/service area controls availability. The residential address is collected later only as the professional's visit destination.</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{categories.map(category=><button key={category.id} onClick={()=>openCategory(category)} className="group rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-[#7358d7]/30"><div className="relative mb-3 h-24 overflow-hidden rounded-xl bg-[#f1effa]"><img src={category.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"/></div><div className="mt-3 flex items-start justify-between gap-2"><span className="text-sm font-black leading-4">{category.name}</span><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#aaaeb6]"/></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#858a93]">{category.shortDesc}</p><p className="mt-2 text-[11px] font-black">Starts ₹{category.basePrice.toLocaleString('en-IN')}</p></button>)}</div>
        </>}

        {level === 'subcategories' && selectedCategory?.id === 'beautician' && <div className="space-y-6">
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#281927] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('beauty salon at home')} alt="At-home salon and personal grooming services" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Beauty & Salon at Home','Salon, spa and personal grooming services at home');}}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#26131f] via-[#26131f]/85 to-[#26131f]/20"/>
            <div className="relative max-w-3xl p-5 sm:p-8 lg:p-9"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-200"><Sparkles className="h-3.5 w-3.5"/> PUNCHX beauty at home</span><h3 className="mt-4 max-w-2xl text-3xl font-black leading-[1.05] sm:text-4xl">Your routine. Your style. <span className="text-rose-300">Your space.</span></h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Choose the women’s or men’s collection, explore only the services relevant to that collection, and compare service and product price ranges before booking.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Women’s salon & spa</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Men’s salon & massage</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Transparent price ranges</span></div></div>
          </section>
          {!beautyGender && <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-600">Choose your collection</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Who are the services for?</h3><p className="mt-1 text-xs leading-5 text-[#737780]">Choose one to see its specific categories, services and products.</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button" onClick={()=>openBeautyGender('female')} className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-rose-300 hover:shadow-md">
                <div className="relative h-44 overflow-hidden bg-rose-50 sm:h-56"><img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85" alt="Woman enjoying a facial treatment" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Salon for Women','Facial, salon and spa services');}}/><div className="absolute inset-0 bg-gradient-to-t from-[#26131f]/85 via-black/10 to-transparent"/><span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">Female collection</span></div>
                <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h4 className="text-xl font-black text-[#26131f]">Women</h4><span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700"><ArrowRight className="h-5 w-5"/></span></div><p className="mt-1 text-sm text-[#737780]">Salon for Women, Spa for Women, Hair Studio for Women, Makeup, Saree & Styling.</p><div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-800">Facials & waxing</span><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-800">Hair & nails</span><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-800">Makeup & spa</span></div></div>
              </button>
              <button type="button" onClick={()=>openBeautyGender('male')} className="group overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-violet-300 hover:shadow-md">
                <div className="relative h-44 overflow-hidden bg-violet-50 sm:h-56"><img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85" alt="Men's barber and grooming service" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Salon for Men','Haircuts, beard grooming and massage');}}/><div className="absolute inset-0 bg-gradient-to-t from-[#1f1c35]/85 via-black/10 to-transparent"/><span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">Male collection</span></div>
                <div className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h4 className="text-xl font-black text-[#211d3b]">Men</h4><span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700"><ArrowRight className="h-5 w-5"/></span></div><p className="mt-1 text-sm text-[#737780]">Salon for Men, Massage for Men, facial and grooming essentials.</p><div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">Hair & beard</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">Facial & grooming</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">Massage & care</span></div></div>
              </button>
            </div>
          </section>}
          {beautyGender && <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-600">{beautyGender==='female'?'Women’s beauty collection':'Men’s grooming collection'}</p><h3 className="mt-1 text-xl font-black tracking-tight text-[#17191d] sm:text-2xl">{beautyGender==='female'?'Choose a women’s service category':'Choose a men’s service category'}</h3><p className="mt-1 text-xs leading-5 text-[#737780]">Select a category to open its own services and related product catalogue.</p></div><button type="button" onClick={()=>{setBeautyGender(null);setSelectedSubcategory(null);setDetailTab('services');setQuery('');}} className="rounded-xl border border-[#e6e0e6] bg-white px-3 py-2 text-xs font-black text-[#4f4753] transition hover:bg-[#faf7fa]">Switch collection</button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BEAUTY_SERVICE_GROUPS.filter(group=>group.gender===beautyGender&&`${group.name} ${group.description} ${group.tag}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openBeautyGroup(group)} className="group min-w-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-rose-300 hover:shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden bg-rose-50"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"/><span className="absolute bottom-2 left-2 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.tag}</span><span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div>
                <div className="p-3 sm:p-4"><h4 className="text-sm font-black leading-5 text-[#211b25] sm:text-base">{group.name}</h4><p className="mt-1.5 min-h-[40px] text-[11px] leading-4 text-[#737780]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5"><span className="text-[10px] font-bold text-[#737780]">{group.services.length} service options</span><span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700">Explore <ChevronRight className="h-3 w-3"/></span></div></div>
              </button>)}
            </div>
          </section>}
          <section className="grid gap-3 rounded-2xl border border-rose-100 bg-white p-4 sm:grid-cols-3">{[{title:'Choose your product',body:'Beauty products and supplies have separate price ranges where listed.'},{title:'Clean tools & product choice',body:'Confirm hygiene, ingredients, skin sensitivity and product preferences before treatment.'},{title:'Clear service pricing',body:'The displayed range is indicative; selected service details and final total are confirmed before booking.'}].map(item=><div key={item.title} className="rounded-xl bg-rose-50/60 p-3"><h4 className="text-sm font-black text-[#302532]">{item.title}</h4><p className="mt-1 text-xs leading-5 text-[#756a78]">{item.body}</p></div>)}</section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'cleaner-housekeeper' && <div className="space-y-6">
          <section className="relative isolate min-h-[300px] overflow-hidden rounded-[28px] bg-[#16372c] text-white shadow-lg sm:min-h-[330px]">
            <img src={selectedCategory.imageUrl || serviceImage('home cleaning')} alt="Home cleaning professional mopping a bright living room" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('PunchX Home Cleaning', 'Flexible help with everyday household chores'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#132b24] via-[#132b24]/85 to-[#132b24]/20"/>
            <div className="relative max-w-3xl p-5 sm:p-8 lg:p-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200"><Sparkles className="h-3.5 w-3.5"/> PUNCHX everyday home care</span>
              <h3 className="mt-4 max-w-2xl text-3xl font-black leading-[1.05] sm:text-4xl">A little help. A fresher home. <span className="text-emerald-300">On your time.</span></h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Choose the chores that matter most, book a flexible duration, and add cleaning products when needed. Instant visits depend on local professional availability.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Pick your priority chores</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Flexible time slots</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Services + supplies</span></div>
            </div>
          </section>
          <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">Quick booking</p><h3 className="mt-1 text-lg font-black text-[#18221d] sm:text-xl">How should we help today?</h3><p className="mt-1 text-xs leading-5 text-[#747c76]">Pick an arrival preference and duration. Price is an estimate and may vary by task and home size.</p></div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-[#edf4ef] p-1">
                <button type="button" onClick={()=>setCleaningMode('instant')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${cleaningMode==='instant'?'bg-white text-emerald-800 shadow-sm':'text-[#65756a]'}`}>Book now</button>
                <button type="button" onClick={()=>setCleaningMode('scheduled')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${cleaningMode==='scheduled'?'bg-white text-emerald-800 shadow-sm':'text-[#65756a]'}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/> Schedule</button>
                <button type="button" onClick={()=>setCleaningMode('recurring')} className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${cleaningMode==='recurring'?'bg-white text-emerald-800 shadow-sm':'text-[#65756a]'}`}>Repeat</button>
              </div>
            </div>
            {cleaningMode==='scheduled' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#415148]">Preferred date<input type="date" value={cleaningDate} min={new Date().toLocaleDateString('en-CA')} onChange={event=>setCleaningDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7df] bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"/></label><label className="text-xs font-bold text-[#415148]">Preferred arrival time<input type="time" value={cleaningTime} onChange={event=>setCleaningTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7df] bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"/></label></div>}
            {cleaningMode==='recurring' && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-xs font-black text-[#244b37]">How often would you like help?</p><div className="mt-2 flex flex-wrap gap-2">{[{id:'daily',label:'Daily'},{id:'weekly',label:'Weekly'},{id:'custom',label:'Custom schedule'}].map(option=><button key={option.id} type="button" onClick={()=>setCleaningCadence(option.id as 'daily'|'weekly'|'custom')} className={`rounded-xl border px-3 py-2 text-xs font-bold ${cleaningCadence===option.id?'border-emerald-600 bg-white text-emerald-800':'border-[#dce7df] bg-transparent text-[#65756a]'}`}>{option.label}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-[#65756a]">This records your preferred cadence for the request. A recurring schedule is confirmed only where PunchX has supported availability.</p></div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-[#244b37]">Choose how you want to price the visit</p><div className="flex rounded-xl bg-[#edf4ef] p-1"><button type="button" onClick={()=>setCleaningPricingMode('hourly')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cleaningPricingMode==='hourly'?'bg-white text-emerald-800 shadow-sm':'text-[#65756a]'}`}>Hourly help</button><button type="button" onClick={()=>setCleaningPricingMode('per-task')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cleaningPricingMode==='per-task'?'bg-white text-emerald-800 shadow-sm':'text-[#65756a]'}`}>Per-task</button></div></div>
            {cleaningPricingMode==='hourly' && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{[0.5,1,1.5,2,3,4].map(hours=><button key={hours} type="button" onClick={()=>setCleaningDuration(hours)} className={`rounded-2xl border p-3 text-left transition ${cleaningDuration===hours?'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600':'border-[#e7ece8] bg-white hover:border-emerald-300'}`}><span className="block text-sm font-black text-[#18221d]">{durationLabel(hours)}</span><span className="mt-1 block text-[10px] font-semibold text-[#7d867f]">{hours===0.5?'Quick chore':hours===1?'Short refresh':hours===1.5?'30 extra minutes':hours===2?'Popular duration':hours===3?'Multi-room routine':'Extended task list'}</span></button>)}</div>}
            {cleaningPricingMode==='hourly' && <div className="mt-4"><div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">PunchX cleaning bundles</p><h4 className="mt-1 text-sm font-black text-[#18221d]">Get more routine chores done in one visit</h4></div><span className="text-[10px] font-semibold text-[#7d867f]">Indicative pricing</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{[{hours:2,title:'Home Reset',note:'Floors, dusting and a priority room',label:'Popular'},{hours:3,title:'Weekly Freshen-up',note:'Combine kitchen, bathroom and daily chores',label:'Multi-task'},{hours:4,title:'Extended Home Help',note:'More time for a longer household task list',label:'Flexible'}].map(offer=><button key={offer.title} type="button" onClick={()=>setCleaningDuration(offer.hours)} className={`rounded-2xl border p-3 text-left transition ${cleaningDuration===offer.hours?'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600':'border-[#e7ece8] bg-white hover:border-emerald-300'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-[#18221d]">{offer.title}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-800">{offer.label}</span></div><p className="mt-1 text-[10px] leading-4 text-[#747c76]">{offer.note}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-emerald-900">{offer.hours} hours · ₹{(offer.hours*149).toLocaleString('en-IN')}–₹{(offer.hours*249).toLocaleString('en-IN')}</span><ArrowRight className="h-3.5 w-3.5 text-emerald-800"/></div></button>)}</div><p className="mt-2 text-[10px] text-[#7d867f]">These bundles are task-planning options, not guaranteed discounts; final scope and price are confirmed before booking.</p></div>}<div className="mt-4 flex flex-col gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#7d867f]">Indicative estimate</p><p className="text-xl font-black text-[#18221d]">{cleaningPricingMode==='hourly'? `₹${Math.round(cleaningDuration*149).toLocaleString('en-IN')} – ₹${Math.round(cleaningDuration*249).toLocaleString('en-IN')}` : selectedCleaningTasks.length ? `₹${selectedCleaningMinimum.toLocaleString('en-IN')} – ₹${selectedCleaningMaximum.toLocaleString('en-IN')}` : 'Choose tasks first'} <span className="text-xs font-semibold text-[#7d867f]">{cleaningPricingMode==='hourly'? `for ${durationLabel(cleaningDuration)}` : 'estimated task total'}</span></p><p className="mt-1 text-[10px] text-[#7d867f]">Final amount depends on selected chores, time, home size and availability.</p></div><button type="button" onClick={()=>{try{localStorage.setItem('punchx_cleaning_booking_preferences',JSON.stringify({mode:cleaningMode,cadence:cleaningMode==='recurring'?cleaningCadence:null,pricingModel:cleaningPricingMode,durationHours:cleaningPricingMode==='hourly'?cleaningDuration:null,preferredDate:cleaningMode==='scheduled'?cleaningDate:null,preferredTime:cleaningMode==='scheduled'?cleaningTime:null,selectedTasks:selectedCleaningTasks,category:'Home Cleaning',createdAt:new Date().toISOString()}));}catch{};const group=CLEANING_SERVICE_GROUPS.find(item=>item.id==='hourly-house-help')!;setSelectedSubcategory({id:group.id,name:group.name,services:CLEANING_LEAF_SERVICES.filter(task=>task.subcategory===group.name)});setLevel('services');setDetailTab('services');setQuery('');}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800"><ArrowRight className="h-4 w-4"/> Choose chores</button></div>
          </section>
          <section className="grid gap-3 rounded-2xl border border-[#e3ece5] bg-white p-4 sm:grid-cols-2">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-800">Included, based on selected task</p><h3 className="mt-1 text-sm font-black text-[#18221d]">Everyday home help</h3><ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#65756a]"><li>• Sweeping and mopping accessible floors</li><li>• Dusting reachable furniture and surface wiping</li><li>• Dishwashing, laundry folding and routine tidying when selected</li><li>• Room, kitchen or bathroom upkeep within the listed scope</li></ul></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">Safety & scope</p><h3 className="mt-1 text-sm font-black text-[#18221d]">Confirm special work separately</h3><ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#65756a]"><li>• No unsafe heights, risky ladder work or moving heavy furniture</li><li>• Specialist equipment or intensive deep cleaning may need a separate service</li><li>• Chemicals must be suitable for the surface and used as labelled</li><li>• Childcare, pet care and medical care are not cleaning tasks</li></ul></div>
            <p className="sm:col-span-2 text-[10px] leading-4 text-[#7d867f]">Select the chores you want, then confirm the final scope, materials, estimated range and professional availability before booking.</p>
          </section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">Popular cleaning tasks</p><h3 className="mt-1 text-lg font-black text-[#18221d] sm:text-xl">Start with what you need</h3></div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[{label:'Bathroom needs a reset',group:'bathroom'},{label:'Kitchen clean-up',group:'kitchen'},{label:'Dishes are piling up',group:'dishwashing'},{label:'Dust and floors',group:'hourly-house-help'}].map(task=><button key={task.label} type="button" onClick={()=>{const group=CLEANING_SERVICE_GROUPS.find(item=>item.id===task.group)!;setSelectedSubcategory({id:group.id,name:group.name,services:group.services.map((service,index)=>({id:`cleaning-${group.id}-${index}`,name:service.name,categoryId:'cleaner-housekeeper',category:selectedCategory?.name||'Home Cleaning',subcategory:group.name,description:service.description,price:service.price,duration:service.duration}))});setLevel('services');setDetailTab('services');setQuery('');}} className="flex min-h-[90px] flex-col justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"><span className="text-sm font-black leading-5 text-[#18221d]">{task.label}</span><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">Explore options <ArrowRight className="h-3.5 w-3.5"/></span></button>)}</div>
          </section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">Explore all categories</p><h3 className="mt-1 text-lg font-black text-[#18221d] sm:text-xl">Everyday chores and focused cleaning</h3><p className="mt-1 text-xs leading-5 text-[#747c76]">Choose a task category first, then browse its services or related supplies.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{CLEANING_SERVICE_GROUPS.filter(group=>`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>{setSelectedSubcategory({id:group.id,name:group.name,services:group.services.map((service,index)=>({id:`cleaning-${group.id}-${index}`,name:service.name,categoryId:'cleaner-housekeeper',category:selectedCategory?.name||'Home Cleaning',subcategory:group.name,description:service.description,price:service.price,duration:service.duration}))});setLevel('services');setDetailTab('services');setQuery('');setCleaningProductAdded(null);}} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:ring-emerald-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-emerald-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.tag}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-emerald-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><h4 className="text-base font-black text-[#18221d]">{group.name}</h4><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#747c76]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#747c76]">{group.services.length} service options</span><span className="text-[10px] font-black text-emerald-800">Services + products</span></div></div></button>)}</div>
          </section>
        </div>}
        
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#102a36] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('plumbing')} alt="Professional plumber repairing household pipework" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Plumbing Services', 'Taps, pipes and bathroom repairs'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#102a36] via-[#102a36]/85 to-[#102a36]/20"/>
            <div className="relative max-w-2xl p-5 sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200"><Droplet className="h-3.5 w-3.5"/> PUNCHX plumbing care</span><h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Leaks, blockages or low pressure? <span className="text-cyan-300">Start here.</span></h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Pick the plumbing issue, explore the relevant service options, and check product price ranges before confirming work.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Problem-first booking</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Service + materials</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Clear price ranges</span></div></div>
          </section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Start with the issue</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What needs fixing?</h3></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{PLUMBING_QUICK_TASKS.map(task=><button key={task.label} type="button" onClick={()=>{const matches=subcategories.flatMap(group=>group.services).filter(service=>matchesPlumbingGroup(task.group,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:task.group,name:task.label,services:matches.length?matches:subcategories.flatMap(group=>group.services)});setLevel('services');setDetailTab('services');setQuery('');}} className="group flex min-h-[100px] flex-col justify-between rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"><span className="text-sm font-black leading-5 text-[#17313a]">{task.label}</span><span className="mt-3 flex items-center justify-between gap-1 text-[10px] font-bold text-cyan-800"><span>{task.detail}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span></button>)}</div></section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Browse by category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Plumbing for every part of your home</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#737780]">Every category opens its own service list and a separate products tab.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLUMBING_SERVICE_GROUPS.filter(group=>`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=>{const count=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`)).length;return <button key={group.id} type="button" onClick={()=>{const matches=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:group.id,name:group.name,services:matches});setLevel('services');setDetailTab('services');setQuery('');}} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-cyan-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-cyan-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.name}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-cyan-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h4 className="text-base font-black text-[#17191d]">{group.name}</h4><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"/></div><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#737780]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#737780]">{count} service options</span><span className="text-[10px] font-black text-cyan-800">Services & products</span></div></div></button>;})}
          </div></section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'plumber' && <div className="space-y-6">
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#102a36] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('plumbing')} alt="Professional plumber repairing household pipework" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Plumbing Services', 'Taps, pipes and bathroom repairs'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#102a36] via-[#102a36]/85 to-[#102a36]/20"/>
            <div className="relative max-w-2xl p-5 sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200"><Droplet className="h-3.5 w-3.5"/> PUNCHX plumbing care</span><h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Leaks, blockages or low pressure? <span className="text-cyan-300">Start here.</span></h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Pick the plumbing issue, explore the relevant service options, and check product price ranges before confirming work.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Problem-first booking</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Service + materials</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Clear price ranges</span></div></div>
          </section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Start with the issue</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What needs fixing?</h3></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{PLUMBING_QUICK_TASKS.map(task=><button key={task.label} type="button" onClick={()=>{const matches=subcategories.flatMap(group=>group.services).filter(service=>matchesPlumbingGroup(task.group,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:task.group,name:task.label,services:matches.length?matches:subcategories.flatMap(group=>group.services)});setLevel('services');setDetailTab('services');setQuery('');}} className="group flex min-h-[100px] flex-col justify-between rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"><span className="text-sm font-black leading-5 text-[#17313a]">{task.label}</span><span className="mt-3 flex items-center justify-between gap-1 text-[10px] font-bold text-cyan-800"><span>{task.detail}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span></button>)}</div></section>
          <section><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-700">Browse by category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Plumbing for every part of your home</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#737780]">Every category opens its own service list and a separate products tab.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLUMBING_SERVICE_GROUPS.filter(group=>`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=>{const count=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`)).length;return <button key={group.id} type="button" onClick={()=>{const matches=subcategories.flatMap(item=>item.services).filter(service=>matchesPlumbingGroup(group.id,`${service.name} ${service.subcategory}`));setSelectedSubcategory({id:group.id,name:group.name,services:matches});setLevel('services');setDetailTab('services');setQuery('');}} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-cyan-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-cyan-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.name}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-cyan-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><div className="flex items-start justify-between gap-2"><h4 className="text-base font-black text-[#17191d]">{group.name}</h4><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"/></div><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#737780]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#737780]">{count} service options</span><span className="text-[10px] font-black text-cyan-800">Services & products</span></div></div></button>;})}
          </div></section>
        </div>}
        
        {level === 'subcategories' && selectedCategory?.id === 'cook' && <div className="space-y-7">
          <section className="relative isolate min-h-[270px] overflow-hidden rounded-[28px] bg-[#312015] text-white shadow-lg sm:min-h-[310px]">
            <img src={selectedCategory.imageUrl || serviceImage('home cook preparing a family meal')} alt="Home cook preparing fresh meals in a kitchen" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Cook & Home Assistance','Home cooking, meal preparation and practical kitchen help');}}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#25180f] via-[#25180f]/85 to-[#25180f]/20"/>
            <div className="relative max-w-3xl p-5 sm:p-8 lg:p-9"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200"><ChefHat className="h-3.5 w-3.5"/> PUNCHX home cooking</span><h3 className="mt-4 max-w-2xl text-3xl font-black leading-[1.05] sm:text-4xl">Your kitchen. Your menu. <span className="text-amber-300">Your routine.</span></h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Book a cook for the meals you need, add kitchen assistance to the same visit, and review service and ingredient price ranges before confirming.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Single or repeat visits</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Cuisine & meal preferences</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Clear service + product prices</span></div></div>
          </section>
          <section className="grid gap-3 rounded-2xl border border-amber-100 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-800">Start with your need</p><h3 className="mt-1 text-lg font-black text-[#2b2119]">What kind of help would you like?</h3><p className="mt-1 text-xs leading-5 text-[#786f68]">Choose one task first, then add other cooking or kitchen-help tasks to the same visit.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'Daily cooking',id:'daily-cook'},{label:'Meal prep',id:'meal-prep'},{label:'Kitchen help',id:'kitchen-assistant'},{label:'Dishes & utensils',id:'utensils-dishes'}].map(shortcut=>{const group=COOK_SERVICE_GROUPS.find(item=>item.id===shortcut.id)!;return <button key={shortcut.id} type="button" onClick={()=>openCookGroup(group)} className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-3 text-left text-xs font-black leading-4 text-[#56391f] transition hover:border-amber-300 hover:bg-amber-50">{shortcut.label}<ArrowRight className="mt-2 block h-3.5 w-3.5 text-amber-800"/></button>;})}</div></section>
          {(['Cooking services','Home assistance'] as const).map(section=><section key={section}><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-800">{section==='Cooking services'?'Cook what you love':'Help around the kitchen'}</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-[#211911] sm:text-2xl">{section}</h3><p className="mt-1 text-xs leading-5 text-[#786f68]">{section==='Cooking services'?'Choose meal slots, cuisine, diet preferences and the dishes you want prepared.':'Add practical prep, ingredient organising or cooking-session cleanup; general home cleaning remains a separate service.'}</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{COOK_SERVICE_GROUPS.filter(group=>group.section===section&&`${group.name} ${group.description} ${group.tag}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openCookGroup(group)} className="group min-w-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-amber-300 hover:shadow-md"><div className="relative aspect-[4/3] overflow-hidden bg-amber-50"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"/><span className="absolute bottom-2 left-2 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">{group.tag}</span></div><div className="p-3 sm:p-4"><h4 className="text-sm font-black leading-5 text-[#2b2119]">{group.name}</h4><p className="mt-1.5 min-h-[48px] text-[11px] leading-4 text-[#786f68]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5"><span className="text-[10px] font-bold text-[#786f68]">{group.services.length} options</span><ArrowRight className="h-3.5 w-3.5 text-amber-800"/></div></div></button>)}</div></section>)}
          <section className="grid gap-3 rounded-2xl border border-[#eee4d7] bg-[#fffaf3] p-4 sm:grid-cols-3">{[{title:'Ingredients are separate',body:'Use ingredients you already have or browse price ranges. Shopping and delivery are not assumed.'},{title:'Cooking cleanup is scoped',body:'Select utensil wash-up or kitchen reset when needed. Full-home or deep cleaning is booked separately.'},{title:'Confirm the menu',body:'Meal count, portions, cuisine, dietary preferences and availability are confirmed before the visit.'}].map(item=><div key={item.title} className="rounded-xl bg-white/80 p-3"><h4 className="text-sm font-black text-[#2b2119]">{item.title}</h4><p className="mt-1 text-xs leading-5 text-[#786f68]">{item.body}</p></div>)}</section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'pest-control-worker' && <div className="space-y-7">
          <section className="relative isolate min-h-[275px] overflow-hidden rounded-[28px] bg-[#17291f] text-white shadow-lg sm:min-h-[315px]">
            <img src={selectedCategory.imageUrl || serviceImage('professional pest control technician home inspection')} alt="Professional pest control technician inspecting a home" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-35" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Pest Control','Inspection and targeted professional pest treatment');}}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#14251c] via-[#14251c]/85 to-[#14251c]/15"/>
            <div className="relative max-w-3xl p-5 sm:p-8 lg:p-9"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-lime-200"><Bug className="h-3.5 w-3.5"/> PUNCHX pest care</span><h3 className="mt-4 max-w-2xl text-3xl font-black leading-[1.05] sm:text-4xl">Find the source. <span className="text-lime-300">Treat it right.</span></h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Choose the pest or start with an inspection. Compare home-size price ranges, see prevention products separately and confirm the treatment plan before work begins.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Pest-specific treatments</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Property-based estimates</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Safety & follow-up clarity</span></div></div>
          </section>
          <section className="grid gap-3 rounded-2xl border border-lime-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-800">Start with what you see</p><h3 className="mt-1 text-lg font-black text-[#1e2a21]">Which pest problem needs attention?</h3><p className="mt-1 text-xs leading-5 text-[#707b72]">Pick a common problem to view related treatment options.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'Cockroaches / ants',id:'cockroach-ant'},{label:'Termites / wood damage',id:'termite-wood-borer'},{label:'Bed bugs',id:'bed-bug'},{label:'Rats / mice',id:'rodent'}].map(shortcut=>{const group=PEST_SERVICE_GROUPS.find(item=>item.id===shortcut.id)!;return <button key={shortcut.id} type="button" onClick={()=>openPestGroup(group)} className="rounded-xl border border-lime-100 bg-lime-50/70 px-3 py-3 text-left text-xs font-black leading-4 text-[#304c28] transition hover:border-lime-300 hover:bg-lime-50">{shortcut.label}<ArrowRight className="mt-2 block h-3.5 w-3.5 text-lime-800"/></button>;})}</div></section>
          {(['Home pest control','Specialist & commercial'] as const).map(section=><section key={section}><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-800">{section==='Home pest control'?'Treat the pest, not just the symptom':'Assessment-led services'}</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-[#1e2a21] sm:text-2xl">{section}</h3><p className="mt-1 text-xs leading-5 text-[#707b72]">{section==='Home pest control'?'Common pests affecting kitchens, bedrooms, wood, balconies and whole homes.':'For larger premises, unclear pest activity, follow-up care and recurring protection plans.'}</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{PEST_SERVICE_GROUPS.filter(group=>group.section===section&&`${group.name} ${group.description} ${group.tag}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openPestGroup(group)} className="group min-w-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-lime-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-lime-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.tag}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lime-900 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><h4 className="text-base font-black text-[#1e2a21]">{group.name}</h4><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#707b72]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#707b72]">{group.services.length} treatment options</span><span className="text-[10px] font-black text-lime-900">See price ranges <ArrowRight className="ml-1 inline h-3 w-3"/></span></div></div></button>)}</div></section>)}
          <section className="grid gap-3 rounded-2xl border border-[#e3eadf] bg-[#f7fbf4] p-4 sm:grid-cols-3">{[{title:'Inspection before treatment',body:'Different pests need different methods. The provider should confirm what is included and why.'},{title:'Preparation instructions',body:'Follow the professional’s written product-label instructions for food, utensils, children, pets and re-entry.'},{title:'Follow-up in writing',body:'Treatment rounds, revisit eligibility and warranty terms depend on the plan—confirm them before booking.'}].map(item=><div key={item.title} className="rounded-xl bg-white/80 p-3"><h4 className="text-sm font-black text-[#203024]">{item.title}</h4><p className="mt-1 text-xs leading-5 text-[#707b72]">{item.body}</p></div>)}</section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'painter' && <div className="space-y-7">
          <section className="relative isolate min-h-[275px] overflow-hidden rounded-[28px] bg-[#33251e] text-white shadow-lg sm:min-h-[315px]">
            <img src={selectedCategory.imageUrl || serviceImage('interior home painting')} alt="Painter preparing a home wall for a fresh finish" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback('Painting & Home Improvement','Interior painting, wall repair and home finishing');}}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#2d2019] via-[#2d2019]/85 to-[#2d2019]/15"/>
            <div className="relative max-w-3xl p-5 sm:p-8 lg:p-9"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200"><Paintbrush className="h-3.5 w-3.5"/> PUNCHX painting & improvement</span><h3 className="mt-4 max-w-2xl text-3xl font-black leading-[1.05] sm:text-4xl">Refresh your space. <span className="text-orange-300">Repair it right.</span></h3><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">From one wall to a full-home project, pick the work, compare transparent price ranges and choose paint or repair materials separately.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Room & whole-home packages</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Prep, paint & finish options</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Products priced separately</span></div></div>
          </section>
          <section className="grid gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-800">Start with your project</p><h3 className="mt-1 text-lg font-black text-[#2b2119]">What would you like to improve?</h3><p className="mt-1 text-xs leading-5 text-[#786f68]">Choose a project category first. It opens matching services and products/materials.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{label:'One room',id:'interior-painting'},{label:'Full home',id:'full-home-painting'},{label:'Damp wall',id:'waterproofing-damp'},{label:'Door or grill',id:'doors-grills'}].map(shortcut=>{const group=PAINT_SERVICE_GROUPS.find(item=>item.id===shortcut.id)!;return <button key={shortcut.id} type="button" onClick={()=>openPaintGroup(group)} className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-3 text-left text-xs font-black leading-4 text-[#5b3520] transition hover:border-orange-300 hover:bg-orange-50">{shortcut.label}<ArrowRight className="mt-2 block h-3.5 w-3.5 text-orange-800"/></button>;})}</div></section>
          {(['Painting & finishes','Repair & improvement'] as const).map(section=><section key={section}><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-800">{section==='Painting & finishes'?'Colour, coatings & finishes':'Fix the surface before finishing'}</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-[#241b15] sm:text-2xl">{section}</h3><p className="mt-1 text-xs leading-5 text-[#786f68]">{section==='Painting & finishes'?'Interior/exterior paint, room packages, designer walls, wood polish and metal finishes.':'Surface preparation, dampness, waterproofing, grouting and small renovation work.'}</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{PAINT_SERVICE_GROUPS.filter(group=>group.section===section&&`${group.name} ${group.description} ${group.tag}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openPaintGroup(group)} className="group min-w-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-orange-300 hover:shadow-md"><div className="relative h-36 overflow-hidden bg-orange-50 sm:h-40"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{group.tag}</span><span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-orange-800 shadow-sm"><ArrowRight className="h-4 w-4"/></span></div><div className="p-4"><h4 className="text-base font-black text-[#2b2119]">{group.name}</h4><p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#786f68]">{group.description}</p><div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#786f68]">{group.services.length} service options</span><span className="text-[10px] font-black text-orange-800">Services & products <ArrowRight className="ml-1 inline h-3 w-3"/></span></div></div></button>)}</div></section>)}
          <section className="grid gap-3 rounded-2xl border border-[#eee4d7] bg-[#fffaf3] p-4 sm:grid-cols-3">{[{title:'Prepare before painting',body:'Ask what masking, sanding, putty, primer and number of coats are included in the quote.'},{title:'Materials are itemised',body:'Paint, primer, putty, waterproofing products and tools have separate indicative ranges.'},{title:'Approve the scope',body:'Area, wall condition, finish tier and exclusions are recorded before the final estimate.'}].map(item=><div key={item.title} className="rounded-xl bg-white/80 p-3"><h4 className="text-sm font-black text-[#2b2119]">{item.title}</h4><p className="mt-1 text-xs leading-5 text-[#786f68]">{item.body}</p></div>)}</section>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'ac-technician' && <div className="space-y-7 rounded-3xl bg-white p-1 sm:p-3">
          <section>
            <div className="mb-4"><h3 className="text-xl font-semibold tracking-tight text-[#171717] sm:text-2xl">Large appliances</h3><p className="mt-1 text-xs text-[#737780]">Choose the appliance you need help with.</p></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4">
              {APPLIANCE_SELECTOR_GROUPS.filter(group=>group.section==='Large appliances'&&`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openApplianceGroup(group)} className="group min-w-0 text-center transition">
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#f5f5f5] ring-1 ring-black/[0.03] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/></div>
                <span className="mt-2 block text-sm font-medium leading-snug text-[#242424] sm:text-base">{group.name}</span>
              </button>)}
            </div>
          </section>
          <section>
            <div className="mb-4"><h3 className="text-xl font-semibold tracking-tight text-[#171717] sm:text-2xl">Other appliances</h3></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4">
              {APPLIANCE_SELECTOR_GROUPS.filter(group=>group.section==='Other appliances'&&`${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} type="button" onClick={()=>openApplianceGroup(group)} className="group min-w-0 text-center transition">
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#f5f5f5] ring-1 ring-black/[0.03] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(group.name,group.description);}}/></div>
                <span className="mt-2 block text-sm font-medium leading-snug text-[#242424] sm:text-base">{group.name}</span>
              </button>)}
            </div>
          </section>
          <p className="border-t border-[#eeeeee] pt-4 text-[11px] leading-5 text-[#737780]">Select an appliance to see only its available services, spare parts and indicative minimum-to-maximum prices. Final quote depends on model, diagnosis and parts required.</p>
        </div>}
        {level === 'subcategories' && selectedCategory?.id === 'electrician' && <div className="space-y-6">
          <section className="relative isolate min-h-[270px] overflow-hidden rounded-[28px] bg-[#17191d] text-white shadow-lg sm:min-h-[300px]">
            <img src={selectedCategory.imageUrl || serviceImage('electrician')} alt="Electrician carrying out a household electrical repair" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Electrician services', 'Home electrical repairs and installation'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#17191d] via-[#17191d]/90 to-[#17191d]/30"/>
            <div className="relative max-w-2xl p-5 sm:p-8 lg:p-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200"><Zap className="h-3.5 w-3.5"/> PUNCHX electrical care</span>
              <h3 className="mt-4 max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">Power problems? <span className="text-orange-400">Let’s fix them smartly.</span></h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">Choose the issue, compare clear starting prices and find the right electrical service for your home.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><Check className="h-3.5 w-3.5 text-orange-300"/> Task-based selection</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-orange-300"/> Safety-first service choices</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2"><MapPin className="h-3.5 w-3.5 text-orange-300"/> Local availability checks</span>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">Start with the problem</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What do you need fixed?</h3></div>
              <span className="text-xs font-semibold text-[#858a93]">{subcategories.length} service groups</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {ELECTRICIAN_QUICK_TASKS.map((task) => {
                const targetGroup = subcategories.find((group) => group.name.toLowerCase() === task.group.toLowerCase());
                return <button key={task.label} type="button" disabled={!targetGroup} onClick={() => targetGroup && openSubcategory(targetGroup)} className="group flex min-h-[104px] flex-col justify-between rounded-2xl border border-orange-100 bg-orange-50/70 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50">
                  <span className="text-sm font-black leading-5 text-[#252525]">{task.label}</span>
                  <span className="mt-3 flex items-center justify-between gap-1 text-[10px] font-bold text-orange-700"><span>{task.detail}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"/></span>
                </button>;
              })}
            </div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-600">Browse by category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">Electrical services for every room</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#737780]">Explore repair, installation and replacement options with relevant service photos.</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subcategories.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())).map((group) => {
                const visual = electricianGroupVisual(group.name);
                const startingPrice = group.services.length ? Math.min(...group.services.map((item) => item.price)) : 0;
                return <button key={group.id} type="button" onClick={() => openSubcategory(group)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:ring-orange-300 hover:shadow-md">
                  <div className="relative h-36 overflow-hidden bg-[#eee8df] sm:h-40">
                    <img src={visual.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(group.name, visual.description); }}/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"/>
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{visual.tag}</span>
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-orange-600 shadow-sm transition group-hover:bg-orange-500 group-hover:text-white"><ArrowRight className="h-4 w-4"/></span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2"><h4 className="text-base font-black text-[#17191d]">{group.name}</h4><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"/></div>
                    <p className="mt-1.5 min-h-[40px] text-xs leading-5 text-[#737780]">{visual.description}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3"><span className="text-[11px] font-bold text-[#737780]">{group.services.length} service options</span><span className="text-xs font-black text-orange-700">From ₹{startingPrice.toLocaleString('en-IN')}</span></div>
                  </div>
                </button>;
              })}
            </div>
          </section>
        </div>}
        {level === 'subcategories' && !['electrician', 'beautician', 'plumber', 'cleaner-housekeeper', 'ac-technician', 'cook', 'painter', 'pest-control-worker'].includes(selectedCategory?.id || '') && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{subcategories.filter(s=>s.name.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} onClick={()=>openSubcategory(group)} className="flex min-h-[130px] flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 hover:ring-[#7358d7]/30"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-6 w-6"/></div><div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-black">{group.name}</span><ChevronRight className="h-4 w-4 text-[#aaaeb6]"/></div><p className="mt-1 text-[10px] text-[#858a93]">{group.services.length} services</p></div></button>)}</div>}

        {level === 'services' && selectedCategory?.id === 'cook' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#392516] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-200">Cook & Home Assistance</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/75">Add cooking and kitchen-help tasks to one visit, then choose your booking and ingredient preferences.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#392516]':'text-white'}`}><CookingPot className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#392516]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Ingredients & products</button></div></div>
          {detailTab==='services' ? <div className="space-y-4">
            <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3"><h4 className="text-sm font-black text-[#2b2119]">Personalise your visit</h4><p className="mt-1 text-[11px] text-[#786f68]">These preferences are saved with your booking request for the professional to review.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="text-xs font-bold text-[#574536]">Cuisine preference<select value={cookCuisine} onChange={event=>setCookCuisine(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm outline-none focus:border-amber-600">{['Bengali','North Indian','South Indian','Punjabi','Gujarati','Chinese','Continental','Jain-style / No onion-no garlic','Flexible / mixed'].map(option=><option key={option}>{option}</option>)}</select></label></div>
                <div><label className="text-xs font-bold text-[#574536]">Meal preference<select value={cookDiet} onChange={event=>setCookDiet(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm outline-none focus:border-amber-600">{['No restriction','Vegetarian','Non-vegetarian','Vegan','Jain-style','Less-oil home-style'].map(option=><option key={option}>{option}</option>)}</select></label></div>
                <div><label className="text-xs font-bold text-[#574536]">People to serve<select value={cookServings} onChange={event=>setCookServings(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm outline-none focus:border-amber-600">{[1,2,3,4,5,6,8,10].map(count=><option key={count} value={count}>{count} {count===1?'person':'people'}</option>)}</select></label><p className="mt-1 text-[10px] text-[#786f68]">Large gatherings or complex menus need a confirmed quote.</p></div>
                <div><p className="text-xs font-bold text-[#574536]">Which meals?</p><div className="mt-1 flex flex-wrap gap-2">{[{id:'breakfast',label:'Breakfast'},{id:'lunch',label:'Lunch'},{id:'dinner',label:'Dinner'},{id:'snacks',label:'Snacks'}].map(slot=><button key={slot.id} type="button" onClick={()=>setCookMealSlots(current=>current.includes(slot.id)?current.filter(item=>item!==slot.id):[...current,slot.id])} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${cookMealSlots.includes(slot.id)?'border-amber-700 bg-amber-700 text-white':'border-[#e6d8c7] bg-white text-[#574536]'}`}>{slot.label}</button>)}</div></div>
              </div>
              <div className="mt-4 border-t border-[#f0e6db] pt-4"><p className="text-xs font-bold text-[#574536]">Ingredients</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>setCookIngredientMode('customer-provided')} className={`rounded-xl border p-3 text-left ${cookIngredientMode==='customer-provided'?'border-amber-700 bg-amber-50':'border-[#e6d8c7] bg-white'}`}><span className="block text-xs font-black text-[#392516]">I’ll provide ingredients</span><span className="mt-1 block text-[10px] leading-4 text-[#786f68]">Cook uses ingredients you already have at home.</span></button><button type="button" onClick={()=>setCookIngredientMode('ingredient-planning')} className={`rounded-xl border p-3 text-left ${cookIngredientMode==='ingredient-planning'?'border-amber-700 bg-amber-50':'border-[#e6d8c7] bg-white'}`}><span className="block text-xs font-black text-[#392516]">Help me plan ingredients</span><span className="mt-1 block text-[10px] leading-4 text-[#786f68]">Build a list and browse indicative product prices; purchase/delivery is separate.</span></button></div></div>
              <div className="mt-4 border-t border-[#f0e6db] pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-[#392516]">Booking preference</p><div className="flex flex-wrap rounded-xl bg-[#f7f0e7] p-1">{[{id:'instant',label:'Book now'},{id:'scheduled',label:'Schedule'},{id:'recurring',label:'Repeat'}].map(mode=><button key={mode.id} type="button" onClick={()=>setCookBookingMode(mode.id as 'instant'|'scheduled'|'recurring')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cookBookingMode===mode.id?'bg-white text-[#6f421f] shadow-sm':'text-[#786f68]'}`}>{mode.label}</button>)}</div></div>
                {cookBookingMode==='scheduled'&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#574536]">Preferred date<input type="date" value={cookDate} min={new Date().toISOString().slice(0,10)} onChange={event=>setCookDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm"/></label><label className="text-xs font-bold text-[#574536]">Preferred arrival time<input type="time" value={cookTime} onChange={event=>setCookTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm"/></label></div>}
                {cookBookingMode==='recurring'&&<div className="mt-3 rounded-xl bg-amber-50 p-3"><p className="text-xs font-black text-[#5b3c1e]">Preferred repeat schedule</p><div className="mt-2 flex flex-wrap gap-2">{[{id:'daily',label:'Daily'},{id:'weekly',label:'Weekly'},{id:'custom',label:'Custom days'}].map(option=><button key={option.id} type="button" onClick={()=>setCookCadence(option.id as 'daily'|'weekly'|'custom')} className={`rounded-lg border px-3 py-2 text-xs font-bold ${cookCadence===option.id?'border-amber-700 bg-white text-[#6f421f]':'border-[#e6d8c7] text-[#786f68]'}`}>{option.label}</button>)}</div><p className="mt-2 text-[10px] text-[#786f68]">This records your preference; repeat visits are confirmed according to local professional availability.</p></div>}
              </div>
            </section>
            <section className="rounded-2xl border border-[#eee4d7] bg-[#fffaf3] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-black text-[#2b2119]">Choose the pricing model</h4><p className="mt-1 text-[10px] text-[#786f68]">Hourly pricing uses duration; per-task estimates add the selected task ranges.</p></div><div className="flex rounded-xl bg-white p-1"><button type="button" onClick={()=>setCookPricingMode('hourly')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cookPricingMode==='hourly'?'bg-amber-700 text-white':'text-[#786f68]'}`}>Hourly help</button><button type="button" onClick={()=>setCookPricingMode('per-task')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cookPricingMode==='per-task'?'bg-amber-700 text-white':'text-[#786f68]'}`}>Per task</button></div></div>
              {cookPricingMode==='hourly'&&<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{[0.5,1,1.5,2,3,4].map(hours=><button key={hours} type="button" onClick={()=>setCookDuration(hours)} className={`rounded-xl border p-3 text-left transition ${cookDuration===hours?'border-amber-700 bg-white ring-1 ring-amber-700':'border-[#eadfD2] bg-white/70 hover:border-amber-400'}`}><span className="block text-sm font-black text-[#392516]">{hours<1?'30 minutes':hours===1?'1 hour':hours===1.5?'90 minutes':`${hours} hours`}</span><span className="mt-1 block text-[10px] leading-4 text-[#786f68]">{hours===0.5?'Quick prep':hours===1?'Short meal':hours===1.5?'Small meal plan':hours===2?'Popular duration':hours===3?'Multi-meal visit':'Extended meal plan'}</span></button>)}</div>}
            </section>
            <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-800">Select services</p><h4 className="mt-1 text-base font-black text-[#2b2119]">Add tasks to your visit</h4></div><span className="text-[10px] font-bold text-[#786f68]">{services.length} options</span></div>
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const picked=cookSelectedTasks.includes(service.id);const range=cookPriceRange(service.price,service.name);return <article key={service.id} className={`flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 transition sm:gap-4 sm:p-4 ${picked?'ring-2 ring-amber-700':'ring-black/5 hover:ring-amber-300'}`}><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-amber-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#2b2119]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-amber-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-[#6f421f]">₹{range.min.toLocaleString('en-IN')}–₹{range.max.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#786f68]">{service.description}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#786f68]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" onClick={()=>toggleCookTask(service.id)} className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${picked?'bg-amber-800 text-white':'border border-amber-200 bg-amber-50 text-[#6f421f] hover:bg-amber-100'}`}>{picked?<><Check className="mr-1 inline h-3.5 w-3.5"/> Added to visit</>:'＋ Add task'}</button></div><p className="mt-1 text-[10px] text-[#8b7e72]">{cookPricingMode==='hourly'?'Indicative reference range; the booked duration sets the estimate.':'Indicative task range; confirm menu, portions and final quote before work starts.'}</p></div></article>})}
            {services.length===0&&<div className="rounded-xl border border-dashed border-amber-200 bg-white p-6 text-center text-sm text-[#786f68]">No listed service options here yet.</div>}
            {selectedCookServices.length>0&&<section className="sticky bottom-2 z-10 rounded-2xl border border-amber-200 bg-white p-4 shadow-lg sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">Your plan · {selectedCookServices.length} task{selectedCookServices.length===1?'':'s'}</p><h4 className="mt-1 text-base font-black text-[#2b2119]">{selectedCookServices.map(task=>task.name).join(' · ')}</h4></div><button type="button" onClick={()=>setCookSelectedTasks([])} className="text-[10px] font-bold text-[#786f68] underline">Clear plan</button></div><p className="mt-2 text-xs font-black text-[#6f421f]">Estimated service range: ₹{selectedCookMinimum.toLocaleString('en-IN')} – ₹{selectedCookMaximum.toLocaleString('en-IN')}</p><p className="mt-1 text-[10px] leading-4 text-[#786f68]">{cookPricingMode==='hourly'?`Based on ${cookDuration<1?'30 minutes':cookDuration===1?'1 hour':cookDuration===1.5?'90 minutes':`${cookDuration} hours`}; task selection prioritises work within that slot rather than adding every service charge.`:'Sum of indicative task ranges; servings, complexity and extra time can change the final price.'}</p><p className="mt-1 text-[10px] leading-4 text-[#786f68]">Meal slots: {cookMealSlots.length?cookMealSlots.join(', '):'not selected'} · {cookCuisine} · {cookDiet} · {cookServings} serving{cookServings===1?'':'s'} · Ingredients: {cookIngredientMode==='customer-provided'?'customer-provided':'ingredient list requested'}</p><button type="button" disabled={(cookBookingMode==='scheduled'&&(!cookDate||!cookTime))||cookMealSlots.length===0} onClick={()=>{const taskSummary=selectedCookServices.map(task=>task.name).join(', ');const description=`Selected services: ${taskSummary}. Meal slots: ${cookMealSlots.join(', ')}. Cuisine: ${cookCuisine}. Dietary preference: ${cookDiet}. Servings: ${cookServings}. Ingredients: ${cookIngredientMode==='customer-provided'?'customer-provided':'ingredient planning requested'}. Booking: ${cookBookingMode}; repeat cadence: ${cookBookingMode==='recurring'?cookCadence:'not applicable'}; preferred slot: ${cookBookingMode==='scheduled'?`${cookDate} ${cookTime}`:'earliest available subject to coverage'}. Pricing: ${cookPricingMode}; estimated range ₹${selectedCookMinimum}–₹${selectedCookMaximum}. Confirm menu, scope, ingredient costs and final amount before work begins.`;try{localStorage.setItem('punchx_cook_booking_preferences',JSON.stringify({mode:cookBookingMode,cadence:cookBookingMode==='recurring'?cookCadence:null,pricingModel:cookPricingMode,durationHours:cookPricingMode==='hourly'?cookDuration:null,mealSlots:cookMealSlots,cuisine:cookCuisine,diet:cookDiet,servings:cookServings,ingredientMode:cookIngredientMode,preferredDate:cookBookingMode==='scheduled'?cookDate:null,preferredTime:cookBookingMode==='scheduled'?cookTime:null,selectedTasks:selectedCookServices.map(task=>({id:task.id,name:task.name,category:task.subcategory})),minPrice:selectedCookMinimum,maxPrice:selectedCookMaximum,createdAt:new Date().toISOString()}));}catch{};const booking={id:`cook-request-${Date.now()}`,name:`Cook & Home Assistance · ${selectedCookServices.length} selected task${selectedCookServices.length===1?'':'s'}`,categoryId:'cook',category:selectedCategory?.name||'Cook & Home Assistance',subcategory:selectedSubcategory?.name||'Home cooking',description,price:Math.round((selectedCookMinimum+selectedCookMaximum)/2),minPrice:selectedCookMinimum,maxPrice:selectedCookMaximum,priceIsIndicativeRange:true,duration:cookPricingMode==='hourly'?`${cookDuration} hour booking`:'Per-task estimate'} as PunchXLeafService & {minPrice:number;maxPrice:number;priceIsIndicativeRange:boolean};selectLeaf(booking);}} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 py-3.5 text-sm font-black text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight className="h-4 w-4"/> Continue to professional matching</button></section>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{COOK_PRODUCTS.filter(product=>(selectedSubcategory?.id?COOK_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-amber-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-[#6f421f]">Ingredient / kitchen product</span></div><h4 className="mt-3 text-sm font-black text-[#2b2119]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#786f68]">{product.specification}</p><p className="mt-3 text-xs font-black text-[#6f421f]">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#8b7e72]">/ {product.unit}</span></p><button type="button" onClick={()=>setCookProductAdded(cookProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-[#6f421f] hover:bg-amber-100"><ShoppingBasket className="h-3.5 w-3.5"/>{cookProductAdded===product.id?'Added to cart':cookProductAdded==='error'?'Try again':'Add to cart'}</button></article>)}
            {COOK_PRODUCTS.filter(product=>(selectedSubcategory?.id?COOK_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-amber-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#2b2119]">No ingredient or kitchen products listed for this category.</p><p className="mt-1 text-xs text-[#786f68]">The cook can confirm required ingredients and quantities before the visit.</p></div>}
          </div>}
          {cookProductAdded&&cookProductAdded!=='error'&&<p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-[#6f421f]">Added to the PunchX catalogue cart. Final ingredient prices and availability must be confirmed before purchase.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'pest-control-worker' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#17291f] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-200">Pest Control · treatment options</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/75">Select a treatment or browse prevention products for this pest category.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#17291f]':'text-white'}`}><ShieldCheck className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#17291f]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products & prevention</button></div></div>
          {detailTab==='services' ? <div className="space-y-4">
            <section className="rounded-2xl border border-lime-100 bg-white p-4 shadow-sm sm:p-5"><div className="mb-3"><h4 className="text-sm font-black text-[#203024]">Tell us about the property</h4><p className="mt-1 text-[11px] leading-4 text-[#707b72]">These details help match the right treatment and make the estimate more relevant.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-[#344436]">Premise type<select value={pestPropertyType} onChange={event=>{setPestPropertyType(event.target.value as 'residential'|'commercial');if(event.target.value==='commercial')setPestPropertySize('Commercial');else if(pestPropertySize==='Commercial')setPestPropertySize('2 BHK');}} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600"><option value="residential">Home / apartment</option><option value="commercial">Office / shop / commercial</option></select></label>
                <label className="text-xs font-bold text-[#344436]">Property size<select value={pestPropertySize} onChange={event=>setPestPropertySize(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600">{(pestPropertyType==='residential'?['1 RK','1 BHK','2 BHK','3 BHK','4 BHK+','Villa / house']:['Small shop / office','Commercial','Restaurant / kitchen','Warehouse / large site']).map(option=><option key={option}>{option}</option>)}</select></label>
                <label className="text-xs font-bold text-[#344436]">Approximate area (sq ft)<input type="number" min="100" max="500000" value={pestAreaSqFt} onChange={event=>setPestAreaSqFt(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600" placeholder="e.g. 900"/></label>
                <label className="text-xs font-bold text-[#344436]">Infestation level<select value={pestSeverity} onChange={event=>setPestSeverity(event.target.value as 'light'|'moderate'|'heavy')} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600"><option value="light">Light — occasional signs</option><option value="moderate">Moderate — repeated sightings</option><option value="heavy">Heavy — widespread activity</option></select></label>
                <label className="text-xs font-bold text-[#344436]">Treatment plan<select value={pestFrequency} onChange={event=>setPestFrequency(event.target.value as 'one-time'|'follow-up'|'annual-plan')} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600"><option value="one-time">One-time visit</option><option value="follow-up">Treatment + follow-up</option><option value="annual-plan">Recurring / annual plan</option></select></label>
                <label className="text-xs font-bold text-[#344436]">Describe what you noticed<input value={pestNotes} onChange={event=>setPestNotes(event.target.value)} placeholder="e.g. cockroaches near kitchen drain" className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-lime-600"/></label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8f0e4] pt-4"><p className="text-xs font-black text-[#203024]">Preferred visit</p><div className="flex rounded-xl bg-[#f0f6ec] p-1"><button type="button" onClick={()=>setPestVisitMode('earliest')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${pestVisitMode==='earliest'?'bg-white text-[#39572d] shadow-sm':'text-[#707b72]'}`}>Earliest available</button><button type="button" onClick={()=>setPestVisitMode('scheduled')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${pestVisitMode==='scheduled'?'bg-white text-[#39572d] shadow-sm':'text-[#707b72]'}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/> Schedule</button></div></div>
              {pestVisitMode==='scheduled'&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#344436]">Preferred date<input type="date" value={pestPreferredDate} min={new Date().toISOString().slice(0,10)} onChange={event=>setPestPreferredDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm"/></label><label className="text-xs font-bold text-[#344436]">Preferred time<input type="time" value={pestPreferredTime} onChange={event=>setPestPreferredTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce7d8] bg-white px-3 py-3 text-sm"/></label></div>}
              <p className="mt-3 rounded-xl bg-lime-50 px-3 py-2 text-[10px] leading-4 text-[#40533c]">Safety note: exact preparation, food/utensil handling, children and pet precautions, ventilation and re-entry timing must follow the assigned professional’s written instructions and the treatment product label.</p>
            </section>
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>Published prices are estimates, not a guaranteed quote. The provider should confirm the pest, rooms/area, treatment method, number of visits, follow-up eligibility and total before treatment starts.</span></div>
            <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-800">Available treatments</p><h4 className="mt-1 text-base font-black text-[#203024]">Compare treatment options</h4></div><span className="text-[10px] font-bold text-[#707b72]">{services.length} options</span></div>
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const range=pestServiceRange(service.name,service.subcategory);return <article key={service.id} className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-lime-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-lime-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#203024]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-lime-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-lime-50 px-2 py-1 text-xs font-black text-[#39572d]">₹{range?.min.toLocaleString('en-IN')}–₹{range?.max.toLocaleString('en-IN')} <span className="text-[9px] font-semibold">{range?.unit==='job'?'':'/ '+range?.unit}</span></span></div><p className="mt-2 text-xs leading-5 text-[#707b72]">{service.description}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#707b72]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" disabled={(pestVisitMode==='scheduled'&&(!pestPreferredDate||!pestPreferredTime))||!pestAreaSqFt||Number(pestAreaSqFt)<100} onClick={()=>{try{localStorage.setItem('punchx_pest_request_details',JSON.stringify({propertyType:pestPropertyType,propertySize:pestPropertySize,areaSqFt:Number(pestAreaSqFt),severity:pestSeverity,frequency:pestFrequency,visitMode:pestVisitMode,preferredDate:pestVisitMode==='scheduled'?pestPreferredDate:null,preferredTime:pestVisitMode==='scheduled'?pestPreferredTime:null,notes:pestNotes.trim()||null,service:service.name,category:service.subcategory,minPrice:range?.min,maxPrice:range?.max,priceUnit:range?.unit,createdAt:new Date().toISOString()}));}catch{};selectLeaf(service);}} className="inline-flex items-center gap-1 rounded-xl bg-[#2e4e2c] px-3 py-2.5 text-[11px] font-black text-white transition hover:bg-[#213b20] disabled:cursor-not-allowed disabled:opacity-40">Request booking <ArrowRight className="h-3.5 w-3.5"/></button></div><p className="mt-1 text-[10px] text-[#707b72]">{range?.unit&&range.unit!=='job'?'Unit estimate; area and scope determine final pricing.':'Indicative range based on the stated package; final cost depends on actual infestation and scope.'}</p></div></article>})}
            {services.length===0&&<div className="rounded-xl border border-dashed border-lime-200 bg-white p-6 text-center text-sm text-[#707b72]">No treatment options listed yet. Request an inspection to confirm the right service.</div>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{PEST_PRODUCTS.filter(product=>(selectedSubcategory?.id?PEST_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-lime-300 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-lime-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-lime-900">Prevention product</span></div><h4 className="mt-3 text-sm font-black text-[#203024]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#707b72]">{product.specification}</p><p className="mt-3 text-xs font-black text-[#39572d]">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#707b72]">/ {product.unit}</span></p><button type="button" onClick={()=>setPestProductAdded(pestProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2 text-[10px] font-black text-lime-900 hover:bg-lime-100"><ShoppingBasket className="h-3.5 w-3.5"/>{pestProductAdded===product.id?'Added to cart':pestProductAdded==='error'?'Try again':'Add to cart'}</button></article>)}
            {PEST_PRODUCTS.filter(product=>(selectedSubcategory?.id?PEST_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-lime-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#203024]">No prevention products listed for this category.</p><p className="mt-1 text-xs text-[#707b72]">A professional can confirm appropriate materials during inspection.</p></div>}
          </div>}
          {pestProductAdded&&pestProductAdded!=='error'&&<p className="rounded-xl bg-lime-50 px-3 py-2 text-xs font-bold text-[#39572d]">Added to the PunchX catalogue cart. Follow product-label directions and keep items away from children and pets where specified.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'painter' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#33251e] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-200">Painting project</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/75">Compare the labour/service range and materials separately before confirming the project scope.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#33251e]':'text-white'}`}><Paintbrush className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#33251e]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products & materials</button></div></div>
          {detailTab==='services' ? <div className="space-y-4">
            <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-start gap-2"><Ruler className="mt-0.5 h-4 w-4 text-orange-800"/><div><h4 className="text-sm font-black text-[#2b2119]">Tell us about the project</h4><p className="mt-1 text-[11px] leading-4 text-[#786f68]">These details help the professional prepare a more accurate estimate.</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-[#574536]">Project size<select value={paintProjectSize} onChange={event=>setPaintProjectSize(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-orange-500">{[{id:'single-wall',label:'One wall / small patch'},{id:'one-room',label:'One room'},{id:'two-three-rooms',label:'2–3 rooms'},{id:'1bhk',label:'1 BHK home'},{id:'2bhk',label:'2 BHK home'},{id:'3bhk-plus',label:'3 BHK or larger'},{id:'exterior',label:'Exterior / terrace'}].map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#574536]">Surface condition<select value={paintSurfaceCondition} onChange={event=>setPaintSurfaceCondition(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-orange-500">{[{id:'good',label:'Good — repaint only'},{id:'minor-prep',label:'Minor prep / sanding'},{id:'cracks-peeling',label:'Cracks / peeling paint'},{id:'dampness',label:'Dampness / seepage'},{id:'major-repair',label:'Major repair — inspect first'}].map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#574536]">Finish preference<select value={paintFinishTier} onChange={event=>setPaintFinishTier(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-orange-500">{[{id:'economy',label:'Economy'},{id:'standard',label:'Standard washable'},{id:'premium',label:'Premium finish'},{id:'designer',label:'Texture / designer finish'}].map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#574536]">Approximate paint area (sq ft)<input type="number" min="1" max="100000" value={paintWallArea} onChange={event=>setPaintWallArea(event.target.value)} placeholder="e.g. 300" className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-orange-500"/></label>
                <label className="text-xs font-bold text-[#574536]">Materials preference<select value={paintMaterialMode} onChange={event=>setPaintMaterialMode(event.target.value as 'professional-supply'|'customer-supply')} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm font-normal outline-none focus:border-orange-500"><option value="professional-supply">Ask professional to supply</option><option value="customer-supply">I’ll provide paint/materials</option></select></label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0e6db] pt-4"><p className="text-xs font-black text-[#392516]">When do you need the work?</p><div className="flex rounded-xl bg-[#f7f0e7] p-1"><button type="button" onClick={()=>setPaintBookingMode('earliest')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${paintBookingMode==='earliest'?'bg-white text-[#6f421f] shadow-sm':'text-[#786f68]'}`}>Earliest available</button><button type="button" onClick={()=>setPaintBookingMode('scheduled')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${paintBookingMode==='scheduled'?'bg-white text-[#6f421f] shadow-sm':'text-[#786f68]'}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/> Schedule site visit</button></div></div>
              {paintBookingMode==='scheduled'&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#574536]">Preferred date<input type="date" value={paintDate} min={new Date().toISOString().slice(0,10)} onChange={event=>setPaintDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm"/></label><label className="text-xs font-bold text-[#574536]">Preferred time<input type="time" value={paintTime} onChange={event=>setPaintTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6d8c7] bg-white px-3 py-3 text-sm"/></label></div>}
              <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-[10px] leading-4 text-[#765338]">Final quote depends on measured area, number of coats, surface preparation, chosen paint brand, access and materials. Dampness or active leakage must be diagnosed before repainting.</p>
            </section>
            <section className="grid gap-3 rounded-2xl border border-[#eee4d7] bg-[#fffaf3] p-4 sm:grid-cols-3">{[{title:'Surface preparation',body:'Ask whether scraping, sanding, putty and crack repair are included.'},{title:'Painting system',body:'Confirm primer, number of coats, brand/finish and expected coverage.'},{title:'Handover',body:'Agree protection/masking, cleanup, exclusions and finish inspection before approving the quote.'}].map(item=><div key={item.title} className="rounded-xl bg-white/80 p-3"><h4 className="text-sm font-black text-[#2b2119]">{item.title}</h4><p className="mt-1 text-xs leading-5 text-[#786f68]">{item.body}</p></div>)}</section>
            <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-800">Available services</p><h4 className="mt-1 text-base font-black text-[#2b2119]">Choose a job</h4></div><span className="text-[10px] font-bold text-[#786f68]">{services.length} options</span></div>
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const range=paintServiceRange(service.name,service.subcategory);return <article key={service.id} className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-orange-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-orange-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#2b2119]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-orange-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-[#6f421f]">₹{range?.min.toLocaleString('en-IN')}–₹{range?.max.toLocaleString('en-IN')} <span className="text-[9px] font-semibold">{range?.unit==='job'?'':'/ '+range?.unit}</span></span></div><p className="mt-2 text-xs leading-5 text-[#786f68]">{service.description}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#786f68]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" disabled={paintBookingMode==='scheduled'&&(!paintDate||!paintTime)} onClick={()=>{try{localStorage.setItem('punchx_painting_request_details',JSON.stringify({projectSize:paintProjectSize,approximateWallAreaSqFt:paintWallArea?Number(paintWallArea):null,surfaceCondition:paintSurfaceCondition,finishTier:paintFinishTier,materialMode:paintMaterialMode,bookingMode:paintBookingMode,preferredDate:paintBookingMode==='scheduled'?paintDate:null,preferredTime:paintBookingMode==='scheduled'?paintTime:null,selectedService:service.name,category:service.subcategory,minPrice:range?.min,maxPrice:range?.max,priceUnit:range?.unit,createdAt:new Date().toISOString()}));}catch{};selectLeaf(service);}} className="inline-flex items-center gap-1 rounded-xl bg-[#6f421f] px-3 py-2.5 text-[11px] font-black text-white transition hover:bg-[#533016] disabled:cursor-not-allowed disabled:opacity-40">Request quote <ArrowRight className="h-3.5 w-3.5"/></button></div><p className="mt-1 text-[10px] text-[#8b7e72]">{range?.unit && range.unit!=='job'?'Unit estimate; final cost uses the measured area.':'Indicative project range, subject to site inspection and confirmed scope.'}</p></div></article>})}
            {services.length===0&&<div className="rounded-xl border border-dashed border-orange-200 bg-white p-6 text-center text-sm text-[#786f68]">No service options listed yet.</div>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{PAINT_PRODUCTS.filter(product=>(selectedSubcategory?.id?PAINT_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-orange-300 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-orange-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-[#6f421f]">Paint / repair material</span></div><h4 className="mt-3 text-sm font-black text-[#2b2119]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#786f68]">{product.specification}</p><p className="mt-3 text-xs font-black text-[#6f421f]">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#8b7e72]">/ {product.unit}</span></p><button type="button" onClick={()=>setPaintProductAdded(paintProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-black text-[#6f421f] hover:bg-orange-100"><ShoppingBasket className="h-3.5 w-3.5"/>{paintProductAdded===product.id?'Added to cart':paintProductAdded==='error'?'Try again':'Add to cart'}</button></article>)}
            {PAINT_PRODUCTS.filter(product=>(selectedSubcategory?.id?PAINT_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#2b2119]">No products listed for this category.</p><p className="mt-1 text-xs text-[#786f68]">A professional can confirm the right materials and quantities during the site visit.</p></div>}
          </div>}
          {paintProductAdded&&paintProductAdded!=='error'&&<p className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-[#6f421f]">Added to the PunchX catalogue cart. Confirm brand, coverage, quantity and final product pricing before purchase.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'ac-technician' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#10223b] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-200">Appliance category selected</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">See service price ranges or check spare-part and material estimates.</p></div>
            <div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#10223b]':'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#10223b]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Parts & materials</button></div>
          </div>
          {detailTab==='services' ? <div className="space-y-3">
            <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <div className="mb-3"><h4 className="text-sm font-black text-[#142235]">Appliance details (optional)</h4><p className="mt-1 text-[11px] leading-4 text-[#748094]">Adding brand, model and symptoms can help the professional prepare. Do not open the appliance or handle electrical components yourself.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#43546a]">Brand / model<input value={applianceBrandModel} onChange={event=>setApplianceBrandModel(event.target.value)} placeholder="e.g. brand and model number" className="mt-1 w-full rounded-xl border border-[#dce5ef] px-3 py-3 text-sm font-normal outline-none focus:border-sky-500"/></label><label className="text-xs font-bold text-[#43546a]">Issue / symptoms<input value={applianceIssueNotes} onChange={event=>setApplianceIssueNotes(event.target.value)} placeholder="e.g. not cooling, error code, leak" className="mt-1 w-full rounded-xl border border-[#dce5ef] px-3 py-3 text-sm font-normal outline-none focus:border-sky-500"/></label></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setApplianceBookingMode('earliest')} className={`rounded-xl border px-3 py-2 text-xs font-black ${applianceBookingMode==='earliest'?'border-sky-700 bg-sky-700 text-white':'border-[#dce5ef] bg-white text-[#43546a]'}`}>Earliest available</button><button type="button" onClick={()=>setApplianceBookingMode('scheduled')} className={`rounded-xl border px-3 py-2 text-xs font-black ${applianceBookingMode==='scheduled'?'border-sky-700 bg-sky-700 text-white':'border-[#dce5ef] bg-white text-[#43546a]'}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/> Schedule a visit</button></div>
              {applianceBookingMode==='scheduled' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#43546a]">Preferred date<input type="date" value={appliancePreferredDate} min={new Date().toLocaleDateString('en-CA')} onChange={event=>setAppliancePreferredDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce5ef] px-3 py-3 text-sm"/></label><label className="text-xs font-bold text-[#43546a]">Preferred time<input type="time" value={appliancePreferredTime} onChange={event=>setAppliancePreferredTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dce5ef] px-3 py-3 text-sm"/></label></div>}
            </section>
            {selectedSubcategory && <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>Service prices are indicative labour/visit ranges. Parts, refrigerant, extra piping, difficult access or additional work may be separate. The professional must confirm the total and receive approval before proceeding.</span></div>}
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const range=applianceServiceRange(service.price,service.name);return <article key={service.id} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-sky-300 sm:gap-4 sm:p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sky-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#142235]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-sky-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-sky-50 px-2 py-1 text-xs font-black text-sky-900">₹{range.min.toLocaleString('en-IN')}–₹{range.max.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#748094]">{service.description}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#748094]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" disabled={applianceBookingMode==='scheduled'&&(!appliancePreferredDate||!appliancePreferredTime)} onClick={()=>{try{localStorage.setItem('punchx_appliance_request_details',JSON.stringify({applianceCategory:selectedSubcategory?.name||'AC & Appliance Repair',brandModel:applianceBrandModel.trim()||null,issueNotes:applianceIssueNotes.trim()||null,bookingMode:applianceBookingMode,preferredDate:applianceBookingMode==='scheduled'?appliancePreferredDate:null,preferredTime:applianceBookingMode==='scheduled'?appliancePreferredTime:null,service:service.name,minPrice:range.min,maxPrice:range.max,createdAt:new Date().toISOString()}));}catch{};selectLeaf(service);}} className="inline-flex items-center gap-1 rounded-xl bg-[#10223b] px-3 py-2.5 text-[11px] font-black text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-40">Select service <ArrowRight className="h-3.5 w-3.5"/></button></div></div>
            </article>})}
            {services.length===0&&<div className="rounded-2xl border border-dashed border-sky-200 bg-white p-8 text-center text-sm text-[#748094]">No service listed for this category yet. Ask for an inspection quote.</div>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {APPLIANCE_PRODUCTS.filter(product=>(selectedSubcategory?.id?applianceProductGroupIds(selectedSubcategory.id).some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-sky-300 sm:p-4">
              <div className="relative h-24 overflow-hidden rounded-xl bg-sky-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-sky-900">Part / material</span></div>
              <h4 className="mt-3 text-sm font-black text-[#142235]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#748094]">{product.specification}</p>
              <p className="mt-3 text-xs font-black text-sky-900">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#8490a2]">/ {product.unit}</span></p>
              {product.quoteRequired&&<p className="mt-2 text-[10px] font-bold text-amber-800">Exact model, stock and written quote required.</p>}
              <button type="button" onClick={()=>setApplianceAddedProduct(applianceProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black text-sky-900 hover:bg-sky-100"><ShoppingBasket className="h-3.5 w-3.5"/>{applianceAddedProduct===product.id?'Added to cart':applianceAddedProduct==='error'?'Try again':'Add to cart'}</button>
            </article>)}
            {APPLIANCE_PRODUCTS.filter(product=>(selectedSubcategory?.id?applianceProductGroupIds(selectedSubcategory.id).some(groupId=>product.groups.includes(groupId)):true)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-sky-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#142235]">No spare-part range is listed for this category yet.</p><p className="mt-1 text-xs text-[#748094]">Book an inspection and confirm model compatibility and a written parts quote before authorising replacement.</p></div>}
          </div>}
          {applianceAddedProduct&&applianceAddedProduct!=='error'&&<p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900">Added to the PunchX catalogue cart. Confirm model compatibility and final price before purchase.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'cleaner-housekeeper' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#16372c] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-200">Home Cleaning · flexible booking</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">Add several chores to one visit, then choose hourly or task-based pricing.</p></div>
            <div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0">
              <button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#16372c]':'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button>
              <button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#16372c]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button>
            </div>
          </div>
          {detailTab==='services' ? <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><div><p className="text-xs font-black text-[#244b37]">How should this visit be priced?</p><p className="mt-1 text-[10px] text-[#65756a]">Hourly bundles cover your selected duration; per-task pricing adds the listed task ranges.</p></div><div className="flex rounded-xl bg-white p-1"><button type="button" onClick={()=>setCleaningPricingMode('hourly')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cleaningPricingMode==='hourly'?'bg-emerald-700 text-white':'text-[#65756a]'}`}>Hourly help</button><button type="button" onClick={()=>setCleaningPricingMode('per-task')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${cleaningPricingMode==='per-task'?'bg-emerald-700 text-white':'text-[#65756a]'}`}>Per-task</button></div></div>
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const picked=selectedCleaningTasks.includes(service.id);const range=cleanPriceRange(service.price,service.name);return <article key={service.id} className={`group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition sm:gap-4 sm:p-4 ${picked?'ring-2 ring-emerald-600':'ring-black/5 hover:ring-emerald-300'}`}>
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div>
              <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#18221d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-emerald-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-900">₹{range.min.toLocaleString('en-IN')}–₹{range.max.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#747c76]">{service.description}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#858a8e]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" onClick={()=>toggleCleaningTask(service.id)} className={`rounded-xl px-3 py-2 text-[11px] font-black transition ${picked?'bg-emerald-700 text-white':'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'}`}>{picked?<><Check className="mr-1 inline h-3.5 w-3.5"/> Added to visit</>:'＋ Add chore'}</button></div><p className="mt-1 text-[10px] text-[#858a8e]">{cleaningPricingMode==='hourly'?'Reference range only — selected chores are priorities for your booked time.':'Indicative task price; final amount is confirmed before work starts.'}</p></div>
            </article>})}
            {services.length===0 && <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-[#747c76]">No services listed for this cleaning category yet.</div>}
            {selectedCleaningServices.length>0 && <section className="sticky bottom-2 z-10 rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">Your cleaning list · {selectedCleaningServices.length} chore{selectedCleaningServices.length===1?'':'s'}</p><h4 className="mt-1 text-base font-black text-[#18221d]">{selectedCleaningServices.map(task=>task.name).join(' · ')}</h4></div><button type="button" onClick={()=>setSelectedCleaningTasks([])} className="text-[10px] font-bold text-[#747c76] underline">Clear list</button></div>
              <p className="mt-2 text-xs font-black text-emerald-900">Estimated range: ₹{selectedCleaningMinimum.toLocaleString('en-IN')} – ₹{selectedCleaningMaximum.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-[10px] leading-4 text-[#747c76]">{cleaningPricingMode==='hourly'?`Based on ${durationLabel(cleaningDuration)} of help; chore prices are not added separately in hourly mode.`:'Sum of indicative task ranges; scope, materials and home size can change the final quote.'}</p>
              <button type="button" onClick={()=>{const tasks=selectedCleaningServices;const description=`Requested chores: ${tasks.map(task=>task.name).join(', ')}. Booking preference: ${cleaningMode}; ${cleaningMode==='recurring'?cleaningCadence:cleaningMode==='scheduled'?`${cleaningDate||'date to be confirmed'} ${cleaningTime||''}`:'earliest available slot'}. Pricing model: ${cleaningPricingMode}. Indicative range ₹${selectedCleaningMinimum}–₹${selectedCleaningMaximum}; confirm availability, scope and final amount before work begins.`;try{localStorage.setItem('punchx_cleaning_booking_preferences',JSON.stringify({mode:cleaningMode,cadence:cleaningMode==='recurring'?cleaningCadence:null,pricingModel:cleaningPricingMode,durationHours:cleaningPricingMode==='hourly'?cleaningDuration:null,preferredDate:cleaningMode==='scheduled'?cleaningDate:null,preferredTime:cleaningMode==='scheduled'?cleaningTime:null,selectedTasks:tasks.map(task=>({id:task.id,name:task.name,subcategory:task.subcategory})),minPrice:selectedCleaningMinimum,maxPrice:selectedCleaningMaximum,category:'Home Cleaning',createdAt:new Date().toISOString()}));}catch{};selectLeaf({id:`cleaning-bundle-${Date.now()}`,name:`Home Cleaning · ${tasks.length} selected chore${tasks.length===1?'':'s'}`,categoryId:'cleaner-housekeeper',category:selectedCategory?.name||'Home Cleaning',subcategory:selectedSubcategory?.name||'Home Cleaning',description,price:Math.round((selectedCleaningMinimum+selectedCleaningMaximum)/2),duration:cleaningPricingMode==='hourly'?durationLabel(cleaningDuration):'Per-task estimate'});}} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800"><ArrowRight className="h-4 w-4"/> Continue to professional matching</button>
            </section>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{CLEANING_PRODUCTS.filter(product=>(selectedSubcategory?.id ? CLEANING_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.includes(product.groups[0]) || product.groups.some(g=>CLEANING_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory?.id)?.products.includes(g)) : true)&&(!query||(product.name+' '+product.specification).toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-emerald-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-emerald-900">Cleaning supply</span></div><h4 className="mt-3 text-sm font-black text-[#18221d]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#747c76]">{product.specification}</p><p className="mt-3 text-xs font-black text-emerald-900">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#858a8e]">/ {product.unit}</span></p><button type="button" onClick={()=>setCleaningProductAdded(cleanProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-900 hover:bg-emerald-100"><ShoppingBasket className="h-3.5 w-3.5"/>{cleaningProductAdded===product.id?'Added to cart':cleaningProductAdded==='error'?'Try again':'Add to cart'}</button></article>)}
            {CLEANING_PRODUCTS.filter(product=>(selectedSubcategory?.id ? CLEANING_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory.id)?.products.includes(product.groups[0]) || product.groups.some(g=>CLEANING_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory?.id)?.products.includes(g)) : true)&&(!query||(product.name+' '+product.specification).toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-emerald-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#18221d]">No cleaning supplies match this category yet.</p><p className="mt-1 text-xs text-[#747c76]">Choose another category or confirm specific materials with your professional.</p></div>}
          </div>}
          {cleaningProductAdded && cleaningProductAdded!=='error' && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Added to your PunchX catalogue cart. Quantities and estimated totals can be reviewed in the price catalogue.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'plumber' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#102a36] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">Plumbing category selected</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">Browse service options or matching parts and materials.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#102a36]':'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#102a36]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button></div></div>
          {detailTab==='services' ? <div className="space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-cyan-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cyan-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-cyan-800">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-900">₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-800">Choose service <ArrowRight className="h-3 w-3"/></span></div></button>)}{services.length===0&&<div className="rounded-2xl border border-dashed border-cyan-200 bg-white p-8 text-center text-sm text-[#737780]">No services have been added to this category yet.</div>}</div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(getProductsForCategory(serviceCategories.find(category=>category.id==='plumber')!).filter(product=>plumbingProductMatches(selectedSubcategory?.id||'',`${product.name} ${product.specification}`)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase())))).map(product=><article key={product.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="flex h-24 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800"><Package className="h-8 w-8"/></div><h4 className="mt-3 text-sm font-black text-[#17191d]">{product.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{product.specification}</p><p className="mt-3 text-xs font-black text-cyan-900">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#858a93]">/ {product.unit}</span></p><p className="mt-1 text-[10px] text-[#858a93]">Indicative product price</p></article>)}
          </div>}
        </div>}
        
        {level === 'services' && selectedCategory?.id === 'beautician' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#281927] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-200">{beautyGender==='female'?'Women’s salon & spa':'Men’s salon & massage'}</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/75">Compare service estimates or browse products for this category.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={()=>setDetailTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='services'?'bg-white text-[#281927]':'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={()=>setDetailTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${detailTab==='products'?'bg-white text-[#281927]':'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button></div></div>
          {detailTab==='services' ? <div className="space-y-4">
            <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-black text-[#302532]">Appointment preference</h4><p className="mt-1 text-[11px] leading-4 text-[#756a78]">Book the earliest available slot or choose a preferred date and time.</p></div><div className="flex rounded-xl bg-rose-50 p-1"><button type="button" onClick={()=>setBeautyBookingMode('earliest')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${beautyBookingMode==='earliest'?'bg-white text-rose-800 shadow-sm':'text-[#756a78]'}`}>Earliest available</button><button type="button" onClick={()=>setBeautyBookingMode('scheduled')} className={`rounded-lg px-3 py-2 text-[11px] font-black ${beautyBookingMode==='scheduled'?'bg-white text-rose-800 shadow-sm':'text-[#756a78]'}`}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/> Schedule</button></div></div>
              {beautyBookingMode==='scheduled'&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#4a3d4b]">Preferred date<input type="date" min={new Date().toISOString().slice(0,10)} value={beautyPreferredDate} onChange={event=>setBeautyPreferredDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7dce7] bg-white px-3 py-3 text-sm"/></label><label className="text-xs font-bold text-[#4a3d4b]">Preferred time<input type="time" value={beautyPreferredTime} onChange={event=>setBeautyPreferredTime(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7dce7] bg-white px-3 py-3 text-sm"/></label></div>}
            </section>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5 text-[11px] leading-5 text-[#5b455e]">Service prices show an indicative minimum–maximum range. Product upgrades, hair length, selected treatment, occasion styling and add-ons may affect the final quote.</div>
            <div className="flex items-end justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-700">Available services</p><h4 className="mt-1 text-base font-black text-[#302532]">Choose a service</h4></div><span className="text-[10px] font-bold text-[#756a78]">{services.length} options</span></div>
            {services.filter(service=>`${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())).map(service=>{const range=beautyServiceRange(service.name,service.subcategory);return <article key={service.id} className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-rose-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-rose-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(service.name,service.description);}}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#302532]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-rose-700">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-xs font-black text-rose-800">₹{range?.min.toLocaleString('en-IN')}–₹{range?.max.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#756a78]">{service.description}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8a7f8c]"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><button type="button" disabled={beautyBookingMode==='scheduled'&&(!beautyPreferredDate||!beautyPreferredTime)} onClick={()=>selectLeaf(service)} className="inline-flex items-center gap-1 rounded-xl bg-[#7b315f] px-3 py-2.5 text-[11px] font-black text-white transition hover:bg-[#61264a] disabled:cursor-not-allowed disabled:opacity-40">Choose service <ArrowRight className="h-3.5 w-3.5"/></button></div><p className="mt-1 text-[10px] text-[#8a7f8c]">Indicative service estimate; confirm exact inclusions and final price before the appointment.</p></div></article>})}
            {services.length===0&&<div className="rounded-xl border border-dashed border-rose-200 bg-white p-6 text-center text-sm text-[#756a78]">No services listed for this category yet.</div>}
          </div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BEAUTY_PRODUCTS.filter(product=>(BEAUTY_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory?.id)?.productGroups.some(groupId=>product.groups.includes(groupId))||false)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-rose-300 sm:p-4"><div className="relative h-24 overflow-hidden rounded-xl bg-rose-50"><img src={serviceImage(product.name)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={(event)=>{event.currentTarget.onerror=null;event.currentTarget.src=serviceImageFallback(product.name,product.specification);}}/><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-rose-800">Beauty product</span></div><h4 className="mt-3 text-sm font-black text-[#302532]">{product.name}</h4><p className="mt-1 flex-1 text-[11px] leading-4 text-[#756a78]">{product.specification}</p><p className="mt-3 text-xs font-black text-rose-800">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#8a7f8c]">/ {product.unit}</span></p><button type="button" onClick={()=>setBeautyProductAdded(beautyProductCartAdd(product)?product.id:'error')} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-800 hover:bg-rose-100"><ShoppingBasket className="h-3.5 w-3.5"/>{beautyProductAdded===product.id?'Added to cart':beautyProductAdded==='error'?'Try again':'Add to cart'}</button></article>)}
            {BEAUTY_PRODUCTS.filter(product=>(BEAUTY_SERVICE_GROUPS.find(group=>group.id===selectedSubcategory?.id)?.productGroups.some(groupId=>product.groups.includes(groupId))||false)&&(!query||`${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).length===0&&<div className="col-span-full rounded-2xl border border-dashed border-rose-200 bg-white p-6 text-center"><p className="text-sm font-bold text-[#302532]">No products listed for this category.</p><p className="mt-1 text-xs text-[#756a78]">The professional can confirm the suitable product and price before the appointment.</p></div>}
          </div>}
          {beautyProductAdded&&beautyProductAdded!=='error'&&<p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">Added to the PunchX catalogue cart. Confirm brand, quantity and final price before purchase.</p>}
        </div>}
        {level === 'services' && selectedCategory?.id === 'electrician' && <div className="mx-auto max-w-4xl space-y-3">
          <div className="rounded-2xl bg-[#17191d] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-300">Selected electrical category</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/65">Choose the exact job to view its starting price and continue.</p></div>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold sm:mt-0"><ShieldCheck className="h-4 w-4 text-orange-300"/> Safety-first task selection</span>
          </div>
          {services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-orange-300 sm:gap-4 sm:p-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f6f0e8] sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(service.name, service.description); }}/></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-orange-700">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">From ₹{service.price.toLocaleString('en-IN')}</span></div>
              <p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span className="inline-flex items-center gap-1 text-orange-700">Choose this service <ArrowRight className="h-3 w-3"/></span></div>
            </div>
          </button>)}
        </div>}
        {level === 'services' && !['electrician', 'beautician', 'plumber', 'cleaner-housekeeper', 'ac-technician', 'cook', 'painter', 'pest-control-worker'].includes(selectedCategory?.id || '') && <div className="mx-auto max-w-3xl space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="flex w-full gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-[#7358d7]/30"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-7 w-7"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black">{service.name}</h3><p className="mt-1 text-[10px] font-bold text-[#7358d7]">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-[#f3f0ff] px-2 py-1 text-xs font-black text-[#7358d7]">Starts ₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span>View details</span><span className="text-[#7358d7]">Add</span></div></div></button>)}</div>}
      </div>
      {citizenAddress && <div className="border-t border-black/5 bg-white px-4 py-3 text-xs sm:px-6"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-[#7358d7]"/><span className="font-black">Residential address:</span><span className="truncate text-[#6f747d]">{citizenAddress}</span></div></div>}
    </div>
  </div>;
}
