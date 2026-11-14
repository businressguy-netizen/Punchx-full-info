import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { calculatePunchXPricing, formatINR } from '../config/punchxCommerce';
import { AppScreen, Worker } from '../types';

interface ChoosePaymentProps {
  onTransition:(target:AppScreen)=>void;
  selectedWorker:Worker|null;
  promoApplied:boolean;
  hasUsedBonus?:boolean;
  onOrderFinalized?:()=>void;
  onApplyPromo:(code:string)=>void;
  showNotification?:(msg:string)=>void;
}
type PendingBooking={
  cart?:Array<{id?:string;serviceId?:string;serviceName?:string;category?:string;subcategory?:string;description?:string;price?:number;duration?:string;quantity?:number}>;
  serviceId?:string;serviceName?:string;category?:string;description?:string;price?:number|null;
  address?:string;date?:string;time?:string;workerId?:string|null;workerName?:string|null;
  workerIsDemo?:boolean;isPersonalSelection?:boolean;bookingTiming?:'instant'|'later';
  note?:string;residentialAddress?:Record<string,unknown>;addressCoordinates?:{lat:number;lng:number};
  geofenceArea?:string;geofenceCity?:string;serviceAreaMatch?:string|null;
  serviceAvailabilityChecked?:boolean;serviceAvailable?:boolean;
};
const load=():PendingBooking=>{try{return JSON.parse(localStorage.getItem('punchx_pending_booking')||'{}');}catch{return{};}};
const WHATSAPP_URL='https://wa.me/917001139809';

