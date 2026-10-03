import { ServiceCategoryItem } from './categories';
import { PunchXLeafService, PunchXServiceBranch, PunchXSubcategory, getPunchXServiceBranch } from './serviceHierarchy';

type ServiceSeed = [string, number?, string?, string?];

type Profile = {
  match: (category: ServiceCategoryItem) => boolean;
  groups: Array<[string, string[]]>;
};

const profiles: Profile[] = [
  {
    match: c => /electric|solar|cctv|security|locksmith|electronics|mobile|computer|technician|appliance|refrigerator|washing/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Repair & diagnosis', ['Inspection & diagnosis', 'Minor repair', 'Major repair', 'Emergency repair']],
      ['Installation & setup', ['New installation', 'Replacement & installation', 'Setup & configuration', 'Uninstallation']],
      ['Parts & replacement', ['Part replacement', 'Accessory installation', 'Consumable replacement', 'Upgrade service']],
      ['Maintenance & cleaning', ['Routine maintenance', 'Deep cleaning', 'Performance check', 'Safety inspection']]
    ]
  },
  {
    match: c => /plumb|water|drain|bathroom|pipe/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Leaks & blockage', ['Leak detection & repair', 'Drain blockage removal', 'Pipe blockage removal', 'Emergency water repair']],
      ['Bathroom & fittings', ['Tap & mixer service', 'Toilet & flush service', 'Shower & faucet service', 'Basin & sink service']],
      ['Pipes & water systems', ['Pipe installation', 'Pipe replacement', 'Water tank service', 'Pump & motor service']],
      ['Installation & maintenance', ['New fixture installation', 'Water system maintenance', 'Inspection & quotation', 'Preventive maintenance']]
    ]
  },
  {
    match: c => /carpent|furniture|wood|door|shelf|cabinet/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Doors, locks & hardware', ['Door repair', 'Door installation', 'Hinge replacement', 'Lock & handle installation']],
      ['Furniture repair', ['Table & chair repair', 'Bed repair', 'Sofa repair', 'Furniture polishing']],
      ['Cabinets & storage', ['Cupboard repair', 'Drawer repair', 'Shelf installation', 'Cabinet assembly']],
      ['Assembly & installation', ['Furniture assembly', 'Wall-mounted installation', 'Dismantling service', 'Custom fitting']]
    ]
  },
  {
    match: c => /paint|mason|welder|tile|construction|brick|cement|plaster/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Surface & wall work', ['Wall repair', 'Plaster repair', 'Crack filling', 'Surface preparation']],
      ['Painting & finishing', ['Interior painting', 'Exterior painting', 'Touch-up painting', 'Texture & decorative finish']],
      ['Floor, tile & masonry', ['Tile fixing', 'Grouting repair', 'Brick & cement work', 'Floor repair']],
      ['Metal & fabrication', ['Gate repair', 'Grill repair', 'Welding & joining', 'Custom metal fabrication']]
    ]
  },
  {
    match: c => /barber|hair|beaut|salon|makeup/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Hair & styling', ['Haircut', 'Hair styling', 'Hair wash & blow-dry', 'Hair spa']],
      ['Beard & grooming', ['Beard trim', 'Beard styling', 'Clean shave', 'Grooming package']],
      ['Skin & beauty', ['Facial', 'Cleanup', 'De-tan', 'Skin care service']],
      ['Hands, feet & waxing', ['Manicure', 'Pedicure', 'Waxing', 'Threading']]
    ]
  },
  {
    match: c => /tailor|cloth|stitch|dress|fabric/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Alteration & fitting', ['Trouser alteration', 'Shirt alteration', 'Dress fitting', 'Size adjustment']],
      ['Stitching', ['Blouse stitching', 'Dress stitching', 'Suit stitching', 'Custom stitching']],
      ['Repair & finishing', ['Zip replacement', 'Button replacement', 'Tear repair', 'Hem & finishing']],
      ['Pickup & measurement', ['Home measurement', 'Pickup & delivery', 'Fabric consultation', 'Fitting consultation']]
    ]
  },
  {
    match: c => /bike|car mechanic|mechanic|vehicle|driver|delivery|packer|mover/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Breakdown & diagnosis', ['Vehicle inspection', 'Breakdown diagnosis', 'Emergency roadside assistance', 'Starting/jumpstart']],
      ['Service & maintenance', ['Routine service', 'Oil & filter service', 'Brake inspection', 'Battery check']],
      ['Repair & replacement', ['Tyre & puncture service', 'Battery replacement', 'Brake repair', 'Part replacement']],
      ['Transport & assistance', ['Pickup/drop service', 'Local delivery', 'Loading & unloading', 'Relocation assistance']]
    ]
  },
  {
    match: c => /clean|housekeep|pest|garden|laundry|ironing|cobbler|shoe/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Home & routine service', ['Regular service', 'Deep service', 'Move-in/move-out service', 'One-time service']],
      ['Room & specialty service', ['Kitchen service', 'Bathroom service', 'Bedroom/living room service', 'Specialized treatment']],
      ['Care & maintenance', ['Maintenance visit', 'Inspection & quotation', 'Stain/spot treatment', 'Preventive treatment']],
      ['Pickup, delivery & add-ons', ['Pickup service', 'Delivery service', 'Material/add-on service', 'Recurring service']]
    ]
  },
  {
    match: c => /cook|baker|cater|tiffin|food|chef/.test(`${c.id} ${c.name} ${c.keywords.join(' ')}`.toLowerCase()),
    groups: [
      ['Daily meals', ['Breakfast', 'Lunch', 'Dinner', 'Full-day meal plan']],
      ['Special occasions', ['Birthday/event menu', 'Party catering', 'Festival menu', 'Custom menu']],
      ['Home kitchen service', ['Home cook visit', 'Meal preparation', 'Kitchen assistance', 'Grocery-to-meal service']],
      ['Subscription & delivery', ['Daily tiffin', 'Weekly subscription', 'Monthly subscription', 'Doorstep delivery']]
    ]
  },
  {
    match: () => true,
    groups: [
      ['Repair & troubleshooting', ['Inspection & diagnosis', 'Minor repair', 'Major repair', 'Emergency service']],
      ['Installation & setup', ['Installation', 'New installation', 'Replacement & installation', 'Setup & configuration']],
      ['Maintenance & replacement', ['Routine maintenance', 'Cleaning & maintenance', 'Part replacement', 'Inspection service']],
      ['Home visit & consultation', ['At-home consultation', 'Inspection & quotation', 'Scheduled visit', 'Priority visit']]
    ]
  }
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function profileFor(category: ServiceCategoryItem) {
  return profiles.find(profile => profile.match(category)) || profiles[profiles.length - 1];
}

