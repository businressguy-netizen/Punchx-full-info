import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, MapPin, Navigation, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { AppScreen, OrderRecord } from '../types';
import { auth, db } from '../lib/firebase';
import { fetchGoogleMapsConfig, GoogleMapsConfig } from '../lib/location';

interface LiveTrackingProps { onTransition: (target: AppScreen) => void; bookingTime?: string; }
type Coords = { lat: number; lng: number };
type TrackingOrder = Partial<OrderRecord> & {
  id?: string;
  workerOutForWork?: boolean;
  trackingSessionId?: string;
  trackingLastLocationAt?: string;
  workerLocation?: { lat: number; lng: number; updatedAt?: string; timestamp?: string; accuracy?: number; heading?: number; speed?: number };
};
type RouteInfo = { distanceKm: number; etaMinutes: number } | null;

const readOrder = (): TrackingOrder => {
  try { return JSON.parse(localStorage.getItem('punchx_active_order') || '{}'); } catch { return {}; }
};
const isCoords = (value: unknown): value is Coords => {
  if (!value || typeof value !== 'object') return false;
  const p = value as Coords;
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
};
const isJourneyActive = (order: TrackingOrder) =>
  Boolean(order.workerOutForWork) && ['EN_ROUTE', 'TRAVELLING', 'Enroute', 'In-Progress', 'In Progress'].includes(String(order.status || ''));

function RouteLine({ from, to, onRouteInfo }: { from: Coords; to: Coords; onRouteInfo: (info: RouteInfo) => void }) {
  const map = useMap();
  const latestFrom = useRef(from);
  const latestTo = useRef(to);
  latestFrom.current = from;
  latestTo.current = to;

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeOpacity: 0.9, strokeWeight: 5, strokeColor: '#2563eb' },
    });
    const service = new google.maps.DirectionsService();
    let cancelled = false;
    let requestInFlight = false;

    const calculateRoute = () => {
      if (cancelled || requestInFlight) return;
      requestInFlight = true;
      const origin = latestFrom.current;
      const destination = latestTo.current;
      service.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
        provideRouteAlternatives: false,
      }, (result, status) => {
        requestInFlight = false;
        if (cancelled) return;
        const leg = result?.routes?.[0]?.legs?.[0];
        if (status === 'OK' && leg) {
          const seconds = leg.duration_in_traffic?.value ?? leg.duration?.value;
          const meters = leg.distance?.value;
          if (typeof seconds === 'number' && typeof meters === 'number') {
            onRouteInfo({ distanceKm: meters / 1000, etaMinutes: Math.max(1, Math.ceil(seconds / 60)) });
          } else {
            onRouteInfo(null);
          }
          renderer.setDirections(result);
        } else {
          onRouteInfo(null);
        }
      });
    };

    calculateRoute();
    // Recalculate no more often than every 30s, even when GPS positions update faster.
    const timer = window.setInterval(calculateRoute, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      renderer.setMap(null);
    };
  }, [map, onRouteInfo]);
  return null;
}

function TrackingMap({ customer, worker, workerName, mapsConfig, onRouteInfo }: {
  customer: Coords;
  worker: Coords;
  workerName: string;
  mapsConfig: GoogleMapsConfig;
  onRouteInfo: (info: RouteInfo) => void;
}) {
  const center = useMemo(() => ({
    lat: (customer.lat + worker.lat) / 2,
    lng: (customer.lng + worker.lng) / 2,
  }), [customer.lat, customer.lng, worker.lat, worker.lng]);
  const mapId = mapsConfig.mapId && mapsConfig.mapId !== 'PUNCHX_MAP_ID' ? mapsConfig.mapId : 'DEMO_MAP_ID';

  return <APIProvider apiKey={mapsConfig.apiKey}>
    <Map
      mapId={mapId}
      defaultCenter={center}
      center={center}
      defaultZoom={13}
      gestureHandling="greedy"
      fullscreenControl
      style={{ width: '100%', height: '100%' }}
    >
      <RouteLine from={worker} to={customer} onRouteInfo={onRouteInfo} />
      <AdvancedMarker position={customer} title="Your service address">
        <div className="flex flex-col items-center">
          <div className="rounded-full border-2 border-white bg-[#17191d] p-2.5 text-white shadow-xl"><MapPin className="h-5 w-5 fill-white" /></div>
          <span className="mt-1 rounded-lg bg-white px-2 py-1 text-[10px] font-black shadow">YOU</span>
        </div>
      </AdvancedMarker>
      <AdvancedMarker position={worker} title={workerName}>
        <div className="flex flex-col items-center">
          <div className="rounded-full border-2 border-white bg-[#2563eb] p-3 text-white shadow-xl"><Navigation className="h-5 w-5" /></div>
          <span className="mt-1 max-w-32 truncate rounded-lg bg-[#17191d] px-2 py-1 text-[10px] font-black text-white shadow">{workerName}</span>
        </div>
      </AdvancedMarker>
    </Map>
  </APIProvider>;
}

