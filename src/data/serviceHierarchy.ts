import { PUNCHX_50_CATEGORIES, ServiceCategoryItem } from './categories';

export interface PunchXLeafService {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  duration: string;
}

export interface PunchXSubcategory {
  id: string;
  name: string;
  services: PunchXLeafService[];
}

export interface PunchXServiceBranch {
  categoryId: string;
  name: string;
  shortDesc: string;
  basePrice: number;
  subcategories: PunchXSubcategory[];
}

type LeafSeed = [string, number?, string?, string?];

const specific: Record<string, Array<[string, LeafSeed[]]>> = {
  electrician: [
    ['Switch & socket', [['Switch/socket repair & replacement', 69], ['Switchboard repair & replacement', 99], ['Plug replacement', 69], ['New switchbox installation', 149], ['Smart switch installation', 150]]],
    ['Fan', [['Fan installation', 139], ['Fan replacement', 259, '60 mins'], ['Fan uninstallation', 129], ['Fan repair', 199], ['Fan regulator repair/replacement', 99], ['Smart/BLDC fan installation', 159]]],
    ['Light', [['Bulb installation/replacement', 49], ['Ceiling light installation', 89], ['Hanging light installation', 199], ['Fancy light installation/replacement', 149], ['Tubelight repair & installation', 99], ['Chandelier installation', 499]]],
    ['Wiring & power', [['Minor wiring repair', 149], ['Socket/wire fault diagnosis', 199], ['New point wiring', 249], ['Short-circuit diagnosis', 199], ['MCB/fuse replacement', 149]]],
    ['Doorbell & security', [['Doorbell installation', 149], ['Doorbell repair', 99], ['Video doorbell installation', 299], ['Sensor/light installation', 199]]],
    ['Appliances', [['Geyser electrical connection', 199], ['Exhaust fan installation', 149], ['Kitchen appliance connection', 149], ['Inverter wiring check', 249]]]
  ],
  plumber: [
    ['Tap & mixer', [['Tap repair', 129], ['Tap installation/replacement', 129], ['Tap accessory installation', 49], ['Mixer tap repair', 199], ['Water mixer installation', 449]]],
    ['Toilet', [['Toilet repair', 699], ['Flush tank repair', 199], ['Jet spray repair/replacement', 199], ['Toilet seat cover installation', 149], ['Toilet replacement', 1699], ['Pot blockage', 1299]]],
    ['Bath & shower', [['Shower repair', 149], ['Shower installation', 149], ['Health faucet installation', 99], ['Bathroom accessory installation', 99]]],
    ['Basin & sink', [['Basin repair', 199], ['Basin installation', 249], ['Sink blockage', 249], ['Sink installation', 299], ['Waste pipe replacement', 149]]],
    ['Drainage & blockage', [['Kitchen sink blockage', 249], ['Bathroom drain blockage', 299], ['Floor trap blockage', 299], ['Pipeline leakage repair', 309]]],
    ['Water tank & motor', [['Water tank repair', 169], ['Overhead tank installation', 599], ['Tank cleaning', 799], ['Water pump repair', 399], ['Water meter installation', 399]]]
  ],
  carpenter: [
    ['Wooden door', [['Door repair', 99], ['Wooden door installation', 699], ['Door lock replace/install', 129], ['Door hinge installation', 299], ['Door accessory installation', 119], ['Peephole installation', 119]]],
    ['Cupboard & drawer', [['Cupboard repair & installation', 89], ['Drawer repair & installation', 89], ['Cupboard lock repair', 79], ['Hinge replacement', 79], ['Drawer channel replacement', 149]]],
    ['Shelf & cabinet', [['Wall shelf installation', 149], ['Cabinet repair', 199], ['Cabinet hinge replacement', 99], ['Shelf dismantling', 149]]],
    ['Furniture repair', [['Table repair', 149], ['Chair repair', 99], ['Bed repair', 199], ['Sofa frame repair', 299], ['Furniture polishing', 399]]],
    ['Furniture assembly', [['Bed assembly', 299], ['Table assembly', 199], ['Wardrobe assembly', 399], ['IKEA furniture assembly', 299]]]
  ],
  'ac-technician': [
    ['AC service', [['Foam & power jet service', 649, '60 mins'], ['AC basic cleaning', 399], ['AC filter cleaning', 199], ['AC deep cleaning', 799]]],
    ['Repair & diagnosis', [['AC repair diagnosis', 299], ['Water leakage repair', 599], ['Noise/vibration repair', 399], ['Cooling issue diagnosis', 299]]],
    ['Gas & refrigerant', [['Gas check-up', 299], ['Gas refill', 3000, '150 mins'], ['Gas leak inspection', 499], ['Leak repair & refill', 3499]]],
    ['Installation / uninstallation', [['AC installation', 1599], ['AC uninstallation', 699], ['Outdoor unit reinstallation', 799], ['Drain pipe installation', 100]]]
  ],
  'cleaner-housekeeper': [
    ['Home cleaning', [['Full home deep cleaning', 999, '180 mins'], ['Regular home cleaning', 499, '120 mins'], ['Move-in cleaning', 1499, '240 mins'], ['Move-out cleaning', 1499, '240 mins']]],
    ['Kitchen', [['Kitchen deep cleaning', 499, '90 mins'], ['Chimney cleaning', 399, '60 mins'], ['Cabinet cleaning', 299, '60 mins'], ['Kitchen appliance cleaning', 299]]],
    ['Bathroom', [['Bathroom deep cleaning', 299], ['Tile cleaning', 399], ['Toilet deep cleaning', 249], ['Grout cleaning', 399]]],
    ['Housekeeping', [['Hourly housekeeper', 299, '120 mins'], ['Dusting & mopping', 249], ['Fan & window dusting', 249], ['Post-event cleaning', 599]]]
  ],
  'pest-control-worker': [
    ['Cockroach & ant', [['Cockroach control', 399], ['Ant control', 399], ['Kitchen pest treatment', 449]]],
    ['Termite', [['Termite inspection', 299], ['Termite treatment', 1499], ['Wood termite treatment', 999]]],
    ['Bedbug & mosquito', [['Bedbug treatment', 999], ['Mosquito control', 499], ['Mosquito fogging', 699]]],
    ['Rodent', [['Rat control', 499], ['Mouse control', 499], ['Rodent inspection', 299]]]
  ],
  'barber': [
    ['Haircut', [['Basic haircut', 149], ['Premium haircut', 249], ['Kids haircut', 129], ['Hair styling', 199]]],
    ['Beard', [['Beard trim', 99], ['Beard styling', 149], ['Clean shave', 129], ['Beard grooming', 199]]],
    ['Grooming', [['Haircut + beard', 249], ['Head massage', 149], ['Hair wash', 99], ['Face cleanup', 199]]]
  ],
  beautician: [
    ['Facial & skin', [['Basic facial', 399], ['Cleanup', 299], ['De-tan', 349], ['Skin consultation', 199]]],
    ['Waxing', [['Full arms waxing', 249], ['Full legs waxing', 399], ['Underarm waxing', 149], ['Full body waxing', 999]]],
    ['Threading', [['Eyebrow threading', 79], ['Upper lip threading', 49], ['Full face threading', 199]]],
    ['Nails & hands', [['Manicure', 299], ['Pedicure', 399], ['Nail cleanup', 199]]]
  ],
  painter: [
    ['Interior painting', [['Single room painting', 1499], ['Wall repainting', 999], ['Touch-up painting', 499], ['Ceiling painting', 799]]],
    ['Exterior painting', [['Exterior wall painting', 1999], ['Gate painting', 599], ['Balcony painting', 799]]],
    ['Waterproofing & repair', [['Wall dampness inspection', 299], ['Waterproofing treatment', 999], ['Crack filling', 399]]]
  ]
};

