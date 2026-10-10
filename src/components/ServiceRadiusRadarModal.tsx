import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MapPin, Navigation, Compass, Star, ShieldCheck, CheckCircle, 
  ExternalLink, Layers, Crosshair, RefreshCw, AlertTriangle, Phone, ChevronRight
} from 'lucide-react';
import { Worker, OrderRecord } from '../types';
import { calculateDistanceKm, getCoordinatesForAddressOrSector, buildPunchXCustomerAreaLabels, isServiceAreaMatch } from '../lib/location';

interface ServiceRadiusRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'customer' | 'worker';
  centerLocation: { lat: number; lng: number; address?: string; name?: string; city?: string; area?: string; district?: string; state?: string; postalCode?: string; serviceAreas?: string[] };
  providers?: Worker[];
  workers?: Worker[];
  orders?: OrderRecord[];
  onSelectWorker?: (worker: Worker) => void;
  onSelectOrder?: (order: OrderRecord) => void;
  onRecalibrateGps?: () => void;
}

export default function ServiceRadiusRadarModal({
  isOpen,
  onClose,
  mode,
  centerLocation,
  providers = [],
  workers = [],
  orders = [],
  onSelectWorker,
  onSelectOrder,
  onRecalibrateGps
}: ServiceRadiusRadarModalProps) {
  const activeProviders = providers.length > 0 ? providers : workers;
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [mapType, setMapType] = useState<'radar' | 'satellite' | 'street'>('radar');
  const [isCalibrating, setIsCalibrating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
    }
  }, [isOpen, centerLocation.area, centerLocation.city]);

  if (!isOpen) return null;

  const centerLat = Number.isFinite(centerLocation.lat) ? centerLocation.lat : 22.9734;
  const centerLng = Number.isFinite(centerLocation.lng) ? centerLocation.lng : 78.6569;

  const centerAreaLabels = buildPunchXCustomerAreaLabels({
    area: centerLocation.area, city: centerLocation.city, district: centerLocation.district,
    state: centerLocation.state, pinCode: centerLocation.postalCode, address: centerLocation.address
  });

  // Distances are informational for navigation only. Serviceability uses configured named areas.
  const processedItems = mode === 'customer'
    ? activeProviders.map(p => {
        const coords = (p.location && p.location.lat) ? p.location : getCoordinatesForAddressOrSector(p.address, p.area, p.sector);
        const dist = calculateDistanceKm(centerLat, centerLng, coords.lat, coords.lng);
        const workerAreas = (p as any).serviceAreas || (p as any).geofenceAreas || [p.area, p.sector].filter(Boolean);
        return { ...p, coords, distanceKm: Number.isFinite(dist) ? Math.round(dist * 10) / 10 : null, isWithinZone: isServiceAreaMatch(centerAreaLabels, workerAreas) };
      })
    : orders.map(o => {
        const coords = (o as any).customerLocation?.lat
          ? (o as any).customerLocation
          : getCoordinatesForAddressOrSector(o.customerAddress, o.area, o.sector);
        const dist = calculateDistanceKm(centerLat, centerLng, coords.lat, coords.lng);
        const customerLabels = buildPunchXCustomerAreaLabels({
          area: (o as any).area, locality: (o as any).locality || (o as any).villageArea,
          sector: (o as any).sector, city: (o as any).customerCity || (o as any).city,
          district: (o as any).customerDistrict || (o as any).district,
          state: (o as any).customerState || (o as any).state,
          pinCode: (o as any).customerPinCode || (o as any).pinCode,
          address: o.customerAddress
        });
        const coverage = centerLocation.serviceAreas || [];
        return { ...o, coords, distanceKm: Number.isFinite(dist) ? Math.round(dist * 10) / 10 : null, isWithinZone: coverage.length ? isServiceAreaMatch(customerLabels, coverage) : true };
      });

  // Do not filter on distance or a circular boundary.
  const visibleItems = processedItems;
  const totalServiceableAreas = processedItems.filter(item => item.isWithinZone).length;
  const maxDisplayDistance = Math.max(1, ...processedItems.map(item => Number(item.distanceKm) || 0));

  const handleRefresh = async () => {
    setIsCalibrating(true);
    if (onRecalibrateGps) {
      await onRecalibrateGps();
    }
    setTimeout(() => setIsCalibrating(false), 1200);
  };

  return (
    <div id="service-radius-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        id="service-radius-modal-dialog"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0b1325] border border-[#c5a059]/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative text-white"
      >
        {/* Modal Top Header */}
        <div id="modal-header-bar" className="p-4 sm:p-5 bg-[#0e172e] border-b border-[#c5a059]/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c5a059]/15 border border-[#c5a059]/40 flex items-center justify-center text-[#e9c176]">
              <Compass className="w-5 h-5 animate-spin text-[#e9c176]" style={{ animationDuration: '14s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#e9c176] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/30">
                  Pan-India Service Areas
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  GPS LOCKED
                </span>
              </div>
              <h2 id="radar-dialog-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                {mode === 'customer' ? 'Service Specialists in Covered Areas' : 'Customer Service-Area Dispatch'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="recalibrate-gps-radar-btn"
              onClick={handleRefresh}
              disabled={isCalibrating}
              className="p-2 bg-zinc-800/80 hover:bg-[#c5a059]/20 border border-zinc-700 hover:border-[#c5a059]/40 rounded-xl text-[#c5a059] transition-all cursor-pointer"
              title="Recalibrate GPS Coordinates"
            >
              <RefreshCw className={`w-4 h-4 ${isCalibrating ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="close-radar-modal-btn"
              onClick={onClose}
              className="p-2 bg-zinc-800/80 hover:bg-red-500/20 hover:border-red-500/40 border border-zinc-700 rounded-xl text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader: Center Info & Radius Indicator */}
        <div className="bg-[#071022] px-4 py-2.5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <MapPin className="w-3.5 h-3.5 text-[#e9c176] flex-shrink-0" />
            <span className="font-mono text-[11px] text-zinc-400">Hub:</span>
            <span className="font-bold text-white truncate max-w-xs">{centerLocation.address || 'Active Geolocation'}</span>
            <span className="text-[10px] font-mono text-[#e9c176]/80">
              ({centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#c5a059]/10 border border-[#c5a059]/30 px-3 py-1 rounded-full text-[#e9c176] font-mono text-[11px] font-bold">
              <span>Area matches:</span>
              <span className="text-white font-extrabold">{totalServiceableAreas}</span>
              <span className="text-zinc-400">of {visibleItems.length} shown</span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg">
              <button
                onClick={() => setMapType('radar')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${mapType === 'radar' ? 'bg-[#c5a059] text-black shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Radar
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-all ${mapType === 'satellite' ? 'bg-[#c5a059] text-black shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                Satellite
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Map Canvas & List Panels */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[420px]">
          
          {/* Left / Center: Interactive GPS Radar Map View (7 cols) */}
          <div className="md:col-span-7 bg-[#050b18] relative flex items-center justify-center p-4 overflow-hidden border-b md:border-b-0 md:border-r border-zinc-800">
            
            {/* Visual Radar Rings & Crosshairs */}
            <div className="relative w-full aspect-square max-w-[380px] max-h-[380px] flex items-center justify-center">
              
              {/* No circular geofence: the overlay describes locality coverage only. */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full border border-[#c5a059]/40 bg-[#07122a]/90 px-3 py-1 text-[9px] font-mono font-bold text-[#e9c176] whitespace-nowrap">NAMED AREAS · NOT TO SCALE</div>

              {/* Radar Grid axes */}
              <div className="absolute w-full h-[1px] bg-[#c5a059]/15"></div>
              <div className="absolute h-full w-[1px] bg-[#c5a059]/15"></div>

              {/* Sweeping Radar beam effect (radar mode only) */}
              {mapType === 'radar' && (
                <div 
                  className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(197, 160, 89, 0.3) 0deg, rgba(197, 160, 89, 0.05) 60deg, transparent 90deg)',
                    animation: 'spin 6s linear infinite'
                  }}
                />
              )}

              {/* Center User Pin */}
              <div className="relative z-20 flex flex-col items-center">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.8)] border-2 border-white animate-pulse">
                    <Navigation className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute -inset-2 rounded-full border border-blue-400 animate-ping opacity-60 pointer-events-none"></div>
                </div>
                <span className="text-[10px] font-bold font-mono bg-blue-950/90 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/40 mt-1 shadow whitespace-nowrap">
                  {mode === 'customer' ? 'Your Location' : 'Worker Service Hub'}
                </span>
              </div>

              {/* Pins show location context; distance is not used to decide serviceability. */}
              {visibleItems.map((item, idx) => {
                // Calculate geometric angle & radial distance from center
                const dLat = item.coords.lat - centerLat;
                const dLng = item.coords.lng - centerLng;
                
                // Spread location pins for visualization only; this is not a service boundary.
                const distanceRatio = Math.min((Number(item.distanceKm) || 0) / maxDisplayDistance, 1);
                const angle = Math.atan2(dLat, dLng);
                const radiusPx = distanceRatio * 150; // max radius inside 380px box
                
                const leftPos = Math.cos(angle) * radiusPx;
                const topPos = -Math.sin(angle) * radiusPx; // invert Y for screen coords

                const isSelected = selectedItem?.id === item.id;
                const isServiceable = item.isWithinZone;

                const itemAny = item as any;
                const displayName = itemAny.name || itemAny.workerName || itemAny.category || 'Specialist';
                const displayAvatar = itemAny.avatar || itemAny.workerAvatar;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      transform: `translate(${leftPos}px, ${topPos}px)`,
                      position: 'absolute',
                      zIndex: isSelected ? 30 : 25
                    }}
                    className="cursor-pointer group flex flex-col items-center transition-all duration-300"
                  >
                    <div className={`p-1 rounded-full border transition-all ${
                      isSelected 
                        ? 'bg-[#c5a059] border-white scale-125 shadow-[0_0_20px_rgba(197,160,89,1)]' 
                        : isWithin15Km 
                          ? 'bg-[#121f3d] border-[#c5a059] hover:border-white shadow-md hover:scale-110' 
                          : 'bg-red-950 border-red-500 shadow-md'
                    }`}>
                      <div className="w-7 h-7 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <MapPin className={`w-3.5 h-3.5 ${isServiceable ? 'text-[#e9c176]' : 'text-red-400'}`} />
                        )}
                      </div>
                    </div>

                    <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold mt-1 shadow-lg whitespace-nowrap transition-all ${
                      isSelected 
                        ? 'bg-[#c5a059] text-black font-extrabold' 
                        : 'bg-[#0b1325]/90 text-zinc-300 border border-zinc-800 group-hover:border-[#c5a059]'
                    }`}>
                      {displayName} ({item.distanceKm == null ? 'Distance unavailable' : item.distanceKm + ' km'})
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Compass rose legend */}
            <div className="absolute bottom-3 left-3 bg-[#0b1325]/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-zinc-400 flex items-center gap-2">
              <span className="text-[#e9c176] font-bold">Named-area coverage:</span>
              <span className="text-emerald-400">{totalWithinServiceRadius} area matches</span>
            </div>

          </div>

          {/* Right: Item List & Details Card (5 cols) */}
          <div className="md:col-span-5 bg-[#0b1325] flex flex-col justify-between overflow-y-auto max-h-[460px] p-4 border-t md:border-t-0">
            
            {selectedItem ? (
              /* Selected Provider or Order Detailed Card */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#e9c176] bg-[#c5a059]/10 px-2.5 py-0.5 rounded border border-[#c5a059]/30">
                    Selected Location Point
                  </span>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedItem.isWithinZone ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-red-950 text-red-300 border border-red-500/40'
                  }`}>
                    {selectedItem.distanceKm == null ? 'Distance unavailable' : selectedItem.distanceKm + ' km away'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-[#c5a059] flex-shrink-0 shadow-md">
                    <img 
                      src={selectedItem.avatar || selectedItem.workerAvatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200'} 
                      alt={selectedItem.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{selectedItem.name || selectedItem.workerName || selectedItem.category}</h3>
                    <p className="text-xs text-[#e9c176] font-mono">{selectedItem.category || selectedItem.skill || 'Certified Service'}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                        {selectedItem.rating || 5.0}
                      </span>
                      <span>•</span>
                      <span className="text-zinc-300">{selectedItem.address || selectedItem.customerAddress || 'Indiranagar Sector'}</span>
                    </div>
                  </div>
                </div>

                {/* Proximity Verification Notice */}
                <div className="p-3 rounded-2xl border bg-emerald-950/40 border-emerald-500/30 text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-bold text-xs font-mono">
                      {selectedItem.isWithinZone ? '✓ SERVICE AREA MATCH' : 'OUTSIDE CONFIGURED SERVICE AREAS'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {selectedItem.isWithinZone ? 'This location matches the configured named-area coverage. Distance is shown only as navigation context.' : 'This location does not match the configured named service areas.'}
                  </p>
                </div>

                {/* Action CTA */}
                <div className="pt-2">
                  {mode === 'customer' ? (
                    <button
                      id="radar-book-selected-specialist"
                      onClick={() => {
                        if (onSelectWorker) {
                          onSelectWorker(selectedItem);
                        }
                        onClose();
                      }}
                      className="w-full py-3 bg-[#c5a059] hover:bg-[#e9c176] text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Book Specialist Directly</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      id="radar-accept-selected-order"
                      onClick={() => {
                        if (onSelectOrder) {
                          onSelectOrder(selectedItem);
                        }
                        onClose();
                      }}
                      className="w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 bg-[#c5a059] hover:bg-[#e9c176] text-black"
                    >
                      <span>Open Order for Acceptance</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full text-center text-xs text-zinc-400 hover:text-white py-1 cursor-pointer"
                >
                  ← Back to full list
                </button>
              </div>
            ) : (
              /* List of all nearby candidates */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <h4 className="font-bold text-xs uppercase text-zinc-300 font-mono">
                    {mode === 'customer' ? 'Certified Specialists' : 'Proximity Dispatch Feed'}
                  </h4>
                  <span className="text-[10px] font-mono text-[#e9c176] font-bold">
                    {visibleItems.length} available
                  </span>
                </div>

                {visibleItems.length === 0 ? (
                  <div className="p-6 text-center space-y-2 bg-[#081021] rounded-2xl border border-dashed border-zinc-800">
                    <MapPin className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="font-bold text-xs text-zinc-300">not yet started service in your area</p>
                    <p className="text-[11px] text-zinc-500">No active service specialists detected in your vicinity.</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                    {visibleItems.map((item) => {
                      const itemAny = item as any;
                      const displayName = itemAny.name || itemAny.workerName || itemAny.category || 'Specialist';
                      const displayAvatar = itemAny.avatar || itemAny.workerAvatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200';
                      const displaySkill = itemAny.category || itemAny.skill || 'Authorized Specialist';

                      return (
                        <div
                          id={`radar-item-card-${item.id}`}
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="p-3 bg-[#0e172e] hover:bg-[#142142] border border-zinc-800/80 hover:border-[#c5a059]/50 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden border border-[#c5a059]/40 flex-shrink-0">
                              <img 
                                src={displayAvatar} 
                                alt={displayName} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-white group-hover:text-[#e9c176] transition-colors">{displayName}</h5>
                              <p className="text-[10px] text-zinc-400 font-mono">{displaySkill}</p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold font-mono text-[#e9c176] block">
                              {item.distanceKm} km
                            </span>
                            <span className="text-[9px] font-mono text-emerald-400 font-bold">
                              Distance info
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer Summary note */}
            <div className="pt-3 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>Google Maps Grounded GPS</span>
              <span>Proximity Dispatch Active</span>
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