export default function LiveTracking({ onTransition }: LiveTrackingProps) {
  const [order, setOrder] = useState<TrackingOrder>(readOrder);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [workerLocation, setWorkerLocation] = useState<TrackingOrder['workerLocation']>(order.workerLocation);
  const [customer, setCustomer] = useState<Coords | null>(() => {
    const candidate = order.addressCoordinates || order.customerLocation;
    return isCoords(candidate) ? candidate : null;
  });
  const [mapsConfig, setMapsConfig] = useState<GoogleMapsConfig | null>(null);
  const [mapError, setMapError] = useState('');
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [now, setNow] = useState(Date.now());
  const status = String(order.status || 'Pending');
  const journeyActive = isJourneyActive(order);
  const locationTimestamp = workerLocation?.updatedAt || workerLocation?.timestamp || order.trackingLastLocationAt;
  const locationAgeMs = locationTimestamp ? now - new Date(locationTimestamp).getTime() : Number.POSITIVE_INFINITY;
  const locationStale = !Number.isFinite(locationAgeMs) || locationAgeMs > 45000;
  const lastUpdatedText = locationTimestamp && Number.isFinite(new Date(locationTimestamp).getTime())
    ? new Date(locationTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Not received yet';
  const handleRouteInfo = useCallback((info: RouteInfo) => setRouteInfo(info), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    fetchGoogleMapsConfig().then(config => {
      if (active) setMapsConfig(config);
    }).catch(() => {
      if (active) setMapError('Map configuration could not be loaded. Refresh to try again.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const orderId = String(order.id || '');
    if (!orderId) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), snapshot => {
      if (!snapshot.exists()) {
        setMapError('This booking is no longer available.');
        return;
      }
      const data = { id: snapshot.id, ...snapshot.data() } as TrackingOrder;
      setOrder(current => ({ ...current, ...data }));
      setWorkerLocation(data.workerLocation);
      const target = data.addressCoordinates || data.customerLocation;
      if (isCoords(target)) setCustomer(target);
      if (!isJourneyActive(data)) setRouteInfo(null);
      try { localStorage.setItem('punchx_active_order', JSON.stringify({ ...readOrder(), ...data })); } catch {}
    }, error => {
      console.warn('PunchX live tracking subscription failed:', error);
      setMapError('Live booking updates are temporarily unavailable. Check your connection.');
    });
    return () => unsubscribe();
  }, [order.id]);

  // If the booking has an address but no stored coordinates, resolve the booked
  // destination once. Never substitute the customer's current GPS location.
  useEffect(() => {
    let active = true;
    if (customer || !order.id) return;
    const address = String(order.customerAddress || order.address || '').trim();
    if (!address) return;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/maps/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ address }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.success !== true || !isCoords({ lat: Number(result.lat), lng: Number(result.lng) })) {
          throw new Error(result?.error || 'PunchX could not locate the saved service address.');
        }
        if (active) setCustomer({ lat: Number(result.lat), lng: Number(result.lng) });
      } catch (error: any) {
        if (active) setMapError(error?.message || 'Unable to map the saved service address.');
      }
    })();
    return () => { active = false; };
  }, [order.id, order.customerAddress, order.address, customer]);

  const cancel = async () => {
    if (!order.id || cancelBusy) return;
    setCancelBusy(true);
    setCancelError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Your sign-in session has expired. Please sign in again.');
      const token = await user.getIdToken();
      const backendBase = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${backendBase}/api/tracking/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, action: 'cancel_booking' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success !== true) throw new Error(result?.error || 'Could not cancel this booking.');
      const next = { ...order, status: result.status || 'Cancelled', workerOutForWork: false, trackingSessionId: undefined, trackingEndedAt: new Date().toISOString() };
      setOrder(next);
      setWorkerLocation(undefined);
      setRouteInfo(null);
      try { localStorage.setItem('punchx_active_order', JSON.stringify(next)); } catch {}
      setCancelOpen(false);
    } catch (error: any) {
      setCancelError(error?.message || 'Cancellation could not be confirmed. Please retry.');
    } finally {
      setCancelBusy(false);
    }
  };

  const stages = ['BOOKED', 'PROFESSIONAL MATCH', 'ARRIVAL', 'WORK STARTED', 'COMPLETION'];
  const progressIndex = status === 'Cancelled' || status === 'CANCELLED' ? -1
    : ['Done', 'COMPLETED', 'Completed'].includes(status) ? 4
    : ['IN_SERVICE', 'In Progress', 'In-Progress'].includes(status) ? 3
    : ['ARRIVED', 'Arrived'].includes(status) ? 2
    : journeyActive || Boolean(order.workerId) ? 1 : 0;
  const mapReady = Boolean(mapsConfig?.hasKey && mapsConfig.apiKey && customer && isCoords(workerLocation) && journeyActive && !locationStale);
  const statusIsFinal = ['Cancelled', 'CANCELLED', 'Done', 'COMPLETED', 'Completed'].includes(status);

  return <div className="min-h-screen bg-[#f7faff] pb-10 text-[#0f172a]">
    <header className="sticky top-0 z-40 border-b border-[#dbeafe] bg-white/95 px-3 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <button onClick={() => onTransition('home')} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe]" aria-label="Back to home"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-wider text-[#2563eb]">PUNCHX TRACKING</div><h1 className="truncate text-lg font-black">Your service, live</h1></div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusIsFinal ? 'bg-slate-100 text-slate-600' : journeyActive && !locationStale ? 'bg-emerald-50 text-emerald-700' : 'bg-[#eaf3ff] text-[#2563eb]'}`}>{journeyActive ? (locationStale ? 'GPS DELAYED' : 'LIVE JOURNEY') : status}</span>
      </div>
    </header>

    <main className="mx-auto max-w-4xl space-y-4 px-3 py-5 sm:px-6">
      <section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#2563eb]">Booking ID</div><div className="mt-1 break-all text-sm font-black">{order.id || 'Not available'}</div><h2 className="mt-3 text-2xl font-black">{order.serviceName || 'PUNCHX service'}</h2><div className="mt-2 text-xs text-[#64748b]">{order.date || 'Date unavailable'} · {order.time || bookingTime || 'Time unavailable'}</div></div>
          <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-[#2563eb]"/>
        </div>
        <div className="mt-4 rounded-2xl bg-[#f8fbff] p-3 text-xs"><MapPin className="mr-1 inline h-4 w-4 text-[#2563eb]"/>{order.customerAddress || order.address || 'Residential address not available'}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#dbeafe] bg-white shadow-sm">
        <div className="relative h-[360px] w-full sm:h-[480px]">
          {mapReady && mapsConfig ? <TrackingMap customer={customer!} worker={workerLocation!} workerName={String(order.workerName || 'PunchX Professional')} mapsConfig={mapsConfig} onRouteInfo={handleRouteInfo}/>
          : <div className="flex h-full items-center justify-center bg-[#101827] p-6 text-center text-white"><div>
            {journeyActive ? <Navigation className="mx-auto h-9 w-9 text-blue-300"/> : <MapPin className="mx-auto h-9 w-9 text-blue-300"/>}
            <h3 className="mt-3 text-lg font-black">{!mapsConfig ? 'Connecting to PunchX Maps' : !mapsConfig.hasKey ? 'Map configuration required' : !customer ? 'Locating saved service address' : !journeyActive ? 'Live tracking has not started' : locationStale ? 'Waiting for a fresh GPS update' : 'Waiting for worker location'}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/65">{mapError || (!mapsConfig?.hasKey ? 'Configure the Google Maps key and an approved map ID for this deployment.' : !journeyActive ? 'The assigned professional shares their location after tapping Start Journey. Sharing stops after arrival.' : locationStale ? `Last worker GPS update: ${lastUpdatedText}. The map will resume when a fresh location arrives.` : 'The route appears when PunchX receives a fresh worker GPS coordinate.')}</p>
          </div></div>}
          {journeyActive && <div className="absolute left-3 top-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur sm:left-4 sm:top-4">
            <div className="flex items-center gap-2 text-xs font-black"><span className={`h-2.5 w-2.5 rounded-full ${mapReady ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}/>{locationStale ? 'Location delayed' : mapReady ? 'Worker live location' : 'Connecting to worker'}</div>
            <p className="mt-1 text-[10px] text-[#64748b]">Last update: {lastUpdatedText}</p>
          </div>}
        </div>
        <div className="grid grid-cols-3 divide-x border-t border-black/5 bg-white">
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">Road distance</p><p className="mt-1 text-base font-black">{routeInfo ? `${routeInfo.distanceKm.toFixed(1)} km` : '—'}</p></div>
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">Traffic ETA</p><p className="mt-1 text-base font-black">{routeInfo ? `${routeInfo.etaMinutes} min` : '—'}</p></div>
          <div className="p-3 text-center sm:p-4"><p className="text-[10px] uppercase tracking-wider text-[#8a8f98]">GPS status</p><p className="mt-1 text-base font-black">{!journeyActive ? 'Off' : locationStale ? 'Delayed' : 'Live'}</p></div>
        </div>
        {routeInfo && <div className="border-t border-black/5 px-4 py-3 text-xs text-[#64748b]">ETA is an estimate from the road-routing service and may change with traffic.</div>}
      </section>

      <section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm">
        <h2 className="font-black">Booking progress</h2>
        <div className="mt-4 space-y-3">{stages.map((stage,index) => {
          const completed = progressIndex >= index;
          const current = index === progressIndex;
          return <div key={stage} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? 'bg-[#2563eb] text-white' : 'bg-[#eef6ff] text-[#64748b]'}`}>{completed ? <CheckCircle2 className="h-4 w-4"/> : <span className="text-xs font-black">{index+1}</span>}</div>
            <div className="flex-1"><div className="text-xs font-black">{stage}</div><div className="text-[10px] text-[#64748b]">{current ? 'Current step' : completed ? 'Completed' : index===1 ? (order.workerName || 'PunchX is matching a professional') : 'Waiting for booking status'}</div></div>
          </div>;
        })}</div>
        {!journeyActive && !statusIsFinal && <p className="mt-3 rounded-xl bg-[#f8fbff] p-3 text-xs text-[#64748b]"><Clock3 className="mr-1 inline h-4 w-4 text-[#2563eb]"/>Tracking becomes available when the assigned professional starts the journey.</p>}
        {statusIsFinal && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Live location sharing has stopped for this booking.</p>}
      </section>

      <section className="rounded-3xl border border-[#dbeafe] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Professional</div><div className="mt-1 text-lg font-black">{order.workerName || 'Being assigned by PUNCHX'}</div><p className="mt-1 text-xs text-[#64748b]">{order.category || 'Professional service'}</p></div><UserRound className="h-7 w-7 text-[#2563eb]"/></div>
        {order.workerPhone && <a href={`tel:${order.workerPhone}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#eef6ff] py-3 text-xs font-black text-[#2563eb]"><Phone className="h-4 w-4"/>Call professional</a>}
        <div className="mt-3 rounded-2xl bg-[#eef6ff] p-3"><div className="text-[9px] font-black uppercase text-[#64748b]">Customer reference</div><div className="mt-1 text-sm font-black text-[#2563eb]">{order.customerReferenceId || localStorage.getItem('punchx_customer_id') || '—'}</div><p className="mt-1 text-[10px] leading-5 text-[#64748b]">Share your one-time service-start code with the professional only when they arrive. PunchX does not display authentication secrets here.</p></div>
      </section>

      {mapError && <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mr-1 inline h-4 w-4"/>{mapError}</div>}
      {status !== 'Cancelled' && status !== 'CANCELLED' && !statusIsFinal && <section className="rounded-3xl border border-[#fecaca] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[#b91c1c]"><AlertTriangle className="h-5 w-5"/><h2 className="font-black">Cancel order</h2></div>
        {cancelOpen ? <div className="mt-3"><p className="text-xs text-[#64748b]">Are you sure you want to cancel this booking? Live location sharing will stop.</p>
          {cancelError && <p className="mt-2 text-xs text-red-700">{cancelError}</p>}
          <div className="mt-3 flex gap-2"><button onClick={() => {setCancelOpen(false);setCancelError('');}} disabled={cancelBusy} className="flex-1 rounded-xl border border-[#dbeafe] py-3 text-xs font-black">Keep booking</button><button onClick={() => void cancel()} disabled={cancelBusy} className="flex-1 rounded-xl bg-[#dc2626] py-3 text-xs font-black text-white disabled:opacity-50">{cancelBusy ? 'Cancelling…' : 'Cancel booking'}</button></div>
        </div> : <button onClick={() => setCancelOpen(true)} className="mt-3 w-full rounded-xl border border-[#fecaca] py-3 text-xs font-black text-[#dc2626]">Cancel order</button>}
      </section>}
    </main>
  </div>;
}