const genericGroups = [
  ['Repair & troubleshooting', ['Repair', 'Diagnosis', 'Minor repair', 'Major repair']],
  ['Installation & setup', ['Installation', 'New installation', 'Setup & configuration', 'Replacement & installation']],
  ['Maintenance & replacement', ['Maintenance service', 'Cleaning & maintenance', 'Part replacement', 'Inspection service']],
  ['Consultation', ['At-home consultation', 'Inspection & quotation', 'Emergency visit']]
] as const;

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function genericHierarchy(category: ServiceCategoryItem): Array<[string, LeafSeed[]]> {
  return genericGroups.map(([group, actions]) => [
    group,
    actions.map((action, actionIndex) => [
      `${category.name} ${action}`,
      Math.max(49, category.basePrice + (actionIndex * 50) + (genericGroups.indexOf(genericGroups.find(item => item[0] === group)!) * 25)),
      actionIndex === 1 ? '60 mins' : '30 mins',
      `At-home ${category.name.toLowerCase()} ${action.toLowerCase()} service by a verified PUNCHX professional.`
    ])
  ]);
}

function makeLeaf(category: ServiceCategoryItem, subcategory: string, seed: LeafSeed, index: number): PunchXLeafService {
  const [name, price, duration, description] = seed;
  return {
    id: `${category.id}-${slug(subcategory)}-${slug(name)}-${index}`,
    name,
    categoryId: category.id,
    category: category.name,
    subcategory,
    description: description || `Professional ${name.toLowerCase()} service at your residential address.`,
    price: price ?? category.basePrice,
    duration: duration || '30 mins'
  };
}

export function getPunchXServiceBranch(category: ServiceCategoryItem): PunchXServiceBranch {
  const groups = specific[category.id] || genericHierarchy(category);
  return {
    categoryId: category.id,
    name: category.name,
    shortDesc: category.shortDesc,
    basePrice: category.basePrice,
    subcategories: groups.map(([name, seeds]) => ({
      id: `${category.id}-${slug(name)}`,
      name,
      services: seeds.map((seed, index) => makeLeaf(category, name, seed, index))
    }))
  };
}

export const PUNCHX_SERVICE_BRANCHES: PunchXServiceBranch[] = PUNCHX_50_CATEGORIES.map(getPunchXServiceBranch);
export const PUNCHX_LEAF_SERVICES: PunchXLeafService[] = PUNCHX_SERVICE_BRANCHES.flatMap(branch => branch.subcategories.flatMap(group => group.services));

export function findPunchXLeafService(id: string) {
  return PUNCHX_LEAF_SERVICES.find(service => service.id === id);
}

export function findPunchXCategory(nameOrId: string) {
  const value = nameOrId.toLowerCase();
  return PUNCHX_50_CATEGORIES.find(item => item.id.toLowerCase() === value || item.name.toLowerCase() === value);
}