function makeSeed(category: ServiceCategoryItem, action: string, index: number): ServiceSeed {
  const premiumWords = /major|emergency|custom|deep|full-day|priority|relocation|specialized|fabrication/i;
  const price = Math.max(category.basePrice, category.basePrice + index * 40 + (premiumWords.test(action) ? 150 : 0));
  return [
    `${category.name} ${action}`,
    price,
    /deep|full-day|event|relocation|custom|major|specialized/i.test(action) ? '90 mins' : '45 mins',
    `Professional ${category.name.toLowerCase()} ${action.toLowerCase()} at your selected address, with clear pricing before confirmation.`
  ];
}

export function getUniversalPunchXServiceBranch(category: ServiceCategoryItem): PunchXServiceBranch {
  const existing = getPunchXServiceBranch(category);
  const hasSpecificContent = existing.subcategories.some(group => group.services.some(service => service.id.startsWith(`${category.id}-`)) && !serviceIsGeneric(category, service));
  if (hasSpecificContent) return existing;

  const profile = profileFor(category);
  const subcategories: PunchXSubcategory[] = profile.groups.map(([groupName, actions], groupIndex) => ({
    id: `${category.id}-${slug(groupName)}`,
    name: groupName,
    services: actions.map((action, actionIndex) => {
      const seed = makeSeed(category, action, groupIndex + actionIndex);
      const [name, price, duration, description] = seed;
      const leaf: PunchXLeafService = {
        id: `${category.id}-${slug(groupName)}-${slug(action)}`,
        name,
        categoryId: category.id,
        category: category.name,
        subcategory: groupName,
        description: description!,
        price: price!,
        duration: duration!
      };
      return leaf;
    })
  }));

  return {
    categoryId: category.id,
    name: category.name,
    shortDesc: category.shortDesc,
    basePrice: category.basePrice,
    subcategories
  };
}

function serviceIsGeneric(category: ServiceCategoryItem, service: PunchXLeafService) {
  return service.name === `${category.name} Repair` || service.name === `${category.name} Diagnosis` || service.name === `${category.name} Minor repair` || service.name === `${category.name} Major repair`;
}

export function getUniversalPunchXLeafServices(category: ServiceCategoryItem) {
  return getUniversalPunchXServiceBranch(category).subcategories.flatMap(group => group.services);
}