export default function ChoosePayment({onTransition,selectedWorker,onOrderFinalized,showNotification}:ChoosePaymentProps){
  const [pending]=useState<PendingBooking>(load);
  const [submitting,setSubmitting]=useState(false);
  const [order,setOrder]=useState<any>(null);
  const [error,setError]=useState('');
  const [checking,setChecking]=useState(false);
  const pricing=useMemo(()=>typeof pending.price==='number'?calculatePunchXPricing(pending.price):null,[pending.price]);
  const estimatedTotal=(pricing?.visitingFee||59)+(pricing?.customerPlatformFee??10);
  const status=String(order?.status||'');
  const accepted=status==='AWAITING_CUSTOMER_CONFIRMATION';
  const rejected=status==='REJECTED';
  const waiting=status==='PENDING_ADMIN_REVIEW';

  const authHeaders=async()=>{
    const user=auth.currentUser;
    if(!user)throw new Error('Please sign in before submitting your booking.');
    return {Authorization:`Bearer ${await user.getIdToken()}`};
  };

  const submitRequest=async()=>{
    if(submitting)return;
    if(!pending.serviceName||!pending.address||!pending.date||!pending.time){
      setError('Your booking details are incomplete. Please return to the cart and review them.');
      return;
    }
    setSubmitting(true);setError('');
    try{
      const headers=await authHeaders();
      const profile=(()=>{try{return JSON.parse(localStorage.getItem('punchx_namoid_profile')||'{}');}catch{return{};}})();
      const workerId=selectedWorker?.uid||pending.workerId||selectedWorker?.id||null;
      const response=await fetch('/api/orders',{
        method:'POST',
        headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({
          customerName:profile.name||auth.currentUser?.displayName||'',
          customerEmail:profile.email||auth.currentUser?.email||'',
          customerPhone:profile.phone||auth.currentUser?.phoneNumber||'',
          customerAddress:pending.address,address:pending.address,
          category:pending.category||'Home Services',serviceId:pending.serviceId||null,
          serviceName:pending.serviceName,description:pending.description||'',note:pending.note||'',
          serviceItems:(pending.cart||[]).map(item=>({
            id:item.id||item.serviceId||'',serviceId:item.serviceId||null,
            serviceName:item.serviceName||'',category:item.category||pending.category||'',
            subcategory:item.subcategory||'',description:item.description||'',price:0,
            duration:item.duration||'',quantity:Number(item.quantity||1)
          })),
          residentialAddress:pending.residentialAddress||null,
          addressCoordinates:pending.addressCoordinates||null,
          geofenceArea:pending.geofenceArea||'',geofenceCity:pending.geofenceCity||'',
          serviceAreaMatch:pending.serviceAreaMatch||null,
          serviceAvailabilityChecked:Boolean(pending.serviceAvailabilityChecked),
          serviceAvailable:Boolean(pending.serviceAvailable),
          date:pending.date,time:pending.time,workerId,
          workerName:pending.workerName||selectedWorker?.name||null,
          workerIsDemo:Boolean(pending.workerIsDemo),
          isPersonalSelection:Boolean(pending.isPersonalSelection),
          dispatchMode:pending.isPersonalSelection?'PERSONAL_SELECT':'AUTO_MATCH',
          bookingTiming:pending.bookingTiming||'later',
          bookingType:pending.bookingTiming==='instant'?'INSTANT':'SCHEDULED',
          paymentMethod:'WHATSAPP_COORDINATED',paymentStatus:'pending',
          liveTrackingEnabled:false,workerOutForWork:false
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success!==true||!result.order?.id)throw new Error(result.error||'PUNCHX could not save your request.');
      const saved=result.order;
      setOrder(saved);
      localStorage.setItem('punchx_active_order',JSON.stringify(saved));
      const history=(()=>{try{return JSON.parse(localStorage.getItem('punchx_order_history')||'[]');}catch{return[];}})();
      localStorage.setItem('punchx_order_history',JSON.stringify([saved,...history.filter((x:any)=>x.id!==saved.id)]));
      localStorage.removeItem('punchx_pending_booking');
      localStorage.removeItem('punchx_cart');
      localStorage.removeItem('punchx_cart_selected_worker');
      onOrderFinalized?.();
    }catch(e){
      const message=e instanceof Error?e.message:'Booking request failed. Please try again.';
      setError(message);showNotification?.(message);
    }finally{setSubmitting(false);}
  };

  useEffect(()=>{
    if(!order?.id)return;
    let active=true;
    const refresh=async()=>{
      try{
        setChecking(true);
        const headers=await authHeaders();
        const response=await fetch(`/api/orders/${encodeURIComponent(order.id)}`,{headers});
        if(!response.ok)return;
        const result=await response.json();
        if(active&&result.success&&result.order){
          setOrder(result.order);
          localStorage.setItem('punchx_active_order',JSON.stringify(result.order));
          const history=(()=>{try{return JSON.parse(localStorage.getItem('punchx_order_history')||'[]');}catch{return[];}})();
          localStorage.setItem('punchx_order_history',JSON.stringify([result.order,...history.filter((x:any)=>x.id!==result.order.id)]));
        }
      }catch{/* Keep the last known state visible while the network reconnects. */}
      finally{if(active)setChecking(false);}
    };
    void refresh();
    const timer=window.setInterval(()=>void refresh(),5000);
    return()=>{active=false;window.clearInterval(timer);};
  },[order?.id]);

  if(order){
    return <main id="punchx-payment-flow" className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-[#171714] sm:px-6">
      <section className="mx-auto max-w-lg rounded-3xl border border-[#dbeafe] bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef6ff]">
          {accepted?<CheckCircle2 className="h-11 w-11 text-emerald-600"/>:rejected?<XCircle className="h-11 w-11 text-red-600"/>:<Clock3 className="h-11 w-11 text-[#2563eb]"/>}
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-[#2563eb]">PUNCHX booking request</p>
        <h1 className="mt-2 text-2xl font-black">{accepted?'Your order has been accepted':rejected?'Order request not accepted':'Request submitted successfully'}</h1>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">
          {accepted?'Your request has been accepted. A PUNCHX admin will contact you directly on WhatsApp from our official Business account. Please keep your registered mobile number available.':
           rejected?'The PUNCHX team could not accept this request. Please contact our team if you need help.':
           'Your order details have been sent to the PUNCHX Admin Panel. Please wait while our team reviews service availability and professional assignment.'}
        </p>
        <div className="mt-5 rounded-2xl bg-[#f8fbff] p-4 text-left">
          <div className="text-[9px] font-black uppercase text-[#64748b]">Order ID</div>
          <div className="mt-1 break-all text-base font-black text-[#2563eb]">{order.id}</div>
          <div className="mt-4 text-sm font-black">{order.serviceName||pending.serviceName}</div>
          <div className="mt-1 text-xs text-[#64748b]">{order.date||pending.date} · {order.time||pending.time}</div>
          <div className="mt-1 break-words text-xs text-[#64748b]">{order.address||order.customerAddress||pending.address}</div>
          <div className="mt-4 flex items-center justify-between border-t border-[#e5eefb] pt-3">
            <span className="text-xs text-[#64748b]">Order status</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${accepted?'bg-emerald-100 text-emerald-800':rejected?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{status.replaceAll('_',' ')}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-[#64748b]">Payment</span>
            <span className="text-xs font-bold">Not collected yet</span>
          </div>
        </div>
        {accepted&&<div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/><div><p className="text-sm font-black text-emerald-900">PUNCHX will contact you</p><p className="mt-1 text-xs leading-5 text-emerald-800">Our admin team will start the WhatsApp conversation with you. You do not need to open WhatsApp or message us first.</p></div></div>}
        {waiting&&<p className="mt-4 text-xs text-[#64748b]">{checking?'Checking for an admin update…':'This page will update automatically when the team reviews your request.'}</p>}
        {rejected&&order.adminReviewNotes&&<p className="mt-3 rounded-xl bg-red-50 p-3 text-left text-xs text-red-700">{order.adminReviewNotes}</p>}
        <button onClick={()=>onTransition('home')} className="mt-4 w-full rounded-2xl border border-[#dbeafe] py-3 text-sm font-bold text-[#2563eb]">Back to PUNCHX home</button>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#f7faff] px-4 py-8 text-[#0f172a]">
    <section className="mx-auto max-w-lg rounded-3xl border border-[#dbeafe] bg-white p-6 shadow-xl">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#2563eb]"><ShieldCheck className="h-4 w-4"/> Admin-reviewed booking</div>
      <h1 className="mt-3 text-2xl font-black">Submit your service request</h1>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">Your booking details will first go to the PUNCHX Admin Panel. No payment is taken at this stage. If accepted, a PUNCHX admin will contact you directly through our official WhatsApp Business account.</p>
      <div className="mt-5 rounded-2xl bg-[#f8fbff] p-4">
        <div className="text-sm font-black">{pending.serviceName||'Selected PUNCHX service'}</div>
        <div className="mt-1 text-xs text-[#64748b]">{pending.date||'Date'} · {pending.time||'Time'}</div>
        <div className="mt-1 break-words text-xs text-[#64748b]">{pending.address||'Service address'}</div>
        <div className="mt-4 flex justify-between border-t border-[#e5eefb] pt-3 text-sm"><span className="text-[#64748b]">Indicative visit + platform fee</span><strong>{formatINR(estimatedTotal)}</strong></div>
        <p className="mt-2 text-[10px] leading-4 text-[#64748b]">This is an estimate only. Final labour, materials, taxes and payment details will be confirmed by PUNCHX before payment.</p>
      </div>
      {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
      <button onClick={submitRequest} disabled={submitting} className="mt-5 w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white disabled:opacity-50">{submitting?'Submitting request…':'Submit order for admin approval'}</button>
      <button onClick={()=>onTransition('booking')} className="mt-3 w-full rounded-2xl border border-[#dbeafe] py-3 text-sm font-bold text-[#2563eb]">Back to booking details</button>
    </section>
  </main>;
}
