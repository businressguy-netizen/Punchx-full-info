import React, { useMemo, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Wallet, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { calculatePunchXPricing, formatINR } from '../config/punchxCommerce';
import { AppScreen, Worker } from '../types';

interface ChoosePaymentProps { onTransition:(target:AppScreen)=>void; selectedWorker:Worker|null; promoApplied:boolean; hasUsedBonus?:boolean; onOrderFinalized?:()=>void; onApplyPromo:(code:string)=>void; showNotification?:(msg:string)=>void; }
type PendingBooking={serviceId?:string;serviceName?:string;category?:string;description?:string;price?:number|null;address?:string;date?:string;time?:string;workerId?:string|null;workerName?:string|null;workerIsDemo?:boolean;isPersonalSelection?:boolean;bookingTiming?:'instant'|'later';hasWarrantyGuarantee?:boolean;warrantyFee?:number;customerTotal?:number;note?:string;};
const load=():PendingBooking=>{try{return JSON.parse(localStorage.getItem('punchx_pending_booking')||'{}');}catch{return{};}};

function getCustomerCredentials(){
  const uid=auth.currentUser?.uid||'guest';
  const customerId=localStorage.getItem('punchx_customer_id')||`PXC-${uid.slice(-8).toUpperCase()}`;
  let otp=localStorage.getItem('punchx_customer_permanent_otp');
  if(!otp){otp=String(Math.floor(1000+Math.random()*9000));localStorage.setItem('punchx_customer_permanent_otp',otp);}
  localStorage.setItem('punchx_customer_id',customerId);
  return {customerId,otp};
}

export default function ChoosePayment({onTransition,selectedWorker,onOrderFinalized,showNotification}:ChoosePaymentProps){
  const [pending]=useState<PendingBooking>(load);
  const [method,setMethod]=useState<'cod'|'online'>('cod');
  const [submitting,setSubmitting]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [orderId,setOrderId]=useState('');
  const [credentials,setCredentials]=useState<{customerId:string;otp:string}|null>(null);
  const pricing=useMemo(()=>typeof pending.price==='number'?calculatePunchXPricing(pending.price):null,[pending.price]);
  const total=Number(pending.customerTotal ?? (pricing?.customerTotal ?? pending.price ?? 0))+Number(pending.warrantyFee||0);

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
      const creds=getCustomerCredentials();
      const workerId=pending.workerId||selectedWorker?.id||null;
      const workerName=pending.workerName||selectedWorker?.name||null;
      const paymentMethod=method==='cod'?'Cash on Service':'Online Payment';
      const ref=await addDoc(collection(db,'orders'),{
        customerId:uid,customerReferenceId:creds.customerId,customerPermanentOtp:creds.otp,category:pending.category||'Home Services',serviceId:pending.serviceId||null,serviceName:pending.serviceName,description:pending.description||'',price:pending.price??null,totalAmountToPay:total,customerPlatformFee:pricing?.customerPlatformFee??0,warrantyFee:Number(pending.warrantyFee||0),hasWarrantyGuarantee:Boolean(pending.hasWarrantyGuarantee),warrantyExpiryDate:pending.hasWarrantyGuarantee?new Date(Date.now()+30*86400000).toISOString():null,address:pending.address,date:pending.date,time:pending.time,workerId,workerName,workerIsDemo:Boolean(pending.workerIsDemo),isPersonalSelection:Boolean(pending.isPersonalSelection),dispatchMode:pending.isPersonalSelection?'PERSONAL_SELECT':'AUTO_MATCH',bookingTiming:pending.bookingTiming||'later',bookingType:pending.bookingTiming==='instant'?'INSTANT':'SCHEDULED',isInstantOrder:pending.bookingTiming==='instant',emergencyETA:pending.bookingTiming==='instant'?'Immediate':null,paymentMethod,paymentStatus:method==='online'?'paid':'pending',paymentId:paymentId||null,status:'Pending',liveTrackingEnabled:false,workerOutForWork:false,bookingTimeline:{bookedAt:new Date().toISOString(),currentStage:'BOOKED',stages:['BOOKED','PROFESSIONAL_MATCH','ARRIVAL','WORK_STARTED','COMPLETION','INVOICE','WARRANTY','REVIEW']},note:pending.note||'',createdAt:new Date().toISOString()
      });
      const order={id:ref.id,serviceName:pending.serviceName,category:pending.category,address:pending.address,customerAddress:pending.address,date:pending.date,time:pending.time,status:'Pending',paymentMethod,paymentStatus:method==='online'?'paid':'pending',totalAmountToPay:total,workerId,workerName,customerReferenceId:creds.customerId,customerPermanentOtp:creds.otp,hasWarrantyGuarantee:Boolean(pending.hasWarrantyGuarantee),warrantyFee:Number(pending.warrantyFee||0),liveTrackingEnabled:false,workerOutForWork:false,createdAt:new Date().toISOString()};
      localStorage.setItem('punchx_active_order',JSON.stringify(order));
      const history=(()=>{try{return JSON.parse(localStorage.getItem('punchx_order_history')||'[]');}catch{return[];}})();
      localStorage.setItem('punchx_order_history',JSON.stringify([order,...history]));
      localStorage.removeItem('punchx_pending_booking');localStorage.removeItem('punchx_cart');localStorage.removeItem('punchx_cart_selected_worker');
      setOrderId(ref.id);setCredentials(creds);setConfirmed(true);onOrderFinalized?.();
    }catch(error){console.error('PUNCHX booking creation failed:',error);showNotification?.('Booking could not be created. Please try again.');}
    finally{setSubmitting(false);}
  };

  const payOnline=async()=>{
    const key=import.meta.env.VITE_RAZORPAY_KEY_ID as string|undefined;
    if(!key){showNotification?.('Online payment needs VITE_RAZORPAY_KEY_ID in the production environment. COD remains available.');return;}
    const loaded=await loadRazorpay();if(!loaded){showNotification?.('Payment gateway could not load. Please try again or choose COD.');return;}
    const Razorpay=(window as any).Razorpay;
    const options={key,amount:Math.round(total*100),currency:'INR',name:'PUNCHX',description:pending.serviceName,prefill:{name:auth.currentUser?.displayName||'PUNCHX Customer',email:auth.currentUser?.email||''},theme:{color:'#2563eb'},handler:(response:any)=>finalize(response?.razorpay_payment_id)};
    new Razorpay(options).open();
  };

  if(confirmed&&credentials)return <div className="min-h-screen bg-[#f7faff] px-4 py-10 text-[#0f172a]"><div className="mx-auto max-w-lg rounded-3xl border border-[#dbeafe] bg-white p-7 text-center shadow-xl"><div className="mx-auto flex h-24 w-24 animate-[pulse_2s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#eaf3ff]"><CheckCircle2 className="h-12 w-12 text-[#2563eb]"/></div><h1 className="mt-6 text-3xl font-black">Booking confirmed</h1><p className="mt-2 text-sm text-[#64748b]">Your PUNCHX booking is now in the tracking system.</p><div className="mt-5 rounded-2xl bg-[#f8fbff] p-4 text-left"><div className="text-sm font-black">{pending.serviceName}</div><div className="mt-1 text-xs text-[#64748b]">{pending.date} · {pending.time}</div><div className="mt-1 text-xs text-[#64748b]">{pending.address}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Customer ID</div><div className="mt-1 font-black text-[#2563eb]">{credentials.customerId}</div></div><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Permanent OTP</div><div className="mt-1 font-black text-[#2563eb]">{credentials.otp}</div></div></div><div className="mt-3 text-xs font-bold">Booking ID: {orderId}</div><div className="mt-1 text-xs text-[#64748b]">Live tracking becomes active when the professional is marked out for work.</div></div><button onClick={()=>onTransition('tracking')} className="mt-6 w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white">Track booking</button></div></div>;

  return <div id="payment-screen-container" className="min-h-screen bg-[#f7faff] pb-24 text-[#0f172a]"><header className="sticky top-0 z-40 border-b border-[#dbeafe] bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center gap-3"><button onClick={()=>onTransition('booking')} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]"><X className="h-5 w-5 rotate-45"/></button><div><div className="text-[10px] font-black uppercase tracking-wider text-[#2563eb]">PUNCHX</div><h1 className="text-lg font-black">Payment gateway</h1></div></div></header><main className="punchx-citizen-main mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8"><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#2563eb]"><ShieldCheck className="h-4 w-4"/> Secure checkout</div><h2 className="mt-3 text-2xl font-black">{pending.serviceName||'PUNCHX booking'}</h2><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#64748b]">Product price</span><span className="font-bold">{formatINR(pricing?.serviceValue??pending.price??0)}</span></div><div className="flex justify-between"><span className="text-[#64748b]">Visiting fee</span><span className="font-bold">{pricing?.visitingFee && pricing.visitingFee > 0 ? formatINR(pricing.visitingFee) : 'Free'}</span></div><div className="flex justify-between"><span className="text-[#64748b]">PUNCHX platform fee</span><span className="font-bold">{formatINR(pricing?.customerPlatformFee??0)}</span></div><div className="flex justify-between"><span className="text-[#64748b]">GST (18%)</span><span className="font-bold">{formatINR(pricing?.gstAmount??0)}</span></div>{pending.warrantyFee&&<div className="flex justify-between"><span className="text-[#64748b]">Extended warranty</span><span className="font-bold">₹{pending.warrantyFee}</span></div>}<div className="flex justify-between border-t border-[#e5eefb] pt-3"><span className="font-black">Total</span><span className="font-black text-[#2563eb]">{formatINR(total)}</span></div></div></section><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><h3 className="font-black">Choose payment method</h3><button onClick={()=>setMethod('cod')} className={`mt-4 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method==='cod'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe]'}`}><Wallet className="h-5 w-5 text-[#2563eb]"/><div className="flex-1"><div className="font-black">Cash on Delivery / Service</div><div className="text-xs text-[#64748b]">Pay the professional according to the final invoice.</div></div>{method==='cod'&&<CheckCircle2 className="h-5 w-5 text-[#2563eb]"/>}</button><button onClick={()=>setMethod('online')} className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method==='online'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe]'}`}><CreditCard className="h-5 w-5 text-[#2563eb]"/><div className="flex-1"><div className="font-black">Online payment</div><div className="text-xs text-[#64748b]">Razorpay checkout opens when VITE_RAZORPAY_KEY_ID is configured.</div></div>{method==='online'&&<CheckCircle2 className="h-5 w-5 text-[#2563eb]"/>}</button></section><button onClick={()=>method==='online'?payOnline():finalize()} disabled={submitting} className="w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white disabled:opacity-50">{submitting?'Processing…':method==='online'?'Pay securely':'Confirm COD booking'}</button><p className="text-center text-[10px] text-[#64748b]">Payment and booking records are saved only after successful gateway/COD confirmation.</p></main></div>;
}
