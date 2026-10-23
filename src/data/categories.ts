export interface ServiceCategoryItem {
  id: string;
  name: string;
  shortDesc: string;
  iconName: string;
  basePrice: number;
  imageUrl: string;
  keywords: string[];
}

const PUNCHX_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: 'electrician',
    name: 'Electrician Services',
    shortDesc: 'Switches, fans, lighting, wiring faults, MCBs and household electrical repairs.',
    iconName: 'Zap',
    basePrice: 199,
    imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=85',
    keywords: ['electrician','electric','electrical','wire','wiring','switch','socket','light','mcb','fuse','power','fan','bulb','inverter']
  },
  {
    id: 'plumber',
    name: 'Plumbing Services',
    shortDesc: 'Tap and pipe leaks, drainage, toilets, sinks, bathroom fittings and water connections.',
    iconName: 'Droplet',
    basePrice: 199,
    imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=85',
    keywords: ['plumber','plumbing','pipe','leak','leakage','tap','drain','drainage','flush','sink','toilet','bathroom','water','motor','shower']
  },
  {
    id: 'cleaner-housekeeper',
    name: 'Home Cleaning',
    shortDesc: 'Regular and deep cleaning, bathrooms, kitchens, sofas and move-in/out cleaning.',
    iconName: 'Sparkles',
    basePrice: 299,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
    keywords: ['clean','cleaner','cleaning','housekeeping','maid','deep clean','bathroom clean','kitchen clean','sofa','upholstery','mattress','carpet','disinfection','sanitisation','sanitization','housekeeper']
  },
  {
    id: 'ac-technician',
    name: 'AC & Appliance Repair',
    shortDesc: 'AC servicing, refrigerator, washing machine, geyser and water-purifier repairs.',
    iconName: 'Wind',
    basePrice: 299,
    imageUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=85',
    keywords: ['ac','ac repair','ac technician','air conditioner','hvac','refrigerator','fridge','washing machine','washer','appliance','geyser','water purifier','ro','tv repair','electronics','microwave','chimney','cooling','repair technician']
  },
  {
    id: 'pest-control-worker',
    name: 'Pest Control',
    shortDesc: 'Treatment for cockroaches, ants, mosquitoes, rodents, bedbugs and termites.',
    iconName: 'Bug',
    basePrice: 399,
    imageUrl: 'https://willixai.com/assets/pest-control-3PLWX0ZE.jpg',
    keywords: ['pest','pest control','termite','cockroach','ant','bedbug','bed bug','mosquito','rat','rodent','fumigation','infestation']
  },
  {
    id: 'beautician',
    name: 'Beauty & Salon at Home',
    shortDesc: 'Facials, waxing, threading, manicure, pedicure, hair spa and grooming.',
    iconName: 'Scissors',
    basePrice: 299,
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85',
    keywords: ['beauty','beautician','barber','hair stylist','hairstylist','haircut','shave','beard','grooming','facial','waxing','threading','pedicure','manicure','skin','salon','makeup','hairstyling','hair spa','spa']
  },
  {
    id: 'carpenter',
    name: 'Carpenter & Handyman',
    shortDesc: 'Furniture and door repairs, shelves, cabinet fittings, locks and minor household fixes.',
    iconName: 'Hammer',
    basePrice: 249,
    imageUrl: 'https://images.unsplash.com/photo-1601058268499-e52658b5b3e5?auto=format&fit=crop&w=1200&q=85',
    keywords: ['carpenter','carpentry','handyman','wood','furniture','door','table','chair','cabinet','hinge','bed','shelf','locksmith','lock','window','glass','welder','welding','metal','fabrication','drilling','assembly']
  },
  {
    id: 'painter',
    name: 'Painting & Home Improvement',
    shortDesc: 'Interior painting, wall touch-ups, waterproofing, tiles, plaster and small renovations.',
    iconName: 'Paintbrush',
    basePrice: 299,
    imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=85',
    keywords: ['paint','painter','painting','wall','room','house painting','interior painting','exterior painting','renovation','home improvement','waterproofing','seepage','mason','masonry','tile','marble','plaster','ceiling','putty','whitewash']
  },
  {
    id: 'cook',
    name: 'Cook & Home Assistance',
    shortDesc: 'Meal preparation, daily cooking and scheduled help with routine household tasks.',
    iconName: 'Utensils',
    basePrice: 299,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
    keywords: ['cook','chef','home assistance','household help','domestic help','meal','meal prep','dinner','lunch','breakfast','roti','curry','kitchen','maid','dishwashing','sweeping','mopping','catering','tiffin']
  },
  {
    id: 'home-care',
    name: 'Home Care & Daily Assistance',
    shortDesc: 'Elderly companionship, daily-living support, mobility assistance and scheduled caregivers at home.',
    iconName: 'Heart',
    basePrice: 399,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85',
    keywords: ['home care','elderly care','senior support','mobility support','caregiver','daily assistance','nursing','home nurse','companion','daily living']
  },
  {
    id: 'physiotherapy',
    name: 'Physiotherapy at Home',
    shortDesc: 'At-home assessment, rehabilitation, mobility exercises and recovery sessions with qualified physiotherapists.',
    iconName: 'Heart',
    basePrice: 499,
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85',
    keywords: ['physiotherapy','physiotherapist','physio','rehabilitation','post surgery','exercise therapy','pain and movement','recovery session']
  },
  {
    id: 'catering',
    name: 'Catering Services',
    shortDesc: 'Home parties, family gatherings, office meals and event catering with menu and guest-count options.',
    iconName: 'Utensils',
    basePrice: 999,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
    keywords: ['catering','caterer','event catering','party food','bulk meals','office catering','buffet','food service','event menu']
  }
];

