import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Home, MapPin, ShoppingBag, Trash2, Wallet } from 'lucide-react';
import { AppScreen } from '../types';

interface ConfirmBookingProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  promoApplied: boolean;
  issueDescription: string;
  setIssueDescription: (text: string) => void;
  bookingTime: string;
  setBookingTime: (time: string) => void;
  bookingDate: string;
  setBookingDate: (date: string) => void;
  citizenAddress: string;
  setCitizenAddress: (val: string) => void;
}

type CartItem = { id:string; serviceId?:string; serviceName:string; category:string; subcategory?:string; description?:string; price:number; duration?:string; image?:string; bookingTiming?:'instant'|'later' };
type Address = { house:string; street:string; landmark:string; villageArea:string; city:string; district:string; state:string; pinCode:string };
const EMPTY:Address={house:'',street:'',landmark:'',villageArea:'',city:'',district:'',state:'',pinCode:''};
const dateISO=(value:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(value)?value:'';
const SCHEDULE_SLOTS=Array.from({length:12},(_,i)=>{const minutes=9*60+30+i*30;const h=Math.floor(minutes/60);const m=minutes%60;return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;});
const formatDay=(value:string)=>{const d=new Date(`${value}T12:00:00`);return {weekday:d.toLocaleDateString('en-IN',{weekday:'short'}),day:d.toLocaleDateString('en-IN',{day:'2-digit'}),month:d.toLocaleDateString('en-IN',{month:'short'})};};
const loadJSON = <T,>(key:string, fallback:T):T => { try { const v=JSON.parse(localStorage.getItem(key)||'null'); return v ?? fallback; } catch { return fallback; } };
const saveJSON = (key:string, value:unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

export default function ConfirmBooking({ onTransition, bookingTime, setBookingTime, bookingDate, setBookingDate, citizenAddress, setCitizenAddress }:ConfirmBookingProps){
  const [cart,setCart]=useState<CartItem[]>(() => loadJSON<CartItem[]>('punchx_cart',[]));
  const [address,setAddress]=useState<Address>(() => ({...EMPTY,...loadJSON<Partial<Address>>('punchx_residential_address',{})}));
  const [date,setDate]=useState(()=>dateISO(bookingDate)||new Date(Date.now()+86400000).toLocaleDateString('en-CA'));
  const [time,setTime]=useState(()=>SCHEDULE_SLOTS.includes(bookingTime)?bookingTime:'');
  const [note,setNote]=useState('');
  const [geofenceError,setGeofenceError]=useState('');
  const [validatingGeofence,setValidatingGeofence]=useState(false);


  useEffect(() => {
    const pending = loadJSON<any>('punchx_pending_booking', null);
    if (!cart.length && pending?.serviceName) {
      setCart([{ id:`pending-${pending.serviceName}`, serviceId:pending.serviceId, serviceName:pending.serviceName, category:pending.category||'Service', description:pending.description, price:0, duration:pending.duration }]);
    }
  }, []);

  const estimatedDuration=cart.map(item=>item.duration).filter(Boolean)[0] || 'Confirmed after request review';
  const scheduleDays=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d.toLocaleDateString('en-CA');});
  const addressText=[address.house,address.street,address.landmark,address.villageArea,address.city,address.district,address.state,address.pinCode].filter(Boolean).join(', ');
  const validAddress=Object.values(address).every(v=>String(v).trim().length>0);
  const valid=cart.length>0&&validAddress&&date&&time;

  const removeItem=(id:string)=>{const next=cart.filter(item=>item.id!==id);setCart(next);saveJSON('punchx_cart',next);};
  const saveAndPay=async()=>{
    if(!valid||validatingGeofence)return;
    setGeofenceError('');
    setValidatingGeofence(true);
    try {
      setCitizenAddress(addressText);
      setBookingDate(date);
      setBookingTime(time);
      saveJSON('punchx_residential_address',address);
      localStorage.setItem('punchx_residential_address_label',addressText);
      saveJSON('punchx_pending_booking',{
        cart,
        bookingTiming:cart[0]?.bookingTiming||'later',
        serviceId:cart[0]?.serviceId||null,
        serviceName:cart.length===1?cart[0].serviceName:`${cart.length} PUNCHX services`,
        category:cart[0]?.category||'Home Services',
        description:cart.map(item=>item.serviceName).join(', '),
        address:addressText,
        residentialAddress:address,
        addressCoordinates:null,
        geofenceArea:address.villageArea,
        geofenceCity:address.city,
        serviceAreaMatch:null,
        serviceAreasChecked:false,
        serviceAvailabilityChecked:false,
        serviceAvailable:false,
        date,
        time,
        workerId:null,
        workerName:null,
        workerIsDemo:false,
        isPersonalSelection:false,
        dispatchMode:'AREA_MATCH',
        hasWarrantyGuarantee:false,
        warrantyFee:0,
        note
      });
      onTransition('payment');
    } catch {
      setGeofenceError('We could not save these request details. Please try again.');
    } finally {
      setValidatingGeofence(false);
    }
  };

  return <div id="punchx-booking-flow" className="min-h-screen bg-[#f7faff] pb-28 text-[#0f172a]">
    <header className="sticky top-0 z-50 border-b border-[#dbeafe] bg-white/95 px-3 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={()=>{if(window.history.state?.screen==='booking'&&window.history.length>1)window.history.back();else onTransition('providers');}} aria-label="Back to service catalogue" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]"><ArrowLeft className="h-5 w-5"/></button><div><div className="text-[10px] font-black uppercase tracking-wider text-[#94703a]">PUNCHX SERVICE REQUEST</div><h1 className="text-lg font-black">Review your request</h1></div></div></header>
    <main id="punchx-booking-flow" className="punchx-citizen-main mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-7 sm:py-8">
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563eb]">Cart</div><h2 className="mt-1 text-xl font-black">{cart.length} service{cart.length===1?'':'s'} added</h2></div><ShoppingBag className="h-6 w-6 text-[#2563eb]"/></div>{cart.length===0?<div className="mt-4 rounded-2xl bg-[#f8fbff] p-5 text-center text-sm font-bold text-[#64748b]">Your cart is empty. Add an available exact service first.</div>:<div className="mt-4 space-y-3">{cart.map(item=><div key={item.id} className="flex gap-3 rounded-2xl border border-[#e5eefb] p-3"><img src={item.image||'/placeholder.svg'} alt="" className="h-16 w-16 rounded-xl object-cover bg-[#eef6ff]"/><div className="min-w-0 flex-1"><div className="font-black">{item.serviceName}</div><div className="mt-1 text-[10px] text-[#64748b]">{item.category}{item.subcategory?` · ${item.subcategory}`:''}</div><div className="mt-2 rounded-xl bg-[#f8fbff] p-2 text-xs leading-5 text-[#64748b]"><span className="font-black text-[#2563eb]">Price not defined yet.</span> Product/material costs are not included in this pricing. The worker will charge separately for products according to the quality you choose. Please confirm the product and its price with the worker before purchase.</div></div><button onClick={()=>removeItem(item.id)} aria-label="Remove service" className="h-9 w-9 rounded-xl bg-[#fff1f2] text-[#dc2626]"><Trash2 className="mx-auto h-4 w-4"/></button></div>)}</div>}</section>
      <section className="overflow-hidden rounded-3xl border border-[#dbeafe] bg-white shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#2563eb]"/><h2 className="font-black text-lg">Select date and time</h2></div>
          <p className="mt-1 text-sm text-[#64748b]">Estimated duration: {estimatedDuration}</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{scheduleDays.map(day=>{const parts=formatDay(day);const active=date===day;return <button type="button" key={day} onClick={()=>{setDate(day);setTime('');}} aria-pressed={active} className={`min-w-[72px] shrink-0 rounded-2xl border px-3 py-3 text-center transition ${active?'border-[#7358d7] bg-[#f3f0ff] text-[#5b45c7] ring-1 ring-[#7358d7]':'border-[#e5e7eb] bg-white text-[#454954] hover:border-[#b7a9f2]'}`}><span className="block text-xs">{parts.weekday}</span><span className="mt-1 block text-xl font-black">{parts.day}</span><span className="block text-[10px]">{parts.month}</span></button>;})}</div>
          <div className="my-4 border-t border-dashed border-[#d8dce5]"/>
          <p className="mb-3 text-xs font-bold text-[#64748b]">Choose a preferred start time</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SCHEDULE_SLOTS.map(slot=>{const active=time===slot;return <button type="button" key={slot} onClick={()=>setTime(slot)} aria-pressed={active} className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-semibold transition ${active?'border-[#7358d7] bg-[#f3f0ff] text-[#5b45c7] ring-1 ring-[#7358d7]':'border-[#e5e7eb] bg-white text-[#343741] hover:border-[#b7a9f2]'}`}>{slot}</button>;})}</div>
          <p className="mt-3 text-[10px] leading-4 text-[#858995]">This is your preferred slot, not a confirmed appointment. The PUNCHX team confirms availability after review.</p>
        </div>
      </section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Home className="h-5 w-5 text-[#2563eb]"/><div><h2 className="font-black">Confirm residential address</h2><p className="text-[10px] text-[#64748b]">The PUNCHX team uses this address to review serviceability and coordinate the request.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['house','House / Flat / Building'],['street','Street / Road'],['landmark','Landmark'],['villageArea','Village / Area'],['city','City'],['district','District'],['state','State'],['pinCode','PIN code']] as const).map(([key,label])=><label key={key} className="text-[10px] font-black text-[#64748b]">{label}<input value={address[key]} onChange={e=>setAddress({...address,[key]:e.target.value})} placeholder={label} className="mt-1 w-full rounded-xl border border-[#dbeafe] p-3 text-sm font-semibold outline-none"/></label>)}</div>{addressText&&<div className="mt-3 rounded-xl bg-[#eef6ff] p-3 text-xs font-semibold text-[#1e3a5f]"><MapPin className="mr-1 inline h-3.5 w-3.5 text-[#2563eb]"/>{addressText}</div>}</section>

      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><label className="text-xs font-black">Special instructions <span className="font-normal text-[#64748b]">(optional)</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Share details that will help the PUNCHX team understand your request…" className="mt-2 min-h-20 w-full rounded-xl border border-[#dbeafe] p-3 text-sm outline-none"/></label></section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[#2563eb]"/><h2 className="font-black">Quotation & payment</h2></div><p className="mt-3 text-sm leading-6 text-[#64748b]">No payment is collected with this request. The itemised quotation and payment instructions are shared after the PUNCHX team reviews the request and coordinates the next step.</p></section>
    </main>
    {geofenceError&&<div role="alert" className="mx-auto mb-24 max-w-3xl px-3"><div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{geofenceError}</div></div>}
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#dbeafe] bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(37,99,235,.12)] backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Booking request</div><div className="text-sm font-black">Continue to request submission</div></div><button onClick={saveAndPay} disabled={!valid||validatingGeofence} className="rounded-2xl bg-[#2563eb] px-4 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-black text-white whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40">{validatingGeofence?'Saving request details…':'Continue to submit request'} <ArrowRight className="ml-1 inline h-4 w-4"/></button></div></div>
  </div>;
}
