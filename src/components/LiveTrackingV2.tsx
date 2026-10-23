import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { ArrowLeft, Clock3, LocateFixed, MapPin, Navigation2, Phone, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { AppScreen } from '../types';
import { db } from '../lib/firebase';
import { getAccurateCurrentPosition } from '../lib/location';

interface LiveTrackingV2Props { onTransition: (target: AppScreen) => void; bookingTime?: string; }
type Coords = { lat: number; lng: number };
type RouteInfo = { distanceKm: number; etaMinutes: number } | null;

function RouteLine({ from, to, onRouteInfo }: { from: Coords; to: Coords; onRouteInfo: (info: RouteInfo) => void }) {
  useEffect(() => {
    onRouteInfo(null);
    if (typeof google === 'undefined') return;
    const map = (window as any).__punchx_tracking_map as google.maps.Map | undefined;
    if (!map) return;

    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeOpacity: 0.9, strokeWeight: 5, strokeColor: '#B99A62' },
    });
    renderer.setMap(map);

    const service = new google.maps.DirectionsService();
    service.route({
      origin: from,
      destination: to,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      },
      provideRouteAlternatives: false,
    }, (result, status) => {
      if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
        const leg = result.routes[0].legs[0];
        const seconds = leg.duration_in_traffic?.value ?? leg.duration?.value;
        const meters = leg.distance?.value;
        if (typeof seconds === 'number' && typeof meters === 'number') {
          onRouteInfo({ distanceKm: meters / 1000, etaMinutes: Math.max(1, Math.ceil(seconds / 60)) });
        }
        renderer.setDirections(result);
      }
    });

    return () => renderer.setMap(null);
  }, [from.lat, from.lng, to.lat, to.lng, onRouteInfo]);
  return null;
}

function TrackingMap({ customer, worker, workerName, onRouteInfo }: { customer: Coords; worker: Coords; workerName: string; onRouteInfo: (info: RouteInfo) => void }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const center = useMemo(() => ({ lat: (customer.lat + worker.lat) / 2, lng: (customer.lng + worker.lng) / 2 }), [customer, worker]);

  if (!apiKey) {
    return <div className="flex h-full min-h-[420px] items-center justify-center bg-[#17191d] p-6 text-center text-white"><div><MapPin className="mx-auto h-9 w-9 text-[#b69cff]" /><h3 className="mt-3 text-lg font-black">Live map needs Google Maps</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/60">Configure VITE_GOOGLE_MAPS_API_KEY in the deployment environment to enable the real map, live driving route and traffic ETA.</p></div></div>;
  }

  return <APIProvider apiKey={apiKey}>
    <Map
      mapId="PUNCHX_LIVE_TRACKING"
      defaultCenter={center}
      center={center}
      defaultZoom={13}
      gestureHandling="greedy"
      style={{ width: '100%', height: '100%' }}
      onIdle={(event) => { (window as any).__punchx_tracking_map = event.map; }}
    >
      <RouteLine from={worker} to={customer} onRouteInfo={onRouteInfo} />
      <AdvancedMarker position={customer}>
        <div className="flex flex-col items-center"><div className="rounded-full border-2 border-white bg-[#17191d] p-2.5 text-white shadow-xl"><MapPin className="h-5 w-5 fill-white" /></div><span className="mt-1 rounded-lg bg-white px-2 py-1 text-[10px] font-black shadow">YOU</span></div>
      </AdvancedMarker>
      <AdvancedMarker position={worker}>
        <div className="flex flex-col items-center"><div className="rounded-full border-2 border-white bg-[#B99A62] p-3 text-white shadow-xl"><Navigation2 className="h-5 w-5 rotate-45" /></div><span className="mt-1 rounded-lg bg-[#17191d] px-2 py-1 text-[10px] font-black text-white shadow">{workerName}</span></div>
      </AdvancedMarker>
    </Map>
  </APIProvider>;
}

