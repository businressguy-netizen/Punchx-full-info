import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Search, X, MapPin, Home, Clock3, ShieldCheck, Wrench, Zap, Sparkles, Package, Droplet, CalendarDays, ShoppingBasket } from 'lucide-react';
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

const BEAUTICIAN_SERVICE_GROUPS = [
  { id: 'facial', name: 'Facial & Skin Care', description: 'Clean-up, facial and skin treatments', image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85' },
  { id: 'waxing', name: 'Waxing', description: 'Face, arms, legs and underarms', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85' },
  { id: 'threading', name: 'Threading', description: 'Eyebrows, upper lip and full face', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hands-feet', name: 'Manicure & Pedicure', description: 'Nail care, hand and foot spa', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hair-care', name: 'Hair Spa & Treatments', description: 'Hair spa, conditioning and care', image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=1000&q=85' },
  { id: 'hair-styling', name: 'Hair Studio & Styling', description: 'Blow-dry, straightening and styling', image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1000&q=85' },
  { id: 'makeup-saree', name: 'Makeup & Saree Styling', description: 'Makeup, draping and occasion looks', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85' },
];
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


  const categories = useMemo(() => PUNCHX_50_CATEGORIES.filter(item => `${item.name} ${item.shortDesc} ${item.keywords.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const subcategories = selectedBranch?.subcategories || [];
  const services = selectedSubcategory?.services || [];
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


  const reset = () => { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); setSelectedSubcategory(null); setQuery(''); setSelectedCleaningTasks([]); setCleaningProductAdded(null); };
  const close = () => { reset(); onClose(); };
  const openCategory = (category: ServiceCategoryItem) => {
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
  const selectLeaf = (service: PunchXLeafService) => {
    localStorage.setItem('punchx_selected_leaf_service', JSON.stringify(service));
    localStorage.setItem('punchx_selected_service_path', JSON.stringify({ category: service.category, subcategory: service.subcategory, service: service.name }));
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
          {level !== 'categories' && <button onClick={() => { if (level === 'services') { setSelectedSubcategory(null); setLevel('subcategories'); } else { setLevel('categories'); setSelectedCategory(null); setSelectedBranch(null); } }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f8]"><ArrowLeft className="h-5 w-5"/></button>}
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
          <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-[#2a1724] text-white shadow-lg sm:min-h-[285px]">
            <img src={selectedCategory.imageUrl || serviceImage('Beauty & Salon at Home')} alt="At-home beauty and salon care" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback('Beauty & Salon at Home', 'At-home beauty and personal care'); }}/>
            <div className="absolute inset-0 bg-gradient-to-r from-[#26131f] via-[#26131f]/85 to-[#26131f]/20"/>
            <div className="relative max-w-2xl p-5 sm:p-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-200"><Sparkles className="h-3.5 w-3.5"/> PUNCHX beauty at home</span><h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Your beauty routine, <span className="text-rose-300">your space.</span></h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Choose a beauty category first, then explore services and related products with clear price ranges.</p><div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">At-home convenience</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Services + products</span><span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Transparent price ranges</span></div></div>
          </section>
          <section><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-600">Choose your beauty category</p><h3 className="mt-1 text-lg font-black text-[#17191d] sm:text-xl">What would you like to book?</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BEAUTICIAN_SERVICE_GROUPS.filter(group => `${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())).map(group => <button key={group.id} type="button" onClick={() => { const matches = services.filter(service => { const t = `${service.name} ${service.subcategory}`.toLowerCase(); return group.id === 'facial' ? /facial|cleanup|de-tan|skin polishing/.test(t) : group.id === 'waxing' ? /wax/.test(t) : group.id === 'threading' ? /thread/.test(t) : group.id === 'hands-feet' ? /manicure|pedicure|nail|hand\/foot spa/.test(t) : group.id === 'hair-care' ? /hair spa|conditioning|keratin|scalp treatment/.test(t) : group.id === 'hair-styling' ? /haircut|blow dry|straightening|curl styling|hairstyle|hair color|highlights/.test(t) : /makeup|saree|draping|bridal|styling/.test(t); }); setSelectedSubcategory({ id: group.id, name: group.name, services: matches.length ? matches : services }); setLevel('services'); setQuery(''); }} className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-rose-300 hover:shadow-md"><div className="relative h-28 overflow-hidden bg-rose-50 sm:h-36"><img src={group.image} alt={group.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(group.name, group.description); }}/><div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"/></div><div className="p-3 sm:p-4"><h4 className="text-sm font-black text-[#17191d]">{group.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{group.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-rose-700">Explore options <ArrowRight className="h-3 w-3"/></span></div></button>)}
            </div>
          </section>
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
        {level === 'subcategories' && !['electrician', 'beautician', 'plumber', 'cleaner-housekeeper'].includes(selectedCategory?.id || '') && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{subcategories.filter(s=>s.name.toLowerCase().includes(query.toLowerCase())).map(group=><button key={group.id} onClick={()=>openSubcategory(group)} className="flex min-h-[130px] flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 hover:ring-[#7358d7]/30"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-6 w-6"/></div><div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-black">{group.name}</span><ChevronRight className="h-4 w-4 text-[#aaaeb6]"/></div><p className="mt-1 text-[10px] text-[#858a93]">{group.services.length} services</p></div></button>)}</div>}

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
        {level === 'services' && selectedCategory?.id === 'beautician' && <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl bg-[#2a1724] p-4 text-white sm:flex sm:items-center sm:justify-between sm:gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-200">Beauty category selected</p><h3 className="mt-1 text-lg font-black">{selectedSubcategory?.name}</h3><p className="mt-1 text-xs text-white/70">Compare service prices or browse products used for this category.</p></div><div className="mt-3 flex rounded-xl bg-white/10 p-1 sm:mt-0"><button type="button" onClick={() => setBeauticianTab('services')} className={`rounded-lg px-4 py-2 text-xs font-black ${beauticianTab === 'services' ? 'bg-white text-[#2a1724]' : 'text-white'}`}><Wrench className="mr-1 inline h-3.5 w-3.5"/> Services</button><button type="button" onClick={() => setBeauticianTab('products')} className={`rounded-lg px-4 py-2 text-xs font-black ${beauticianTab === 'products' ? 'bg-white text-[#2a1724]' : 'text-white'}`}><Package className="mr-1 inline h-3.5 w-3.5"/> Products</button></div></div>
          {beauticianTab === 'services' ? <div className="space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="group flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-rose-300 sm:gap-4 sm:p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-rose-50 sm:h-28 sm:w-32"><img src={serviceImage(service.name)} alt={service.name} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = serviceImageFallback(service.name, service.description); }}/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-black text-[#17191d]">{service.name}</h4><p className="mt-1 text-[10px] font-bold text-rose-700">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">Choose service <ArrowRight className="h-3 w-3"/></span></div></button>)}</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(getProductsForCategory(serviceCategories.find(category => category.id === 'beautician')!).filter(product => !query || `${product.name} ${product.specification}`.toLowerCase().includes(query.toLowerCase()))).map(product=><article key={product.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4"><div className="flex h-24 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Package className="h-8 w-8"/></div><h4 className="mt-3 text-sm font-black text-[#17191d]">{product.name}</h4><p className="mt-1 text-[11px] leading-4 text-[#737780]">{product.specification}</p><p className="mt-3 text-xs font-black text-rose-700">₹{product.minPrice.toLocaleString('en-IN')} – ₹{product.maxPrice.toLocaleString('en-IN')} <span className="font-semibold text-[#858a93]">/ {product.unit}</span></p><p className="mt-1 text-[10px] text-[#858a93]">Indicative product price</p></article>)}</div>}
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
        {level === 'services' && !['electrician', 'beautician', 'plumber'].includes(selectedCategory?.id || '') && <div className="mx-auto max-w-3xl space-y-3">{services.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())).map(service=><button key={service.id} onClick={()=>selectLeaf(service)} className="flex w-full gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 transition hover:ring-[#7358d7]/30"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f1effa] text-[#7358d7]"><Wrench className="h-7 w-7"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black">{service.name}</h3><p className="mt-1 text-[10px] font-bold text-[#7358d7]">{service.subcategory}</p></div><span className="shrink-0 rounded-lg bg-[#f3f0ff] px-2 py-1 text-xs font-black text-[#7358d7]">Starts ₹{service.price.toLocaleString('en-IN')}</span></div><p className="mt-2 text-xs leading-5 text-[#777c85]">{service.description}</p><div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-[#858a93]"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{service.duration}</span><span>View details</span><span className="text-[#7358d7]">Add</span></div></div></button>)}</div>}
      </div>
      {citizenAddress && <div className="border-t border-black/5 bg-white px-4 py-3 text-xs sm:px-6"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-[#7358d7]"/><span className="font-black">Residential address:</span><span className="truncate text-[#6f747d]">{citizenAddress}</span></div></div>}
    </div>
  </div>;
}
