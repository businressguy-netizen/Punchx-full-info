import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { ArrowLeft, CircleAlert, MapPin, Navigation, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { db } from '../../lib/firebase';
import { fetchGoogleMapsConfig, GoogleMapsConfig } from '../../lib/location';
import { AppScreen, OrderRecord } from '../../types';

interface Props { onTransition: (screen: AppScreen) => void; }
type ActiveBooking = Partial<OrderRecord> & {
  id: string;
  workerOutForWork?: boolean;
  trackingSessionId?: string;
  trackingLastLocationAt?: string;
  workerLocation?: { lat: number; lng: number; updatedAt?: string; timestamp?: string; accuracy?: number };
};

function coordsValid(location: ActiveBooking['workerLocation']) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
    && location.lat >= -90 && location.lat <= 90 && location.lng >= -180 && location.lng <= 180);
}
function locationTime(booking: ActiveBooking) {
  const timestamp = booking.workerLocation?.updatedAt || booking.workerLocation?.timestamp || booking.trackingLastLocationAt;
  const ms = timestamp ? new Date(timestamp).getTime() : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

export default function LiveTrackingManager({ onTransition }: Props) {
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<ActiveBooking[]>([]);
  const [mapsConfig, setMapsConfig] = useState<GoogleMapsConfig | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    fetchGoogleMapsConfig().then(config => { if (active) setMapsConfig(config); })
      .catch(() => { if (active) setLoadError('Map configuration could not be loaded.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const activeQuery = query(collection(db, 'orders'), where('workerOutForWork', '==', true));
    const unsubscribe = onSnapshot(activeQuery, snapshot => {
      const next = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() } as ActiveBooking))
        .filter(order => Boolean(order.trackingSessionId) && ['EN_ROUTE', 'TRAVELLING', 'Enroute'].includes(String(order.status || '')))
        .sort((a, b) => locationTime(b) - locationTime(a));
      setBookings(next);
      setLoadError('');
      setLoading(false);
    }, error => {
      console.error('PunchX admin tracking subscription failed:', error);
      setLoadError('Active tracking could not be loaded. Check your admin access and connection.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const located = useMemo(() => bookings.filter(order => coordsValid(order.workerLocation)), [bookings]);
  const staleCount = bookings.filter(order => !locationTime(order) || now - locationTime(order) > 45000).length;

  if (!isAdmin) {
    return <main className="min-h-screen bg-[#07122a] p-4 text-white sm:p-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-7 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-amber-300"/>
        <h1 className="mt-4 text-xl font-black">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">Only an authorized PunchX administrator can view active worker locations.</p>
        <button onClick={() => onTransition('home')} className="mt-5 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900">Return to home</button>
      </section>
    </main>;
  }

  const mapId = mapsConfig?.mapId && mapsConfig.mapId !== 'PUNCHX_MAP_ID' ? mapsConfig.mapId : 'DEMO_MAP_ID';
  const center = located.length
    ? { lat: located[0].workerLocation!.lat, lng: located[0].workerLocation!.lng }
    : (mapsConfig?.defaultCenter || { lat: 22.9734, lng: 78.6569 });

  return <div className="min-h-screen bg-[#07122a] pb-10 text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07122a]/95 px-4 py-4 backdrop-blur-xl sm:px-7">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <button onClick={() => onTransition('home')} className="rounded-xl border border-white/10 p-2" aria-label="Back to home"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">PUNCHX · OPERATIONS</p><h1 className="truncate text-xl font-black sm:text-2xl">Live worker tracking</h1><p className="mt-1 text-xs text-white/60">Booking-scoped professional locations · updates in real time</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black text-emerald-200"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> LIVE</span>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-7">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-xs text-white/60"><Navigation className="h-4 w-4"/> Active journeys</div><div className="mt-2 text-3xl font-black">{bookings.length}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-xs text-white/60"><MapPin className="h-4 w-4"/> GPS positions received</div><div className="mt-2 text-3xl font-black">{located.length}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-xs text-white/60"><CircleAlert className="h-4 w-4"/> Stale or missing GPS</div><div className="mt-2 text-3xl font-black">{staleCount}</div></div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div><h2 className="font-black">Active journeys map</h2><p className="mt-1 text-xs text-white/55">Only workers currently sharing location for an active booking are shown.</p></div>
          <span className="text-xs text-white/60">{located.length} mapped</span>
        </div>
        <div className="h-[360px] sm:h-[480px]">
          {mapsConfig?.hasKey && mapsConfig.apiKey ? <APIProvider apiKey={mapsConfig.apiKey}>
            <Map mapId={mapId} defaultCenter={center} center={center} defaultZoom={located.length ? 12 : 5} gestureHandling="greedy" style={{ width: '100%', height: '100%' }}>
              {located.map(order => <AdvancedMarker key={order.id} position={{lat:order.workerLocation!.lat,lng:order.workerLocation!.lng}} title={order.workerName || 'PunchX professional'}>
                <div className="flex flex-col items-center"><div className="rounded-full border-2 border-white bg-blue-600 p-2 text-white shadow-xl"><Navigation className="h-4 w-4"/></div><span className="mt-1 max-w-32 truncate rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">{order.workerName || 'Professional'}</span></div>
              </AdvancedMarker>)}
            </Map>
          </APIProvider> : <div className="flex h-full flex-col items-center justify-center bg-[#101827] p-6 text-center"><MapPin className="h-8 w-8 text-amber-300"/><b className="mt-3">Google Maps is not configured</b><p className="mt-2 max-w-md text-sm leading-6 text-white/60">Configure a browser-restricted Google Maps key and a production map ID to view positions on the map.</p></div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5"><div><h2 className="font-black">Live booking list</h2><p className="mt-1 text-xs text-white/55">Location timestamps are shown explicitly; stale positions are never presented as live.</p></div><Users className="h-5 w-5 text-amber-300"/></div>
        {loading ? <div className="flex items-center gap-2 p-6 text-sm text-white/65"><RefreshCw className="h-4 w-4 animate-spin"/>Loading active bookings…</div>
          : loadError ? <div role="status" className="p-5 text-sm text-amber-200">{loadError}</div>
          : bookings.length === 0 ? <div className="p-8 text-center"><Navigation className="mx-auto h-8 w-8 text-white/35"/><p className="mt-3 font-bold">No active worker journeys</p><p className="mt-1 text-xs text-white/55">Assigned professionals appear here after tapping Start Journey.</p></div>
          : <div className="divide-y divide-white/10">{bookings.map(order => {
              const age = locationTime(order) ? now - locationTime(order) : Number.POSITIVE_INFINITY;
              const stale = age > 45000;
              return <article key={order.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5">
                <div className="min-w-0"><div className="truncate text-sm font-black">{order.workerName || 'Assigned professional'}</div><div className="mt-1 break-all text-[11px] text-white/55">{order.id} · {order.serviceName || order.category || 'Service booking'}</div></div>
                <div className="text-xs text-white/70">{order.customerAddress || order.address || 'Customer address unavailable'}<div className="mt-1 text-[10px] text-white/45">GPS: {locationTime(order) ? new Date(locationTime(order)).toLocaleTimeString() : 'No update received'}</div></div>
                <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-black ${stale ? 'bg-amber-300/10 text-amber-200' : coordsValid(order.workerLocation) ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/10 text-white/60'}`}>{stale ? 'STALE GPS' : coordsValid(order.workerLocation) ? 'GPS RECEIVED' : 'WAITING FOR GPS'}</span>
              </article>;
            })}</div>}
      </section>
    </main>
  </div>;
}