export default function LiveTrackingV2({ onTransition }: LiveTrackingV2Props) {
  const [order, setOrder] = useState<any | null>(() => { try { return JSON.parse(localStorage.getItem('punchx_active_order') || 'null'); } catch { return null; } });
  const [customer, setCustomer] = useState<Coords | null>(null);
  const [worker, setWorker] = useState<Coords | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [lastWorkerUpdate, setLastWorkerUpdate] = useState('Waiting for professional GPS');
  const [gpsState, setGpsState] = useState<'loading' | 'live' | 'denied' | 'unavailable'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const handleRouteInfo = useMemo(() => (info: RouteInfo) => setRouteInfo(info), []);

  useEffect(() => {
    if (!order?.id) return;
    return onSnapshot(doc(db, 'orders', order.id), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as any;
      setOrder((current: any) => ({ ...(current || {}), id: snapshot.id, ...data }));
      if (typeof data.customerLocation?.lat === 'number' && typeof data.customerLocation?.lng === 'number') setCustomer({ lat: data.customerLocation.lat, lng: data.customerLocation.lng });
      if (typeof data.workerLocation?.lat === 'number' && typeof data.workerLocation?.lng === 'number') {
        setWorker({ lat: data.workerLocation.lat, lng: data.workerLocation.lng });
        setLastWorkerUpdate(data.workerLocation.timestamp ? new Date(data.workerLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live');
      }
    }, (error) => console.warn('PunchX tracking listener:', error));
  }, [order?.id]);

  const syncCustomerGps = async () => {
    setRefreshing(true);
    try { const pos = await getAccurateCurrentPosition(true); setCustomer(pos); setGpsState('live'); }
    catch { setGpsState('denied'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { syncCustomerGps(); }, []);

  const status = order?.status || 'Waiting for professional';
  const routeActive = Boolean(customer && worker && routeInfo);

  if (!order?.id) return <div className="min-h-screen bg-[#f7f8fa] px-4 py-8"><div className="mx-auto max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-black/5"><Navigation2 className="mx-auto h-10 w-10 text-[#B99A62]" /><h1 className="mt-4 text-2xl font-black">No active service</h1><p className="mt-2 text-sm leading-6 text-[#777c85]">Book a professional first. Once a booking is active, PunchX will show the professional's live dispatch position here.</p><button onClick={() => onTransition('home')} className="mt-6 rounded-2xl bg-[#17191d] px-5 py-3 text-sm font-black text-white">Explore services</button></div></div>;

  return <div className="min-h-screen bg-[#f7f8fa] pb-8 text-[#17191d]">
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><button onClick={() => onTransition('home')} className="rounded-xl bg-[#f4f5f7] p-2"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><h1 className="truncate text-base font-black sm:text-lg">Live route to your service</h1><p className="text-[11px] text-[#858a93]">{order.id} • {status}</p></div><button onClick={syncCustomerGps} disabled={refreshing} className="rounded-xl border border-black/5 bg-white p-2.5"><LocateFixed className={refreshing ? 'h-5 w-5 animate-pulse text-[#B99A62]' : 'h-5 w-5 text-[#B99A62]'} /></button></div></header>
    <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="relative h-[430px] w-full sm:h-[520px]">
          {customer && worker ? <TrackingMap customer={customer} worker={worker} workerName={order.workerName || 'PunchX Professional'} onRouteInfo={handleRouteInfo} /> : <div className="flex h-full items-center justify-center bg-[#17191d] text-white"><RefreshCw className="h-7 w-7 animate-spin text-[#b69cff]" /></div>}
          <div className="absolute left-3 top-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur sm:left-4 sm:top-4"><div className="flex items-center gap-2 text-xs font-black"><span className={`h-2.5 w-2.5 rounded-full ${routeActive ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} /> {routeActive ? 'Live route' : 'Connecting route'}</div><p className="mt-1 text-[10px] text-[#777c85]">Pro GPS update: {lastWorkerUpdate}</p></div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t border-black/5 bg-white">
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">Road distance</p><p className="mt-1 text-lg font-black">{routeInfo ? `${routeInfo.distanceKm.toFixed(1)} km` : '—'}</p></div>
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">Traffic ETA</p><p className="mt-1 text-lg font-black">{routeInfo ? `${routeInfo.etaMinutes} min` : '—'}</p></div>
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">GPS</p><p className="mt-1 text-lg font-black">{gpsState === 'live' ? 'Live' : gpsState === 'denied' ? 'Off' : 'Sync'}</p></div>
        </div>
      </div>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#eee9ff]"><UserRound className="h-6 w-6 text-[#B99A62]" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="truncate text-base font-black">{order.workerName || 'PunchX Professional'}</h2><ShieldCheck className="h-4 w-4 text-emerald-500" /></div><p className="mt-0.5 text-xs text-[#777c85]">{order.category || 'Professional service'}</p></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-2xl bg-[#f7f8fa] p-3"><Clock3 className="h-4 w-4 text-[#B99A62]" /><p className="mt-2 text-[10px] text-[#8a8f98]">Booking time</p><p className="text-xs font-black">{order.bookingTime || 'Scheduled'}</p></div><div className="rounded-2xl bg-[#f7f8fa] p-3"><MapPin className="h-4 w-4 text-[#B99A62]" /><p className="mt-2 text-[10px] text-[#8a8f98]">Destination</p><p className="truncate text-xs font-black">{order.customerAddress || 'Saved service address'}</p></div><div className="col-span-2 rounded-2xl bg-[#f7f8fa] p-3 sm:col-span-1"><Navigation2 className="h-4 w-4 text-[#B99A62]" /><p className="mt-2 text-[10px] text-[#8a8f98]">Route status</p><p className="text-xs font-black">{routeActive ? 'Live driving route' : 'Waiting for route'}</p></div></div>
        <div className="mt-3 flex gap-2"><button className="flex-1 rounded-2xl border border-black/5 bg-white py-3 text-xs font-black"><Phone className="mr-1 inline h-4 w-4" /> Contact</button><button onClick={() => showDirections(order)} className="flex-1 rounded-2xl bg-[#17191d] py-3 text-xs font-black text-white"><Navigation2 className="mr-1 inline h-4 w-4" /> Directions</button></div>
      </section>
    </main>
  </div>;
}

function showDirections(order: any) { if (order?.customerAddress) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`, '_blank', 'noopener,noreferrer'); }
