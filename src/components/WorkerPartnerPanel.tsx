import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Home, Wallet, ClipboardList, UserRound, Bell, Settings, LogOut, Menu, X, MapPin, Phone, Navigation, CheckCircle2, Clock3, CircleAlert, TrendingUp, CalendarDays, Star, ShieldCheck, Gift, LifeBuoy, ChevronRight, Search, Banknote, BriefcaseBusiness, Zap, MoreHorizontal, SlidersHorizontal, Route, MessageCircle, GraduationCap, Plus, Timer, Package, Camera, Pencil, Save, Loader2, BarChart3, LineChart } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { auth, db } from '../lib/firebase';
import { OrderRecord } from '../types';
import { collection, doc, onSnapshot, runTransaction, updateDoc, setDoc, query as firestoreQuery, where } from 'firebase/firestore';
import PUNCHX_LOGO from '../assets/logo';
import { calculateDistanceKm, getAccurateCurrentPosition, reverseGeocodeCoords, getServiceRadiusKm } from '../lib/location';
import './worker-partner-panel.css';

type Tab = 'home'|'orders'|'schedule'|'earnings'|'performance'|'training'|'inventory'|'profile'|'notifications'|'incentives'|'support'|'settings';
type Status = 'NEW'|'ACCEPTED'|'TRAVELLING'|'ARRIVED'|'SERVICE_STARTED'|'COMPLETED'|'CANCELLED';
type ReportPeriod = 7|30|60|90|365;
const REPORT_PERIODS:ReportPeriod[]=[7,30,60,90,365];
const reportLabel=(days:ReportPeriod)=>days===365?'1 year':String(days)+' days';
type Order = { id:string; customer:string; service:string; address:string; distance:number|null; time:string; date:string; duration:string; price:number|null; earning:number|null; status:Status; payment:string; avatar:string; raw?:OrderRecord };

const labels:Record<Status,string> = {NEW:'New',ACCEPTED:'Accepted',TRAVELLING:'Travelling',ARRIVED:'Arrived',SERVICE_STARTED:'Service started',COMPLETED:'Completed',CANCELLED:'Cancelled'};
const pending=(s?:string)=>!s || ['Pending','PAID','DISPATCHING'].includes(s);
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const moneyOrUnavailable=(n:number|null|undefined)=>n==null?'Unavailable':money(n);
const recordDate=(o:Order)=>parseDate(o.raw?.completedAt||o.raw?.createdAt||o.date);
const normalise=(value:unknown)=>String(value??'').trim().toLowerCase();
const statusLabel:Record<string,string>={...labels,ALL:'All'};
const parseDate=(value:unknown):Date|null=>{if(value&&typeof value==='object'&&typeof (value as any).toDate==='function'){const d=(value as any).toDate();return d instanceof Date&&!Number.isNaN(d.getTime())?d:null;}const s=String(value??'').trim();if(!s||['today','tomorrow','upcoming'].includes(s.toLowerCase()))return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d;};
const isToday=(value:unknown)=>{const s=String(value??'').trim().toLowerCase();if(s==='today')return true;const d=parseDate(value);if(!d)return false;const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();};
const isWithinDays=(value:unknown,days:number)=>{const d=parseDate(value);if(!d)return false;const diff=Date.now()-d.getTime();return diff>=0&&diff<=days*86400000;};
const safeNumber=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0;};

const isInstantOrderRecord=(o:OrderRecord)=>Boolean(o.isInstantOrder)||o.bookingType==='INSTANT'||Boolean(o.emergencyETA)||Number(o.emergencySurcharge||0)>0||['instant','sos','emergency'].includes(normalise((o as any).orderType||(o as any).priority));