/** Canonical list: PunchX currently offers exactly these ten main service categories. */
export const PUNCHX_10_CATEGORIES = PUNCHX_CATEGORIES;

/** Legacy export kept so existing components continue to work while the catalogue is migrated. */
export const PUNCHX_50_CATEGORIES = PUNCHX_CATEGORIES;
export const SEARCH_CATEGORY_LIST = PUNCHX_CATEGORIES;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Filter the ten canonical categories by name, description, ID or matching search terms. */
export function filterCategories(query: string): ServiceCategoryItem[] {
  const cleanQuery = normalize(query || '');
  if (!cleanQuery) return PUNCHX_CATEGORIES;
  return PUNCHX_CATEGORIES.filter((category) =>
    normalize(`${category.name} ${category.shortDesc} ${category.id} ${category.keywords.join(' ')}`).includes(cleanQuery)
    || category.keywords.some((keyword) => normalize(keyword).includes(cleanQuery))
  );
}

/** Match a professional's saved trade/skill to one of the ten canonical categories. */
export function isCategoryMatching(
  workerSkills: string[] | string | undefined,
  targetCategory: string
): boolean {
  if (!targetCategory || ['all', 'all specialties'].includes(targetCategory.toLowerCase().trim())) return true;
  if (!workerSkills) return false;

  const target = normalize(targetCategory);
  const category = PUNCHX_CATEGORIES.find((item) =>
    normalize(item.id) === target || normalize(item.name) === target
  );
  const skills = Array.isArray(workerSkills)
    ? workerSkills
    : workerSkills.split(/[,&/|]/).map((skill) => skill.trim());

  return skills.some((rawSkill) => {
    const skill = normalize(rawSkill);
    if (!skill) return false;
    if (skill === target || skill.includes(target) || target.includes(skill)) return true;
    if (category && category.keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return normalizedKeyword.length > 1 && (skill.includes(normalizedKeyword) || normalizedKeyword.includes(skill));
    })) return true;
    return false;
  });
}

/** Map legacy worker skill labels into the current ten categories for editable profiles. */
export function normalizeCategorySelection(values: string[] | string | undefined): string[] {
  if (!values) return [];
  const skills = Array.isArray(values) ? values : [values];
  return PUNCHX_CATEGORIES
    .filter((category) => skills.some((skill) => isCategoryMatching(skill, category.name)))
    .map((category) => category.name);
}
