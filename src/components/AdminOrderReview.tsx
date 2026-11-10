import React,{useCallback,useEffect,useState} from 'react';
import {CheckCircle2,RefreshCw,ShieldCheck,XCircle,Clock3,MessageCircle} from 'lucide-react';
import {auth} from '../lib/firebase';
import {OrderRecord} from '../types';

interface Props{showNotification?:(message:string)=>void;}
type ReviewOrder=OrderRecord&{adminReviewNotes?:string;adminReviewedAt?:string;};

export default function AdminOrderReview({showNotification}:Props){
  const [orders,setOrders]=useState<ReviewOrder[]>([]);
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState('');
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [filter,setFilter]=useState<'PENDING_ADMIN_REVIEW'|'AWAITING_CUSTOMER_CONFIRMATION'|'ALL'>('PENDING_ADMIN_REVIEW');

  const headers=useCallback(async()=>{
    const user=auth.currentUser;
    if(!user)throw new Error('Admin session expired. Please sign in again.');
    return {Authorization:`Bearer ${await user.getIdToken()}`};
  },[]);

  const refresh=useCallback(async()=>{
    try{
      const h=await headers();
      const response=await fetch('/api/orders',{headers:h});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!Array.isArray(data.orders))throw new Error(data.error||'Could not load orders');
      setOrders(data.orders);
    }catch(e){showNotification?.(e instanceof Error?e.message:'Could not load order requests.');}
    finally{setLoading(false);}
  },[headers,showNotification]);

  useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(),10000);return()=>window.clearInterval(timer);},[refresh]);

  const updateStatus=async(order:ReviewOrder,status:'AWAITING_CUSTOMER_CONFIRMATION'|'REJECTED'|'CUSTOMER_CONFIRMED')=>{
    setBusyId(order.id);
    try{
      const h=await headers();
      const response=await fetch(`/api/orders/${encodeURIComponent(order.id)}/transition`,{
        method:'POST',headers:{...h,'Content-Type':'application/json'},
        body:JSON.stringify({targetStatus:status,reason:notes[order.id]|| (status==='REJECTED'?'Not serviceable or unavailable':'Accepted by PUNCHX admin')})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.error||'Could not update order status');
      showNotification?.(status==='REJECTED'?'Order rejected.':'Order accepted. Customer can now continue through WhatsApp.');
      await refresh();
    }catch(e){showNotification?.(e instanceof Error?e.message:'Order update failed.');}
    finally{setBusyId('');}
  };

  const visible=orders.filter(o=>filter==='ALL'?['PENDING_ADMIN_REVIEW','AWAITING_CUSTOMER_CONFIRMATION','CUSTOMER_CONFIRMED','REJECTED'].includes(String(o.status)):o.status===filter);
  const count=(s:string)=>orders.filter(o=>o.status===s).length;

  return <div className="min-h-screen bg-[#f7f8fa] px-3 py-5 text-[#17191d] sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#b99a62]"><ShieldCheck className="h-4 w-4"/> PUNCHX ADMIN</div><h1 className="mt-1 text-2xl font-black">Order review desk</h1><p className="mt-1 text-xs text-[#69707c]">Review customer requests before WhatsApp confirmation and payment.</p></div>
        <button onClick={()=>{setLoading(true);void refresh();}} className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4"/> Refresh</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[['Pending review',count('PENDING_ADMIN_REVIEW')],['Awaiting WhatsApp',count('AWAITING_CUSTOMER_CONFIRMATION')],['Customer confirmed',count('CUSTOMER_CONFIRMED')]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-black/5 bg-white p-4"><div className="text-[10px] font-bold text-[#69707c]">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">{(['PENDING_ADMIN_REVIEW','AWAITING_CUSTOMER_CONFIRMATION','ALL'] as const).map(v=><button key={v} onClick={()=>setFilter(v)} className={`rounded-xl px-4 py-2 text-[10px] font-black ${filter===v?'bg-[#17191d] text-white':'border border-black/10 bg-white text-[#555b65]'}`}>{v==='ALL'?'All workflow orders':v.replaceAll('_',' ')}</button>)}</div>
      <div className="mt-4 space-y-3">
        {loading?<div className="rounded-2xl bg-white p-8 text-center text-sm text-[#69707c]">Loading orders…</div>:visible.length===0?<div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-[#69707c]">No orders in this queue.</div>:visible.map(order=><article key={order.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase text-[#b99a62]">{order.id}</div><h2 className="mt-1 text-base font-black">{order.serviceName||order.category}</h2><p className="mt-1 text-xs text-[#69707c]">{order.customerName||'Customer'} · {order.customerPhone||'No phone supplied'}</p></div><span className="rounded-full bg-[#fff7e6] px-3 py-1 text-[9px] font-black text-[#946b18]">{String(order.status).replaceAll('_',' ')}</span></div>
          <div className="mt-3 grid gap-2 rounded-xl bg-[#f8f9fb] p-3 text-xs sm:grid-cols-2"><div><b>Address:</b> {order.customerAddress||order.address||'—'}</div><div><b>Preferred slot:</b> {order.date} · {order.time||'—'}</div><div><b>Customer ID:</b> {order.customerReferenceId||'—'}</div><div><b>Requested professional:</b> {order.workerName||'Admin assignment required'}</div><div><b>Payment:</b> Pending — not collected</div><div><b>Estimated total:</b> {typeof order.totalAmountToPay==='number'?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(order.totalAmountToPay):'To be confirmed'}</div></div>
          {order.status==='PENDING_ADMIN_REVIEW'&&<><textarea value={notes[order.id]||''} onChange={e=>setNotes(v=>({...v,[order.id]:e.target.value}))} placeholder="Optional admin note or rejection reason" className="mt-3 min-h-16 w-full rounded-xl border border-black/10 p-3 text-xs outline-none focus:border-[#b99a62]"/><div className="mt-3 flex flex-col gap-2 sm:flex-row"><button disabled={busyId===order.id} onClick={()=>void updateStatus(order,'AWAITING_CUSTOMER_CONFIRMATION')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#15945a] px-4 py-3 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Accept order</button><button disabled={busyId===order.id} onClick={()=>void updateStatus(order,'REJECTED')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4"/> Reject order</button></div></>}
          {order.status==='AWAITING_CUSTOMER_CONFIRMATION'&&<><p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><MessageCircle className="h-4 w-4"/> Accepted. Customer has been prompted to contact PUNCHX WhatsApp. Confirm the customer’s message and payment coordination before continuing.</p><button disabled={busyId===order.id} onClick={()=>void updateStatus(order,'CUSTOMER_CONFIRMED')} className="mt-3 w-full rounded-xl bg-[#17191d] px-4 py-3 text-xs font-black text-white disabled:opacity-50">Mark WhatsApp confirmation received</button></>}
        </article>)}
      </div>
      <p className="mt-5 text-[10px] leading-5 text-[#69707c]">WhatsApp contact, payment confirmation and final invoice must be completed through the approved PUNCHX process. Opening WhatsApp alone does not mark an order confirmed or paid.</p>
    </div>
  </div>;
}
