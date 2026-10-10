import type { ServiceCategory } from './serviceCatalogs';

export interface PriceProduct {
  id: string;
  name: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  specification: string;
  confidence: 'A/B' | 'B' | 'C';
  quoteRequired?: boolean;
  keywords?: string[];
}

type ProductSeed = Omit<PriceProduct, 'id'>;
type Family = { match: RegExp; products: ProductSeed[] };

const families: Family[] = [
  { match: /electri|electrician/i, products: [
    {name:'LED bulb 5–7W',unit:'piece',minPrice:30,maxPrice:180,specification:'Basic to branded; check cap type',confidence:'B'},
    {name:'LED bulb 9–12W',unit:'piece',minPrice:45,maxPrice:350,specification:'Wattage and brand tier',confidence:'B'},
    {name:'LED batten 20–40W',unit:'piece',minPrice:180,maxPrice:900,specification:'Length, wattage and brand',confidence:'C'},
    {name:'Ceiling fan 1200 mm',unit:'piece',minPrice:1400,maxPrice:6500,specification:'Standard or BLDC; installation extra',confidence:'C'},
    {name:'Modular switch 6A',unit:'piece',minPrice:25,maxPrice:250,specification:'Series and brand',confidence:'B'},
    {name:'Socket 6A/16A',unit:'piece',minPrice:40,maxPrice:450,specification:'Current rating and brand',confidence:'B'},
    {name:'MCB 6A–16A, SP',unit:'piece',minPrice:120,maxPrice:500,specification:'Pole, rating and breaking capacity',confidence:'A/B'},
    {name:'RCCB/RCBO 25–63A',unit:'piece',minPrice:900,maxPrice:6500,specification:'Pole, sensitivity and brand',confidence:'C'},
    {name:'Copper wire 1.5 sq mm',unit:'metre',minPrice:18,maxPrice:55,specification:'Kolkata reference around ₹22/m',confidence:'A/B'},
    {name:'Copper wire 2.5 sq mm',unit:'metre',minPrice:35,maxPrice:95,specification:'Kolkata reference around ₹55/m',confidence:'A/B'},
    {name:'Inverter 600 VA–1.5 kVA',unit:'piece',minPrice:3500,maxPrice:18000,specification:'Capacity and waveform',confidence:'C'}]},
  { match: /plumb/i, products: [
    {name:'CPVC pipe ½ inch',unit:'metre',minPrice:44,maxPrice:64,specification:'Pressure class and brand; Kolkata reference',confidence:'A/B'},
    {name:'UPVC pipe ½–1 inch',unit:'metre',minPrice:35,maxPrice:180,specification:'Diameter and pressure class',confidence:'C'},
    {name:'SWR pipe 110 mm / 4 inch',unit:'metre',minPrice:280,maxPrice:380,specification:'Class and brand; Kolkata reference',confidence:'A/B'},
    {name:'GI pipe 1 inch',unit:'metre',minPrice:200,maxPrice:304,specification:'Schedule, wall thickness and length',confidence:'B'},
    {name:'Basin mixer tap',unit:'piece',minPrice:700,maxPrice:6500,specification:'Finish and cartridge quality',confidence:'C'},
    {name:'Flush tank mechanism kit',unit:'set',minPrice:250,maxPrice:1800,specification:'Compatibility with cistern model',confidence:'C'},
    {name:'1000 L water tank',unit:'piece',minPrice:5408,maxPrice:7488,specification:'Layer count and brand; Kolkata reference',confidence:'A/B'},
    {name:'Water pump 0.5–1 HP',unit:'piece',minPrice:2500,maxPrice:9500,specification:'Head, flow and motor type',confidence:'C'}]},
  { match: /carpentry|furniture|carpenter/i, products: [
    {name:'Door hinge set',unit:'set',minPrice:120,maxPrice:900,specification:'Steel grade and finish',confidence:'C'},
    {name:'Cabinet/drawer channel',unit:'pair',minPrice:250,maxPrice:2400,specification:'Length, load and soft-close type',confidence:'C'},
    {name:'Door lock set',unit:'piece',minPrice:250,maxPrice:4500,specification:'Mortise, cylindrical or smart lock',confidence:'C'},
    {name:'Plywood 6–18 mm',unit:'sheet',minPrice:700,maxPrice:4500,specification:'Grade, thickness and sheet size',confidence:'C'},
    {name:'Wood adhesive',unit:'kg/litre',minPrice:120,maxPrice:850,specification:'Brand and pack size',confidence:'C'}]},
  { match: /ac service|air condition|ac repair/i, products: [
    {name:'AC remote control',unit:'piece',minPrice:250,maxPrice:1800,specification:'Universal or model-specific',confidence:'B'},
    {name:'AC capacitor 25–60 µF',unit:'piece',minPrice:250,maxPrice:1800,specification:'Match capacitance and voltage',confidence:'B'},
    {name:'AC temperature sensor',unit:'piece',minPrice:250,maxPrice:1400,specification:'Model/connector compatibility',confidence:'C'},
    {name:'AC indoor/outdoor fan motor',unit:'piece',minPrice:1800,maxPrice:8500,specification:'OEM/compatible and model',confidence:'C',quoteRequired:true},
    {name:'AC PCB/control board',unit:'piece',minPrice:1800,maxPrice:12000,specification:'Exact model and inverter type',confidence:'C',quoteRequired:true},
    {name:'Copper piping with insulation',unit:'metre',minPrice:450,maxPrice:1400,specification:'Diameter and wall thickness',confidence:'C'},
    {name:'Refrigerant gas recharge',unit:'service',minPrice:1800,maxPrice:6500,specification:'Gas type and refrigerant quantity',confidence:'B',quoteRequired:true},
    {name:'Compressor 1–2 ton',unit:'piece',minPrice:6500,maxPrice:26000,specification:'Capacity and compatible refrigerant',confidence:'C',quoteRequired:true}]},
  { match: /appliance|washing machine|refrigerator/i, products: [
    {name:'Washing machine drain pump',unit:'piece',minPrice:1200,maxPrice:2200,specification:'Model-compatible replacement',confidence:'B',quoteRequired:true},
    {name:'Washing machine inlet valve',unit:'piece',minPrice:700,maxPrice:1400,specification:'Single/dual inlet and model',confidence:'B'},
    {name:'Washer belt/coupler',unit:'piece',minPrice:500,maxPrice:1100,specification:'Model and part number',confidence:'B'},
    {name:'Washing machine bearing kit',unit:'kit',minPrice:2500,maxPrice:4800,specification:'Drum type and model',confidence:'B',quoteRequired:true},
    {name:'Refrigerator thermostat/sensor',unit:'piece',minPrice:500,maxPrice:2500,specification:'Model-specific',confidence:'C'},
    {name:'Refrigerator compressor',unit:'piece',minPrice:3500,maxPrice:14000,specification:'Capacity and refrigerant; quote after diagnosis',confidence:'C',quoteRequired:true},
    {name:'Geyser heating element',unit:'piece',minPrice:450,maxPrice:2200,specification:'Wattage, length and flange',confidence:'C'},
    {name:'Microwave magnetron',unit:'piece',minPrice:1200,maxPrice:4200,specification:'Model and power rating',confidence:'C',quoteRequired:true}]},
  { match: /water purifier|\bro\b/i, products: [
    {name:'Sediment filter cartridge',unit:'piece',minPrice:120,maxPrice:500,specification:'Size and micron rating',confidence:'B'},
    {name:'Activated carbon filter',unit:'piece',minPrice:180,maxPrice:900,specification:'Inline/block type and compatibility',confidence:'B'},
    {name:'RO membrane 75 GPD',unit:'piece',minPrice:700,maxPrice:1800,specification:'Brand and membrane type',confidence:'B'},
    {name:'RO membrane 100 GPD',unit:'piece',minPrice:900,maxPrice:2500,specification:'Brand and membrane type',confidence:'C'},
    {name:'RO booster pump',unit:'piece',minPrice:900,maxPrice:2800,specification:'Voltage and pressure rating',confidence:'B'},
    {name:'RO SMPS / power supply',unit:'piece',minPrice:450,maxPrice:1800,specification:'Output voltage/current and connector',confidence:'C'},
    {name:'UV lamp',unit:'piece',minPrice:350,maxPrice:1500,specification:'Length and wattage',confidence:'B'},
    {name:'Complete compatible filter kit',unit:'set',minPrice:1200,maxPrice:4200,specification:'Brand/model and stages included',confidence:'B',quoteRequired:true}]},
  { match: /tv|electronics|soundbar/i, products: [
    {name:'LED TV power board',unit:'piece',minPrice:900,maxPrice:4500,specification:'Exact TV model and board number',confidence:'C',quoteRequired:true},
    {name:'TV mainboard / logic board',unit:'piece',minPrice:1800,maxPrice:9500,specification:'Exact model; confirm repair vs replacement',confidence:'C',quoteRequired:true},
    {name:'TV LED backlight strip kit',unit:'set',minPrice:500,maxPrice:3000,specification:'Screen size and panel model',confidence:'C'},
    {name:'Speaker driver 4–8 inch',unit:'piece',minPrice:400,maxPrice:3500,specification:'Impedance and wattage',confidence:'C'},
    {name:'HDMI cable 2–5 m',unit:'piece',minPrice:150,maxPrice:1200,specification:'HDMI version and certification',confidence:'C'}]},
  { match: /computer|laptop|printer/i, products: [
    {name:'DDR3 RAM 4GB',unit:'module',minPrice:700,maxPrice:1400,specification:'Desktop UDIMM or laptop SODIMM',confidence:'C'},
    {name:'DDR3 RAM 8GB',unit:'module',minPrice:1400,maxPrice:2600,specification:'Confirm motherboard support',confidence:'C'},
    {name:'DDR4 RAM 8GB',unit:'module',minPrice:2500,maxPrice:3500,specification:'Desktop/laptop form factor; Kolkata repair benchmark',confidence:'B'},
    {name:'DDR4 RAM 16GB',unit:'module',minPrice:3500,maxPrice:4800,specification:'Desktop/laptop form factor; Kolkata repair benchmark',confidence:'B'},
    {name:'DDR4 RAM 32GB kit',unit:'kit',minPrice:5500,maxPrice:7500,specification:'Speed and kit configuration',confidence:'B'},
    {name:'DDR4 RAM 64GB kit',unit:'kit',minPrice:9000,maxPrice:18000,specification:'Board compatibility and kit configuration',confidence:'C'},
    {name:'DDR5 RAM 8GB',unit:'module',minPrice:2500,maxPrice:4000,specification:'Desktop/laptop form factor',confidence:'C'},
    {name:'DDR5 RAM 16GB',unit:'module',minPrice:4000,maxPrice:5500,specification:'Desktop/laptop form factor; Kolkata repair benchmark',confidence:'B'},
    {name:'DDR5 RAM 32GB kit',unit:'kit',minPrice:6500,maxPrice:12000,specification:'Speed and kit configuration',confidence:'C'},
    {name:'DDR5 RAM 64GB kit',unit:'kit',minPrice:12000,maxPrice:24000,specification:'Board compatibility and kit configuration',confidence:'C'},
    {name:'SATA SSD 128GB',unit:'piece',minPrice:1200,maxPrice:2500,specification:'2.5-inch SATA; brand tier',confidence:'C'},
    {name:'SATA SSD 256GB',unit:'piece',minPrice:1800,maxPrice:3500,specification:'2.5-inch SATA; brand tier',confidence:'B'},
    {name:'SATA SSD 512GB',unit:'piece',minPrice:2800,maxPrice:5200,specification:'2.5-inch SATA; brand tier',confidence:'C'},
    {name:'NVMe SSD 256GB',unit:'piece',minPrice:2200,maxPrice:4200,specification:'M.2 key and PCIe generation',confidence:'C'},
    {name:'NVMe SSD 512GB',unit:'piece',minPrice:3000,maxPrice:6500,specification:'M.2 key and PCIe generation',confidence:'B'},
    {name:'NVMe SSD 1TB',unit:'piece',minPrice:4800,maxPrice:11000,specification:'M.2 key and PCIe generation',confidence:'C'},
    {name:'NVMe SSD 2TB',unit:'piece',minPrice:9000,maxPrice:22000,specification:'M.2 key and PCIe generation',confidence:'C'},
    {name:'Laptop battery',unit:'piece',minPrice:1800,maxPrice:7500,specification:'Exact laptop model and cell quality',confidence:'C',quoteRequired:true},
    {name:'Laptop display panel',unit:'piece',minPrice:2800,maxPrice:12000,specification:'Size, resolution, connector and refresh rate',confidence:'C',quoteRequired:true},
    {name:'Laptop keyboard',unit:'piece',minPrice:800,maxPrice:3800,specification:'Model, backlight and layout',confidence:'C'},
    {name:'Laptop charger / adapter',unit:'piece',minPrice:700,maxPrice:3500,specification:'Voltage, wattage and connector',confidence:'C'},
    {name:'Printer cartridge / toner',unit:'piece',minPrice:500,maxPrice:6500,specification:'Printer model and OEM/compatible',confidence:'C'},
    {name:'Printer fuser kit',unit:'kit',minPrice:1800,maxPrice:9500,specification:'Printer model and page-yield class',confidence:'C',quoteRequired:true}]},
  { match: /mobile|tablet/i, products: [
    {name:'Phone battery replacement part',unit:'piece',minPrice:700,maxPrice:4500,specification:'Exact model and battery authenticity',confidence:'C',quoteRequired:true},
    {name:'Phone display assembly',unit:'piece',minPrice:1200,maxPrice:18000,specification:'LCD/OLED, frame and model variant',confidence:'C',quoteRequired:true},
    {name:'Charging port flex',unit:'piece',minPrice:250,maxPrice:2200,specification:'Exact model/board revision',confidence:'C'},
    {name:'Rear camera module',unit:'piece',minPrice:500,maxPrice:7500,specification:'Lens and model compatibility',confidence:'C'},
    {name:'Speaker / earpiece module',unit:'piece',minPrice:250,maxPrice:1800,specification:'Exact model',confidence:'C'},
    {name:'Back glass / rear cover',unit:'piece',minPrice:400,maxPrice:4500,specification:'Colour and model; adhesive may be extra',confidence:'C'}]},
  { match: /cctv|wi-fi|smart home/i, products: [
    {name:'2MP CCTV camera',unit:'piece',minPrice:900,maxPrice:2800,specification:'Indoor/outdoor and lens',confidence:'C'},
    {name:'4MP CCTV camera',unit:'piece',minPrice:1800,maxPrice:5500,specification:'Resolution, night vision and IP rating',confidence:'C'},
    {name:'8MP / 4K CCTV camera',unit:'piece',minPrice:3500,maxPrice:12000,specification:'Resolution and analytics',confidence:'C'},
    {name:'DVR 4-channel',unit:'piece',minPrice:1800,maxPrice:6500,specification:'Analog/IP support and channels',confidence:'C'},
    {name:'NVR 8-channel PoE',unit:'piece',minPrice:4500,maxPrice:16000,specification:'Channel count and PoE ports',confidence:'C'},
    {name:'Surveillance HDD 1TB',unit:'piece',minPrice:3500,maxPrice:6000,specification:'Surveillance-rated drive',confidence:'C'},
    {name:'PoE switch 8-port',unit:'piece',minPrice:1800,maxPrice:6500,specification:'PoE budget and port speed',confidence:'C'},
    {name:'Cat6 cable',unit:'metre',minPrice:18,maxPrice:65,specification:'Copper vs CCA and jacket type',confidence:'C'}]},
  { match: /solar|inverter/i, products: [
    {name:'Solar panel 100–200W',unit:'piece',minPrice:3500,maxPrice:9500,specification:'Wattage and cell technology',confidence:'C'},
    {name:'Solar panel 400–550W',unit:'piece',minPrice:8000,maxPrice:18000,specification:'Wattage and module efficiency',confidence:'C'},
    {name:'Solar charge controller',unit:'piece',minPrice:900,maxPrice:6500,specification:'PWM/MPPT and current rating',confidence:'C'},
    {name:'Inverter battery 100–200Ah',unit:'piece',minPrice:8500,maxPrice:22000,specification:'Tubular/flat plate and warranty',confidence:'C'},
    {name:'Solar DC cable',unit:'metre',minPrice:25,maxPrice:120,specification:'Gauge and UV-rated insulation',confidence:'C'}]},
  { match: /clean|housekeep|domestic help/i, products: [
    {name:'Floor cleaner concentrate',unit:'litre',minPrice:120,maxPrice:650,specification:'Concentration and surface compatibility',confidence:'C'},
    {name:'Bathroom descaler',unit:'litre',minPrice:100,maxPrice:500,specification:'Acid type and surface-safe use',confidence:'C'},
    {name:'Microfibre cloth set',unit:'set',minPrice:100,maxPrice:650,specification:'Count and GSM',confidence:'C'},
    {name:'Mop / floor wiper',unit:'piece',minPrice:120,maxPrice:1200,specification:'Head material and handle type',confidence:'C'},
    {name:'Disposable gloves / masks',unit:'pack',minPrice:80,maxPrice:600,specification:'Material and pack count',confidence:'C'}]},
  { match: /sofa|mattress|carpet|upholstery/i, products: [
    {name:'Upholstery shampoo',unit:'litre',minPrice:250,maxPrice:1200,specification:'Fabric-safe concentrate',confidence:'C'},
    {name:'Fabric stain remover',unit:'bottle',minPrice:180,maxPrice:900,specification:'Test colour-fastness first',confidence:'C'},
    {name:'Vacuum filter / bag',unit:'piece',minPrice:250,maxPrice:1800,specification:'Machine model compatibility',confidence:'C'}]},
  { match: /pest control|termite/i, products: [
    {name:'Pest gel bait',unit:'tube',minPrice:250,maxPrice:900,specification:'Registered product; follow label directions',confidence:'C'},
    {name:'Termite treatment chemical',unit:'litre',minPrice:450,maxPrice:1800,specification:'Licensed professional use only; label and safety compliance',confidence:'C',quoteRequired:true},
    {name:'Rodent bait station',unit:'piece',minPrice:180,maxPrice:850,specification:'Tamper-resistant station',confidence:'C'}]},
  { match: /paint|waterproof|mason|tile|false ceiling|pop/i, products: [
    {name:'Interior wall paint 1L',unit:'litre',minPrice:180,maxPrice:950,specification:'Economy to premium washable finish',confidence:'C'},
    {name:'Interior wall paint 20L',unit:'bucket',minPrice:1800,maxPrice:12500,specification:'Coverage and finish tier',confidence:'C'},
    {name:'Wall putty 20kg',unit:'bag',minPrice:450,maxPrice:1100,specification:'Brand and grade',confidence:'C'},
    {name:'Waterproofing chemical 1L',unit:'litre',minPrice:180,maxPrice:950,specification:'Application area and coat count',confidence:'C'},
    {name:'Cement 50kg',unit:'bag',minPrice:340,maxPrice:520,specification:'Grade and current local quote',confidence:'C'},
    {name:'Ceramic tile 300×300 mm',unit:'sq ft',minPrice:25,maxPrice:120,specification:'Design, grade and batch',confidence:'C'},
    {name:'Vitrified tile 600×600 mm',unit:'sq ft',minPrice:45,maxPrice:220,specification:'Finish and grade',confidence:'C'},
    {name:'Gypsum board 12.5 mm',unit:'sheet',minPrice:450,maxPrice:1200,specification:'Board size and fire/moisture rating',confidence:'C'}]},
  { match: /weld|fabricat|glass|glazier|locksmith|door|window/i, products: [
    {name:'Steel angle / section',unit:'kg',minPrice:55,maxPrice:130,specification:'Section, thickness and steel grade',confidence:'C'},
    {name:'Welding electrode',unit:'kg',minPrice:90,maxPrice:350,specification:'Diameter and classification',confidence:'C'},
    {name:'Toughened glass 5–12 mm',unit:'sq ft',minPrice:120,maxPrice:650,specification:'Thickness, edge finish and cut-outs',confidence:'C',quoteRequired:true},
    {name:'Aluminium window hardware set',unit:'set',minPrice:250,maxPrice:2200,specification:'Profile and opening type',confidence:'C'},
    {name:'Door lock cylinder',unit:'piece',minPrice:250,maxPrice:2500,specification:'Size and security grade',confidence:'C'}]},
  { match: /beauty|salon|massage|spa/i, products: [
    {name:'Salon consumables kit',unit:'kit',minPrice:250,maxPrice:1800,specification:'Service-specific disposable/consumable set',confidence:'C'},
    {name:'Wax cartridge / wax tub',unit:'piece',minPrice:120,maxPrice:850,specification:'Wax type and weight',confidence:'C'},
    {name:'Facial product kit',unit:'kit',minPrice:250,maxPrice:2500,specification:'Brand, skin suitability and number of uses',confidence:'C'},
    {name:'Massage oil 500 ml',unit:'bottle',minPrice:250,maxPrice:1200,specification:'Ingredients and brand',confidence:'C'}]},
  { match: /tailor|laundry|shoe|bag repair/i, products: [
    {name:'Clothing zipper / slider',unit:'piece',minPrice:20,maxPrice:250,specification:'Length, gauge and garment type',confidence:'C'},
    {name:'Thread / button set',unit:'pack',minPrice:30,maxPrice:500,specification:'Material and pack count',confidence:'C'},
    {name:'Shoe sole replacement material',unit:'pair',minPrice:120,maxPrice:1200,specification:'Sole material and shoe type',confidence:'C'},
    {name:'Bag zip / buckle hardware',unit:'piece',minPrice:50,maxPrice:700,specification:'Size and compatible fit',confidence:'C'},
    {name:'Laundry detergent',unit:'kg',minPrice:80,maxPrice:450,specification:'Concentrate and pack size',confidence:'C'}]},
  { match: /mover|delivery|vehicle washing|detailing/i, products: [
    {name:'Packing carton (medium)',unit:'piece',minPrice:35,maxPrice:120,specification:'Board strength and size',confidence:'C'},
    {name:'Bubble wrap',unit:'metre',minPrice:15,maxPrice:80,specification:'Width and bubble size',confidence:'C'},
    {name:'Stretch wrap roll',unit:'roll',minPrice:120,maxPrice:550,specification:'Width and thickness',confidence:'C'},
    {name:'Vehicle shampoo',unit:'litre',minPrice:150,maxPrice:800,specification:'pH and vehicle-safe formula',confidence:'C'},
    {name:'Microfibre detailing kit',unit:'set',minPrice:250,maxPrice:1800,specification:'Towels, brushes and applicators',confidence:'C'}]},
  { match: /garden|cook|cater|food|interior|event|photo|video|dj|security/i, products: [
    {name:'Consumables / materials allowance',unit:'job',minPrice:100,maxPrice:2500,specification:'Depends on selected scope; itemised quote required',confidence:'C',quoteRequired:true},
    {name:'Tools / equipment rental',unit:'day',minPrice:250,maxPrice:5000,specification:'Equipment, duration and delivery vary',confidence:'C',quoteRequired:true},
    {name:'Protective / disposable supplies',unit:'pack',minPrice:80,maxPrice:1200,specification:'Quantity and grade vary',confidence:'C'}]},
];

const genericProducts: ProductSeed[] = [
  {name:'Consumables / small materials',unit:'job',minPrice:50,maxPrice:1200,specification:'Confirm brand, quantity and inclusion with professional',confidence:'C'},
  {name:'Replacement part (model-specific)',unit:'piece',minPrice:250,maxPrice:5000,specification:'Exact model/measurements required before purchase',confidence:'C',quoteRequired:true},
  {name:'Tools / equipment rental',unit:'day',minPrice:250,maxPrice:3500,specification:'Availability and delivery must be confirmed',confidence:'C',quoteRequired:true},
];

export function getProductsForCategory(category: ServiceCategory): PriceProduct[] {
  const family = families.find(({match}) => match.test(category.name) || match.test(category.id));
  const seeds = family?.products || genericProducts;
  return seeds.map((product, index) => ({
    ...product,
    id: `${category.id}-product-${index + 1}`,
    keywords: [category.name, product.name, product.specification],
  }));
}
