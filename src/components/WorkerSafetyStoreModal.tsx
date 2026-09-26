import React, { useState } from 'react';
import { Shield, ShoppingBag, X, Check, Truck, Award, Sparkles, Wrench } from 'lucide-react';

interface WorkerSafetyStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string) => void;
}

export default function WorkerSafetyStoreModal({
  isOpen,
  onClose,
  showNotification
}: WorkerSafetyStoreModalProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isOrdered, setIsOrdered] = useState<boolean>(false);

  if (!isOpen) return null;

  const kitItems = [
    {
      id: 'gear-boots',
      name: 'PunchX Anti-Slip Insulated Safety Boots',
      category: 'Safety PPE',
      price: 1299,
      points: 450,
      desc: '1000V electric shock-proof rubber sole with steel-toe cap protection.',
      icon: '🥾'
    },
    {
      id: 'gear-multimeter',
      name: 'Digital True-RMS Auto-Ranging Multimeter',
      category: 'Diagnostic Tools',
      price: 1599,
      points: 600,
      desc: 'Non-contact AC voltage sensor, backlit display & temperature probe.',
      icon: '📟'
    },
    {
      id: 'gear-uniform',
      name: 'Standardized PunchX Polo & Tool Belt (Set of 2)',
      category: 'Apparel',
      price: 799,
      points: 300,
      desc: 'Breathable reinforced polyester fabric with heavy-duty leather holster.',
      icon: '👕'
    },
    {
      id: 'gear-gloves',
      name: 'High-Tension Heavy Duty Insulated Gloves',
      category: 'Safety PPE',
      price: 499,
      points: 150,
      desc: 'Class 0 rated 1000V electrical work gloves with chemical-resistant grip.',
      icon: '🧤'
    },
    {
      id: 'gear-bag',
      name: 'Waterproof Hard-Bottom Specialist Backpack',
      category: 'Tool Storage',
      price: 1199,
      points: 400,
      desc: '32 dedicated tool slots, reinforced base, and reflective safety strips.',
      icon: '🎒'
    }
  ];

  const toggleItem = (id: string) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCost = Object.keys(selectedItems)
    .filter(k => selectedItems[k])
    .reduce((sum, id) => {
      const itm = kitItems.find(i => i.id === id);
      return sum + (itm ? itm.price : 0);
    }, 0);

  const totalItemsCount = Object.values(selectedItems).filter(Boolean).length;

  const handlePlaceOrder = () => {
    if (totalItemsCount === 0) {
      showNotification('⚠️ Please select at least one item from the safety store.');
      return;
    }
    setIsOrdered(true);
    showNotification('✓ Partner Kit Order dispatched! Free hub delivery within 24 hours.');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#07122a] border border-[#c5a059]/40 rounded-3xl max-w-xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-5 bg-[#0a1736] border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a059] font-bold">
                PARTNER PROCUREMENT STORE
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                Specialist Safety Gear & Toolkits
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isOrdered ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Safety Gear Order Dispatched</h4>
              <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                Your order of <strong>{totalItemsCount} item(s)</strong> worth <strong>₹{totalCost}</strong> has been confirmed. The equipment will be delivered directly to your registered Kolkata hub address within 24 hours. The cost will be automatically deducted from your partner weekly payout ledger.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => {
                    setIsOrdered(false);
                    setSelectedItems({});
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-bold text-xs transition-all cursor-pointer"
                >
                  Close Store
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-2xl bg-[#0e1f42] border border-[#c5a059]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>Free doorstep delivery for verified partner specialists</span>
                </div>
                <span className="text-[#e9c176] font-mono font-bold">SUBSIDIZED RATES</span>
              </div>

              <div className="space-y-3">
                {kitItems.map((item) => {
                  const isChecked = !!selectedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                        isChecked
                          ? 'bg-[#11244e] border-[#c5a059] shadow-md'
                          : 'bg-[#09152e] border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">{item.name}</h4>
                            <span className="text-[9px] font-mono text-[#c5a059] bg-[#c5a059]/10 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-[#e9c176] font-mono">₹{item.price}</div>
                        <div className={`text-[10px] font-mono font-bold mt-1 px-2 py-0.5 rounded ${
                          isChecked ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {isChecked ? 'SELECTED' : '+ ADD'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Order Bar */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block">TOTAL SUBSIDIZED COST</span>
                  <span className="text-xl font-bold text-white font-mono">₹{totalCost}</span>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={totalItemsCount === 0}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-lg ${
                    totalItemsCount > 0
                      ? 'bg-[#c5a059] hover:bg-[#e9c176] text-black shadow-[#c5a059]/25'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order {totalItemsCount > 0 ? `(${totalItemsCount})` : ''} to Hub</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
