import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Home, Wallet, ClipboardList, UserRound, Bell, Settings, LogOut, Menu, X, MapPin, Phone, Navigation, CheckCircle2, Clock3, CircleAlert, TrendingUp, CalendarDays, Star, ShieldCheck, Gift, LifeBuoy, ChevronRight, Search, Banknote, BriefcaseBusiness, Zap, MoreHorizontal, SlidersHorizontal, Route, MessageCircle, GraduationCap, Plus, Timer, Package, Camera, Pencil, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { db } from '../lib/firebase';
import { OrderRecord } from '../types';
import { collection, doc, onSnapshot, runTransaction, updateDoc, query as firestoreQuery, where } from 'firebase/firestore';
import PUNCHX_LOGO from '../assets/logo';
import './worker-partner-panel.css';

type Tab = 'home'|'orders'|'schedule'|'earnings'|'performance'|'training'|'inventory'|'profile'|'notifications'|'incentives'|'support'|'settings';
type Status = 'NEW'|'ACCEPTED'|'TRAVELLING'|'ARRIVED'|'SERVICE_STARTED'|'COMPLETED'|'CANCELLED';
type Order = { id:string; customer:string; service:string; address:string; distance:number|null; time:string; date:string; duration:string; price:number|null; earning:number|null; status:Status; payment:string; avatar:string; raw?:OrderRecord };

const labels:Record<Status,string> = {NEW:'New',ACCEPTED:'Accepted',TRAVELLING:'Travelling',ARRIVED:'Arrived',SERVICE_STARTED:'Service started',COMPLETED:'Completed',CANCELLED:'Cancelled'};
const pending=(s?:string)=>!s || ['Pending','PAID','DISPATCHING'].includes(s);
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const normalise=(value:unknown)=>String(value??'').trim().toLowerCase();
const statusLabel:Record<string,string>={...labels,ALL:'All'};
const parseDate=(value:unknown):Date|null=>{const s=String(value??'').trim();if(!s||['today','tomorrow','upcoming'].includes(s.toLowerCase()))return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d;};
const isToday=(value:unknown)=>{const s=String(value??'').trim().toLowerCase();if(s==='today')return true;const d=parseDate(value);if(!d)return false;const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();};
const isWithinDays=(value:unknown,days:number)=>{const d=parseDate(value);if(!d)return false;const diff=Date.now()-d.getTime();return diff>=0&&diff<=days*86400000;};
const safeNumber=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0;};

