export interface ServiceCategoryItem {
  id: string;
  name: string;
  shortDesc: string;
  iconName: string;
  basePrice: number;
  keywords: string[];
}

export const PUNCHX_50_CATEGORIES: ServiceCategoryItem[] = [
  { id: 'electrician', name: 'Electrical Services', shortDesc: 'Switches, wiring, lighting, fans, MCBs and household electrical work', iconName: 'Zap', basePrice: 199, keywords: ['electrician','electric','electrical','wire','wiring','switch','light','mcb','fuse','power','fan','bulb','inverter'] },
  { id: 'plumber', name: 'Plumbing Services', shortDesc: 'Taps, pipes, drainage, toilets, sinks, leaks and water connections', iconName: 'Droplet', basePrice: 199, keywords: ['plumber','plumbing','pipe','leak','tap','drain','flush','sink','toilet','bathroom','water','motor'] },
  { id: 'carpenter', name: 'Carpentry & Furniture Repair', shortDesc: 'Doors, cabinets, hinges, furniture repair and assembly', iconName: 'Hammer', basePrice: 249, keywords: ['carpenter','carpentry','wood','furniture','door','table','chair','cabinet','hinge','bed','shelf','sofa frame'] },
  { id: 'ac-technician', name: 'AC Service & Repair', shortDesc: 'AC installation, cleaning, cooling faults and maintenance', iconName: 'Wind', basePrice: 299, keywords: ['ac','ac repair','air conditioner','ac technician','cooling','gas','jet clean','hvac','compressor','split ac'] },
  { id: 'appliance-repair-technician', name: 'Appliance Repair', shortDesc: 'Washing machines, refrigerators, geysers, chimneys and kitchen appliances', iconName: 'Wrench', basePrice: 249, keywords: ['appliance','appliance repair','washing machine','washing machine technician','washer','refrigerator','refrigerator technician','fridge','geyser','water heater','chimney','induction','oven','otg','microwave','mixer','dishwasher','dryer','drum','thermostat'] },
  { id: 'ro-water-purifier-technician', name: 'Water Purifier & RO Service', shortDesc: 'Filter replacement, membrane, TDS tuning, leakage and installation', iconName: 'Droplets', basePrice: 199, keywords: ['ro','water purifier','ro technician','aquaguard','kent','filter','membrane','tds','pureit','water filter'] },
  { id: 'electronics-repair-technician', name: 'TV & Home Electronics Repair', shortDesc: 'LED TVs, speakers, soundbars and household electronics', iconName: 'Tv', basePrice: 249, keywords: ['electronics','electronics repair','tv','led tv','audio','speaker','soundbar','amplifier','circuit','pcb'] },
  { id: 'computer-laptop-technician', name: 'Computer, Laptop & Printer Repair', shortDesc: 'Hardware, software, upgrades, printer setup and home networking', iconName: 'Laptop', basePrice: 299, keywords: ['computer','laptop','printer','pc','macbook','desktop','windows','format','ssd','ram','hardware','antivirus','wifi setup','router'] },
  { id: 'mobile-repair-technician', name: 'Mobile & Tablet Repair', shortDesc: 'Screen, battery, charging, camera and software troubleshooting', iconName: 'Smartphone', basePrice: 199, keywords: ['mobile','phone','smartphone','tablet','screen','display','battery','charging','iphone','android','mic'] },
  { id: 'cctv-technician', name: 'CCTV, Wi-Fi & Smart Home Setup', shortDesc: 'Security cameras, DVR/NVR, Wi-Fi setup and connected devices', iconName: 'Video', basePrice: 349, keywords: ['cctv','camera','security camera','surveillance','dvr','nvr','ip camera','wifi','router setup','smart home','smart device'] },
  { id: 'solar-technician', name: 'Solar Panel & Inverter Service', shortDesc: 'Solar panel cleaning, inverter setup, battery and system maintenance', iconName: 'Sun', basePrice: 399, keywords: ['solar','solar panel','inverter','battery setup','green energy','photovoltaic','rooftop solar','net metering'] },
  { id: 'cleaner-housekeeper', name: 'Home Cleaning & Housekeeping', shortDesc: 'Regular and deep cleaning, kitchen, bathroom and move-in/out cleaning', iconName: 'Sparkles', basePrice: 299, keywords: ['clean','cleaner','cleaning','housekeeping','maid','deep clean','dusting','mop','bathroom clean','kitchen clean','toilet cleaning','move-in cleaning','move-out cleaning'] },
  { id: 'upholstery-sofa-cleaner', name: 'Sofa, Mattress & Carpet Cleaning', shortDesc: 'Sofa shampooing, mattress cleaning, carpet and upholstery care', iconName: 'Sparkles', basePrice: 349, keywords: ['sofa','upholstery','sofa clean','mattress clean','carpet clean','shampooing','cushion','rug cleaning'] },
  { id: 'pest-control-worker', name: 'Pest Control & Termite Treatment', shortDesc: 'Cockroach, ant, termite, bedbug, mosquito and rodent treatment', iconName: 'Bug', basePrice: 399, keywords: ['pest','pest control','termite','cockroach','bedbug','mosquito','rat','rodent','fumigation'] },
  { id: 'painter', name: 'Painting & Wall Finishing', shortDesc: 'Interior/exterior painting, touch-ups, putty and wall preparation', iconName: 'Paintbrush', basePrice: 299, keywords: ['paint','painter','house painter','painting','wall','color','polish','primer','distemper','texture','whitewash','touch up'] },
  { id: 'waterproofing-specialist', name: 'Waterproofing & Leakage Treatment', shortDesc: 'Roof, terrace, bathroom seepage, damp walls and crack sealing', iconName: 'Droplet', basePrice: 399, keywords: ['waterproofing','waterproof','leakage','seepage','damp wall','roof leak','terrace leak','bathroom leak','moisture'] },
  { id: 'mason', name: 'Masonry, Tiles & Home Repairs', shortDesc: 'Brickwork, plaster, tile fixing, grouting and minor construction', iconName: 'HardHat', basePrice: 349, keywords: ['mason','masonry','brick','cement','tile','marble','granite','plaster','wall repair','flooring','grouting','tile marble installer'] },
  { id: 'welder', name: 'Welding & Metal Fabrication', shortDesc: 'Iron grills, gates, railings, frames and metal fabrication', iconName: 'Flame', basePrice: 299, keywords: ['weld','welder','welding','iron','metal','gate','grill','steel','fabrication','soldering','fabricator','aluminium','railing'] },
  { id: 'glass-glazier-worker', name: 'Door, Window & Glass Repair', shortDesc: 'Glass replacement, window fitting, mirrors, partitions and sealing', iconName: 'Wrench', basePrice: 299, keywords: ['glass','glazier','window glass','mirror','toughened glass','glass partition','shower glass','window repair'] },
  { id: 'locksmith', name: 'Locksmith & Lock Installation', shortDesc: 'Lock repair, replacement, duplicate keys and smart locks', iconName: 'Key', basePrice: 199, keywords: ['lock','key','locksmith','door lock','duplicate key','padlock','deadbolt','lost key','smart lock'] },
  { id: 'pop-false-ceiling-worker', name: 'False Ceiling & POP Work', shortDesc: 'Gypsum/PVC ceilings, POP mouldings, ceiling repair and finishing', iconName: 'Hammer', basePrice: 399, keywords: ['pop','false ceiling','gypsum','ceiling design','cove light','plaster of paris','moldings'] },
  { id: 'beautician', name: 'Beauty & Salon at Home', shortDesc: 'Haircut, grooming, facials, waxing, nails, makeup and hairstyling', iconName: 'Scissors', basePrice: 299, keywords: ['beauty','beautician','barber','hair stylist','haircut','shave','beard','grooming','facial','waxing','threading','pedicure','manicure','skin','salon','makeup','hairstyling','hair spa'] },
  { id: 'tailor', name: 'Tailoring & Clothing Alterations', shortDesc: 'Stitching, fitting, alterations, zip and button repairs', iconName: 'Scissors', basePrice: 149, keywords: ['tailor','cloth','stitch','stitching','alteration','dress','suit','blouse','pants','shirt','fabric'] },
  { id: 'laundry-dry-cleaner', name: 'Laundry & Ironing', shortDesc: 'Wash and fold, dry cleaning, steam pressing and pickup/delivery', iconName: 'Waves', basePrice: 149, keywords: ['laundry','dry clean','dry cleaner','wash and fold','suits','curtains','stain','ironing','iron','steam iron','press','clothes press','saree iron','shirt iron'] },
  { id: 'cobbler-shoe-repairer', name: 'Shoe & Bag Repair', shortDesc: 'Sole replacement, stitching, heel repair, bag zips and leather care', iconName: 'Wrench', basePrice: 99, keywords: ['cobbler','shoe','shoe repair','sole','sandal','heel','leather','boots','bag zip','bag repair'] },
  { id: 'packer-mover', name: 'Packers & Movers', shortDesc: 'Packing, loading, local household shifting and unpacking', iconName: 'Truck', basePrice: 799, keywords: ['packer','mover','packers and movers','relocation','shifting','house shifting','moving','furniture shifting'] },
  { id: 'gardener', name: 'Gardening & Plant Care', shortDesc: 'Plant pruning, lawn care, repotting and garden maintenance', iconName: 'Sprout', basePrice: 199, keywords: ['garden','gardener','plant','lawn','mowing','potting','fertilizer','pruning','flowers','seeds'] },
  { id: 'cook', name: 'Cook & Meal Preparation', shortDesc: 'Daily meals, breakfast, lunch, dinner and home meal prep', iconName: 'Utensils', basePrice: 299, keywords: ['cook','chef','food','meal','dinner','lunch','breakfast','roti','curry','kitchen'] },
  { id: 'caterer', name: 'Catering & Party Food', shortDesc: 'Home party catering, buffet, functions and event meals', iconName: 'Utensils', basePrice: 599, keywords: ['cater','caterer','catering','buffet','party food','function','wedding food','banquet'] },
  { id: 'security-guard', name: 'Residential & Event Security', shortDesc: 'Residential guard, gatekeeping, event and temporary security', iconName: 'Shield', basePrice: 499, keywords: ['security','guard','security guard','gatekeeper','bouncer','watchman','event security'] },
  { id: 'interior-decorator', name: 'Interior Design & Home Styling', shortDesc: 'Space planning, home styling, wallpaper and decor installation', iconName: 'Palette', basePrice: 599, keywords: ['interior','decorator','interior design','modular kitchen','wallpaper','home styling','wardrobe','space planning'] },
  { id: 'event-decorator', name: 'Event & Party Decoration', shortDesc: 'Birthday, wedding, stage, balloon and themed event decoration', iconName: 'Sparkles', basePrice: 599, keywords: ['event decorator','stage decor','flowers','balloon decor','wedding decor','party setup','lighting'] },
  { id: 'photographer', name: 'Photography', shortDesc: 'Portraits, family events, weddings and product photography', iconName: 'Camera', basePrice: 599, keywords: ['photo','photographer','photography','shoot','portrait','wedding','event photo','camera'] },
  { id: 'videographer', name: 'Videography & Video Editing', shortDesc: 'Event videos, reels, YouTube recording and editing', iconName: 'Video', basePrice: 699, keywords: ['video','videographer','videography','reels','youtube','shoot','cinematography','film','video editing'] },
  { id: 'dj-sound-technician', name: 'DJ & Sound Setup', shortDesc: 'DJ booking, speaker/microphone setup and event sound', iconName: 'Tv', basePrice: 699, keywords: ['dj','sound','sound technician','speakers','party dj','audio console','microphones','pa system'] },
  { id: 'delivery-driver', name: 'Local Delivery & Errand Pickup', shortDesc: 'Local parcel, document, store pickup and delivery assistance', iconName: 'Car', basePrice: 199, keywords: ['driver','delivery','delivery driver','courier','parcel pickup','transport','local delivery','errand pickup'] }
];

