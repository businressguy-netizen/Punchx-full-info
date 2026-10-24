import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Wallet, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import { formatINR } from '../config/punchxCommerce';
import { AppScreen, Worker } from '../types';

interface ChoosePaymentProps { onTransition:(target:AppScreen)=>void; selectedWorker:Worker|null; promoApplied:boolean; hasUsedBonus?:boolean; onOrderFinalized?:()=>void; onApplyPromo:(code:string)=>void; showNotification?:(msg:string)=>void; }
type PendingBooking={cart?:Array<{id?:string;serviceId?:string;serviceName?:string;category?:string;subcategory?:string;description?:string;price?:number;duration?:string;quantity?:number}>;serviceId?:string;serviceName?:string;category?:string;description?:string;price?:number|null;address?:string;date?:string;time?:string;workerId?:string|null;workerName?:string|null;workerIsDemo?:boolean;isPersonalSelection?:boolean;bookingTiming?:'instant'|'later';hasWarrantyGuarantee?:boolean;warrantyFee?:number;customerTotal?:number;note?:string;residentialAddress?:Record<string,unknown>;addressCoordinates?:{lat:number;lng:number};geofenceArea?:string;geofenceCity?:string;serviceAreaMatch?:string|null;serviceAvailabilityChecked?:boolean;serviceAvailable?:boolean;};
type ServerQuote={baseVisitingFee:number;customerPlatformFee:number;gstAmount:number;totalAmountToPay:number;couponValid?:boolean;couponMessage?:string;};
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
  const [serverQuote,setServerQuote]=useState<ServerQuote|null>(null);
  const [quoteLoading,setQuoteLoading]=useState(false);
  const [quoteError,setQuoteError]=useState('');
  const [method,setMethod]=useState<'cod'|'online'>('cod');

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
        const orders=Array.isArray(result.orders)?result.orders:[];
        const hasConfirmedBooking=orders.some((order:any)=>{
          const status=String(order.status||'').toUpperCase();
          const paymentStatus=String(order.paymentStatus||'').toUpperCase();
          const paymentMethod=String(order.paymentMethod||'').toUpperCase();
          const isCancelled=['CANCELLED','CANCELED'].includes(status);
          return !isCancelled&&(
            ['COD','CASH','PAY_AFTER_SERVICE'].includes(paymentMethod)||
            ['PAID','CAPTURED','SETTLED'].includes(paymentStatus)||
            ['DISPATCHING','ACCEPTED','EN_ROUTE','ARRIVED','IN_SERVICE','COMPLETION_PENDING','COMPLETED','DONE','IN-PROGRESS','IN PROGRESS'].includes(status)
          );
        });
        if(!cancelled)setIsFirstBooking(!hasConfirmedBooking);
      }catch{
        if(!cancelled)setIsFirstBooking(false);
      }
    };
    checkWelcomeOffer();
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    if(isFirstBooking===null){setServerQuote(null);return;}
    let cancelled=false;
    const loadQuote=async()=>{
      setQuoteLoading(true);setQuoteError('');
      try{
        const backendBase=String(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
        const response=await fetch(`${backendBase}/api/pricing/quote`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            serviceId:pending.serviceId||undefined,
            category:pending.category||'Home Services',
            isEmergency:pending.bookingTiming==='instant',
            waivePlatformFee:isFirstBooking===true
          })
        });
        const result=await response.json().catch(()=>({}));
        if(!response.ok||result.success!==true||!result.quote||!Number.isFinite(Number(result.quote.totalAmountToPay))){
          throw new Error(result.error||'PunchX could not calculate the checkout total.');
        }
        if(!cancelled)setServerQuote(result.quote);
      }catch(error:any){
        if(!cancelled){setServerQuote(null);setQuoteError(error?.message||'Unable to verify the checkout amount. Please try again.');}
      }finally{if(!cancelled)setQuoteLoading(false);}
    };
    loadQuote();
    return()=>{cancelled=true;};
  },[isFirstBooking,pending.serviceId,pending.category,pending.bookingTiming]);

  const [submitting,setSubmitting]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [orderId,setOrderId]=useState('');
  const [credentials,setCredentials]=useState<{customerId:string;startOtp:string}|null>(null);
  const visitingFee=serverQuote?.baseVisitingFee??0;
  const platformFee=serverQuote?.customerPlatformFee??0;
  const total=serverQuote?.totalAmountToPay??0;

  const loadRazorpay=()=>new Promise<boolean>(resolve=>{
    if((window as any).Razorpay){resolve(true);return;}
    const existing=document.querySelector('script[data-razorpay]');
    if(existing){existing.addEventListener('load',()=>resolve(true),{once:true});existing.addEventListener('error',()=>resolve(false),{once:true});return;}
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.dataset.razorpay='true';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.appendChild(script);
  });

  const persistConfirmedOrder=(saved:any,startOtp:string)=>{
    const uid=auth.currentUser?.uid;
    if(!uid) throw new Error('Please sign in again to view your booking confirmation.');
    const customerReferenceId=getCustomerReferenceId(uid);
    const order={...saved,id:saved.id,serviceName:saved.serviceName||pending.serviceName,category:saved.category||pending.category,address:saved.address||pending.address,customerAddress:saved.customerAddress||pending.address,date:saved.date||pending.date,time:saved.time||pending.time,status:saved.status,paymentMethod:saved.paymentMethod|| (method==='cod'?'COD':'ONLINE'),paymentStatus:saved.paymentStatus||'pending',totalAmountToPay:saved.totalAmountToPay??total,workerId:saved.workerId||selectedWorker?.uid||pending.workerId||null,workerName:saved.workerName||pending.workerName||selectedWorker?.name||null,customerReferenceId,hasWarrantyGuarantee:Boolean(pending.hasWarrantyGuarantee),warrantyFee:Number(pending.warrantyFee||0),createdAt:saved.createdAt||new Date().toISOString()};
    localStorage.setItem('punchx_active_order',JSON.stringify(order));
    const history=(()=>{try{return JSON.parse(localStorage.getItem('punchx_order_history')||'[]');}catch{return[];}})();
    localStorage.setItem('punchx_order_history',JSON.stringify([order,...history.filter((item:any)=>item.id!==order.id)]));
    localStorage.removeItem('punchx_pending_online_order');
    localStorage.removeItem('punchx_pending_booking');localStorage.removeItem('punchx_cart');localStorage.removeItem('punchx_cart_selected_worker');
    setOrderId(saved.id);setCredentials({customerId:customerReferenceId,startOtp:String(startOtp||'')});setConfirmed(true);onOrderFinalized?.();
  };

  const launchOnlinePayment=async(saved:any,initialStartOtp:string,idToken:string,backendBase:string)=>{
    const gatewayResponse=await fetch(`${backendBase}/api/payments/create-order`,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},
      body:JSON.stringify({orderId:saved.id})
    });
    const gateway=await gatewayResponse.json().catch(()=>({}));
    if(!gatewayResponse.ok||gateway.success!==true||!gateway.gatewayOrderId)throw new Error(gateway.error||'Payment gateway could not initialize this booking.');
    if(gateway.isMock===true)throw new Error('A real payment gateway is not configured. No payment was taken; please choose COD.');
    const loaded=await loadRazorpay();
    if(!loaded)throw new Error('Payment gateway could not load. Your booking is still unpaid; retry or choose COD.');
    const Razorpay=(window as any).Razorpay;
    if(!Razorpay)throw new Error('Payment gateway script is unavailable. Your booking is still unpaid.');
    const instance=new Razorpay({
      key:gateway.keyId,
      order_id:gateway.gatewayOrderId,
      amount:Math.round(Number(gateway.amount)*100),
      currency:gateway.currency||'INR',
      name:'PUNCHX',
      description:saved.serviceName||pending.serviceName,
      prefill:{name:auth.currentUser?.displayName||'PUNCHX Customer',email:auth.currentUser?.email||''},
      theme:{color:'#B99A62'},
      handler:async(paymentResponse:any)=>{
        setSubmitting(true);
        try{
          const currentUser=auth.currentUser;
          if(!currentUser)throw new Error('Your sign-in session expired. Please sign in again.');
          const token=await currentUser.getIdToken();
          if(!paymentResponse?.razorpay_order_id||!paymentResponse?.razorpay_payment_id||!paymentResponse?.razorpay_signature)throw new Error('The gateway did not return a complete payment verification response.');
          const verifyResponse=await fetch(`${backendBase}/api/payments/verify`,{
            method:'POST',
            headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
            body:JSON.stringify({orderId:saved.id,razorpayOrderId:paymentResponse.razorpay_order_id,razorpayPaymentId:paymentResponse.razorpay_payment_id,razorpaySignature:paymentResponse.razorpay_signature})
          });
          const verified=await verifyResponse.json().catch(()=>({}));
          if(!verifyResponse.ok||verified.success!==true||!verified.order)throw new Error(verified.error||'Payment verification failed. The booking remains unpaid.');
          let startOtp=initialStartOtp;
          if(!startOtp){
            try{
              const otpResponse=await fetch(`${backendBase}/api/orders/${encodeURIComponent(saved.id)}/otp/generate`,{
                method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({type:'START'})
              });
              const otpResult=await otpResponse.json().catch(()=>({}));
              if(otpResponse.ok&&otpResult.success===true)startOtp=String(otpResult.otp||'');
            }catch(otpError){console.warn('Could not refresh service start code:',otpError);}
          }
          persistConfirmedOrder(verified.order,startOtp);
        }catch(error:any){
          console.error('PUNCHX payment verification failed:',error);
          showNotification?.(error?.message||'Payment verification failed. Please contact support before trying again.');
        }finally{setSubmitting(false);}
      },
      modal:{ondismiss:()=>setSubmitting(false)}
    });
    if(typeof instance.on==='function')instance.on('payment.failed',(event:any)=>{
      setSubmitting(false);
      showNotification?.(event?.error?.description||'Payment failed. No booking has been marked paid; you may retry checkout or choose COD.');
    });
    instance.open();
  };

  const finalize=async(paymentId?:string)=>{
    const uid=auth.currentUser?.uid;
    if(!uid){showNotification?.('Please sign in before creating a booking.');return;}
    if(!pending.serviceName||!pending.address||!pending.date||!pending.time){showNotification?.('Booking details are incomplete. Return to the cart.');return;}
    setSubmitting(true);
    try{
      const customerReferenceId=getCustomerReferenceId(uid);
      const workerId=selectedWorker?.uid||pending.workerId||selectedWorker?.id||null;
      const workerName=pending.workerName||selectedWorker?.name||null;
      const paymentMethod=method==='cod'?'COD':'ONLINE';
      const firebaseUser=auth.currentUser;
      if(!firebaseUser) throw new Error('Your sign-in session expired. Please sign in again.');
      const idToken=await firebaseUser.getIdToken();
      const profile=(()=>{try{return JSON.parse(localStorage.getItem('punchx_namoid_profile')||'{}');}catch{return{};}})();
      const backendBase=String(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
      if(method==='online'){
        try{
          const cached=JSON.parse(localStorage.getItem('punchx_pending_online_order')||'null');
          const cachedOrder=cached?.order;
          if(cachedOrder?.id&&cachedOrder.customerId===uid&&cachedOrder.serviceName===pending.serviceName&&cachedOrder.address===(pending.address||'')&&cachedOrder.date===pending.date&&cachedOrder.time===pending.time&&String(cachedOrder.paymentStatus||'').toUpperCase()!=='PAID'){
            await launchOnlinePayment(cachedOrder,'',idToken,backendBase);
            return;
          }
        }catch(cacheError){console.warn('Could not read pending online checkout:',cacheError);}
      }
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
          paymentMethod,paymentStatus:'pending',
          paymentId:null,liveTrackingEnabled:false,workerOutForWork:false,
          bookingTimeline:{bookedAt:new Date().toISOString(),currentStage:'BOOKED',stages:['BOOKED','PROFESSIONAL_MATCH','ARRIVAL','WORK_STARTED','COMPLETION','INVOICE','WARRANTY','REVIEW']}
        })
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success!==true||!result.order?.id) throw new Error(result.error||'Firebase did not confirm the booking save.');
      const saved=result.order;
      if(method==='online'){
        localStorage.setItem('punchx_pending_online_order',JSON.stringify({order:saved}));
        await launchOnlinePayment(saved,String(result.startOtp||''),idToken,backendBase);
        return;
      }
      persistConfirmedOrder(saved,String(result.startOtp||''));
    }catch(error:any){console.error('PUNCHX booking creation failed:',error);showNotification?.(error?.message||'Booking could not be created. Please try again.');}
    finally{setSubmitting(false);}
  };

  if(confirmed&&credentials)return <div className="min-h-screen bg-[#f7faff] px-4 py-10 text-[#0f172a]"><div className="mx-auto max-w-lg rounded-3xl border border-[#dbeafe] bg-white p-7 text-center shadow-xl"><div className="mx-auto flex h-24 w-24 animate-[pulse_2s_ease-in-out_infinite] items-center justify-center rounded-full bg-[#eaf3ff]"><CheckCircle2 className="h-12 w-12 text-[#2563eb]"/></div><h1 className="mt-6 text-3xl font-black">Booking confirmed</h1><p className="mt-2 text-sm text-[#64748b]">Your PUNCHX booking is now in the tracking system.</p><div className="mt-5 rounded-2xl bg-[#f8fbff] p-4 text-left"><div className="text-sm font-black">{pending.serviceName}</div><div className="mt-1 text-xs text-[#64748b]">{pending.date} · {pending.time}</div><div className="mt-1 text-xs text-[#64748b]">{pending.address}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Customer ID</div><div className="mt-1 font-black text-[#2563eb]">{credentials.customerId}</div></div><div className="rounded-xl bg-white p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Service Start Code</div><div className="mt-1 font-black text-[#2563eb]">{credentials.startOtp||"Provided securely by PUNCHX"}</div></div></div><div className="mt-3 text-xs font-bold">Booking ID: {orderId}</div><div className="mt-1 text-xs text-[#64748b]">Live tracking becomes active when the professional is marked out for work.</div></div><button onClick={()=>onTransition('tracking')} className="mt-6 w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white">Track booking</button></div></div>;

  return <div id="payment-screen-container" className="min-h-screen bg-[#f7faff] pb-24 text-[#0f172a]"><header className="sticky top-0 z-40 border-b border-[#dbeafe] bg-white/95 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center gap-3"><button onClick={()=>{if(window.history.state?.screen==='payment'&&window.history.length>1)window.history.back();else onTransition('booking');}} aria-label="Back to cart" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]"><X className="h-5 w-5 rotate-45"/></button><div><div className="text-[10px] font-black uppercase tracking-wider text-[#2563eb]">PUNCHX</div><h1 className="text-lg font-black">Payment gateway</h1></div></div></header><main className="punchx-citizen-main mx-auto max-w-2xl space-y-4 px-4 py-5 sm:px-6 sm:py-8"><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#2563eb]"><ShieldCheck className="h-4 w-4"/> Secure checkout</div><h2 className="mt-3 text-2xl font-black">Payment details</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-[#64748b]">Visiting fee</span><span className="font-bold">{serverQuote?formatINR(visitingFee):'Verifying…'}</span></div><div className="flex justify-between"><span className="text-[#64748b]">PUNCHX platform charges</span><span className={platformFee===0?"font-bold text-emerald-600":"font-bold"}>{serverQuote?(platformFee===0?'FREE':formatINR(platformFee)):'—'}</span></div>{serverQuote&&platformFee===0&&<p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Welcome to PUNCHX! Your first confirmed booking has no platform charge.</p>}<div className="flex justify-between"><span className="text-[#64748b]">GST</span><span className="font-bold">{serverQuote?formatINR(serverQuote.gstAmount):'—'}</span></div><div className="flex justify-between border-t border-[#e5eefb] pt-3"><span className="font-black">Total payable now</span><span className="font-black text-[#2563eb]">{serverQuote?formatINR(total):'—'}</span></div><p className="text-xs leading-5 text-[#64748b]">Product/material costs are not included in this pricing. The worker will charge separately for products according to the quality you choose. Please confirm the product and its price with the worker before purchase.</p></div></section><section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm"><h3 className="font-black">Choose payment method</h3><button onClick={()=>setMethod('cod')} className={`mt-4 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method==='cod'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe]'}`}><Wallet className="h-5 w-5 text-[#2563eb]"/><div className="flex-1"><div className="font-black">Cash on Delivery / Service</div><div className="text-xs text-[#64748b]">Pay the professional according to the final invoice.</div></div>{method==='cod'&&<CheckCircle2 className="h-5 w-5 text-[#2563eb]"/>}</button><button onClick={()=>setMethod('online')} className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${method==='online'?'border-[#2563eb] bg-[#eef6ff]':'border-[#dbeafe]'}`}><CreditCard className="h-5 w-5 text-[#2563eb]"/><div className="flex-1"><div className="font-black">Online payment</div><div className="text-xs text-[#64748b]">Razorpay checkout opens when VITE_RAZORPAY_KEY_ID is configured.</div></div>{method==='online'&&<CheckCircle2 className="h-5 w-5 text-[#2563eb]"/>}</button></section><button onClick={()=>finalize()} disabled={submitting||isFirstBooking===null||quoteLoading||!serverQuote} className="w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-black text-white disabled:opacity-50">{submitting?'Processing…':isFirstBooking===null||quoteLoading?'Verifying checkout amount…':!serverQuote?'Checkout unavailable':method==='online'?'Pay securely':'Confirm COD booking'}</button>{quoteError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{quoteError}</p>}<p className="text-center text-[10px] text-[#64748b]">Payment and booking records are saved only after successful gateway/COD confirmation.</p></main></div>;
}