export default function WorkerPartnerPanel({onTransition,showNotification}:{onTransition?:(s:any)=>void;showNotification?:(m:string)=>void}) {
 const {currentUser,userProfile,refreshProfile,logout}=useAuth() as any;
 const uid=currentUser?.uid || userProfile?.uid || '';
 const [tab,setTab]=useState<Tab>('home');
 const [online,setOnline]=useState(false);
 const [orders,setOrders]=useState<Order[]>([]);
 const [selected,setSelected]=useState<Order|null>(null);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('ALL');
 const [mobile,setMobile]=useState(false);
 const [loggingOut,setLoggingOut]=useState(false);
 const name=userProfile?.name||'Professional';
 useEffect(function(){if(typeof userProfile?.workerAvailability==='boolean')setOnline(userProfile.workerAvailability);},[userProfile?.workerAvailability]);
 const workerCategories=useMemo(function(){
   const raw=userProfile?.workerCategories || userProfile?.categories || [];
   return Array.from(new Set([...(Array.isArray(raw)?raw:[]),userProfile?.workerSkill,userProfile?.skill].map(normalise).filter(Boolean)));
 },[userProfile]);
 const workerArea=normalise(userProfile?.area);
 const workerSector=normalise(userProfile?.sector);
 const mapStatus=function(s?:string):Status{
   if(['Done','COMPLETED'].includes(s||'')) return 'COMPLETED';
   if(['Cancelled','CANCELLED'].includes(s||'')) return 'CANCELLED';
   if(['IN_SERVICE'].includes(s||'')) return 'SERVICE_STARTED';
   if(['ARRIVED'].includes(s||'')) return 'ARRIVED';
   if(['EN_ROUTE'].includes(s||'')) return 'TRAVELLING';
   if(['ACCEPTED','In-Progress','In Progress'].includes(s||'')) return 'ACCEPTED';
   return 'NEW';
 };
 useEffect(function(){
   if(!uid){setOrders([]);return;}
   const assignedQuery=firestoreQuery(collection(db,'orders'),where('workerId','==',uid));
   const availableQuery=firestoreQuery(collection(db,'orders'),where('workerId','==',null),where('status','in',['Pending','PAID','DISPATCHING']));
   let assigned:OrderRecord[]=[];
   let available:OrderRecord[]=[];
   let assignedReady=false;
   let availableReady=false;

   const publish=function(){
     if(!assignedReady&&!availableReady)return;
     const map=new Map<string,OrderRecord>();
     [...assigned,...available].forEach(function(o){map.set(o.id,o);});
     const nextOrders=Array.from(map.values()).filter(function(o){
       if(o.workerId===uid)return true;
       if(!online)return false;
       if(o.workerId || !pending(o.status))return false;
       if(o.isPersonalSelection || o.dispatchMode==='PERSONAL_SELECT')return false;
       const cat=normalise(o.category);
       const catOk=!workerCategories.length || workerCategories.some(function(x){return cat.includes(x)||x.includes(cat)});
       if(!catOk)return false;
       const oa=normalise(o.area), os=normalise(o.sector);
       if(oa||os)return (!workerArea || !oa || oa===workerArea) || (!!workerSector && !!os && workerSector===os);
       return true;
     }).sort(function(a,b){
       const at=new Date(a.createdAt||'').getTime() || a.createdTimestamp || 0;
       const bt=new Date(b.createdAt||'').getTime() || b.createdTimestamp || 0;
       return bt-at;
     }).map(function(o):Order{
       return {id:o.id,customer:o.customerName||'Customer',service:o.category||'Service',address:o.customerAddress||o.area||o.sector||'Location available in details',distance:Number.isFinite(Number((o as any).distanceKm))&&Number((o as any).distanceKm)>0?Number((o as any).distanceKm):null,time:o.time||'Time unavailable',date:o.date||'Upcoming',duration:o.emergencyETA?'Emergency':'Scheduled',price:o.totalAmountToPay!=null||o.price!=null?Number(o.totalAmountToPay??o.price):null,earning:o.professionalPayout!=null?Number(o.professionalPayout):null,status:mapStatus(o.status),payment:o.paymentStatus||o.paymentMethod||'Payment status unavailable',avatar:(o.customerName||'CU').slice(0,2).toUpperCase(),raw:o};
     });
     setOrders(nextOrders);
   };

   const unsubAssigned=onSnapshot(assignedQuery,function(snap){
     assigned=snap.docs.map(function(d){return {id:d.id,...d.data()} as OrderRecord});
     assignedReady=true;publish();
   },function(){assignedReady=true;publish();showNotification?.('Unable to sync your assigned jobs right now.');});

   const unsubAvailable=onSnapshot(availableQuery,function(snap){
     available=snap.docs.map(function(d){return {id:d.id,...d.data()} as OrderRecord});
     availableReady=true;publish();
   },function(){availableReady=true;publish();showNotification?.('Unable to sync available jobs right now.');});

   return function(){unsubAssigned();unsubAvailable();};
 },[uid,workerCategories.join('|'),workerArea,workerSector,online]);
 const today=orders.filter(function(o){return isToday(o.date)||isToday(o.raw?.createdAt)});
 const completed=today.filter(function(o){return o.status==='COMPLETED'}).length;
 const pendingCount=today.filter(function(o){return o.status!=='COMPLETED'&&o.status!=='CANCELLED'}).length;
 const cancelled=today.filter(function(o){return o.status==='CANCELLED'}).length;
 const todayPayouts=today.filter(function(o){return o.status==='COMPLETED'&&o.earning!==null});
 const todayEarn=todayPayouts.length?todayPayouts.reduce(function(s,o){return s+(o.earning||0)},0):null;
 const filtered=useMemo(function(){return orders.filter(function(o){return (filter==='ALL'||(filter==='NEW'&&o.status==='NEW')||(filter==='ACCEPTED'&&o.status==='ACCEPTED')||(filter==='TRAVELLING'&&o.status==='TRAVELLING')||(filter==='ARRIVED'&&o.status==='ARRIVED')||(filter==='SERVICE_STARTED'&&o.status==='SERVICE_STARTED')||(filter==='COMPLETED'&&o.status==='COMPLETED')||(filter==='CANCELLED'&&o.status==='CANCELLED'))&&(o.id+' '+o.customer+' '+o.service+' '+o.address).toLowerCase().includes(query.toLowerCase())})},[orders,filter,query]);
 const persistAvailability=async function(nextOnline:boolean){
   const previous=online;
   setOnline(nextOnline);
   try{
     if(!uid)throw new Error('Account ID unavailable.');
     await updateDoc(doc(db,'users',uid),{workerAvailability:nextOnline,isOnline:nextOnline,workerStatus:nextOnline?'ONLINE':'OFFLINE',updatedAt:new Date().toISOString()});
     showNotification?.(nextOnline?'You are now online and eligible for new orders':'You are now offline and will not receive new jobs');
   }catch(e){
     setOnline(previous);
     showNotification?.('Unable to save availability. Please try again.');
   }
 };
 const nav=function(t:Tab){setTab(t);setSelected(null);setMobile(false);window.scrollTo({top:0,behavior:'smooth'});};
 const handleLogout=async function(){
   if(loggingOut)return;
   setLoggingOut(true);
   try{
     setMobile(false);
     setSelected(null);
     await logout();
   }catch(error){
     console.error('Worker logout error:',error);
     showNotification?.('Unable to log out right now. Please try again.');
     setLoggingOut(false);
   }
 };
 const locationWatch=useRef<number|null>(null);
 useEffect(function(){
   const activeOrder=orders.find(function(o){return o.raw && ['TRAVELLING','ARRIVED','SERVICE_STARTED'].includes(o.status)});
   if(!activeOrder?.raw || !online || !navigator.geolocation){
     if(locationWatch.current!==null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatch.current);
     locationWatch.current=null;
     return;
   }
   locationWatch.current=navigator.geolocation.watchPosition(async function(pos){
     try{
       await updateDoc(doc(db,'orders',activeOrder.raw!.id),{
         workerLocation:{lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy||null,heading:pos.coords.heading??null,speed:pos.coords.speed??null,updatedAt:new Date().toISOString()},
         workerOutForWork:true,updatedAt:new Date().toISOString()
       });
     }catch{}
   },function(){}, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
   return function(){if(locationWatch.current!==null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatch.current);locationWatch.current=null;};
 },[orders.map(function(o){return o.id+o.status;}).join('|'),online]);

 const action=function(s:Status){return s==='NEW'?'Accept order':s==='ACCEPTED'?'Start travel':s==='TRAVELLING'?'Arrived':s==='ARRIVED'?'Start service':s==='SERVICE_STARTED'?'Complete order':'Completed'};
 const advance=async function(o:Order){
   if(!o.raw){return;}
   const raw=o.raw;
   try{
     if(o.status==='NEW'){
       if(!uid){return;}
       await runTransaction(db,async function(tx){
         const ref=doc(db,'orders',raw.id); const snap=await tx.get(ref);
         if(!snap.exists()) throw new Error('Booking no longer exists.');
         const current=snap.data() as any;
         if(!pending(current.status) || (current.workerId && current.workerId!==uid)) throw new Error('This job was already accepted.');
         tx.update(ref,{workerId:uid,workerName:userProfile?.name||'Verified Professional',workerPhone:userProfile?.phone||'',status:'In-Progress',acceptedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
       });
       showNotification?.('✅ Job accepted. The customer assignment is now active.');
     } else {
       const backendStatus:any=o.status==='ACCEPTED'?'EN_ROUTE':o.status==='TRAVELLING'?'ARRIVED':o.status==='ARRIVED'?'IN_SERVICE':o.status==='SERVICE_STARTED'?'Done':null;
       if(!backendStatus) return;
       await updateDoc(doc(db,'orders',raw.id),{status:backendStatus,updatedAt:new Date().toISOString(),...(backendStatus==='Done'?{completedAt:new Date().toISOString(),workerOutForWork:false}:{})});
       showNotification?.(backendStatus==='Done'?'✅ Service completed and recorded.':'Order '+o.id+' updated to '+(labels[mapStatus(backendStatus)]||backendStatus)+'.');
     }
     setSelected(null);
   }catch(e:any){showNotification?.('⚠️ '+(e?.message||'Could not update this booking.'));}
 };
 const menu=[['home','Home',Home],['orders','Orders',ClipboardList],['schedule','Schedule',CalendarDays],['earnings','Earnings',Wallet],['performance','Performance',TrendingUp],['training','Training',ShieldCheck],['inventory','Inventory',BriefcaseBusiness],['profile','Profile',UserRound],['notifications','Notifications',Bell],['incentives','Incentives',Gift],['support','Support',LifeBuoy],['settings','Settings',Settings]] as any[];

 return <div className="wx-app">
  <aside className={'wx-sidebar '+(mobile?'open':'')}>
   <div className="wx-brand"><div className="wx-logo"><img src={PUNCHX_LOGO} alt="PunchX" /></div><div><b>PunchX</b><span>PARTNER PANEL</span></div><button className="wx-close" onClick={()=>setMobile(false)}><X/></button></div>
   <div className="wx-worker-mini"><div className="wx-avatar">{String(name||"P").slice(0,2).toUpperCase()}</div><div><b>{name}</b><span>{userProfile?.uid||"Partner ID unavailable"}</span></div><i className={online?'online':''}></i></div>
   
   <nav>{menu.map(function(m:any){var I=m[2];return <button key={m[0]} className={tab===m[0]?'active':''} onClick={()=>nav(m[0])}><I size={19}/><span>{m[1]}</span>{}</button>})}</nav>
   <button className="wx-logout" onClick={handleLogout} disabled={loggingOut} aria-busy={loggingOut}><LogOut size={18}/>{loggingOut?'Logging out…':'Logout'}</button>
  </aside>
  <div className="wx-main">
   <header className="wx-header"><button className="wx-menu" onClick={()=>setMobile(true)} aria-label="Open partner menu"><Menu/></button><div className="wx-mobile-brand"><img src={PUNCHX_LOGO} alt="PunchX" /><span>PunchX</span></div><div><span className="wx-eyebrow">PUNCHX / PARTNER OPERATIONS</span><h1>{tab==='home'?'Good evening, '+name+' 👋':menu.find(function(m:any){return m[0]===tab})?.[1]}</h1></div><div className="wx-head-actions"><button className={'wx-status '+(online?'is-online':'')} onClick={()=>persistAvailability(!online)}><i></i>{online?'ONLINE':'OFFLINE'}</button><button className="wx-bell" onClick={()=>nav('notifications')} aria-label="Notifications"><Bell size={20}/></button><button className="wx-profile-chip" onClick={()=>nav('profile')}><span>{String(name||"P").slice(0,2).toUpperCase()}</span><strong>{name}</strong><ChevronRight size={15}/></button></div></header>
   <main className="wx-content">
    {tab==='home'&&<HomeView area={userProfile?.area||workerArea} online={online} today={today} completed={completed} pending={pendingCount} cancelled={cancelled} todayEarn={todayEarn} orders={orders} open={setSelected} advance={advance} action={action} nav={nav}/>}
    {tab==='orders'&&<OrdersView filtered={filtered} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} onOpen={setSelected}/>}
    {tab==='schedule'&&<ScheduleView/>}{tab==='earnings'&&<EarningsView orders={orders} todayEarn={todayEarn}/>} {tab==='performance'&&<PerformanceView orders={orders} userProfile={userProfile}/>}{tab==='training'&&<TrainingView userProfile={userProfile}/>}{tab==='inventory'&&<InventoryView userProfile={userProfile}/>}
    {tab==='profile'&&<ProfileView userProfile={userProfile} uid={uid} refreshProfile={refreshProfile} showNotification={showNotification}/>}
    {tab==='notifications'&&<NotificationsView orders={orders}/>}
    {tab==='incentives'&&<IncentivesView/>}
    {tab==='support'&&<SupportView/>}
    {tab==='settings'&&<SettingsView online={online} setOnline={setOnline} persistAvailability={persistAvailability}/>}
   </main>
   <footer className="wx-mobile-nav" aria-label="Worker panel navigation">{menu.slice(0,5).map(function(m:any){var I=m[2];return <button key={m[0]} className={tab===m[0]?'active':''} onClick={()=>nav(m[0])}><I size={18}/><span>{m[1]}</span></button>})}</footer>
   <WorkerWebsiteFooter tab={tab} nav={nav} onTransition={onTransition} onLogout={handleLogout} loggingOut={loggingOut} />
  </div>
  {selected&&<OrderModal order={selected} close={()=>setSelected(null)} advance={()=>advance(selected)} action={action(selected.status)}/>}
 </div>
}

function WorkerWebsiteFooter({tab,nav,onTransition,onLogout,loggingOut}:{tab:Tab;nav:(t:Tab)=>void;onTransition?:(s:any)=>void;onLogout:()=>Promise<void>;loggingOut:boolean}){
 return <footer className="wx-site-footer">
  <div className="wx-site-footer-glow wx-site-footer-glow-right"></div>
  <div className="wx-site-footer-glow wx-site-footer-glow-left"></div>
  <div className="wx-site-footer-inner">
   <div className="wx-footer-trust">
    {[
      [ShieldCheck,'Verified partner operations','Your work status, bookings and professional records come from PunchX account data.'],
      [ClipboardList,'Live booking workflow','Accept, travel, arrive, start and complete jobs from one responsive panel.'],
      [Navigation,'Service visibility','Use real booking location and status information when it is available.'],
      [LifeBuoy,'Partner support','Get help through the verified PunchX support channel.']
    ].map(function(item:any){var I=item[0];return <div className="wx-footer-trust-card" key={item[1]}><I/><div><b>{item[1]}</b><span>{item[2]}</span></div></div>})}
   </div>
   <div className="wx-footer-main">
    <div className="wx-footer-brand">
     <div className="wx-footer-logo"><img src={PUNCHX_LOGO} alt="PunchX"/></div>
     <div><b>PunchX</b><span>Professional partner network</span></div>
     <p>Manage PunchX service work from a mobile-friendly website built for real bookings, real status updates and verified account records.</p>
     <div className="wx-footer-tags"><span>Real bookings</span><span>Verified records</span><span>Responsive website</span></div>
    </div>
    <div className="wx-footer-links">
     <div><strong>Partner panel</strong>
      <button onClick={()=>nav('home')}>Home</button>
      <button onClick={()=>nav('orders')}>Orders</button>
      <button onClick={()=>nav('schedule')}>Schedule</button>
      <button onClick={()=>nav('earnings')}>Earnings</button>
      <button onClick={()=>nav('profile')}>Profile</button>
     </div>
     <div><strong>Account</strong>
      <button onClick={()=>nav('support')}>Support</button>
      <button onClick={()=>nav('settings')}>Settings</button>
      <button onClick={()=>onTransition?.('terms-and-conditions')}>Terms</button>
      <button onClick={()=>onTransition?.('privacy-policy')}>Privacy</button>
     </div>
    </div>
    <div className="wx-footer-support">
     <strong>Partner support</strong>
     <span>For account, booking, payment or technical issues.</span>
     <a href="mailto:punchxservice@gmail.com"><MessageCircle/> punchxservice@gmail.com</a>
     <button onClick={()=>nav('support')}><LifeBuoy/> Open support <ChevronRight/></button>
     <button className="wx-footer-logout" onClick={onLogout} disabled={loggingOut}><LogOut/>{loggingOut?'Logging out…':'Logout'}</button>
    </div>
   </div>
   <div className="wx-footer-bottom">
    <span>© {new Date().getFullYear()} PunchX. All rights reserved.</span>
    <span>Partner Panel · <b>{tab==='home'?'Home':tab.charAt(0).toUpperCase()+tab.slice(1)}</b></span>
   </div>
  </div>
 </footer>
}

function Stat(p:any){return <div className="wx-stat"><div className="wx-icon"><p.icon size={18}/></div><div><span>{p.label}</span><strong>{p.value}</strong>{p.trend&&<small>{p.trend}</small>}</div></div>}

function HomeView(p:any){
 var active=p.today.find(function(o:Order){return o.status!=='COMPLETED'&&o.status!=='CANCELLED'});
 return <div className="wx-stack">
  <div className="wx-hero"><div><span className="wx-pill"><i></i>{p.online?'Ready for orders':'Offline'}</span><h2>{p.online?'You’re online and ready for today’s work.':'You’re currently offline.'}</h2><p>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {p.area||"Service area unavailable"}</p></div><div className="wx-hero-earn"><span>Today’s earnings</span><strong>{p.todayEarn!==null?money(p.todayEarn):'Unavailable'}</strong><small>Based on completed PunchX bookings</small></div></div>
  <div className="wx-stats"><Stat label="Today’s orders" value={p.today.length} icon={ClipboardList}/><Stat label="Completed" value={p.completed} icon={CheckCircle2}/><Stat label="Pending" value={p.pending} icon={Clock3}/><Stat label="Cancelled" value={p.cancelled} icon={CircleAlert}/><Stat label="Working hours" value="—" icon={BriefcaseBusiness}/><Stat label="Avg. order" value={p.today.filter((o:any)=>o.earning!==null).length?money(p.today.filter((o:any)=>o.earning!==null).reduce((s:number,o:any)=>s+(o.earning||0),0)/p.today.filter((o:any)=>o.earning!==null).length):"—"} icon={TrendingUp}/></div>
  <div className="wx-grid-main">
   <section className="wx-card wx-active-card"><div className="wx-card-head"><div><span className="wx-section-label">PRIORITY</span><h3>Active order</h3></div>{active&&<span className={'wx-badge '+active.status.toLowerCase()}>{labels[active.status]}</span>}</div>{active?<OrderCompact order={active} open={()=>p.open(active)} advance={()=>p.advance(active)} action={p.action(active.status)}/>:<div className="wx-empty"><CheckCircle2 size={32}/><b>No active orders</b><span>You’re all caught up. Check upcoming bookings for your next visit.</span><button onClick={()=>p.nav('orders')}>View orders <ChevronRight size={15}/></button></div>}</section>
   <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">PERFORMANCE</span><h3>Performance score</h3></div><span className="wx-score-number">Unavailable</span></div><div className="wx-performance-unavailable"><TrendingUp size={28}/><b>No verified performance score yet</b><span>PunchX will show a score only when a real performance record is available for this partner.</span><button onClick={()=>p.nav('performance')}>Open performance <ChevronRight size={14}/></button></div></section>
  </div>
  <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">SCHEDULE</span><h3>Today’s orders</h3></div><button className="wx-link" onClick={()=>p.nav('orders')}>View all <ChevronRight size={14}/></button></div><div className="wx-timeline">{p.orders.filter(function(o:Order){return isToday(o.date)||isToday(o.raw?.createdAt)}).map(function(o:Order){return <button className="wx-time-row" key={o.id} onClick={()=>p.open(o)}><time>{o.time}</time><span className={'wx-dot '+o.status.toLowerCase()}></span><div><b>{o.service}</b><small>{o.customer} · {o.address}</small></div><strong>{o.earning!==null?money(o.earning):'Payout unavailable'}</strong><span className={'wx-mini-status '+o.status.toLowerCase()}>{labels[o.status]}</span><ChevronRight size={15}/></button>})}</div></section>
  <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">UPCOMING</span><h3>Next bookings</h3></div><CalendarDays size={19}/></div>{p.orders.filter(function(o:Order){return o.date!=='Today'}).map(function(o:Order){return <button className="wx-upcoming-row" key={o.id} onClick={()=>p.open(o)}><div className="wx-date-box"><b>{o.time.split(' ')[0]}</b><span>{o.time.split(' ')[1]}</span></div><div><b>{o.service}</b><span>{o.customer} · {o.address}</span></div><strong>{o.earning!==null?money(o.earning):'Payout unavailable'}</strong><ChevronRight size={15}/></button>})}</section>
  <section className="wx-quick"><button onClick={()=>p.nav('orders')}><ClipboardList/><b>Manage orders</b><span>Accept & complete jobs</span></button><button onClick={()=>p.nav('earnings')}><Wallet/><b>View earnings</b><span>Track your income</span></button><button onClick={()=>p.nav('profile')}><UserRound/><b>Update profile</b><span>Keep details current</span></button><button onClick={()=>p.nav('support')}><LifeBuoy/><b>Get support</b><span>Need help?</span></button></section>
 </div>
}

function OrderCompact(p:any){var o=p.order;return <div className="wx-order-focus"><div className="wx-customer"><div className="wx-avatar large">{o.avatar}</div><div><span>ORDER #{o.id}</span><h4>{o.customer}</h4><p>{o.service} · {o.duration}</p></div><button className="wx-icon-btn" onClick={p.open}><MoreHorizontal/></button></div><div className="wx-order-facts"><div><MapPin/><span>Location</span><b>{o.address}</b><small>{o.distance!==null?o.distance+" km away":"Distance unavailable"}</small></div><div><Clock3/><span>Booking</span><b>{o.date} · {o.time}</b><small>Estimated {o.duration}</small></div><div><Banknote/><span>Your earning</span><b>{o.earning!==null?money(o.earning):'Payout unavailable'}</b><small>{o.payment}</small></div></div><div className="wx-order-actions"><button className="wx-secondary" onClick={p.open}>View details</button><button className="wx-primary" onClick={p.advance}>{p.action}<ChevronRight size={16}/></button></div></div>}

function OrdersView({filtered,filter,setFilter,query,setQuery,onOpen}:any){
  const tabs=['ALL','NEW','ACCEPTED','TRAVELLING','ARRIVED','SERVICE_STARTED','COMPLETED','CANCELLED'];
  return <div className="wx-stack">
    <div className="wx-page-intro"><div><span className="wx-section-label">WORK QUEUE</span><h2>Orders</h2><p>Manage every booking from assignment to completion.</p></div><span className="wx-muted">Live Firebase bookings only</span></div>
    <div className="wx-toolbar"><div className="wx-search"><Search size={17}/><input placeholder="Search order, customer or service…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="wx-tabs">{tabs.map(t=><button className={filter===t?'active':''} key={t} onClick={()=>setFilter(t)}>{t==='ALL'?'All':statusLabel[t]||t.replace('_',' ')}</button>)}</div></div>
    <section className="wx-card wx-table-card"><div className="wx-table-head"><span>Order</span><span>Customer / service</span><span>Schedule</span><span>Amount</span><span>Status</span><span></span></div>
      {filtered.map((o:any)=><button className="wx-table-row" key={o.id} onClick={()=>onOpen(o)}><b>#{o.id}</b><div><strong>{o.customer}</strong><span>{o.service}</span></div><div><strong>{o.date}</strong><span>{o.time} · {o.distance!==null?o.distance+" km":"Distance unavailable"}</span></div><div><strong>{money(o.earning)}</strong><span>{o.payment}</span></div><span className={'wx-badge '+o.status.toLowerCase()}>{statusLabel[o.status]}</span><ChevronRight size={17}/></button>)}
      {!filtered.length&&<div className="wx-empty"><Search/><b>No orders found</b><span>Try another filter or search.</span></div>}
    </section>
  </div>;
}

function EarningsView({orders,todayEarn}:{orders:Order[];todayEarn:number|null}){
 const completed=orders.filter(o=>o.status==='COMPLETED');
 const weekOrders=completed.filter(o=>isWithinDays(o.raw?.completedAt||o.raw?.createdAt,7));
 const monthOrders=completed.filter(o=>isWithinDays(o.raw?.completedAt||o.raw?.createdAt,31));
 const payoutOrders=completed.filter(o=>o.earning!==null);
 const total=payoutOrders.reduce((s,o)=>s+(o.earning||0),0);
 const weekTotal=weekOrders.filter(o=>o.earning!==null).reduce((s,o)=>s+(o.earning||0),0);
 const monthTotal=monthOrders.filter(o=>o.earning!==null).reduce((s,o)=>s+(o.earning||0),0);
 return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">FINANCIALS</span><h2>My earnings</h2><p>Calculated only from completed PunchX bookings.</p></div></div>
 <div className="wx-stats"><Stat label="Today" value={todayEarn!==null?money(todayEarn):"Unavailable"} icon={Banknote}/><Stat label="Last 7 days" value={weekOrders.some(o=>o.earning!==null)?money(weekTotal):"Unavailable"} icon={TrendingUp}/><Stat label="Last 31 days" value={monthOrders.some(o=>o.earning!==null)?money(monthTotal):"Unavailable"} icon={CalendarDays}/><Stat label="Lifetime completed" value={payoutOrders.length?money(total):"Unavailable"} icon={Wallet}/><Stat label="Completed jobs" value={completed.length} icon={CheckCircle2}/></div>
 <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">COMPLETED BOOKINGS</span><h3>Real payout records</h3></div></div>{completed.slice(0,20).map(o=><div className="wx-inventory-row" key={o.id}><Banknote/><div><b>#{o.id} · {o.service}</b><span>{o.date} · {o.customer}</span></div><strong className="good">{o.earning!==null?money(o.earning):'Payout unavailable'}</strong></div>)}{!completed.length&&<div className="wx-empty"><Banknote/><b>No completed earnings yet</b><span>Completed PunchX bookings will appear here.</span></div>}</section>
 <section className="wx-card"><div className="wx-breakdown"><span>Completed jobs <b>{completed.length}</b></span><span>Professional payout total <b>{payoutOrders.length?money(total):"Unavailable"}</b></span><span>Wallet balance <b>Unavailable</b></span></div><p className="wx-muted">Wallet and withdrawal data are hidden until PunchX provides a verified wallet record.</p></section></div>;
}
function ScheduleView(){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">WORK CALENDAR</span><h2>Schedule & availability</h2><p>Only a verified stored schedule will be shown.</p></div></div><section className="wx-card"><div className="wx-empty"><CalendarDays/><b>No verified schedule configured</b><span>No stored weekly working hours are available for this professional.</span></div></section><section className="wx-card"><div className="wx-control-grid"><button disabled><Clock3/><b>Breaks</b><span>Not configured</span></button><button disabled><Route/><b>Service radius</b><span>Not configured</span></button><button disabled><CalendarDays/><b>Time off</b><span>Not configured</span></button><button disabled><CircleAlert/><b>Emergency pass</b><span>Not configured</span></button></div></section></div>}
function PerformanceView({orders,userProfile}:{orders:Order[];userProfile:any}){const completed=orders.filter(o=>o.status==='COMPLETED');const cancelled=orders.filter(o=>o.status==='CANCELLED');const den=completed.length+cancelled.length;const completion=den?Math.round(completed.length/den*100):null;const ratings=completed.map(o=>safeNumber(o.raw?.userRating)).filter(n=>n>0);const rating=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null;return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">QUALITY SCORE</span><h2>Performance & growth</h2><p>Calculated from real PunchX booking records only.</p></div></div><div className="wx-stats"><Stat label="Customer rating" value={rating?rating.toFixed(1)+' / 5':(userProfile?.workerRating?Number(userProfile.workerRating).toFixed(1)+' / 5':'—')} icon={Star}/><Stat label="Completion rate" value={completion!==null?completion+'%':'—'} icon={CheckCircle2}/><Stat label="On-time arrival" value="—" icon={Timer}/><Stat label="Response rate" value="—" icon={MessageCircle}/><Stat label="Completed jobs" value={completed.length} icon={UserRound}/><Stat label="Partner level" value="—" icon={ShieldCheck}/></div><section className="wx-card"><div className="wx-empty"><TrendingUp/><b>Detailed quality metrics unavailable</b><span>On-time, response, repeat-customer and level data require verified PunchX records.</span></div></section></div>}
function TrainingView({userProfile}:{userProfile:any}){const courses=Array.isArray(userProfile?.trainingCourses)?userProfile.trainingCourses:[];return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">SKILLS & CERTIFICATION</span><h2>Training center</h2><p>Only verified PunchX training records are displayed.</p></div></div><section className="wx-card">{courses.length?courses.map((x:any)=><div className="wx-inventory-row" key={x.id||x.name}><GraduationCap/><div><b>{x.name||'Training'}</b><span>{x.status||'Recorded by PunchX'}</span></div></div>):<div className="wx-empty"><GraduationCap/><b>No training records</b><span>No verified PunchX training course or certification is stored.</span></div>}</section></div>}
function InventoryView({userProfile}:{userProfile:any}){const items=Array.isArray(userProfile?.inventory)?userProfile.inventory:[];return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">TOOLS & MATERIALS</span><h2>Inventory & work kit</h2><p>Only verified inventory records are displayed.</p></div></div><section className="wx-card">{items.length?items.map((x:any)=><div className="wx-inventory-row" key={x.id||x.name}><Package/><div><b>{x.name||'Item'}</b><span>{x.status||'Recorded'}</span></div><strong>{x.quantity??'—'}</strong></div>):<div className="wx-empty"><Package/><b>No inventory records</b><span>No verified PunchX inventory or material records are available.</span></div>}</section></div>}
function ProfileView({userProfile,uid,refreshProfile,showNotification}:{userProfile:any;uid:string;refreshProfile?:()=>Promise<void>;showNotification?:(m:string)=>void}){
 const p=userProfile||{};
 const categories=Array.isArray(p.workerCategories)?p.workerCategories.filter(Boolean):[];
 const [application,setApplication]=useState<any>(null);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [photoBusy,setPhotoBusy]=useState(false);
 const [draft,setDraft]=useState<any>({});
 const [photoPreview,setPhotoPreview]=useState<string>(p.photoURL||'');

 useEffect(function(){
   setPhotoPreview(p.photoURL||application?.photoURL||'');
   setDraft({
     name:p.name||application?.legalName||'',
     phone:p.phone||application?.phone||'',
     address:p.address||application?.address||'',
     landmark:p.landmark||application?.landmark||'',
     area:p.area||application?.area||'',
     sector:p.sector||application?.sector||'',
     workerSkill:p.workerSkill||application?.skill||'',
     workerExperience:p.workerExperience||application?.experienceYears||'',
     bio:p.bio||application?.bio||''
   });
 },[p.name,p.phone,p.address,p.landmark,p.area,p.sector,p.workerSkill,p.workerExperience,p.bio,p.photoURL,application]);

 useEffect(function(){
   if(!uid)return;
   const workerApplicationQuery=firestoreQuery(collection(db,'workerApplications'),where('uid','==',uid));
   return onSnapshot(workerApplicationQuery,function(snap){
     const first=snap.docs[0];
     setApplication(first?{id:first.id,...first.data()}:null);
   },function(){setApplication(null);});
 },[uid]);

 const source:any={
   ...(application||{}),
   ...p,
   name:p.name||application?.legalName||'',
   phone:p.phone||application?.phone||'',
   email:p.email||application?.email||'',
   address:p.address||application?.address||'',
   landmark:p.landmark||application?.landmark||'',
   area:p.area||application?.area||'',
   sector:p.sector||application?.sector||'',
   workerSkill:p.workerSkill||application?.skill||'',
   workerExperience:p.workerExperience||application?.experienceYears||'',
   workerCategories:categories.length?categories:(Array.isArray(application?.categories)?application.categories:[])
 };
 const initials=String(source.name||'P').trim().slice(0,2).toUpperCase();

 const readPhoto=function(file:File){
   return new Promise<string>(function(resolve,reject){
     const reader=new FileReader();
     reader.onerror=function(){reject(new Error('Could not read this photo.'));};
     reader.onload=function(){
       const img=new Image();
       img.onerror=function(){reject(new Error('This image could not be processed.'));};
       img.onload=function(){
         const max=384;
         const scale=Math.min(1,max/Math.max(img.width,img.height));
         const canvas=document.createElement('canvas');
         canvas.width=Math.max(1,Math.round(img.width*scale));
         canvas.height=Math.max(1,Math.round(img.height*scale));
         const ctx=canvas.getContext('2d');
         if(!ctx){reject(new Error('Image processing is unavailable on this device.'));return;}
         ctx.drawImage(img,0,0,canvas.width,canvas.height);
         resolve(canvas.toDataURL('image/jpeg',0.72));
       };
       img.src=String(reader.result||'');
     };
     reader.readAsDataURL(file);
   });
 };

 const choosePhoto=async function(e:React.ChangeEvent<HTMLInputElement>){
   const file=e.target.files?.[0];
   e.target.value='';
   if(!file)return;
   if(!file.type.startsWith('image/')){showNotification?.('Please choose a real image file.');return;}
   if(file.size>8*1024*1024){showNotification?.('Photo is too large. Please choose an image under 8 MB.');return;}
   setPhotoBusy(true);
   try{
     const data=await readPhoto(file);
     if(data.length>450000){showNotification?.('Photo is still too large after compression. Please choose a smaller image.');return;}
     setPhotoPreview(data);
   }catch(err:any){
     showNotification?.('⚠️ '+(err?.message||'Could not process the photo.'));
   }finally{setPhotoBusy(false);}
 };

 const save=async function(){
   if(!uid){showNotification?.('Your account ID is unavailable. Please sign in again.');return;}
   if(!draft.name.trim()){showNotification?.('Full name is required.');return;}
   setSaving(true);
   try{
     const payload:any={
       name:draft.name.trim(),
       phone:draft.phone.trim(),
       address:draft.address.trim(),
       landmark:draft.landmark.trim(),
       area:draft.area.trim(),
       sector:draft.sector.trim(),
       workerSkill:draft.workerSkill.trim(),
       workerExperience:draft.workerExperience.trim(),
       bio:draft.bio.trim(),
       photoURL:photoPreview||'',
       updatedAt:new Date().toISOString()
     };
     await updateDoc(doc(db,'users',uid),payload);
     await refreshProfile?.();
     setEditing(false);
     showNotification?.('✓ Profile updated successfully.');
   }catch(err:any){
     showNotification?.('⚠️ Could not save your profile. Please try again.');
   }finally{setSaving(false);}
 };

 return <div className="wx-stack">
   <div className="wx-page-intro">
     <div><span className="wx-section-label">PARTNER PROFILE</span><h2>My profile</h2><p>Your verified PunchX account and professional details.</p></div>
     <button className="wx-primary" onClick={()=>setEditing(true)}><Pencil size={15}/> Edit profile</button>
   </div>

   <section className="wx-profile-hero wx-card">
     <div className="wx-profile-photo-wrap">
       {source.photoURL?<img className="wx-profile-photo" src={source.photoURL} alt="Your PunchX profile" />:<div className="wx-avatar xl">{initials}</div>}
       <button className="wx-photo-camera" onClick={()=>setEditing(true)} aria-label="Add or change profile photo"><Camera size={15}/></button>
     </div>
     <div className="wx-profile-hero-copy">
       <h2>{source.name||'Name unavailable'}</h2>
       <p>{source.workerSkill||categories.join(', ')||application?.skill||'Professional service not configured'} · Partner ID {source.uid||'unavailable'}</p>
       <div className="wx-profile-meta">
         <span><Star size={15} fill="currentColor"/> {source.workerRating?Number(source.workerRating).toFixed(1):'—'}</span>
         <span>{source.workerCompletedJobs??application?.completedJobs??'—'} completed jobs</span>
         <span>{source.workerExperience||application?.experienceYears||'Experience unavailable'}</span>
         <span className="wx-verified"><ShieldCheck size={15}/> {source.status==='APPROVED'||application?.status==='APPROVED'?'Verified Partner':'Verification status unavailable'}</span>
       </div>
     </div>
   </section>

   <section className="wx-card">
     <div className="wx-card-head"><div><span className="wx-section-label">ACCOUNT</span><h3>Account information</h3></div><button className="wx-secondary" onClick={()=>setEditing(true)}><Pencil size={14}/> Edit</button></div>
     <div className="wx-detail-list wx-profile-details">
       <span>Full name <b>{source.name||'—'}</b></span>
       <span>Phone <b>{source.phone||application?.phone||'—'}</b></span>
       <span>Email <b>{source.email||application?.email||'—'}</b></span>
       <span>Address <b>{source.address||application?.address||'—'}</b></span>
       <span>Landmark <b>{source.landmark||'—'}</b></span>
       <span>Area <b>{source.area||application?.area||'—'}</b></span>
       <span>Sector <b>{source.sector||application?.sector||'—'}</b></span>
       <span>Primary service <b>{source.workerSkill||application?.skill||'—'}</b></span>
       <span>Service categories <b>{categories.length?categories.join(', '):(Array.isArray(application?.categories)?application.categories.join(', '):'—')}</b></span>
       <span>Experience <b>{source.workerExperience||application?.experienceYears||'—'}</b></span>
       <span>Partner status <b>{source.status||application?.status||'—'}</b></span>
       <span>Application ID <b>{source.applicationId||application?.id||'—'}</b></span>
       <span>Account created <b>{source.createdAt?new Date(source.createdAt).toLocaleDateString('en-IN'):'—'}</b></span>
       <span>Profile photo <b>{source.photoURL?'Added':'Not added'}</b></span>
     </div>
   </section>

   {source.bio&&<section className="wx-card"><span className="wx-section-label">ABOUT</span><h3>Professional bio</h3><p className="wx-profile-bio">{source.bio}</p></section>}

   <section className="wx-card wx-profile-note"><ShieldCheck size={18}/><div><b>Protected professional fields</b><span>Verification status, ratings, completed jobs and payout records are controlled by PunchX. They cannot be fabricated or edited from this panel.</span></div></section>

   {editing&&<div className="wx-overlay">
     <div className="wx-modal wx-profile-modal">
       <button className="wx-modal-x" onClick={()=>!saving&&setEditing(false)}><X/></button>
       <div className="wx-modal-icon"><UserRound/></div>
       <h2>Edit your profile</h2>
       <p>Update your personal and contact information. Verification and earnings data remain protected.</p>
       <div className="wx-profile-edit-photo">
         {photoPreview?<img src={photoPreview} alt="Profile preview"/>:<div className="wx-avatar xl">{initials}</div>}
         <div><label className="wx-upload-btn">{photoBusy?<Loader2 className="wx-spin"/>:<Camera size={16}/>} {photoBusy?'Processing…':photoPreview?'Change genuine photo':'Add genuine photo'}<input type="file" accept="image/*" onChange={choosePhoto} disabled={saving||photoBusy}/></label><small>Use a clear photo of yourself. PunchX stores the image with your account.</small></div>
       </div>
       <div className="wx-profile-edit-grid">
         <label>Full name<input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})} /></label>
         <label>Phone<input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})} inputMode="tel" /></label>
         <label>Address<input value={draft.address||''} onChange={e=>setDraft({...draft,address:e.target.value})} /></label>
         <label>Landmark<input value={draft.landmark||''} onChange={e=>setDraft({...draft,landmark:e.target.value})} /></label>
         <label>Area<input value={draft.area||''} onChange={e=>setDraft({...draft,area:e.target.value})} /></label>
         <label>Sector<input value={draft.sector||''} onChange={e=>setDraft({...draft,sector:e.target.value})} /></label>
         <label>Primary service<input value={draft.workerSkill||''} onChange={e=>setDraft({...draft,workerSkill:e.target.value})} /></label>
         <label>Experience<input value={draft.workerExperience||''} onChange={e=>setDraft({...draft,workerExperience:e.target.value})} /></label>
         <label className="wx-profile-edit-wide">Professional bio<textarea value={draft.bio||''} onChange={e=>setDraft({...draft,bio:e.target.value})} rows={4}/></label>
       </div>
       <div className="wx-modal-actions"><button className="wx-secondary" onClick={()=>setEditing(false)} disabled={saving}>Cancel</button><button className="wx-primary" onClick={save} disabled={saving||photoBusy}>{saving?<Loader2 className="wx-spin"/>:<Save size={16}/>} {saving?'Saving…':'Save changes'}</button></div>
     </div>
   </div>}
 </div>
}
function NotificationsView({orders}:{orders:Order[]}){const recent=orders.slice(0,20);return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">UPDATES</span><h2>Notifications</h2><p>Only live booking events are shown here.</p></div></div><section className="wx-card wx-notes">{recent.map(o=><div key={o.id}><div className="wx-note-icon"><ClipboardList/></div><div><b>Booking #{o.id}</b><p>{o.service} · {statusLabel[o.status]||o.status} · {o.customer}</p><small>{o.date}{o.time?' · '+o.time:''}</small></div><ChevronRight/></div>)}{!recent.length&&<div className="wx-empty"><Bell/><b>No notifications</b><span>New PunchX booking events will appear here.</span></div>}</section></div>}
function IncentivesView(){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">EARN MORE</span><h2>Incentives & bonuses</h2><p>Only verified PunchX campaigns are displayed.</p></div></div><section className="wx-card"><div className="wx-empty"><Gift/><b>No active incentives available</b><span>No verified incentive campaign is available for this account.</span></div></section></div>}
function SupportView(){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">PARTNER CARE</span><h2>Help & support</h2><p>Order, payment, customer and technical support.</p></div><a className="wx-primary" href="mailto:punchxservice@gmail.com"><LifeBuoy size={16}/> Contact support</a></div><div className="wx-support-grid">{[['Order issue','Report an order problem',ClipboardList],['Payment issue','Missing or incorrect earnings',Banknote],['Customer report','Safety or customer concern',CircleAlert],['Technical issue','App or location problem',Settings],['Email support','punchxservice@gmail.com',MessageCircle],['Emergency assistance','Use verified PunchX support channels',LifeBuoy]].map(function(x:any){var I=x[2];return <button className="wx-card wx-support-card" key={x[0]}><I/><div><b>{x[0]}</b><span>{x[1]}</span></div><ChevronRight/></button>})}</div></div>}
function SettingsView(p:any){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">CONTROL CENTER</span><h2>Settings</h2><p>Account, notifications, privacy and availability.</p></div></div>{['Account','Notifications','Privacy & location','App preferences','Account status'].map(function(x,i){return <section className="wx-card wx-setting" key={x}><div><b>{x}</b><span>{i===0?'Edit profile · Change password · Login security':i===1?'Order alerts · Payment alerts · Promotions':i===2?'Location permission · Data settings':i===3?'Language · Theme · Terms & Privacy':'Deactivate account · Logout'}</span></div>{i===2?<button className="wx-secondary">Manage</button>:i===4?<button className="wx-danger">Deactivate</button>:<ChevronRight/>}</section>})}<section className="wx-card wx-setting"><div><b>Availability</b><span>{p.online?'Online — eligible for new orders':'Offline — no new orders'}</span></div><button className={'wx-toggle-btn '+(p.online?'on':'')} onClick={()=>p.persistAvailability(!p.online)}>{p.online?'ONLINE':'OFFLINE'}</button></section></div>}

function OrderModal(p:any){var o=p.order;return <div className="wx-overlay"><div className="wx-modal wx-order-modal"><button className="wx-modal-x" onClick={p.close}><X/></button><div className="wx-modal-top"><span className={'wx-badge '+o.status.toLowerCase()}>{labels[o.status]}</span><span>ORDER #{o.id}</span></div><div className="wx-customer"><div className="wx-avatar large">{o.avatar}</div><div><h2>{o.customer}</h2><p>{o.service}</p></div></div><div className="wx-modal-grid"><div><MapPin/><span>Address</span><b>{o.address}</b><small>{o.distance!==null?o.distance+" km away":"Distance unavailable"}</small></div><div><CalendarDays/><span>Booking</span><b>{o.date} · {o.time}</b><small>{o.duration}</small></div><div><Banknote/><span>Customer total</span><b>{o.price!==null?money(o.price):'Unavailable'}</b><small>Payment: {o.payment}</small></div><div><Wallet/><span>Your earning</span><b>{o.earning!==null?money(o.earning):'Payout unavailable'}</b><small>Verified professional payout only</small></div></div><div className="wx-status-line">{['ACCEPTED','TRAVELLING','ARRIVED','SERVICE_STARTED','COMPLETED'].map(function(s,i){return <React.Fragment key={s}><span className={['ACCEPTED','TRAVELLING','ARRIVED','SERVICE_STARTED','COMPLETED'].indexOf(o.status)>=i?'done':''}>{i+1}</span>{i<4&&<i/>}</React.Fragment>})}</div><div className="wx-status-labels"><span>Accepted</span><span>Travel</span><span>Arrived</span><span>Service</span><span>Done</span></div><div className="wx-modal-actions"><button className="wx-secondary" onClick={()=>{const phone=o.raw?.customerPhone;if(phone)window.location.href="tel:"+phone;else alert("Customer phone number is not available in this booking.");}}><Phone size={16}/> Contact</button><button className="wx-secondary" onClick={()=>{const loc=o.raw?.customerLocation;if(loc)window.open("https://www.google.com/maps/dir/?api=1&destination="+loc.lat+","+loc.lng,"_blank","noopener,noreferrer");else if(o.address&&o.address!=="Location available in details")window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(o.address),"_blank","noopener,noreferrer");else alert("Customer location is not available in this booking.");}}><Navigation size={16}/> Navigate</button>{o.status!=='COMPLETED'&&<button className="wx-primary" onClick={p.advance}>{p.action}<ChevronRight size={16}/></button>}</div></div></div>}
