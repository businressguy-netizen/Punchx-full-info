import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Home, MapPin, Plus, ShoppingBag, Trash2, UserRound, Wallet, X } from 'lucide-react';
import { AppScreen, Worker } from '../types';
import { calculateDistanceKm, getServiceRadiusKm, isSameServiceCity } from '../lib/location';
import { auth } from '../lib/firebase';
import { calculatePunchXPricing, formatINR } from '../config/punchxCommerce';
import { DEMO_PROFESSIONALS } from '../data/demoProfessionals';
import { fetchApprovedProfessionals } from '../services/professionalDirectory';

interface ConfirmBookingProps {
  onTransition: (target: AppScreen) => void;
  selectedCategory: string;
  selectedWorker: Worker | null;
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
const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PROFESSIONALS === 'true';
const loadJSON = <T,>(key:string, fallback:T):T => { try { const v=JSON.parse(localStorage.getItem(key)||'null'); return v ?? fallback; } catch { return fallback; } };
const saveJSON = (key:string, value:unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

export default function ConfirmBooking({ onTransition, selectedWorker, bookingTime, setBookingTime, bookingDate, setBookingDate, citizenAddress, setCitizenAddress }:ConfirmBookingProps){
  const [cart,setCart]=useState<CartItem[]>(() => loadJSON<CartItem[]>('punchx_cart',[]));
  const [address,setAddress]=useState<Address>(() => ({...EMPTY,...loadJSON<Partial<Address>>('punchx_residential_address',{})}));
  const [date,setDate]=useState(bookingDate || '');
  const [time,setTime]=useState(bookingTime || '');
  const [workers,setWorkers]=useState<Worker[]>([]);
  const [customWorker,setCustomWorker]=useState<Worker|null>(() => loadJSON<Worker|null>('punchx_cart_selected_worker',null));
  const [chooseWorker,setChooseWorker]=useState(false);
  const [warranty,setWarranty]=useState(false);
  const [note,setNote]=useState('');
  const [geofenceError,setGeofenceError]=useState('');
  const [validatingGeofence,setValidatingGeofence]=useState(false);

  const customerGeo = useMemo(() => { try { const v=JSON.parse(localStorage.getItem('punchx_user_location')||'null'); return v&&typeof v.lat==='number'&&typeof v.lng==='number'?v:null; } catch { return null; } }, []);
  const serviceRadiusKm = getServiceRadiusKm(customerGeo?.city || customerGeo?.area);

  useEffect(() => {
    const pending = loadJSON<any>('punchx_pending_booking', null);
    if (!cart.length && pending?.serviceName) {
      setCart([{ id:`pending-${pending.serviceName}`, serviceId:pending.serviceId, serviceName:pending.serviceName, category:pending.category||'Service', description:pending.description, price:Number(pending.price||0), duration:pending.duration }]);
    }
    let active = true;
    void fetchApprovedProfessionals().then(approved => {
      if (!active) return;
      const timing = (cart[0]?.bookingTiming || pending?.bookingTiming || 'later') as 'instant'|'later';
      const visible = approved.filter(worker => {
        if (timing === 'instant' && worker.isOnline !== true) return false;
        if (customerGeo && worker.location) return calculateDistanceKm(customerGeo.lat, customerGeo.lng, worker.location.lat, worker.location.lng) <= serviceRadiusKm;
        const workerCity = String((worker as any).city || worker.address || worker.area || worker.sector || '');
        return Boolean(customerGeo?.city && isSameServiceCity(customerGeo.city, workerCity));
      });
      setWorkers(DEMO_ENABLED ? [...DEMO_PROFESSIONALS, ...visible] : visible);
    }).catch(() => {
      if (active) setWorkers(DEMO_ENABLED ? DEMO_PROFESSIONALS : []);
    });
    return () => { active = false; };
  }, []);

  const serviceValue=useMemo(()=>cart.reduce((sum,item)=>sum+Number(item.price||0),0),[cart]);
  const pricing=useMemo(()=>calculatePunchXPricing(serviceValue),[serviceValue]);
  const warrantyFee=warranty?9:0;
  const total=pricing.customerTotal+warrantyFee;
  const addressText=[address.house,address.street,address.landmark,address.villageArea,address.city,address.district,address.state,address.pinCode].filter(Boolean).join(', ');
  const validAddress=Object.values(address).every(v=>String(v).trim().length>0);
  const valid=cart.length>0&&validAddress&&date&&time;

  const removeItem=(id:string)=>{const next=cart.filter(item=>item.id!==id);setCart(next);saveJSON('punchx_cart',next);};
  const saveAndPay=async()=>{
    if(!valid||validatingGeofence)return;
    setGeofenceError('');
    if(!customerGeo){setGeofenceError('Enable location access and detect your service area before continuing.');return;}
    setValidatingGeofence(true);
    try {
      const token=auth.currentUser?await auth.currentUser.getIdToken():'';
      const response=await fetch('/api/maps/geocode',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({address:addressText,area:address.villageArea})});
      if(!response.ok)throw new Error('ADDRESS_UNVERIFIED');
      const resolved=await response.json();
      if(typeof resolved.lat!=='number'||typeof resolved.lng!=='number')throw new Error('ADDRESS_UNVERIFIED');
      const distanceKm=calculateDistanceKm(customerGeo.lat,customerGeo.lng,resolved.lat,resolved.lng);
      if(distanceKm>serviceRadiusKm){setGeofenceError(`This address is ${distanceKm.toFixed(1)} km from your detected ${customerGeo.city||customerGeo.area||'service area'}. PUNCHX currently serves within ${serviceRadiusKm} km here. Choose an address inside this zone.`);return;}
      setCitizenAddress(addressText);setBookingDate(date);setBookingTime(time);
      saveJSON('punchx_residential_address',address);localStorage.setItem('punchx_residential_address_label',addressText);
      const selected=customWorker||selectedWorker;
      saveJSON('punchx_pending_booking',{cart,bookingTiming:cart[0]?.bookingTiming||'later',serviceId:cart[0]?.serviceId||null,serviceName:cart.length===1?cart[0].serviceName:`${cart.length} PUNCHX services`,category:cart[0]?.category||'Home Services',description:cart.map(x=>x.serviceName).join(', '),price:serviceValue,address:addressText,residentialAddress:address,addressCoordinates:{lat:resolved.lat,lng:resolved.lng},distanceFromDetectedAreaKm:distanceKm,geofenceArea:customerGeo.area||'',geofenceCity:customerGeo.city||'',geofenceRadiusKm:serviceRadiusKm,serviceAvailabilityChecked:true,serviceAvailable:true,date,time,workerId:selected?.id||null,workerName:selected?.name||null,workerIsDemo:Boolean(selected?.id?.startsWith('demo-')),isPersonalSelection:Boolean(selected),hasWarrantyGuarantee:warranty,warrantyFee,customerTotal:total,note});
      onTransition('payment');
    } catch { setGeofenceError('We could not verify this address. Check the address and location permission, then try again.'); }
    finally { setValidatingGeofence(false); }
  };

  return <div id="booking-container" className="min-h-screen bg-[#f7faff] pb-28 text-[#0f172a]">
    <header className="sticky top-0 z-50 border-b border-[#dbeafe] bg-white/95 px-3 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={()=>onTransition('providers')} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]"><ArrowLeft className="h-5 w-5"/></button><div><div className="text-[10px] font-black uppercase tracking-wider text-[#2563eb]">PUNCHX CART</div><h1 className="text-lg font-black">Review your bookings</h1></div></div></header>
    <main className="punchx-citizen-main mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-6 sm:py-7">
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563eb]">Cart</div><h2 className="mt-1 text-xl font-black">{cart.length} service{cart.length===1?'':'s'} added</h2></div><ShoppingBag className="h-6 w-6 text-[#2563eb]"/></div>{cart.length===0?<div className="mt-4 rounded-2xl bg-[#f8fbff] p-5 text-center text-sm font-bold text-[#64748b]">Your cart is empty. Add an available exact service first.</div>:<div className="mt-4 space-y-3">{cart.map(item=><div key={item.id} className="flex gap-3 rounded-2xl border border-[#e5eefb] p-3"><img src={item.image||'/placeholder.svg'} alt="" className="h-16 w-16 rounded-xl object-cover bg-[#eef6ff]"/><div className="min-w-0 flex-1"><div className="font-black">{item.serviceName}</div><div className="mt-1 text-[10px] text-[#64748b]">{item.category}{item.subcategory?` · ${item.subcategory}`:''}</div><div className="mt-1 text-sm font-black">{formatINR(item.price)}</div></div><button onClick={()=>removeItem(item.id)} aria-label="Remove service" className="h-9 w-9 rounded-xl bg-[#fff1f2] text-[#dc2626]"><Trash2 className="mx-auto h-4 w-4"/></button></div>)}</div>}</section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#2563eb]"/><h2 className="font-black">Choose date & time</h2></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-[#64748b]">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="mt-1 w-full rounded-xl border border-[#dbeafe] p-3 text-sm font-bold outline-none"/></label><label className="text-xs font-bold text-[#64748b]">Time<input type="time" value={time} onChange={e=>setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-[#dbeafe] p-3 text-sm font-bold outline-none"/></label></div></section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Home className="h-5 w-5 text-[#2563eb]"/><div><h2 className="font-black">Confirm residential address</h2><p className="text-[10px] text-[#64748b]">This is the address the professional will visit. It is separate from device geofencing.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['house','House / Flat / Building'],['street','Street / Road'],['landmark','Landmark'],['villageArea','Village / Area'],['city','City'],['district','District'],['state','State'],['pinCode','PIN code']] as const).map(([key,label])=><label key={key} className="text-[10px] font-black text-[#64748b]">{label}<input value={address[key]} onChange={e=>setAddress({...address,[key]:e.target.value})} placeholder={label} className="mt-1 w-full rounded-xl border border-[#dbeafe] p-3 text-sm font-semibold outline-none"/></label>)}</div>{addressText&&<div className="mt-3 rounded-xl bg-[#eef6ff] p-3 text-xs font-semibold text-[#1e3a5f]"><MapPin className="mr-1 inline h-3.5 w-3.5 text-[#2563eb]"/>{addressText}</div>}</section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[#2563eb]"/><div><h2 className="font-black">Custom professional</h2><p className="text-[10px] text-[#64748b]">Optional. Choose a specific available worker.</p></div></div><button onClick={()=>setChooseWorker(v=>!v)} className={`rounded-xl px-3 py-2 text-[10px] font-black ${chooseWorker?'bg-[#2563eb] text-white':'bg-[#eef6ff] text-[#2563eb]'}`}>{chooseWorker?'Hide':'Choose'}</button></div>{customWorker&&<div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#bfdbfe] bg-[#f8fbff] p-3"><img src={customWorker.avatar||'/placeholder.svg'} alt="" className="h-10 w-10 rounded-full object-cover"/><div className="flex-1"><div className="text-sm font-black">{customWorker.name}</div><div className="text-[10px] text-[#64748b]">★ {customWorker.rating.toFixed(1)} · Verified professional</div></div><button onClick={()=>{setCustomWorker(null);localStorage.removeItem('punchx_cart_selected_worker')}}><X className="h-4 w-4"/></button></div>}{chooseWorker&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{workers.length?workers.map(worker=><button key={worker.id} onClick={()=>{setCustomWorker(worker);saveJSON('punchx_cart_selected_worker',worker);setChooseWorker(false)}} className="flex items-center gap-3 rounded-2xl border border-[#dbeafe] p-3 text-left hover:bg-[#f8fbff]"><img src={worker.avatar||'/placeholder.svg'} alt="" className="h-10 w-10 rounded-full object-cover bg-[#eef6ff]"/><div className="min-w-0"><div className="truncate text-sm font-black">{worker.name}</div><div className="text-[10px] text-[#64748b]">★ {worker.rating.toFixed(1)} · Available</div></div><ChevronRight className="ml-auto h-4 w-4 text-[#2563eb]"/></button>):<div className="rounded-xl bg-[#fff7ed] p-3 text-xs font-bold text-[#c2410c]">No verified professional is currently available for custom selection.</div>}</div>}</section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><button onClick={()=>setWarranty(v=>!v)} className="flex w-full items-center gap-3 text-left"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${warranty?'bg-[#2563eb] text-white':'bg-[#eef6ff] text-[#2563eb]'}`}>{warranty?<Check className="h-5 w-5"/>:<Plus className="h-5 w-5"/>}</div><div className="flex-1"><div className="font-black">Extended warranty · 1 extra month</div><div className="text-[10px] text-[#64748b]">Optional protection for ₹9 after the completed service.</div></div><span className="text-sm font-black">₹9</span></button></section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><label className="text-xs font-black">Special instructions <span className="font-normal text-[#64748b]">(optional)</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Tell the professional anything useful about the visit…" className="mt-2 min-h-20 w-full rounded-xl border border-[#dbeafe] p-3 text-sm outline-none"/></label></section>
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[#2563eb]"/><h2 className="font-black">Price summary</h2></div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#64748b]">Product price</span><span className="font-bold">{formatINR(pricing.serviceValue)}</span></div><div className="flex justify-between"><span className="text-[#64748b]">Visiting fee</span><span className="font-bold">{pricing.visitingFee > 0 ? formatINR(pricing.visitingFee) : 'Free'}</span></div><div className="flex justify-between"><span className="text-[#64748b]">PUNCHX platform/protection fee</span><span className="font-bold">{formatINR(pricing.customerPlatformFee)}</span></div><div className="flex justify-between"><span className="text-[#64748b]">GST (18%)</span><span className="font-bold">{formatINR(pricing.gstAmount)}</span></div>{warranty&&<div className="flex justify-between"><span className="text-[#64748b]">Extended warranty</span><span className="font-bold">₹9</span></div>}<div className="flex justify-between border-t border-[#e5eefb] pt-3 text-base"><span className="font-black">Total</span><span className="font-black text-[#2563eb]">{formatINR(total)}</span></div></div></section>
    </main>
    {geofenceError&&<div role="alert" className="mx-auto mb-24 max-w-3xl px-3"><div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{geofenceError}</div></div>}
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#dbeafe] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(37,99,235,.12)] backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Total to pay</div><div className="text-lg font-black">{formatINR(total)}</div></div><button onClick={saveAndPay} disabled={!valid||validatingGeofence} className="rounded-2xl bg-[#2563eb] px-6 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{validatingGeofence?'Verifying area…':'Payment'} <ArrowRight className="ml-1 inline h-4 w-4"/></button></div></div>
  </div>;
}
