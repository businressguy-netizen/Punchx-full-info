import { PUNCHX_50_CATEGORIES } from './categories';
import { SERVICE_WORKS_1 } from './serviceCatalogWorks1';
import { SERVICE_WORKS_2 } from './serviceCatalogWorks2';
import { SERVICE_WORKS_3 } from './serviceCatalogWorks3';
import { SERVICE_WORKS_4 } from './serviceCatalogWorks4';
import { SERVICE_WORKS_5 } from './serviceCatalogWorks5';
import { materialFor, serviceImage } from './serviceVisuals';

export type ServiceUnit = 'job' | 'piece' | 'hour' | 'item' | 'sqft' | 'kg' | 'day' | 'visit';
export type ServiceType = 'repair' | 'replacement' | 'installation' | 'cleaning' | 'inspection' | 'service' | 'rental';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
  unit?: ServiceUnit;
  serviceType?: ServiceType;
  material?: string;
  minQuantity?: number;
  duration?: string;
  rating?: number;
  reviews?: number;
}

export interface ServicesSubcategory {
  id: string;
  name: string;
  description: string;
  image: string;
  items: ServiceItem[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  subcategories: ServicesSubcategory[];
}

type WorkGroup = readonly [string, readonly string[]];

const SERVICE_WORKS: Record<string, readonly WorkGroup[]> = {
  ...SERVICE_WORKS_1,
  ...SERVICE_WORKS_2,
  ...SERVICE_WORKS_3,
  ...SERVICE_WORKS_4,
  ...SERVICE_WORKS_5,
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const serviceTypeFor = (name: string): ServiceType => {
  const n = name.toLowerCase();
  if (n.includes('installation') || n.includes('setup') || n.includes('fitting') || n.includes('assembly')) return 'installation';
  if (n.includes('replacement') || n.includes('replace')) return 'replacement';
  if (n.includes('cleaning') || n.includes('polish') || n.includes('washing') || n.includes('sanitization')) return 'cleaning';
  if (n.includes('inspection') || n.includes('diagnosis') || n.includes('check')) return 'inspection';
  if (n.includes('repair') || n.includes('fix') || n.includes('removal')) return 'repair';
  return 'service';
};

const durationFor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('installation') || n.includes('fabrication') || n.includes('wedding') || n.includes('catering')) return '60–180 min';
  if (n.includes('cleaning') || n.includes('service') || n.includes('repair')) return '30–90 min';
  return '30–60 min';
};

const WORK_ALIASES: Record<string, string[]> = {
  'appliance-repair-technician': ['appliance-repair-technician', 'refrigerator-technician', 'washing-machine-technician'],
  beautician: ['beautician', 'hair-stylist', 'barber'],
  'laundry-dry-cleaner': ['laundry-dry-cleaner', 'ironing-worker'],
  painter: ['painter', 'house-painter'],
  mason: ['mason', 'tile-marble-installer'],
  welder: ['welder', 'fabricator'],
};

const buildCategory = (category: typeof PUNCHX_50_CATEGORIES[number]): ServiceCategory => {
  const sourceIds = WORK_ALIASES[category.id] || [category.id];
  const groups = sourceIds.flatMap((id) => SERVICE_WORKS[id] || []).reduce<WorkGroup[]>((merged, [name, items]) => { const index = merged.findIndex(([existingName]) => existingName === name); if (index === -1) merged.push([name, [...items]]); else merged[index] = [name, [...new Set([...merged[index][1], ...items])]]; return merged; }, []);
  return {
    id: category.id,
    name: category.name,
    description: category.shortDesc,
    image: serviceImage(category.name, category.shortDesc),
    subcategories: groups.map(([name, itemNames], subIndex) => {
      const subId = `${category.id}-${slug(name)}`;
      return {
        id: subId,
        name,
        description: `${name} services for ${category.name}. Select the exact work below.`,
        image: serviceImage(`${category.name} • ${name}`, 'Service group and required tools/materials'),
        items: itemNames.map((itemName, itemIndex) => {
          const multiplier = 1 + (subIndex * 0.12) + (itemIndex * 0.06);
          const price = Math.max(49, Math.round(Number(category.basePrice || 199) * multiplier / 10) * 10);
          const material = materialFor(category.name, itemName);
          return {
            id: `${subId}-${slug(itemName)}`,
            name: itemName,
            description: `${itemName} at the residential visit location. Final price may vary for materials, quantity or additional work.`,
            price,
            image: serviceImage(`${category.name} • ${itemName}`, material),
            popular: subIndex === 0 && itemIndex === 0,
            unit: 'job' as ServiceUnit,
            serviceType: serviceTypeFor(itemName),
            material,
            duration: durationFor(itemName),
          };
        }),
      };
    }),
  };
};

export const serviceCategories: ServiceCategory[] = PUNCHX_50_CATEGORIES.map(buildCategory);
export const SERVICE_CATEGORIES = serviceCategories;

export const getCatalogCategory = (nameOrId: string) => {
  const target = nameOrId.trim().toLowerCase();
  if (!target) return undefined;
  const direct = serviceCategories.find((c) => c.id.toLowerCase() === target || c.name.toLowerCase() === target || c.name.toLowerCase().includes(target) || target.includes(c.name.toLowerCase()));
  if (direct) return direct;
  const legacyAlias = PUNCHX_50_CATEGORIES.find((c) => c.keywords.some((keyword) => keyword.toLowerCase() === target));
  return legacyAlias ? serviceCategories.find((c) => c.id === legacyAlias.id) : undefined;
};

export const getCatalogService = (serviceId: string) => {
  for (const category of serviceCategories) {
    for (const subcategory of category.subcategories) {
      const service = subcategory.items.find((item) => item.id === serviceId);
      if (service) return { category, subcategory, service };
    }
  }
  return null;
};
