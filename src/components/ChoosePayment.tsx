import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Wallet, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import { calculatePunchXPricing, formatINR } from '../config/punchxCommerce';
import { AppScreen, Worker } from '../types';

interface ChoosePaymentProps { onTransition:(target:AppScreen)=>void; selectedWorker:Worker|null; promoApplied:boolean; hasUsedBonus?:boolean; onOrderFinalized?:()=>void; onApplyPromo:(code:string)=>void; showNotification?:(msg:string)=>void; }
type PendingBooking={cart?:Array<{id?:string;serviceId?:string;serviceName?:string;category?:string;subcategory?:string;description?:string;price?:number;duration?:string;quantity?:number}>;serviceId?:string;serviceName?:string;category?:string;description?:string;price?:number|null;address?:string;date?:string;time?:string;workerId?:string|null;workerName?:string|null;workerIsDemo?:boolean;isPersonalSelection?:boolean;bookingTiming?:'instant'|'later';hasWarrantyGuarantee?:boolean;warrantyFee?:number;customerTotal?:number;note?:string;residentialAddress?:Record<string,unknown>;addressCoordinates?:{lat:number;lng:number};geofenceArea?:string;geofenceCity?:string;serviceAreaMatch?:string|null;serviceAvailabilityChecked?:boolean;serviceAvailable?:boolean;};
const load=():PendingBooking=>{try{return JSON.parse(localStorage.getItem('punchx_pending_booking')||'{}');}catch{return{};}};

function getCustomerReferenceId(uid:string){
  const expected=`PXC-${uid.slice(-8).toUpperCase()}`;
  const existing=localStorage.getItem('punchx_customer_id');
  const customerId=existing===expected?existing:expected;
  localStorage.setItem('punchx_customer_id',customerId);
  return customerId;
}