export default function WorkerPartnerPanel({onTransition,showNotification}:{onTransition?:(s:any)=>void;showNotification?:(m:string)=>void}) {
 const {currentUser,userProfile,refreshProfile,logout}=useAuth() as any;
 const uid=currentUser?.uid || userProfile?.uid || '';
 const [tab,setTab]=useState<Tab>('home');
 const [reportPeriod,setReportPeriod]=useState<ReportPeriod>(7);
 const [online,setOnline]=useState(false);
 const [orders,setOrders]=useState<Order[]>([]);
 const [selected,setSelected]=useState<Order|null>(null);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('ALL');
 const [mobile,setMobile]=useState(false);
 const [loggingOut,setLoggingOut]=useState(false);
 const [geo,setGeo]=useState<{lat:number;lng:number;area:string;city:string;sector:string;updatedAt:string}|null>(()=>{
   const loc=userProfile?.location;
   return loc&&typeof loc.lat==='number'&&typeof loc.lng==='number'?{lat:loc.lat,lng:loc.lng,area:String(userProfile?.geofenceArea||userProfile?.area||'Service area unavailable'),city:String(userProfile?.city||''),sector:String(userProfile?.sector||''),updatedAt:String(userProfile?.geofenceUpdatedAt||userProfile?.updatedAt||'')}:null;
 });
 const [geoLoading,setGeoLoading]=useState(false);
 const [geoError,setGeoError]=useState('');
 const name=userProfile?.name||'Professional';
 useEffect(function(){if(typeof userProfile?.workerAvailability==='boolean')setOnline(userProfile.workerAvailability);},[userProfile?.workerAvailability]);
 useEffect(function(){
   if(!uid||typeof navigator==='undefined'||!navigator.geolocation)return;
   let cancelled=false; let watchId:number|null=null; let lastReverse=0;
   const applyPosition=async function(lat:number,lng:number){
     if(cancelled)return;
     try{
       const resolved=await reverseGeocodeCoords(lat,lng);
       if(cancelled)return;
       const next={lat,lng,area:resolved.area||'Local area',city:resolved.city||'',sector:resolved.sector||'',updatedAt:new Date().toISOString()};
       setGeo(next);setGeoError('');
       const payload={location:{lat,lng},address:resolved.address,area:next.area,city:next.city,sector:next.sector,geofenceArea:next.area,geofenceRadiusKm:getServiceRadiusKm(next.city || next.area),geofenceUpdatedAt:next.updatedAt,updatedAt:next.updatedAt};
       await setDoc(doc(db,'users',uid),payload,{merge:true});
       await setDoc(doc(db,'workerApplications',String(userProfile?.applicationId||uid)),payload,{merge:true});
     }catch(error){if(!cancelled)setGeoError('Live location could not be resolved right now.');}
   };
   const detect=async function(){
     setGeoLoading(true);setGeoError('');
     try{const pos=await getAccurateCurrentPosition(true);await applyPosition(pos.lat,pos.lng);}catch(error){if(!cancelled)setGeoError('Location permission is required to detect your service zone.');}finally{if(!cancelled)setGeoLoading(false);}
   };
   void detect();
   watchId=navigator.geolocation.watchPosition(function(pos){
     const now=Date.now();
     if(now-lastReverse<30000)return;
     lastReverse=now;void applyPosition(pos.coords.latitude,pos.coords.longitude);
   },function(){if(!cancelled)setGeoError('Live location permission is unavailable.');},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
   return function(){cancelled=true;if(watchId!==null)navigator.geolocation.clearWatch(watchId);};
 },[uid]);
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
       if(o.workerId || !pending(o.status))return false;
       const instantOrder=isInstantOrderRecord(o);
       if(instantOrder&&!online)return false;
       if(o.isPersonalSelection || o.dispatchMode==='PERSONAL_SELECT')return false;
       const cat=normalise(o.category);
       const catOk=!workerCategories.length || workerCategories.some(function(x){return cat.includes(x)||x.includes(cat)});
       if(!catOk)return false;
       const customerLoc=o.customerLocation;
       if(customerLoc&&geo){return calculateDistanceKm(geo.lat,geo.lng,customerLoc.lat,customerLoc.lng)<=getServiceRadiusKm(geo.city || geo.area);}
       const oa=normalise(o.area), os=normalise(o.sector);
       if(oa||os)return (!workerArea || !oa || oa===workerArea) || (!!workerSector && !!os && workerSector===os);
       return true;
     }).sort(function(a,b){
       const at=new Date(a.createdAt||'').getTime() || a.createdTimestamp || 0;
       const bt=new Date(b.createdAt||'').getTime() || b.createdTimestamp || 0;
       return bt-at;
     }).map(function(o):Order{
       return {id:o.id,customer:o.customerName||'Customer information unavailable',service:o.category||'Service unavailable',address:o.customerAddress||o.area||o.sector||'Address unavailable',distance:Number.isFinite(Number((o as any).distanceKm))&&Number((o as any).distanceKm)>0?Number((o as any).distanceKm):null,time:o.time||'Time unavailable',date:o.date||'Upcoming',duration:o.emergencyETA?'Emergency':'Scheduled',price:o.totalAmountToPay!=null||o.price!=null?Number(o.totalAmountToPay??o.price):null,earning:o.professionalPayout!=null?Number(o.professionalPayout):null,status:mapStatus(o.status),payment:o.paymentStatus||o.paymentMethod||'Payment status unavailable',avatar:(o.customerName||'CU').slice(0,2).toUpperCase(),raw:o};
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
 },[uid,workerCategories.join('|'),workerArea,workerSector,online,geo?.lat,geo?.lng]);
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
     showNotification?.(nextOnline?'You are now online and eligible for instant / SOS requests':'You are now offline for instant / SOS requests; later bookings remain visible');
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
   <header className="wx-header"><div className="wx-header-left"><button className="wx-menu" onClick={()=>setMobile(true)} aria-label="Open partner menu"><Menu/></button><div className="wx-mobile-brand"><img src={PUNCHX_LOGO} alt="PunchX" /></div></div><div className="wx-header-title"><span className="wx-eyebrow">PUNCHX / PARTNER OPERATIONS</span><h1>{tab==='home'?'Good evening, '+name+' 👋':menu.find(function(m:any){return m[0]===tab})?.[1]}</h1></div><div className="wx-head-actions"><button className={'wx-status '+(online?'is-online':'')} onClick={()=>persistAvailability(!online)}><i></i>{online?'ONLINE':'OFFLINE'}</button><button className="wx-bell" onClick={()=>nav('notifications')} aria-label="Notifications"><Bell size={20}/></button><button className="wx-profile-chip" onClick={()=>nav('profile')} aria-label="Open profile"><span>{String(name||"P").slice(0,2).toUpperCase()}</span><strong>{name}</strong><ChevronRight size={15}/></button></div></header>
   <main className="wx-content">
    {tab==='home'&&<HomeView area={geo?.area||userProfile?.area||workerArea} geo={geo} geoLoading={geoLoading} geoError={geoError} online={online} toggleOnline={()=>persistAvailability(!online)} today={today} completed={completed} pending={pendingCount} cancelled={cancelled} todayEarn={todayEarn} orders={orders} open={setSelected} advance={advance} action={action} nav={nav}/>}
    {tab==='orders'&&<OrdersView filtered={filtered} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} onOpen={setSelected}/>}
    {tab==='schedule'&&<ScheduleView/>}{tab==='earnings'&&<EarningsView orders={orders} reportPeriod={reportPeriod} setReportPeriod={setReportPeriod}/>} {tab==='performance'&&<PerformanceView orders={orders} userProfile={userProfile} reportPeriod={reportPeriod} setReportPeriod={setReportPeriod}/>}{tab==='training'&&<TrainingView userProfile={userProfile}/>}{tab==='inventory'&&<InventoryView userProfile={userProfile}/>}
    {tab==='profile'&&<ProfileView userProfile={userProfile} uid={uid} refreshProfile={refreshProfile} showNotification={showNotification}/>}
    {tab==='notifications'&&<NotificationsView orders={orders}/>}
    {tab==='incentives'&&<IncentivesView/>}
    {tab==='support'&&<SupportView nav={nav}/>}
    {tab==='settings'&&<SettingsView online={online} setOnline={setOnline} persistAvailability={persistAvailability} nav={nav} onTransition={onTransition}/>}
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
  <section className="wx-geofence-card">
   <div className="wx-geofence-main">
    <div className="wx-geofence-icon"><MapPin size={20}/></div>
    <div className="wx-geofence-copy">
     <span className="wx-section-label">LIVE GEOFENCING</span>
     <h3>{p.geo?.area||p.area||'Service zone unavailable'}</h3>
     <p>{p.geo?.city||'Location not resolved'}{p.geo?.sector?' · '+p.geo.sector:''} · {getServiceRadiusKm(p.geo?.city || p.geo?.area)} km service radius</p>
     <small>{p.geoLoading?'Detecting your live location…':p.geoError||'Your current GPS position determines the active service zone.'}</small>
    </div>
   </div>
   <div className="wx-geofence-actions">
    <span className={'wx-live-location '+(p.geo?'ready':'')}>{p.geo?'LIVE':'LOCATION NEEDED'}</span>
    <button className={'wx-online-toggle '+(p.online?'online':'offline')} onClick={p.toggleOnline}><i></i>{p.online?'Go offline':'Come online'}</button>
    <small>{p.online?'Online: eligible for instant / SOS requests.':'Offline: instant / SOS requests are not offered; later bookings remain visible.'}</small>
   </div>
  </section>
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
      {filtered.map((o:any)=><button className="wx-table-row" key={o.id} onClick={()=>onOpen(o)}><b>#{o.id}</b><div><strong>{o.customer}</strong><span>{o.service}</span></div><div><strong>{o.date}</strong><span>{o.time} · {o.distance!==null?o.distance+" km":"Distance unavailable"}</span></div><div><strong>{moneyOrUnavailable(o.earning)}</strong><span>{o.payment}</span></div><span className={'wx-badge '+o.status.toLowerCase()}>{statusLabel[o.status]}</span><ChevronRight size={17}/></button>)}
      {!filtered.length&&<div className="wx-empty"><Search/><b>No orders found</b><span>Try another filter or search.</span></div>}
    </section>
  </div>;
}

function EarningsView({orders,reportPeriod,setReportPeriod}:{orders:Order[];reportPeriod:ReportPeriod;setReportPeriod:(v:ReportPeriod)=>void}){
 const completed=orders.filter(o=>o.status==='COMPLETED');
 return <div className="wx-stack">
  <div className="wx-page-intro"><div><span className="wx-section-label">FINANCIAL PERFORMANCE</span><h2>Income & earnings report</h2><p>Choose a period to understand your real PunchX income, completed work and payout history.</p></div><button className="wx-secondary" onClick={()=>downloadWorkerReport(orders,reportPeriod,'income')}><Save size={15}/> Export report</button></div>
  <ReportPeriodPicker value={reportPeriod} onChange={setReportPeriod}/>
  <WorkerAnalyticsReport orders={orders} period={reportPeriod}/>
  <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">PAYOUT HISTORY</span><h3>Verified professional payouts</h3></div><span className="wx-muted">{completed.length} completed bookings loaded</span></div>
   {completed.filter(o=>o.earning!==null).sort((a,b)=>(recordDate(b)?.getTime()||0)-(recordDate(a)?.getTime()||0)).slice(0,50).map(o=><div className="wx-inventory-row" key={o.id}><Banknote/><div><b>#{o.id} · {o.service}</b><span>{o.date} · {o.customer}</span></div><strong className="good">{money(o.earning as number)}</strong></div>)}
   {!completed.some(o=>o.earning!==null)&&<div className="wx-empty"><Banknote/><b>No verified payout records</b><span>PunchX will display income only when a professional payout is recorded against a completed booking.</span></div>}
  </section>
  <section className="wx-card wx-report-note"><ShieldCheck size={18}/><div><b>Income transparency</b><span>Customer prices are never treated as worker income. This report uses only the professional payout stored on completed PunchX bookings.</span></div></section>
 </div>;
}
function ScheduleView(){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">WORK CALENDAR</span><h2>Schedule & availability</h2><p>Only a verified stored schedule will be shown.</p></div></div><section className="wx-card"><div className="wx-empty"><CalendarDays/><b>No verified schedule configured</b><span>No stored weekly working hours are available for this professional.</span></div></section><section className="wx-card"><div className="wx-control-grid"><button disabled><Clock3/><b>Breaks</b><span>Not configured</span></button><button disabled><Route/><b>Service radius</b><span>Not configured</span></button><button disabled><CalendarDays/><b>Time off</b><span>Not configured</span></button><button disabled><CircleAlert/><b>Emergency pass</b><span>Not configured</span></button></div></section></div>}
function PerformanceView({orders,userProfile,reportPeriod,setReportPeriod}:{orders:Order[];userProfile:any;reportPeriod:ReportPeriod;setReportPeriod:(v:ReportPeriod)=>void}){
 const completed=orders.filter(o=>o.status==='COMPLETED'); const cancelled=orders.filter(o=>o.status==='CANCELLED');
 const ratings=completed.map(o=>safeNumber(o.raw?.userRating)).filter(n=>n>0); const rating=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null;
 return <div className="wx-stack">
  <div className="wx-page-intro"><div><span className="wx-section-label">PERFORMANCE & GROWTH</span><h2>Performance analytics</h2><p>Measure your progress across real PunchX work history and verified customer feedback.</p></div><button className="wx-secondary" onClick={()=>downloadWorkerReport(orders,reportPeriod,'performance')}><Save size={15}/> Export report</button></div>
  <ReportPeriodPicker value={reportPeriod} onChange={setReportPeriod}/>
  <div className="wx-stats"><Stat label="Customer rating" value={rating?rating.toFixed(1)+' / 5':(userProfile?.workerRating?Number(userProfile.workerRating).toFixed(1)+' / 5':'—')} icon={Star}/><Stat label="Completion rate" value={completed.length+cancelled.length?(Math.round(completed.length/(completed.length+cancelled.length)*100)+'%'):'—'} icon={CheckCircle2}/><Stat label="Completed jobs" value={completed.length} icon={UserRound}/><Stat label="Cancelled jobs" value={cancelled.length} icon={CircleAlert}/><Stat label="Verified reviews" value={ratings.length||'—'} icon={Star}/></div>
  <WorkerAnalyticsReport orders={orders} period={reportPeriod}/>
  <section className="wx-card"><div className="wx-card-head"><div><span className="wx-section-label">CUSTOMER FEEDBACK</span><h3>Verified service feedback</h3></div><Star size={18}/></div>
   {completed.filter(o=>safeNumber(o.raw?.userRating)>0||o.raw?.arrivalQuality?.comment).slice(0,20).map(o=><div className="wx-feedback-row" key={o.id}><div className="wx-feedback-rating"><Star size={13}/><b>{safeNumber(o.raw?.userRating)>0?safeNumber(o.raw?.userRating).toFixed(1):'—'}</b></div><div><b>#{o.id} · {o.service}</b><span>{o.raw?.arrivalQuality?.comment||'No written feedback recorded.'}</span></div><small>{o.date}</small></div>)}
   {!completed.some(o=>safeNumber(o.raw?.userRating)>0||o.raw?.arrivalQuality?.comment)&&<div className="wx-empty"><Star/><b>No verified feedback records yet</b><span>Customer ratings and feedback will appear here when PunchX records them.</span></div>}
  </section>
 </div>;
}
function ReportPeriodPicker({value,onChange}:{value:ReportPeriod;onChange:(v:ReportPeriod)=>void}){
 return <section className="wx-card wx-period-card"><div><span className="wx-section-label">REPORT PERIOD</span><h3>Choose your analysis window</h3><p>All figures update from the selected period.</p></div><div className="wx-period-tabs">{REPORT_PERIODS.map(function(days){return <button key={days} className={value===days?'active':''} onClick={()=>onChange(days)}>{reportLabel(days)}</button>})}</div></section>;
}
function WorkerAnalyticsReport({orders,period}:{orders:Order[];period:ReportPeriod}){
  const now=new Date();
  const start=new Date(now);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate()-period+1);
  const previousStart=new Date(start);
  previousStart.setDate(previousStart.getDate()-period);
  const inRange=orders.filter(o=>{const d=recordDate(o);return !!d&&d>=start&&d<=now;});
  const previous=orders.filter(o=>{const d=recordDate(o);return !!d&&d>=previousStart&&d<start;});
  const completed=inRange.filter(o=>o.status==='COMPLETED');
  const cancelled=inRange.filter(o=>o.status==='CANCELLED');
  const payoutRows=completed.filter(o=>o.earning!==null);
  const income=payoutRows.reduce((sum,o)=>sum+(o.earning||0),0);
  const previousIncome=previous.filter(o=>o.status==='COMPLETED'&&o.earning!==null).reduce((sum,o)=>sum+(o.earning||0),0);
  const avgJob=payoutRows.length?income/payoutRows.length:null;
  const denominator=completed.length+cancelled.length;
  const completion=denominator?completed.length/denominator*100:null;
  const ratings=completed.map(o=>safeNumber(o.raw?.userRating)).filter(n=>n>0);
  const rating=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null;
  const activeDays=new Set(payoutRows.map(o=>recordDate(o)?.toISOString().slice(0,10)).filter(Boolean)).size;
  const delta=previousIncome>0?((income-previousIncome)/previousIncome)*100:null;
  const actionable=cancelled.length>0?'Reduce avoidable cancellations to protect your completed-job rate.':rating!==null&&rating<4.5?'Review customer feedback and complete relevant training to improve service quality.':completion!==null&&completion<90?'Focus on accepting and completing suitable jobs consistently.':payoutRows.length>0?'Your verified activity is building a measurable income history. Keep consistency and monitor the next period.':'Complete PunchX jobs with recorded professional payouts to unlock this analysis.';
  const chartRows=buildPeriodChartRows(inRange,period);
  const hasChartData=chartRows.some(row=>row.income>0||row.completed>0||row.cancelled>0);
  return <div className="wx-stack wx-analytics-report">
    <div className="wx-report-summary">
      <Stat label="Verified income" value={payoutRows.length?money(income):'Unavailable'} icon={Banknote} trend={delta!==null?(delta>=0?'+'+delta.toFixed(1)+'% vs previous period':delta.toFixed(1)+'% vs previous period'):undefined}/>
      <Stat label="Completed jobs" value={completed.length} icon={CheckCircle2}/>
      <Stat label="Average payout / job" value={avgJob!==null?money(avgJob):'—'} icon={TrendingUp}/>
      <Stat label="Active work days" value={activeDays||'—'} icon={CalendarDays}/>
    </div>
    {hasChartData ? <>
      <section className="wx-card wx-analytics-chart">
        <div className="wx-card-head"><div><span className="wx-section-label">{reportLabel(period).toUpperCase()} INCOME TREND</span><h3>Verified professional income</h3></div><LineChart size={18}/></div>
        <div className="wx-report-line"><svg viewBox="0 0 700 220" role="img" aria-label={reportLabel(period)+' verified income trend'}>{buildSvgLine(chartRows,'income',700,220)}</svg><div className="wx-report-axis">{chartRows.map(row=><span key={row.key}>{row.label}</span>)}</div></div>
        <div className="wx-chart-total"><span>Period income</span><strong>{income?money(income):'No verified payout recorded'}</strong></div>
      </section>
      <section className="wx-card wx-analytics-chart">
        <div className="wx-card-head"><div><span className="wx-section-label">{reportLabel(period).toUpperCase()} WORK OUTPUT</span><h3>Completed vs cancelled jobs</h3></div><BarChart3 size={18}/></div>
        <div className="wx-report-bars">{chartRows.map(row=><div className="wx-report-bar-col" key={row.key}><div className="wx-report-bar-pair"><i style={{height:Math.max(4,row.completed*18)}} title={row.completed+' completed'}></i><b style={{height:Math.max(4,row.cancelled*18)}} title={row.cancelled+' cancelled'}></b></div><small>{row.label}</small></div>)}</div>
        <div className="wx-chart-legend"><span><i className="done"></i>Completed: {completed.length}</span><span><i className="cancelled"></i>Cancelled: {cancelled.length}</span><span>Completion: {completion!==null?completion.toFixed(1)+'%':'—'}</span></div>
      </section>
    </> : <section className="wx-card"><div className="wx-empty"><BarChart3/><b>No chartable records for {reportLabel(period)}</b><span>Charts use only real PunchX bookings with usable dates and recorded status or professional payout.</span></div></section>}
    <section className="wx-card wx-growth-card">
      <div className="wx-card-head"><div><span className="wx-section-label">PERSONAL GROWTH SIGNAL</span><h3>What to improve next</h3></div><TrendingUp size={18}/></div>
      <p>{actionable}</p>
      <div className="wx-growth-metrics"><span>Customer rating <b>{rating!==null?rating.toFixed(1)+'/5':'—'}</b></span><span>Completion rate <b>{completion!==null?completion.toFixed(1)+'%':'—'}</b></span><span>Verified reviews <b>{ratings.length||'—'}</b></span></div>
    </section>
  </div>;
}
function buildPeriodChartRows(orders:Order[],period:ReportPeriod){
 const bucketCount=period<=30?Math.min(15,period):period<=90?15:12; const bucketDays=Math.max(1,Math.ceil(period/bucketCount)); const rows:any[]=[]; const end=new Date(); end.setHours(23,59,59,999);
 for(let i=bucketCount-1;i>=0;i--){const from=new Date(end);from.setDate(from.getDate()-(i+1)*bucketDays+1);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+bucketDays);const items=orders.filter(o=>{const d=recordDate(o);return !!d&&d>=from&&d<to;});const completed=items.filter(o=>o.status==='COMPLETED');const cancelled=items.filter(o=>o.status==='CANCELLED');const income=completed.filter(o=>o.earning!==null).reduce((s,o)=>s+(o.earning||0),0);rows.push({key:from.toISOString(),label:from.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),income,completed:completed.length,cancelled:cancelled.length});}
 return rows;
}
function buildSvgLine(rows:any[],key:string,w:number,h:number){
 const max=Math.max(1,...rows.map(r=>r[key]||0)); const padX=24,padY=18; const points=rows.map((r,i)=>{const x=padX+(i*Math.max(1,w-padX*2)/(Math.max(1,rows.length-1)));const y=h-padY-(r[key]/max)*(h-padY*2);return {x,y};});
 return <>{points.length>1&&<polyline points={points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}{points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor"/>)}<text x="8" y="18" fontSize="10" fill="currentColor">{money(max)}</text></>;
}
function downloadWorkerReport(orders:Order[],period:ReportPeriod,kind:'income'|'performance'){
 const now=new Date(); const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-period+1); const rows=orders.filter(o=>{const d=recordDate(o);return !!d&&d>=start&&d<=now;});
 const header=['Order ID','Date','Service','Status','Professional Payout','Customer Rating']; const body=rows.map(o=>[o.id,o.date,o.service,o.status,o.earning==null?'':String(o.earning),o.raw?.userRating==null?'':String(o.raw.userRating)]);
 const csv=[header,...body].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='punchx-'+kind+'-report-'+period+'days.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function TrainingView({userProfile}:{userProfile:any}){const courses=Array.isArray(userProfile?.trainingCourses)?userProfile.trainingCourses:[];return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">SKILLS & CERTIFICATION</span><h2>Training center</h2><p>Only verified PunchX training records are displayed.</p></div></div><section className="wx-card">{courses.length?courses.map((x:any)=><div className="wx-inventory-row" key={x.id||x.name}><GraduationCap/><div><b>{x.name||'Training'}</b><span>{x.status||'Recorded by PunchX'}</span></div></div>):<div className="wx-empty"><GraduationCap/><b>No training records</b><span>No verified PunchX training course or certification is stored.</span></div>}</section></div>}
function InventoryView({userProfile}:{userProfile:any}){const items=Array.isArray(userProfile?.inventory)?userProfile.inventory:[];return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">TOOLS & MATERIALS</span><h2>Inventory & work kit</h2><p>Only verified inventory records are displayed.</p></div></div><section className="wx-card">{items.length?items.map((x:any)=><div className="wx-inventory-row" key={x.id||x.name}><Package/><div><b>{x.name||'Item'}</b><span>{x.status||'Recorded'}</span></div><strong>{x.quantity??'—'}</strong></div>):<div className="wx-empty"><Package/><b>No inventory records</b><span>No verified PunchX inventory or material records are available.</span></div>}</section></div>}
function ProfileView({userProfile,uid,refreshProfile,showNotification}:{userProfile:any;uid:string;refreshProfile?:()=>Promise<void>;showNotification?:(m:string)=>void}){
 const p=userProfile||{};
 const categories=Array.isArray(p.workerCategories)?p.workerCategories.filter(Boolean):(Array.isArray(p.categories)?p.categories.filter(Boolean):(Array.isArray(p.serviceCategories)?p.serviceCategories.filter(Boolean):[]));
 const [application,setApplication]=useState<any>(null);
 const [editing,setEditing]=useState(false);
 const [saving,setSaving]=useState(false);
 const [photoBusy,setPhotoBusy]=useState(false);
 const [draft,setDraft]=useState<any>({});
 const [photoPreview,setPhotoPreview]=useState<string>(p.photoURL||'');

 useEffect(function(){
   if(!editing)return;
   const previousOverflow=document.body.style.overflow;
   document.body.style.overflow='hidden';
   return function(){document.body.style.overflow=previousOverflow;};
 },[editing]);
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
     workerCategories:categories.length?categories:(Array.isArray(application?.categories)?application.categories:[]),
     customSkill:p.customSkill||application?.customSkill||'',
     minimumVisitingFee:p.minimumVisitingFee??application?.minimumVisitingFee??p.visitingFee??application?.visitingFee??'',
     maximumVisitingFee:p.maximumVisitingFee??application?.maximumVisitingFee??p.visitingFee??application?.visitingFee??'',
     city:p.city||application?.city||'',
     streetAddress:p.streetAddress||application?.streetAddress||'',
     bio:p.bio||application?.bio||''
   });
 },[p.name,p.phone,p.address,p.landmark,p.area,p.sector,p.city,p.streetAddress,p.workerSkill,p.workerExperience,p.workerCategories,p.customSkill,p.visitingFee,p.bio,p.photoURL,application]);

 useEffect(function(){
   if(!uid)return;
   const workerApplicationQuery=firestoreQuery(collection(db,'workerApplications'),where('uid','==',uid));
   let byUid:any=null;
   let byId:any=null;
   const publish=function(){
     const next=byId||byUid;
     setApplication(next);
   };
   const unsubQuery=onSnapshot(workerApplicationQuery,function(snap){
     const first=snap.docs[0];
     byUid=first?{id:first.id,...first.data()}:null;
     publish();
   },function(){publish();});
   const appId=String(p.applicationId||'').trim();
   const unsubId=appId?onSnapshot(doc(db,'workerApplications',appId),function(snap){
     byId=snap.exists()?{id:snap.id,...snap.data()}:null;
     publish();
   },function(){publish();}):function(){};
   return function(){unsubQuery();unsubId();};
 },[uid,p.applicationId]);

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
   workerCategories:categories.length?categories:(Array.isArray(application?.categories)?application.categories:[]),
   categories:categories.length?categories:(Array.isArray(application?.categories)?application.categories:[]),
   dob:p.dob||p.birthdate||application?.dob||application?.birthdate||'',
   city:p.city||application?.city||'',
   streetAddress:p.streetAddress||application?.streetAddress||'',
   customSkill:p.customSkill||application?.customSkill||'',
   visitingFee:p.visitingFee??application?.visitingFee,
   termsAccepted:p.termsAccepted??application?.termsAccepted,
   appliedAt:p.appliedAt||application?.appliedAt||''
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
   const minFee=Number(draft.minimumVisitingFee); const maxFee=Number(draft.maximumVisitingFee);
   if(!Number.isFinite(minFee)||minFee<49){showNotification?.('Minimum visiting fee cannot be below ₹49. Enter ₹49 or more to continue.');return;}
   if(!Number.isFinite(maxFee)||maxFee<49||maxFee>349){showNotification?.('Maximum visiting fee must be between ₹49 and ₹349.');return;}
   if(minFee>maxFee){showNotification?.('Minimum visiting fee cannot be greater than maximum visiting fee.');return;}
   setSaving(true);
   try{
     const payload:any={
       uid:uid,
       role:'worker',
       name:draft.name.trim(),
       phone:draft.phone.trim(),
       address:draft.address.trim(),
       streetAddress:draft.streetAddress.trim(),
       landmark:draft.landmark.trim(),
       area:draft.area.trim(),
       city:(draft.city||source.city||'').trim(),
       sector:draft.sector.trim(),
       workerSkill:draft.workerSkill.trim(),
       workerExperience:draft.workerExperience.trim(),
       workerCategories:Array.isArray(draft.workerCategories)?draft.workerCategories:source.workerCategories||[],
       categories:Array.isArray(draft.workerCategories)?draft.workerCategories:source.workerCategories||[],
       customSkill:draft.customSkill.trim(),
       minimumVisitingFee:Number(draft.minimumVisitingFee),
       maximumVisitingFee:Number(draft.maximumVisitingFee),
       visitingFee:Number(draft.minimumVisitingFee),
       bio:draft.bio.trim(),
       photoURL:photoPreview||'',
       updatedAt:new Date().toISOString()
     };
     let backendSaved=false;
     try{
       const token=auth.currentUser?await auth.currentUser.getIdToken():null;
       if(token){
         const backendBase=import.meta.env.VITE_BACKEND_URL||'';
         const response=await fetch(backendBase+'/api/worker/profile',{
           method:'POST',
           headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
           body:JSON.stringify(payload)
         });
         if(!response.ok){
           let message='Worker profile API rejected the update';
           try{const data=await response.json();message=data?.error||message;}catch{}
           throw new Error(message);
         }
         backendSaved=true;
       }
     }catch(backendError){
       console.warn('Worker profile API save notice; trying Firestore owner write:',backendError);
     }

     if(!backendSaved){
       if(!auth.currentUser) throw new Error('Your authenticated session is unavailable. Please sign in again.');
       await setDoc(doc(db,'users',uid),payload,{merge:true});
     }

     try{await refreshProfile?.();}catch(refreshError){console.warn('Profile refresh notice after successful save:',refreshError);}
     setEditing(false);
     showNotification?.('✓ Profile saved to PunchX securely.');
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
       <span>Date of birth <b>{source.dob||'—'}</b></span>
       <span>Phone <b>{source.phone||'—'}</b></span>
       <span>Email <b>{source.email||'—'}</b></span>
       <span>Full address <b>{source.address||'—'}</b></span>
       <span>Street / house address <b>{source.streetAddress||'—'}</b></span>
       <span>Landmark <b>{source.landmark||'—'}</b></span>
       <span>Area <b>{source.area||'—'}</b></span>
       <span>City <b>{source.city||'—'}</b></span>
       <span>Sector <b>{source.sector||'—'}</b></span>
       <span>Primary service <b>{source.workerSkill||'—'}</b></span>
       <span>Service categories <b>{source.workerCategories?.length?source.workerCategories.join(', '):'—'}</b></span>
       <span>Custom skill <b>{source.customSkill||'—'}</b></span>
       <span>Experience <b>{source.workerExperience||'—'}</b></span>
       <span>Visiting / inspection fee range <b>{source.minimumVisitingFee!=null&&source.maximumVisitingFee!=null?`${money(Number(source.minimumVisitingFee))} – ${money(Number(source.maximumVisitingFee))}`:source.visitingFee!=null?money(Number(source.visitingFee)):'—'}</b></span>
       <span>Partner status <b>{source.status||'—'}</b></span>
       <span>Application ID <b>{source.applicationId||application?.id||'—'}</b></span>
       <span>Terms accepted <b>{source.termsAccepted===true?'Yes':source.termsAccepted===false?'No':'—'}</b></span>
       <span>Application submitted <b>{source.appliedAt||'—'}</b></span>
       <span>Account created <b>{source.createdAt?new Date(source.createdAt).toLocaleDateString('en-IN'):'—'}</b></span>
       <span>Profile photo <b>{source.photoURL?'Added':'Not added'}</b></span>
       <span>GPS location <b>{source.location?.lat!=null&&source.location?.lng!=null?`${Number(source.location.lat).toFixed(5)}, ${Number(source.location.lng).toFixed(5)}`:'—'}</b></span>
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
       <div className="wx-profile-edit-section">
         <div className="wx-profile-edit-section-title">Personal & contact details</div>
         <div className="wx-profile-edit-grid">
           <label>Full name<input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})} autoComplete="name" /></label>
           <label>Phone<input value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})} inputMode="tel" autoComplete="tel" /></label>
           <label>Email <span className="wx-readonly-tag">Account</span><input value={source.email||''} readOnly className="wx-readonly-field" /></label>
           <label>Date of birth <span className="wx-readonly-tag">NamoID</span><input value={source.dob||'—'} readOnly className="wx-readonly-field" /></label>
           <label className="wx-profile-edit-wide">Full address<textarea value={draft.address||''} onChange={e=>setDraft({...draft,address:e.target.value})} rows={3} autoComplete="street-address"/></label>
           <label>Street / house address<input value={draft.streetAddress||''} onChange={e=>setDraft({...draft,streetAddress:e.target.value})} /></label>
           <label>Landmark<input value={draft.landmark||''} onChange={e=>setDraft({...draft,landmark:e.target.value})} /></label>
           <label>Area<input value={draft.area||''} onChange={e=>setDraft({...draft,area:e.target.value})} /></label>
           <label>City<input value={draft.city||''} onChange={e=>setDraft({...draft,city:e.target.value})} /></label>
           <label>Sector<input value={draft.sector||''} onChange={e=>setDraft({...draft,sector:e.target.value})} /></label>
         </div>
       </div>

       <div className="wx-profile-edit-section">
         <div className="wx-profile-edit-section-title">Professional details</div>
         <div className="wx-profile-edit-grid">
           <label>Primary service<input value={draft.workerSkill||''} onChange={e=>setDraft({...draft,workerSkill:e.target.value})} /></label>
           <label>Years of experience<input value={draft.workerExperience||''} onChange={e=>setDraft({...draft,workerExperience:e.target.value})} /></label>
           <label>Service categories <span className="wx-readonly-tag">Saved trades</span><input value={Array.isArray(draft.workerCategories)?draft.workerCategories.join(', '):''} onChange={e=>setDraft({...draft,workerCategories:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="Electrician, Plumber" /></label>
           <label>Custom skill<input value={draft.customSkill||''} onChange={e=>setDraft({...draft,customSkill:e.target.value})} /></label>
           <label>Minimum visiting fee (₹)<input type="number" min="49" max="349" step="1" value={draft.minimumVisitingFee??''} onChange={e=>setDraft({...draft,minimumVisitingFee:e.target.value})} inputMode="numeric" /><small>Minimum ₹49</small></label><label>Maximum visiting fee (₹)<input type="number" min="49" max="349" step="1" value={draft.maximumVisitingFee??''} onChange={e=>setDraft({...draft,maximumVisitingFee:e.target.value})} inputMode="numeric" /><small>Maximum ₹349</small></label>{Number(draft.minimumVisitingFee)<49&&draft.minimumVisitingFee!==''&&<p className="wx-profile-edit-wide" role="alert">Minimum visiting fee cannot be below ₹49. Enter ₹49 or more to continue.</p>}{Number(draft.maximumVisitingFee)>349&&<p className="wx-profile-edit-wide" role="alert">Maximum visiting fee cannot exceed ₹349.</p>}{draft.minimumVisitingFee!==''&&draft.maximumVisitingFee!==''&&Number(draft.minimumVisitingFee)>Number(draft.maximumVisitingFee)&&<p className="wx-profile-edit-wide" role="alert">Minimum visiting fee cannot be greater than maximum visiting fee.</p>}
           <label className="wx-profile-edit-wide">Professional bio<textarea value={draft.bio||''} onChange={e=>setDraft({...draft,bio:e.target.value})} rows={4}/></label>
         </div>
       </div>

       <div className="wx-profile-protected-box">
         <ShieldCheck size={17}/>
         <div><b>PunchX-controlled information</b><span>Application ID, partner status, verification records, ratings, completed jobs, payout records, terms acceptance, application timestamps and other system records cannot be edited from this profile.</span></div>
       </div>
       <div className="wx-modal-actions"><button className="wx-secondary" onClick={()=>setEditing(false)} disabled={saving}>Cancel</button><button className="wx-primary" onClick={save} disabled={saving||photoBusy}>{saving?<Loader2 className="wx-spin"/>:<Save size={16}/>} {saving?'Saving…':'Save changes'}</button></div>
     </div>
   </div>}
 </div>
}
function NotificationsView({orders}:{orders:Order[]}){const recent=orders.slice(0,20);return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">UPDATES</span><h2>Notifications</h2><p>Only live booking events are shown here.</p></div></div><section className="wx-card wx-notes">{recent.map(o=><div key={o.id}><div className="wx-note-icon"><ClipboardList/></div><div><b>Booking #{o.id}</b><p>{o.service} · {statusLabel[o.status]||o.status} · {o.customer}</p><small>{o.date}{o.time?' · '+o.time:''}</small></div><ChevronRight/></div>)}{!recent.length&&<div className="wx-empty"><Bell/><b>No notifications</b><span>New PunchX booking events will appear here.</span></div>}</section></div>}
function IncentivesView(){return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">EARN MORE</span><h2>Incentives & bonuses</h2><p>Only verified PunchX campaigns are displayed.</p></div></div><section className="wx-card"><div className="wx-empty"><Gift/><b>No active incentives available</b><span>No verified incentive campaign is available for this account.</span></div></section></div>}
function SupportView({nav}:{nav:(t:Tab)=>void}){const cards=[['Order issue','Open Orders and inspect a live booking',ClipboardList,'orders'],['Payment issue','Open Earnings for verified payout records',Banknote,'earnings'],['Customer report','Use a live order to review customer details',CircleAlert,'orders'],['Technical issue','Open Settings and location controls',Settings,'settings'],['Email support','punchxservice@gmail.com',MessageCircle,'mail'],['Emergency assistance','Use verified PunchX support channels',LifeBuoy,'support']];return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">PARTNER CARE</span><h2>Help & support</h2><p>Order, payment, customer and technical support.</p></div><a className="wx-primary" href="mailto:punchxservice@gmail.com"><LifeBuoy size={16}/> Contact support</a></div><div className="wx-support-grid">{cards.map(function(x:any){var I=x[2];return <button className="wx-card wx-support-card" key={x[0]} onClick={()=>x[3]==='mail'?window.location.href='mailto:punchxservice@gmail.com':nav(x[3])}><I/><div><b>{x[0]}</b><span>{x[1]}</span></div><ChevronRight/></button>})}</div></div>}
function SettingsView(p:any){const nav=p.nav as (t:Tab)=>void;return <div className="wx-stack"><div className="wx-page-intro"><div><span className="wx-section-label">CONTROL CENTER</span><h2>Settings</h2><p>Account, notifications, privacy and availability.</p></div></div>{[['Account','Edit your personal profile and account details','profile'],['Notifications','Review live PunchX booking events','notifications'],['Privacy & location','Review location permissions and live service-zone status','home'],['App preferences','Language, theme and privacy documents','privacy'],['Account status','Deactivation is handled through verified PunchX support','support']].map(function(x:any){return <section className="wx-card wx-setting" key={x[0]}><div><b>{x[0]}</b><span>{x[1]}</span></div><button className={x[0]==='Account status'?'wx-secondary':'wx-secondary'} onClick={()=>x[2]==='privacy'?p.onTransition?.('privacy-policy'):nav(x[2])}>Open</button></section>})}<section className="wx-card wx-setting"><div><b>Availability</b><span>{p.online?'Online — eligible for new orders':'Offline — no new orders'}</span></div><button className={'wx-toggle-btn '+(p.online?'on':'')} onClick={()=>p.persistAvailability(!p.online)}>{p.online?'ONLINE':'OFFLINE'}</button></section></div>}

function OrderModal(p:any){var o=p.order;return <div className="wx-overlay"><div className="wx-modal wx-order-modal"><button className="wx-modal-x" onClick={p.close}><X/></button><div className="wx-modal-top"><span className={'wx-badge '+o.status.toLowerCase()}>{labels[o.status]}</span><span>ORDER #{o.id}</span></div><div className="wx-customer"><div className="wx-avatar large">{o.avatar}</div><div><h2>{o.customer}</h2><p>{o.service}</p></div></div><div className="wx-modal-grid"><div><MapPin/><span>Address</span><b>{o.address}</b><small>{o.distance!==null?o.distance+" km away":"Distance unavailable"}</small></div><div><CalendarDays/><span>Booking</span><b>{o.date} · {o.time}</b><small>{o.duration}</small></div><div><Banknote/><span>Customer total</span><b>{o.price!==null?money(o.price):'Unavailable'}</b><small>Payment: {o.payment}</small></div><div><Wallet/><span>Your earning</span><b>{o.earning!==null?money(o.earning):'Payout unavailable'}</b><small>Verified professional payout only</small></div></div><div className="wx-status-line">{['ACCEPTED','TRAVELLING','ARRIVED','SERVICE_STARTED','COMPLETED'].map(function(s,i){return <React.Fragment key={s}><span className={['ACCEPTED','TRAVELLING','ARRIVED','SERVICE_STARTED','COMPLETED'].indexOf(o.status)>=i?'done':''}>{i+1}</span>{i<4&&<i/>}</React.Fragment>})}</div><div className="wx-status-labels"><span>Accepted</span><span>Travel</span><span>Arrived</span><span>Service</span><span>Done</span></div>
{(o.raw?.issueDescription||o.raw?.serviceProof||o.raw?.additionalWorkRequests?.length||o.raw?.warrantyClaimStatus)&&<section className="wx-job-detail-card">
  {o.raw?.issueDescription&&<div><span>Customer requirement</span><b>{o.raw.issueDescription}</b></div>}
  {o.raw?.serviceProof?.completionNotes&&<div><span>Completion notes</span><b>{o.raw.serviceProof.completionNotes}</b></div>}
  {o.raw?.additionalWorkRequests?.length&&<div><span>Additional work requests</span><b>{o.raw.additionalWorkRequests.length} recorded request(s)</b></div>}
  {o.raw?.warrantyClaimStatus&&<div><span>Warranty</span><b>{String(o.raw.warrantyClaimStatus)}</b></div>}
  {o.raw?.arrivalQuality?.comment&&<div><span>Arrival feedback</span><b>{o.raw.arrivalQuality.comment}</b></div>}
  {(o.raw?.serviceProof?.beforePhoto||o.raw?.serviceProof?.afterPhoto||o.raw?.photoProof)&&<div><span>Service proof</span><b>Verified proof record available</b></div>}
</section>}
<div className="wx-modal-actions"><button className="wx-secondary" onClick={()=>{const phone=o.raw?.customerPhone;if(phone)window.location.href="tel:"+phone;else alert("Customer phone number is not available in this booking.");}}><Phone size={16}/> Contact</button><button className="wx-secondary" onClick={()=>{const loc=o.raw?.customerLocation;if(loc)window.open("https://www.google.com/maps/dir/?api=1&destination="+loc.lat+","+loc.lng,"_blank","noopener,noreferrer");else if(o.address&&o.address!=="Address unavailable")window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(o.address),"_blank","noopener,noreferrer");else alert("Customer location is not available in this booking.");}}><Navigation size={16}/> Navigate</button>{o.status!=='COMPLETED'&&<button className="wx-primary" onClick={p.advance}>{p.action}<ChevronRight size={16}/></button>}</div></div></div>}
