import React from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Award, FileText } from 'lucide-react';
import PUNCHX_LOGO from '../assets/logo';

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    category: string;
    workerName?: string;
    customerName?: string;
    customerAddress?: string;
    price: number;
    date?: string;
    time?: string;
    paymentMethod?: string;
    status?: string;
  } | null;
}

export default function InvoiceReceiptModal({
  isOpen,
  onClose,
  order
}: InvoiceReceiptModalProps) {
  if (!isOpen || !order) return null;

  const invoiceNo = `PX-INV-${order.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
  const invoiceDate = order.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const baseRate = Math.round(order.price * 0.82);
  const gstRate = Math.round(order.price * 0.18);
  const total = order.price;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white text-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 bg-zinc-100 border-b border-zinc-200 flex justify-between items-center print:hidden rounded-t-3xl">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#c5a059]" />
            <span className="font-mono text-xs font-bold text-zinc-700">TAX INVOICE & WARRANTY CERTIFICATE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Sheet */}
        <div id="printable-invoice" className="p-8 space-y-6 bg-white">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-zinc-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-[#c5a059] flex items-center justify-center p-1">
                  <img src={PUNCHX_LOGO} alt="PunchX" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-zinc-900">
                    PUNCH<span className="text-[#c5a059]">X</span> SERVICES
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 font-bold">PUNCHX PLATFORM PVT. LTD.</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 pt-1">
                Indiranagar Prestige Tech Center, Kolkata, KA - 560038
              </p>
            </div>

            <div className="text-right font-mono">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                PAID & COMPLETED
              </span>
              <div className="text-xs text-zinc-500">Invoice No:</div>
              <div className="text-sm font-bold text-zinc-900">{invoiceNo}</div>
              <div className="text-xs text-zinc-500 mt-1">Date: {invoiceDate}</div>
            </div>
          </div>

          {/* Billed To / Service Technician Details */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
            <div>
              <span className="font-mono font-bold text-zinc-400 uppercase text-[10px] block mb-1">CUSTOMER DETAILS</span>
              <div className="font-bold text-zinc-900">{order.customerName || 'Verified Citizen'}</div>
              <div className="text-zinc-600 text-[11px] mt-0.5">{order.customerAddress || 'Kolkata, West Bengal'}</div>
              <div className="text-zinc-500 font-mono text-[10px] mt-1">Payment: {order.paymentMethod || 'UPI / Digital Gateway'}</div>
            </div>

            <div>
              <span className="font-mono font-bold text-zinc-400 uppercase text-[10px] block mb-1">VERIFIED SPECIALIST</span>
              <div className="font-bold text-zinc-900 flex items-center gap-1">
                {order.workerName || 'Rajesh Kumar'}
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-zinc-600 text-[11px] mt-0.5">{order.category} Master Guild</div>
              <div className="text-emerald-700 font-mono text-[10px] mt-1">✓ Police & Aadhaar Verified</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b-2 border-zinc-200 font-mono text-zinc-500 text-[11px]">
                  <th className="py-2.5">DESCRIPTION OF SERVICE</th>
                  <th className="py-2.5 text-center">HSN/SAC</th>
                  <th className="py-2.5 text-right">AMOUNT (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                <tr>
                  <td className="py-3">
                    <div className="font-bold">{order.category} On-Site Diagnostic & Labor</div>
                    <div className="text-[11px] text-zinc-500">Standard Doorstep Visit + Master Technician Repair Work</div>
                  </td>
                  <td className="py-3 text-center font-mono text-zinc-500">998719</td>
                  <td className="py-3 text-right font-mono font-bold">₹{baseRate}</td>
                </tr>
                <tr>
                  <td className="py-3">
                    <div className="font-bold">Integrated 18% GST (CGST 9% + SGST 9%)</div>
                    <div className="text-[11px] text-zinc-500">Government service tax component</div>
                  </td>
                  <td className="py-3 text-center font-mono text-zinc-500">-</td>
                  <td className="py-3 text-right font-mono font-bold">₹{gstRate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total & Summary */}
          <div className="pt-4 border-t-2 border-zinc-900 flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <Award className="w-4 h-4 text-[#c5a059]" />
              <span>30-Day PunchX Revisit Warranty Activated</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 font-mono block">TOTAL AMOUNT PAID</span>
              <span className="text-2xl font-black text-zinc-900 font-mono">₹{total}</span>
            </div>
          </div>

          {/* Official Seal & Notes */}
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-[10px] text-zinc-500 leading-relaxed font-mono">
            <strong>Warranty Terms:</strong> This tax invoice serves as your official warranty proof. If recurring issues occur on the serviced fixture within 30 days of this date, contact 1800-PUNCHX-24 for complimentary repair revisit.
          </div>
        </div>
      </div>
    </div>
  );
}