export default function ChoosePayment({onTransition,selectedWorker,onOrderFinalized,showNotification}:ChoosePaymentProps){
  const [pending]=useState<PendingBooking>(load);
  const [isFirstBooking,setIsFirstBooking]=useState<boolean|null>(null);
  const [method,setMethod]=useState<'request'>('request');

  useEffect(()=>{
    let cancelled=false;
    const checkWelcomeOffer=async()=>{
      const user=auth.currentUser;
      if(!user){if(!cancelled)setIsFirstBooking(false);return;}
      try{
        const token=await user.getIdToken();
        const backendBase=String(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
        const response=await fetch(`${backendBase}/api/orders`,{headers:{Authorization:`Bearer ${token}`}});
        if(!response.ok)throw new Error('Could not verify booking history');
        const result=await response.json();
        if(!cancelled)setIsFirstBooking(Array.isArray(result.orders)&&result.orders.length===0);
      }catch{
        if(!cancelled)setIsFirstBooking(false);
      }
    };
    checkWelcomeOffer();
    return()=>{cancelled=true;};
  },[]);
  const [submitting,setSubmitting]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [orderId,setOrderId]=useState('');
  const [credentials,setCredentials]=useState<{customerId:string;startOtp:string}|null>(null);
  const pricing=useMemo(()=>typeof pending.price==='number'?calculatePunchXPricing(pending.price):null,[pending.price]);
  const visitingFee = pricing?.visitingFee || 59;
  const platformFee = isFirstBooking === true ? 0 : (pricing?.customerPlatformFee ?? 10);
  const total = visitingFee + platformFee;

  const loadRazorpay=()=>new Promise<boolean>(resolve=>{
    if((window as any).Razorpay){resolve(true);return;}
    const existing=document.querySelector('script[data-razorpay]');
    if(existing){existing.addEventListener('load',()=>resolve(true),{once:true});existing.addEventListener('error',()=>resolve(false),{once:true});return;}
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.dataset.razorpay='true';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.appendChild(script);
  });

  const finalize=async(paymentId?:string)=>{
    const uid=auth.currentUser?.uid;
    if(!uid){showNotification?.('Please sign in before creating a booking.');return;}
    if(!pending.serviceName||!pending.address||!pending.date||!pending.time){showNotification?.('Booking details are incomplete. Return to the cart.');return;}
    setSubmitting(true);
    try{
      const customerReferenceId=getCustomerReferenceId(uid);
      const workerId=selectedWorker?.uid||pending.workerId||selectedWorker?.id||null;
      const workerName=pending.workerName||selectedWorker?.name||null;
      const paymentMethod='REQUEST';
      const firebaseUser=auth.currentUser;
      if(!firebaseUser) throw new Error('Your sign-in session expired. Please sign in again.');
      const idToken=await firebaseUser.getIdToken();
      const profile=(()=>{try{return JSON.parse(localStorage.getItem('punchx_namoid_profile')||'{}');}catch{return{};}})();
      const backendBase=String(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
      const response=await fetch(`${backendBase}/api/orders`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},
        body:JSON.stringify({
          customerReferenceId,
          customerName:profile.name||firebaseUser.displayName||'',
          customerEmail:profile.email||firebaseUser.email||'',
          customerPhone:profile.phone||firebaseUser.phoneNumber||'',
          customerAddress:pending.address,address:pending.address,
          category:pending.category||'Home Services',
          serviceId:pending.serviceId||null,serviceName:pending.serviceName,
          description:pending.description||'',note:pending.note||'',
          serviceItems:(Array.isArray(pending.cart)?pending.cart:[]).map((item)=>({id:item.id||item.serviceId||'',serviceId:item.serviceId||null,serviceName:item.serviceName||'',category:item.category||pending.category||'',subcategory:item.subcategory||'',description:item.description||'',price:0,duration:item.duration||'',quantity:Number(item.quantity||1)})),
          price:null,visitingFee, totalAmountToPay:total,
          customerPlatformFee:platformFee,
          warrantyFee:0,
          hasWarrantyGuarantee:false,
          warrantyExpiryDate:null,
          residentialAddress:pending.residentialAddress||null,
          addressCoordinates:pending.addressCoordinates||null,
          geofenceArea:pending.geofenceArea||'',
          geofenceCity:pending.geofenceCity||'',
          serviceAreaMatch:pending.serviceAreaMatch||null,
          serviceAvailabilityChecked:Boolean(pending.serviceAvailabilityChecked),
          serviceAvailable:Boolean(pending.serviceAvailable),
          date:pending.date,time:pending.time,workerId,workerName,
          workerIsDemo:Boolean(pending.workerIsDemo),
          isPersonalSelection:Boolean(pending.isPersonalSelection),
          dispatchMode:pending.isPersonalSelection?'PERSONAL_SELECT':'AUTO_MATCH',
          bookingTiming:pending.bookingTiming||'later',
          bookingType:pending.bookingTiming==='instant'?'INSTANT':'SCHEDULED',
          isInstantOrder:pending.bookingTiming==='instant',
          emergencyETA:pending.bookingTiming==='instant'?'Immediate':null,
          paymentMethod,paymentStatus:'unpaid',requestOnly:true,
          paymentId:paymentId||null,liveTrackingEnabled:false,workerOutForWork:false,
          bookingTimeline:{bookedAt:new Date().toISOString(),currentStage:'BOOKED',stages:['BOOKED','PROFESSIONAL_MATCH','ARRIVAL','WORK_STARTED','COMPLETION','INVOICE','WARRANTY','REVIEW']}
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success!==true||!result.order?.id) throw new Error(result.error||'Firebase did not confirm the booking save.');
      const saved=result.order;
      const order={...saved,id:saved.id,serviceName:saved.serviceName||pending.serviceName,category:saved.category||pending.category,address:saved.address||pending.address,customerAddress:saved.customerAddress||pending.address,date:saved.date||pending.date,time:saved.time||pending.time,status:saved.status,paymentMethod:saved.paymentMethod||paymentMethod,paymentStatus:saved.paymentStatus||'unpaid',totalAmountToPay:saved.totalAmountToPay??total,workerId:saved.workerId||workerId,workerName:saved.workerName||workerName,customerReferenceId,hasWarrantyGuarantee:Boolean(pending.hasWarrantyGuarantee),warrantyFee:Number(pending.warrantyFee||0),liveTrackingEnabled:false,workerOutForWork:false,createdAt:saved.createdAt||new Date().toISOString()};
      localStorage.setItem('punchx_active_order',JSON.stringify(order));
      const history=(()=>{try{return JSON.parse(localStorage.getItem('punchx_order_history')||'[]');}catch{return[];}})();
      localStorage.setItem('punchx_order_history',JSON.stringify([order,...history.filter((item:any)=>item.id!==order.id)]));
      localStorage.removeItem('punchx_pending_booking');localStorage.removeItem('punchx_cart');localStorage.removeItem('punchx_cart_selected_worker');
      setOrderId(saved.id);setCredentials({customerId:customerReferenceId,startOtp:String(result.startOtp||'')});setConfirmed(true);onOrderFinalized?.();
    }catch(error){console.error('PUNCHX booking creation failed:',error);showNotification?.('Booking could not be created. Please try again.');}
    finally{setSubmitting(false);}
  };

  const payOnline=async()=>{
    const key=import.meta.env.VITE_RAZORPAY_KEY_ID as string|undefined;
    if(!key){showNotification?.('Online payment needs VITE_RAZORPAY_KEY_ID in the production environment. COD remains available.');return;}
    const loaded=await loadRazorpay();if(!loaded){showNotification?.('Payment gateway could not load. Please try again or choose COD.');return;}
    const Razorpay=(window as any).Razorpay;
    const options={key,amount:Math.round(total*100),currency:'INR',name:'PUNCHX',description:pending.serviceName,prefill:{name:auth.currentUser?.displayName||'PUNCHX Customer',email:auth.currentUser?.email||''},theme:{color:'#B99A62'},handler:(response:any)=>finalize(response?.razorpay_payment_id)};
    new Razorpay(options).open();
  };

  if(confirmed&&credentials)return <div className="min-h-screen bg-[#f7faff] px-3 sm:px-4 py-6 sm:py-10 text-[#0f172a]"><div className="mx-auto max-w-lg rounded-3xl border border-[#dbeafe] bg-white p-5 sm:p-7 text-center shadow-xl"><div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 animate-[pulse_2s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#eaf3ff]"><CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-[#2563eb]"/></div><h1 className="mt-5 text-2xl sm:text-3xl font-black">Request submitted</h1><p className="mt-2 text-xs sm:text-sm text-[#64748b]">Your request has been sent to PUNCHX for admin review. You will only be asked to pay after it is accepted.</p><div className="mt-5 rounded-2xl bg-[#f8fbff] p-4 text-left"><div className="text-sm font-black">{pending.serviceName}</div><div className="mt-1 text-xs text-[#64748b]">{pending.date} · {pending.time}</div><div className="mt-1 text-xs text-[#64748b] break-words">{pending.address}</div><div className="mt-3 grid grid-cols-1 min-[380px]:grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Customer ID</div><div className="mt-1 font-black text-[#2563eb] break-all">{credentials.customerId}</div></div><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Request status</div><div className="mt-1 font-black text-amber-700">Awaiting PUNCHX review</div></div></div><div className="mt-3 text-xs font-bold break-all">Booking ID: {orderId}</div><div className="mt-1 text-xs text-[#64748b]">Payment and professional assignment remain pending until PUNCHX accepts your request.</div></div><button onClick={()=>onTransition('tracking')} className="mt-6 w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white">View request status</button></div></div>;

  return <div id="payment-screen-container" className="min-h-screen bg-[#f7faff] pb-24 text-[#0f172a]"><header className="sticky top-0 z-40 border-b border-[#dbeafe] bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center gap-3"><button onClick={()=>{if(window.history.state?.screen==='payment'&&window.history.length>1)window.history.back();else onTransition('booking');}} aria-label="Back to cart" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]"><X className="h-5 w-5 rotate-45"/></button><div><div className="text-[10px] font-black uppercase tracking-wider text-[#2563eb]">PUNCHX REQUEST</div><h1 className="text-lg font-black">Review your service request</h1></div></div></header><main className="punchx-citizen-main mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8"><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#2563eb]"><ShieldCheck className="h-4 w-4"/> Admin-reviewed booking</div><h2 className="mt-3 text-2xl font-black">No payment is due now</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-[#64748b]">Visiting fee</span><span className="font-bold">{formatINR(visitingFee)}</span></div><div className="flex justify-between"><span className="text-[#64748b]">PUNCHX platform charges</span><span className={isFirstBooking===true?"font-bold text-emerald-600":"font-bold"}>{isFirstBooking===true?'FREE':formatINR(platformFee)}</span></div>{isFirstBooking===true&&<p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Welcome to PUNCHX! Your first booking has no platform charge.</p>}<div className="flex justify-between border-t border-[#e5eefb] pt-3"><span className="font-black">Estimated visit charge</span><span className="font-black text-[#2563eb]">{formatINR(total)}</span></div><p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">This is an estimate only. PUNCHX will confirm the final amount after reviewing your request. You will receive a payment option only after acceptance.</p><p className="text-xs leading-5 text-[#64748b]">Product/material costs are not included in this pricing. The worker will charge separately for products according to the quality you choose. Please confirm the product and its price with the worker before purchase.</p></div></section><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-amber-600"/><div><h3 className="font-black">What happens next?</h3><ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-[#64748b]"><li>PUNCHX reviews your service details and service area.</li><li>Our admin team accepts or rejects the request.</li><li>If accepted, we confirm the final charges and share a secure payment option.</li><li>After payment confirmation, PUNCHX assigns a suitable professional.</li></ol></div></div></section><button onClick={()=>finalize()} disabled={submitting} className="w-full rounded-2xl bg-[#80663a] py-4 text-sm font-black text-white disabled:opacity-50">{submitting?'Submitting request…':'Submit service request'}</button><p className="text-center text-[10px] text-[#64748b]">Submitting a request does not charge you. Payment is requested only after PUNCHX admin acceptance.</p></main></div>;
}