export const SEARCH_CATEGORY_LIST = PUNCHX_50_CATEGORIES;

/**
 * Filter categories instantly as user types.
 * Matches category name, ID, and comprehensive keyword aliases.
 */
export function filterCategories(query: string): ServiceCategoryItem[] {
  const cleanQuery = (query || '').trim().toLowerCase();
  if (!cleanQuery) {
    return PUNCHX_50_CATEGORIES;
  }

  return PUNCHX_50_CATEGORIES.filter((cat) => {
    if (cat.name.toLowerCase().includes(cleanQuery)) return true;
    if (cat.shortDesc.toLowerCase().includes(cleanQuery)) return true;
    if (cat.id.toLowerCase().includes(cleanQuery)) return true;
    return cat.keywords.some((k) => k.includes(cleanQuery) || cleanQuery.includes(k));
  });
}

/**
 * Checks if a worker's provided category/skill matches a citizen's target category.
 */
export function isCategoryMatching(
  workerSkills: string[] | string | undefined,
  targetCategory: string
): boolean {
  if (!targetCategory || targetCategory.toLowerCase() === 'all' || targetCategory.toLowerCase() === 'all specialties') {
    return true;
  }
  if (!workerSkills) return false;

  const target = targetCategory.toLowerCase().trim();

  let skillsArray: string[] = [];
  if (Array.isArray(workerSkills)) {
    skillsArray = workerSkills;
  } else if (typeof workerSkills === 'string') {
    skillsArray = workerSkills.split(/[,&/|]/).map((s) => s.trim());
  }

  return skillsArray.some((skill) => {
    const s = skill.toLowerCase().trim();
    if (s === target) return true;
    if (s.includes(target) || target.includes(s)) return true;
    
    // Check keyword synonym matching
    const catItem = PUNCHX_50_CATEGORIES.find(c => c.name.toLowerCase() === target || c.id === target);
    if (catItem) {
      if (catItem.keywords.some(kw => s.includes(kw) || kw.includes(s))) return true;
    }
    return false;
  });
}
