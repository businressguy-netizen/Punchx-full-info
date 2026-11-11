import React, { useState } from 'react';
import { 
  Calculator, Check, ArrowRight, Sparkles, Shield, Clock, 
  HelpCircle, Wrench, Zap, Droplets, Wind, Paintbrush, Hammer, Bug, Package
} from 'lucide-react';
import { AppScreen } from '../types';

interface ServicePriceEstimatorProps {
  onTransition: (target: AppScreen) => void;
  onSelectCategory: (category: string) => void;
  showNotification: (msg: string) => void;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  baseLabor: number;
  partsEst: number;
  timeEst: string;
  description: string;
  warrantyDays: number;
  unitLabel: string;
  icon: string;
}

export default function ServicePriceEstimator({
  onTransition,
  onSelectCategory,
  showNotification
}: ServicePriceEstimatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('AC Repair');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('ac-jet');
  const [quantity, setQuantity] = useState<number>(1);
  const [includeMaterialWarranty, setIncludeMaterialWarranty] = useState<boolean>(true);
  const [isUrgentEmergency, setIsUrgentEmergency] = useState<boolean>(false);

  const categories = [
    { id: 'AC Repair', name: 'AC Service', icon: Wind },
    { id: 'Electrical', name: 'Electrical', icon: Zap },
    { id: 'Plumbing', name: 'Plumbing', icon: Droplets },
    { id: 'Cleaning', name: 'Deep Clean', icon: Sparkles },
    { id: 'Carpentry', name: 'Carpentry', icon: Hammer },
    { id: 'Painting', name: 'Painting', icon: Paintbrush },
    { id: 'Pest Control', name: 'Pest Shield', icon: Bug },
    { id: 'Moving', name: 'Express Move', icon: Package },
  ];

  const serviceCatalog: Record<string, ServiceOption[]> = {
    'AC Repair': [
      {
        id: 'ac-jet',
        name: 'Foam Jet Deep AC Service',
        category: 'AC Repair',
        baseLabor: 499,
        partsEst: 0,
        timeEst: '45 mins / unit',
        description: 'High-pressure anti-bacterial foam jet cleaning of indoor cooling coil & outdoor condenser unit.',
        warrantyDays: 30,
        unitLabel: 'AC Units',
        icon: '❄️'
      },
      {
        id: 'ac-gas',
        name: 'Full Gas Leak Fix & Refill',
        category: 'AC Repair',
        baseLabor: 799,
        partsEst: 1499,
        timeEst: '60 mins / unit',
        description: 'Nitrogen pressure testing, brazing copper leak points, vacuuming & 100% pure R32/R410A gas charge.',
        warrantyDays: 60,
        unitLabel: 'AC Units',
        icon: '🧪'
      },
      {
        id: 'ac-pcb',
        name: 'Inverter PCB Diagnostic & Repair',
        category: 'AC Repair',
        baseLabor: 650,
        partsEst: 1200,
        timeEst: '90 mins',
        description: 'Diagnostic troubleshooting of inverter sensor errors (E1/E6), capacitor surge repair, and microchip fix.',
        warrantyDays: 90,
        unitLabel: 'Units',
        icon: '⚡'
      },
      {
        id: 'ac-install',
        name: 'Complete Split AC Installation',
        category: 'AC Repair',
        baseLabor: 1199,
        partsEst: 350,
        timeEst: '120 mins',
        description: 'Core drilling, mounting heavy-duty outdoor bracket, copper pipe insulation & vacuum commissioning.',
        warrantyDays: 45,
        unitLabel: 'AC Units',
        icon: '🪛'
      }
    ],
    'Electrical': [
      {
        id: 'elec-switch',
        name: 'Modular Switchboard & Socket Overhaul',
        category: 'Electrical',
        baseLabor: 299,
        partsEst: 350,
        timeEst: '30 mins / board',
        description: 'Replacement of burnt modular rocker switches, 16A power sockets, and indicator wiring.',
        warrantyDays: 30,
        unitLabel: 'Switchboards',
        icon: '🔌'
      },
      {
        id: 'elec-mcb',
        name: 'Main Distribution MCB & RCCB Fix',
        category: 'Electrical',
        baseLabor: 599,
        partsEst: 850,
        timeEst: '60 mins',
        description: 'Fix frequent tripping, install 40A double-pole isolator, and calibrate earth leakage protection.',
        warrantyDays: 60,
        unitLabel: 'Distribution Panels',
        icon: '⚡'
      },
      {
        id: 'elec-fan',
        name: 'BLDC / Ceiling Fan Installation & Repair',
        category: 'Electrical',
        baseLabor: 249,
        partsEst: 150,
        timeEst: '30 mins / fan',
        description: 'Ceiling hook anchorage, downrod balancing, capacitor replacement, and remote receiver pairing.',
        warrantyDays: 30,
        unitLabel: 'Fans',
        icon: '🌀'
      },
      {
        id: 'elec-inverter',
        name: 'Home Inverter & Battery Setup',
        category: 'Electrical',
        baseLabor: 699,
        partsEst: 200,
        timeEst: '75 mins',
        description: 'Pure sine wave inverter connection, distilled water gravity top-up, and backup line balancing.',
        warrantyDays: 60,
        unitLabel: 'Setups',
        icon: '🔋'
      }
    ],
    'Plumbing': [
      {
        id: 'plumb-leak',
        name: 'Concealed Pipe & Tap Leakage Fix',
        category: 'Plumbing',
        baseLabor: 349,
        partsEst: 250,
        timeEst: '45 mins',
        description: 'Acoustic leak inspection, Teflon thread sealing, spindle cartridge replacement & pressure check.',
        warrantyDays: 30,
        unitLabel: 'Fixtures',
        icon: '🚰'
      },
      {
        id: 'plumb-drain',
        name: 'Mechanical Motorized Drain Unclogging',
        category: 'Plumbing',
        baseLabor: 549,
        partsEst: 0,
        timeEst: '45 mins',
        description: 'High-torque rotational snake cable clearance for clogged kitchen sinks, floor traps, and shower drains.',
        warrantyDays: 30,
        unitLabel: 'Drains',
        icon: '🚿'
      },
      {
        id: 'plumb-motor',
        name: 'Submersible Water Pump Overhaul',
        category: 'Plumbing',
        baseLabor: 799,
        partsEst: 650,
        timeEst: '90 mins',
        description: 'Impeller de-scaling, automatic water level controller wiring, and pressure tank priming.',
        warrantyDays: 60,
        unitLabel: 'Pumps',
        icon: '⚙️'
      }
    ],
    'Cleaning': [
      {
        id: 'clean-deep',
        name: 'Comprehensive Full-Home Deep Sanitization',
        category: 'Cleaning',
        baseLabor: 1899,
        partsEst: 250,
        timeEst: '3.5 - 5 hours',
        description: 'Single-disc machine floor buffing, bathroom descaling, kitchen degreasing, and balcony pressure wash.',
        warrantyDays: 15,
        unitLabel: 'BHKs / Units',
        icon: '✨'
      },
      {
        id: 'clean-sofa',
        name: 'Steam Extraction Sofa & Mattress Wash',
        category: 'Cleaning',
        baseLabor: 699,
        partsEst: 150,
        timeEst: '60 mins',
        description: 'Anti-allergen shampoo injection, motorized brushing, and heavy suction moisture extraction.',
        warrantyDays: 15,
        unitLabel: 'Furniture Sets',
        icon: '🛋️'
      }
    ],
    'Carpentry': [
      {
        id: 'carp-door',
        name: 'Door Lock, Hydraulic Closer & Hinge Realignment',
        category: 'Carpentry',
        baseLabor: 399,
        partsEst: 450,
        timeEst: '45 mins',
        description: 'Precision mortise lock fitting, anti-drag wooden plane leveling, and concealed hinge calibration.',
        warrantyDays: 30,
        unitLabel: 'Doors',
        icon: '🚪'
      },
      {
        id: 'carp-modular',
        name: 'Modular Kitchen Drawer & Channel Repair',
        category: 'Carpentry',
        baseLabor: 499,
        partsEst: 400,
        timeEst: '60 mins',
        description: 'Telescopic soft-close runner replacement, hydraulic strut lift installation, and laminate edge-banding.',
        warrantyDays: 45,
        unitLabel: 'Drawers',
        icon: '🗄️'
      }
    ],
    'Painting': [
      {
        id: 'paint-waterproof',
        name: 'Wall Dampness & Terrace Waterproofing Barrier',
        category: 'Painting',
        baseLabor: 1299,
        partsEst: 950,
        timeEst: '2 - 3 hours',
        description: 'Crack bridging with elastomeric polymer, 3-coat anti-efflorescence waterproofing membrane application.',
        warrantyDays: 180,
        unitLabel: 'Wall Zones',
        icon: '🛡️'
      }
    ],
    'Pest Control': [
      {
        id: 'pest-termite',
        name: 'Total Herbal Gel + Spray Pest Shield',
        category: 'Pest Control',
        baseLabor: 899,
        partsEst: 200,
        timeEst: '60 mins',
        description: 'Odorless fipronil dot baiting in kitchen cabinets, micro-spray along baseboards & drain inlet treatment.',
        warrantyDays: 90,
        unitLabel: 'Apartments',
        icon: '🛡️'
      }
    ],
    'Moving': [
      {
        id: 'move-mini',
        name: 'Local City Express Shifting with Helpers',
        category: 'Moving',
        baseLabor: 2199,
        partsEst: 350,
        timeEst: '3 - 4 hours',
        description: 'Multi-layer corrugated & bubble packing of delicate items, dedicated cargo carrier & master lifters.',
        warrantyDays: 30,
        unitLabel: 'Loads',
        icon: '🚚'
      }
    ]
  };

  const currentOptions = serviceCatalog[selectedCategory] || serviceCatalog['AC Repair'];
  const activeService = currentOptions.find(o => o.id === selectedServiceId) || currentOptions[0];

  // Price Math
  const baseInspection = 199; // Standard Visiting & Diagnostic Fee included
  const calculatedLabor = (activeService.baseLabor * quantity);
  const calculatedParts = (activeService.partsEst * quantity);
  const warrantyCost = includeMaterialWarranty ? 99 : 0;
  const emergencySurge = isUrgentEmergency ? 249 : 0;
  const subtotal = baseInspection + calculatedLabor + calculatedParts + warrantyCost + emergencySurge;
  const promoSavings = 199; // First order discount
  const finalEstimate = Math.max(199, subtotal - promoSavings);

  const handleBookNow = () => {
    onSelectCategory(selectedCategory);
    onTransition('booking');
    showNotification(`✓ Estimate loaded: ${activeService.name} (${quantity} ${activeService.unitLabel})`);
  };

  return (
    <section id="pricing-estimator-section" className="w-full bg-[#081226] border border-[#c5a059]/30 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-zinc-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/20 text-[#e9c176] text-xs font-mono font-bold uppercase tracking-wider mb-2 border border-[#c5a059]/40">
            <Calculator className="w-3.5 h-3.5" />
            <span>Service requirements</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Choose your service requirements
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Choose the work scope and any optional requirements. The team will confirm the quotation before proceeding.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
          <Shield className="w-4 h-4" />
          <span>CLEAR BOOKING DETAILS</span>
        </div>
      </div>

      {/* Category Pills Selector */}
      <div className="py-6 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2.5 min-w-max pb-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  const firstOpt = serviceCatalog[cat.id]?.[0];
                  if (firstOpt) setSelectedServiceId(firstOpt.id);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#c5a059] text-black border-[#e9c176] shadow-lg shadow-[#c5a059]/30 scale-[1.02]'
                    : 'bg-[#0e1b38] text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[#e9c176]'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Service Sub-Type and Scope Controls */}
        <div className="lg:col-span-7 space-y-5">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
            Step 1: Select Exact Service Scope ({selectedCategory})
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentOptions.map((opt) => {
              const isActive = opt.id === activeService.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedServiceId(opt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isActive
                      ? 'bg-[#11234a] border-[#c5a059] shadow-lg shadow-[#c5a059]/20'
                      : 'bg-[#0a1630] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#0d1c3e]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{opt.icon}</span>
                      {isActive && (
                        <span className="w-5 h-5 rounded-full bg-[#c5a059] text-black flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white leading-snug">{opt.name}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{opt.description}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#c5a059]" /> {opt.timeEst}
                    </span>
                    <span className="text-[#e9c176] font-bold">Select</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scope Adjusters: Quantity / Units */}
          <div className="p-4 rounded-2xl bg-[#0a1630] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">Quantity / Work Volume</span>
                <p className="text-[11px] text-zinc-400">Total {activeService.unitLabel.toLowerCase()} requiring service</p>
              </div>

              <div className="flex items-center gap-3 bg-[#07122a] border border-zinc-700 px-3 py-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-white text-base min-w-[20px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMaterialWarranty}
                  onChange={(e) => setIncludeMaterialWarranty(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c5a059] focus:ring-[#c5a059] accent-[#c5a059] bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs text-zinc-300">
                  Include <strong>Extended {activeService.warrantyDays}-Day Master Warranty Protection</strong> 
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgentEmergency}
                  onChange={(e) => setIsUrgentEmergency(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c5a059] focus:ring-[#c5a059] accent-[#c5a059] bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs text-zinc-300">
                  Priority <strong>Instant Emergency Fast-Track Dispatch</strong> 
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Price Summary Card */}
        <div className="lg:col-span-5 bg-[#0e1b38] border border-[#c5a059]/40 rounded-3xl p-6 shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a059] font-bold">
                BOOKING SUMMARY
              </span>
              <h3 className="text-lg font-bold text-white leading-tight mt-0.5">
                {activeService.name}
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#c5a059]/20 text-[#e9c176] font-mono font-bold border border-[#c5a059]/40">
              {quantity} {activeService.unitLabel}
            </span>
          </div>

          {/* Public-facing quotation is confirmed separately; no price breakdown is shown here. */}
          <div className="py-4 space-y-2.5 text-xs text-zinc-300 font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Visit and inspection:</span>
              <span className="text-white"></span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Service scope:</span>
              <span className="text-white"></span>
            </div>

            {calculatedParts > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Parts and consumables:</span>
                <span className="text-white"></span>
              </div>
            )}

            {includeMaterialWarranty && (
              <div className="flex justify-between text-emerald-400">
                <span>Extended {activeService.warrantyDays}-Day Revisit Guarantee:</span>
                <span>+</span>
              </div>
            )}

            {isUrgentEmergency && (
              <div className="flex justify-between text-amber-400">
                <span>Emergency Priority Dispatch:</span>
                <span>+</span>
              </div>
            )}

            <div className="flex justify-between text-emerald-400">
              <span>Offer:</span>
              <span>-</span>
            </div>
          </div>

          {/* No public total or rate is rendered. */}
          <div className="p-4 rounded-2xl bg-[#081226] border border-[#c5a059]/50 my-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Quotation
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#e9c176] font-mono tracking-tight">
                
              </span>
            </div>

            <div className="text-right text-[10px] text-zinc-400 font-mono">
              <span className="text-emerald-400 font-bold block">✓ Pay After Service</span>
              <span>Online UPI / Cash</span>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            id="book-calculated-estimate-btn"
            onClick={handleBookNow}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-sm tracking-wide transition-all shadow-xl shadow-[#c5a059]/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>Continue booking</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-zinc-400 text-center mt-3 leading-relaxed">
            No public prices are displayed. Final quotation is confirmed before the booking is authorised.
          </p>
        </div>
      </div>
    </section>
  );
}
