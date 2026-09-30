import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, Navigation, ShieldCheck, RefreshCw, Route, CircleAlert } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { AppScreen, OrderRecord } from '../types';
import { calculateDistanceKm, getStoredCustomerCoordinates } from '../lib/location';

interface UberLiveTrackingProps { onTransition: (target: AppScreen) => void; }

function RouteLine({ customer, worker }: { customer: { lat: number; lng: number }; worker: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const line = new google.maps.Polyline({ path: [customer, worker], geodesic: true, strokeColor: '#c5a059', strokeOpacity: 0.9, strokeWeight: 5, map });
    return () => line.setMap(null);
  }, [map, customer.lat, customer.lng, worker.lat, worker.lng]);
  return null;
}

function AutoBounds({ customer, worker }: { customer: { lat: number; lng: number }; worker: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(customer);
    bounds.extend(worker);
    map.fitBounds(bounds, 72);
  }, [map, customer.lat, customer.lng, worker.lat, worker.lng]);
  return null;
}

const liveStatuses = ['Pending', 'In Progress', 'In-Progress', 'Out for Service', 'Arrived'];
const isLive = (status?: string) => liveStatuses.includes(status || '');

export default function UberLiveTracking({ onTransition }: UberLiveTrackingProps) {
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number }>(() => getStoredCustomerCoordinates());
  const [lastUpdated, setLastUpdated] = useState('');
  const [manualRefresh, setManualRefresh] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('punchx_active_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isLive(parsed?.status)) setActiveOrder(parsed);
      }
    } catch {}

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'orders'), where('customerId', '==', uid), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() } as OrderRecord)).filter((order) => isLive(order.status));
      const selected = orders.find((order) => ['Out for Service', 'In Progress', 'In-Progress', 'Arrived'].includes(order.status)) || orders[0] || null;
      setActiveOrder(selected);
      if (selected) localStorage.setItem('punchx_active_order', JSON.stringify(selected));
      if (selected?.customerLocation) setCustomerCoords(selected.customerLocation);
      if (selected?.workerLocation) {
        setWorkerCoords(selected.workerLocation);
        setLastUpdated(String((selected as any).workerLocationUpdatedAt || new Date().toISOString()));
      }
    }, (error) => console.warn('PunchX live tracking order listener:', error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeOrder?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', activeOrder.id), (snap) => {
      if (!snap.exists()) return;
      const next = { id: snap.id, ...snap.data() } as OrderRecord & { workerLocationUpdatedAt?: string };
      setActiveOrder(next);
      if (next.customerLocation) setCustomerCoords(next.customerLocation);
      if (next.workerLocation) {
        setWorkerCoords(next.workerLocation);
        setLastUpdated(String(next.workerLocationUpdatedAt || new Date().toISOString()));
      }
    });
    return () => unsubscribe();
  }, [activeOrder?.id]);

  const distanceKm = useMemo(() => workerCoords ? calculateDistanceKm(customerCoords.lat, customerCoords.lng, workerCoords.lat, workerCoords.lng) : null, [customerCoords, workerCoords]);
  const etaMinutes = distanceKm == null ? null : Math.max(1, Math.round(distanceKm * 4.5));
  const mapCenter = workerCoords ? { lat: (customerCoords.lat + workerCoords.lat) / 2, lng: (customerCoords.lng + workerCoords.lng) / 2 } : customerCoords;

  const refresh = () => {
    setManualRefresh(true);
    setTimeout(() => setManualRefresh(false), 700);
  };

  if (!activeOrder) {
    return (
      <div className="min-h-screen bg-[#07122a] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[#c5a059]/25 bg-[#0c1833] p-7 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#c5a059]/10 flex items-center justify-center"><Navigation className="w-7 h-7 text-[#e9c176]" /></div>
          <h1 className="mt-4 text-xl font-black">No active service yet</h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">Book a service to unlock PunchX live specialist tracking from dispatch through arrival.</p>
          <button onClick={() => onTransition('home')} className="mt-5 w-full rounded-xl bg-[#c5a059] text-black py-3 text-xs font-extrabold">Browse services</button>
        </div>
      </div>
    );
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const routeUrl = workerCoords
    ? 'https://www.google.com/maps/dir/?api=1&origin=' + workerCoords.lat + ',' + workerCoords.lng + '&destination=' + customerCoords.lat + ',' + customerCoords.lng
    : '#';

  return (
    <div className="min-h-screen bg-[#07122a] text-[#e1e3e4] pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#c5a059]/20 bg-[#07122a]/95 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0"><button onClick={() => onTransition('home')} className="p-2 rounded-xl bg-[#0d1b35] border border-zinc-800 text-[#e9c176]"><ArrowLeft className="w-5 h-5" /></button><div className="min-w-0"><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">PunchX Live Route</div><div className="text-sm font-black truncate">{activeOrder.category} • #{activeOrder.id}</div></div></div>
        <button onClick={refresh} className="p-2 rounded-xl bg-[#0d1b35] border border-zinc-800 text-[#e9c176]"><RefreshCw className={'w-4 h-4 ' + (manualRefresh ? 'animate-spin' : '')} /></button>
      </header>
      <main className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-7">
        <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4 lg:gap-6">
          <section className="rounded-3xl overflow-hidden border border-[#c5a059]/20 bg-[#0a152d]">
            <div className="p-3 sm:p-4 border-b border-zinc-800 flex items-center justify-between gap-3"><div><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">Exact shared location</div><div className="text-xs text-zinc-400 mt-1">{workerCoords ? 'Specialist location is updating in real time.' : 'Waiting for the specialist to start live location sharing.'}</div></div><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[9px] font-mono text-emerald-300">{workerCoords ? 'LIVE' : 'WAITING'}</span></div></div>
            <div className="relative w-full h-[58vh] min-h-[360px] lg:h-[650px]">
              {apiKey && workerCoords ? (
                <APIProvider apiKey={apiKey}>
                  <Map defaultCenter={mapCenter} defaultZoom={14} gestureHandling="greedy" disableDefaultUI={false} mapTypeControl={false} streetViewControl={false} fullscreenControl={false} className="w-full h-full">
                    <AdvancedMarker position={customerCoords} title="Your location"><div className="w-9 h-9 rounded-full bg-white border-4 border-[#07122a] shadow-lg flex items-center justify-center"><span className="w-3.5 h-3.5 rounded-full bg-[#07122a]" /></div></AdvancedMarker>
                    <AdvancedMarker position={workerCoords} title="PunchX Specialist"><div className="w-11 h-11 rounded-full bg-[#c5a059] border-4 border-white shadow-xl flex items-center justify-center animate-pulse"><Navigation className="w-5 h-5 text-black" /></div></AdvancedMarker>
                    <RouteLine customer={customerCoords} worker={workerCoords} />
                    <AutoBounds customer={customerCoords} worker={workerCoords} />
                  </Map>
                </APIProvider>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_center,#17325f_0%,#07122a_65%)]">
                  <div className="relative w-64 h-64 rounded-full border border-[#c5a059]/20 flex items-center justify-center">{[1, 0.75, 0.5, 0.25].map((scale) => <div key={scale} className="absolute rounded-full border border-[#c5a059]/15" style={{ width: (scale * 100) + '%', height: (scale * 100) + '%' }} />)}<span className="w-4 h-4 rounded-full bg-white" /><motion.div animate={{ x: [40, 95, 70, 40], y: [-20, 10, -40, -20] }} transition={{ duration: 5, repeat: Infinity }} className="absolute w-9 h-9 rounded-full bg-[#c5a059] text-black flex items-center justify-center"><Navigation className="w-4 h-4" /></motion.div></div>
                  <div className="mt-5 max-w-md"><h2 className="text-sm font-black text-white">{apiKey ? 'Waiting for exact specialist GPS' : 'Google Maps key needed for the live map'}</h2><p className="mt-2 text-xs text-zinc-400 leading-relaxed">{apiKey ? 'The customer map is ready; it will update as the specialist device publishes GPS.' : 'Set VITE_GOOGLE_MAPS_API_KEY in the deployment environment to render the real map.'}</p></div>
                </div>
              )}
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-3xl border border-[#c5a059]/20 bg-[#0a152d] p-5"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-[#c5a059]/10 text-[#e9c176] flex items-center justify-center"><Navigation className="w-6 h-6" /></div><div className="min-w-0 flex-1"><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">Live ETA</div><div className="text-2xl font-black text-white">{etaMinutes ? etaMinutes + ' min' : 'Waiting'}</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-[#07122a] border border-zinc-800 p-3"><div className="text-[8px] uppercase text-zinc-500">Distance</div><div className="mt-1 text-sm font-black text-white">{distanceKm == null ? '—' : distanceKm.toFixed(1) + ' km'}</div></div><div className="rounded-2xl bg-[#07122a] border border-zinc-800 p-3"><div className="text-[8px] uppercase text-zinc-500">Status</div><div className="mt-1 text-sm font-black text-emerald-300">{activeOrder.status}</div></div></div>{lastUpdated && <div className="mt-3 text-[9px] font-mono text-zinc-500">Last GPS update: {new Date(lastUpdated).toLocaleTimeString()}</div>}</section>
            <section className="rounded-3xl border border-zinc-800 bg-[#0a152d] p-5"><div className="text-[9px] uppercase tracking-widest text-[#e9c176] font-bold">Trip timeline</div><div className="mt-4 space-y-4">{[['Booking confirmed', true], ['Specialist travelling', ['In Progress', 'In-Progress', 'Out for Service', 'Arrived'].includes(activeOrder.status)], ['Arrival', activeOrder.status === 'Arrived'], ['Service completed', false]].map((row, index) => <div key={row[0] as string} className="flex items-start gap-3"><div className={'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ' + (row[1] ? 'bg-[#c5a059] text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800')}>{index + 1}</div><div><div className={'text-xs font-bold ' + (row[1] ? 'text-white' : 'text-zinc-500')}>{row[0] as string}</div><div className="text-[9px] text-zinc-600 mt-0.5">{row[1] ? 'Confirmed' : 'Waiting'}</div></div></div>)}</div></section>
            <div className="grid grid-cols-2 gap-2"><a href={routeUrl} target="_blank" rel="noreferrer" className={'rounded-2xl p-3 border text-center text-[10px] font-extrabold ' + (workerCoords ? 'border-[#c5a059]/30 bg-[#c5a059]/10 text-[#e9c176]' : 'border-zinc-800 bg-[#0a152d] text-zinc-600 pointer-events-none')}><Route className="w-4 h-4 mx-auto mb-1" />Open route</a><button onClick={() => onTransition('home')} className="rounded-2xl p-3 border border-zinc-800 bg-[#0a152d] text-white text-[10px] font-extrabold"><ArrowLeft className="w-4 h-4 mx-auto mb-1" />Back home</button></div>
            <section className="rounded-3xl border border-zinc-800 bg-[#0a152d] p-5"><div className="flex items-center gap-2 text-white font-bold text-sm"><ShieldCheck className="w-4 h-4 text-[#c5a059]" /> Privacy-first live GPS</div><p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">Live sharing is limited to active assigned services and stops when the service ends or is cancelled.</p><div className="mt-3 flex items-center gap-2 text-[9px] text-zinc-400"><CircleAlert className="w-3.5 h-3.5 text-[#c5a059]" /> Customer view uses real worker coordinates, not simulated movement.</div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
