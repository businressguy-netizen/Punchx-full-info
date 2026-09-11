import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AppScreen } from '../types';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  ArrowLeft, Star, Phone, MessageSquare, MapPin, Send, X, Compass,
  CheckCircle, ShieldCheck, RefreshCw, Navigation2, Clock, Check,
  AlertTriangle, ExternalLink, ChevronRight, Copy, Share2, Bell,
  ShieldAlert, Wrench, Award, CheckCircle2, ThumbsUp, Zap
} from 'lucide-react';
import { CategoryProfileBadge } from './CategoryIcon';
import { getAccurateCurrentPosition, reverseGeocodeCoords, calculateDistanceKm } from '../lib/location';
import ArrivalQualityModal from './ArrivalQualityModal';
import WarrantyClaimModal from './WarrantyClaimModal';

interface LiveTrackingProps {
  onTransition: (target: AppScreen) => void;
  bookingTime?: string;
}

// Declarative Polyline helper component using @vis.gl/react-google-maps
function Polyline({ path }: { path: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#c5a059',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}

// Utility to check if an order is genuinely live/active in progress
const isLiveActiveBooking = (order: any): boolean => {
  if (!order || !order.id) return false;
  const activeStatuses = ['Pending', 'In Progress', 'In-Progress', 'Out for Service', 'Arrived'];
  return activeStatuses.includes(order.status);
};

export default function LiveTracking({ onTransition, bookingTime }: LiveTrackingProps) {
  // Order state
  const [activeOrder, setActiveOrder] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('punchx_active_order');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isLiveActiveBooking(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not parse active order from storage:", e);
    }
    return null;
  });

  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [eta, setEta] = useState<number>(12);
  const [statusStep, setStatusStep] = useState<number>(1); // 0: Assigned, 1: Out for Service, 2: Arrived, 3: Completed
  const [workerPos, setWorkerPos] = useState({ x: 28, y: 68 });
  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState<number>(2.4);
  const [mapViewMode, setMapViewMode] = useState<'map' | 'radar'>('map');

  // Communication & modaling
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'worker' | 'user'; text: string; time: string }[]>([
    {
      sender: 'worker',
      text: "Hello! I am on my way to your location with the complete diagnostic toolkit. You can track my live GPS movement here.",
      time: "Just now"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  // GPS and telemetry
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [trackingNotification, setTrackingNotification] = useState<string | null>(null);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9610, lng: 77.5850 });
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied' | 'syncing'>('syncing');
  const [liveAddressName, setLiveAddressName] = useState<string>('');

  // OTP and Verification
  const [otp, setOtp] = useState<string>('4829');
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Quality & Guarantee Modals
  const [showArrivalQualityModal, setShowArrivalQualityModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [qualityDiscount, setQualityDiscount] = useState<number>(0);
  const [isQualityAlerted, setIsQualityAlerted] = useState<boolean>(false);

  // Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans / Not needed');
  const [cancelExplanation, setCancelExplanation] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationComplete, setCancellationComplete] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // 1. Initial Load: Check local storage and Firestore for active/recent orders
  useEffect(() => {
    // Read from localStorage
    try {
      const rawHistory = localStorage.getItem('punchx_order_history');
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableOrders(parsed);
          // If no activeOrder yet, check if there's an active in-progress booking
          if (!activeOrder) {
            const inProg = parsed.find((o: any) => isLiveActiveBooking(o));
            if (inProg) {
              setActiveOrder(inProg);
              localStorage.setItem('punchx_active_order', JSON.stringify(inProg));
            } else {
              setActiveOrder(null);
              localStorage.removeItem('punchx_active_order');
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error reading local order history:", e);
    }

    // Firestore real-time listener for latest orders
    let unsub: (() => void) | undefined;
    try {
      const ordersRef = collection(db, 'orders');
      unsub = onSnapshot(ordersRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        if (list.length > 0) {
          setAvailableOrders(list);
          // Only auto-select active in-progress order
          setActiveOrder((curr: any) => {
            if (curr && !isLiveActiveBooking(curr)) {
              localStorage.removeItem('punchx_active_order');
              return null;
            }
            if (!curr) {
              const active = list.find((o) => isLiveActiveBooking(o));
              if (active) {
                localStorage.setItem('punchx_active_order', JSON.stringify(active));
                return active;
              } else {
                localStorage.removeItem('punchx_active_order');
                return null;
              }
            }
            return curr;
          });
        } else {
          setActiveOrder(null);
          localStorage.removeItem('punchx_active_order');
        }
      }, (err) => {
        console.warn("Firestore orders listener warning:", err);
      });
    } catch (e) {
      console.warn("Firestore snapshot error:", e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. Sync active order document in Firestore in real-time
  useEffect(() => {
    if (!activeOrder?.id) return;

    // Load or generate OTP
    const storageKey = `punchx_otp_${activeOrder.id}`;
    let savedOtp = localStorage.getItem(storageKey);
    if (!savedOtp) {
      savedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem(storageKey, savedOtp);
    }
    setOtp(savedOtp);

    // Initial status step sync
    if (activeOrder.status === 'Done' || activeOrder.status === 'Completed') {
      setStatusStep(3);
    } else if (activeOrder.status === 'Arrived') {
      setStatusStep(2);
    } else if (activeOrder.status === 'Out for Service' || activeOrder.status === 'In Progress') {
      setStatusStep(1);
    } else {
      setStatusStep(0);
    }

    // Sync Customer address if provided in order
    if (activeOrder.customerAddress) {
      setLiveAddressName(activeOrder.customerAddress);
    }
    if (activeOrder.customerLocation?.lat && activeOrder.customerLocation?.lng) {
      setLiveCoords({
        lat: activeOrder.customerLocation.lat,
        lng: activeOrder.customerLocation.lng
      });
    }

    if (activeOrder.workerLocation?.lat && activeOrder.workerLocation?.lng) {
      setWorkerCoords({
        lat: activeOrder.workerLocation.lat,
        lng: activeOrder.workerLocation.lng
      });
    }

    // Real-time Firestore doc listener for status & live GPS updates
    let unsubDoc: (() => void) | undefined;
    try {
      unsubDoc = onSnapshot(doc(db, 'orders', activeOrder.id), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'Done' || data.status === 'Completed') {
            setStatusStep(3);
            setEta(0);
          } else if (data.status === 'Arrived') {
            setStatusStep(2);
            setEta(0);
          } else if (data.status === 'Out for Service') {
            setStatusStep(1);
          }
          if (data.workerLocation?.lat && data.workerLocation?.lng) {
            setWorkerCoords({ lat: data.workerLocation.lat, lng: data.workerLocation.lng });
          }
        }
      }, (err) => {
        console.warn("Order document listener error:", err);
      });
    } catch (e) {
      console.warn("Firestore snapshot listener error:", e);
    }

    return () => {
      if (unsubDoc) unsubDoc();
    };
  }, [activeOrder?.id]);

  // Dynamic Radar Projection Calculation: Maps real-world lat/lng delta to radar viewport
  const updateRadarProjection = (cust: { lat: number; lng: number }, work: { lat: number; lng: number }) => {
    const dLat = work.lat - cust.lat;
    const dLng = work.lng - cust.lng;
    
    // Approximate distance components in kilometers
    const latKm = dLat * 111;
    const lngKm = dLng * 111 * Math.cos((cust.lat * Math.PI) / 180);
    
    // Scale: 5km max radar radius mapped to 36% radius around center (50%, 50%)
    const maxRadiusKm = 5;
    const scaleFactor = 36 / maxRadiusKm;
    
    let x = 50 + (lngKm * scaleFactor);
    let y = 50 - (latKm * scaleFactor); // In SVG / CSS top-left origin, north (-lat) is upwards (-y)

    // Clamp within visible radar bounds
    x = Math.max(14, Math.min(86, x));
    y = Math.max(14, Math.min(86, y));

    setWorkerPos({ x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) });
  };

  // 3. High-Accuracy GPS Auto-Detection & continuous position watcher
  const syncLiveGpsPosition = async (showToast = true) => {
    setIsTrackingLocation(true);
    setGeoStatus('syncing');
    if (showToast) setTrackingNotification("Acquiring high-accuracy satellite GPS coordinates...");

    try {
      const pos = await getAccurateCurrentPosition();
      setLiveCoords(pos);
      setGeoStatus('granted');

      // Use active order worker coordinates if live; otherwise use actual worker coords
      let targetWorkerCoords = workerCoords;
      if (activeOrder?.workerLocation?.lat && activeOrder?.workerLocation?.lng) {
        targetWorkerCoords = {
          lat: activeOrder.workerLocation.lat,
          lng: activeOrder.workerLocation.lng
        };
        setWorkerCoords(targetWorkerCoords);
      }

      const dist = calculateDistanceKm(pos.lat, pos.lng, targetWorkerCoords.lat, targetWorkerCoords.lng);
      setCalculatedDistanceKm(parseFloat(dist.toFixed(1)));
      setEta(Math.max(1, Math.round(dist * 4)));
      updateRadarProjection(pos, targetWorkerCoords);

      const geoInfo = await reverseGeocodeCoords(pos.lat, pos.lng);
      if (geoInfo.address) {
        setLiveAddressName(geoInfo.address);
      }

      if (showToast) {
        setTrackingNotification("✓ Live GPS and satellite telemetry synchronized.");
        setTimeout(() => setTrackingNotification(null), 3500);
      }
    } catch (err) {
      console.warn("GPS resolution notice in LiveTracking:", err);
      setGeoStatus('denied');
      if (showToast) {
        setTrackingNotification("Live device GPS synchronized with active sector.");
        setTimeout(() => setTrackingNotification(null), 3000);
      }
    } finally {
      setIsTrackingLocation(false);
    }
  };

  useEffect(() => {
    // Initial GPS resolution on mount
    syncLiveGpsPosition(false);

    // Continuous watchPosition for live real-time location stream
    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLiveCoords(newPos);
          setGeoStatus('granted');
          updateRadarProjection(newPos, workerCoords);
        },
        (err) => {
          console.warn("watchPosition notice:", err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [workerCoords.lat, workerCoords.lng]);

  // 4. Update real-time distance, ETA, and radar projection whenever coordinates update
  useEffect(() => {
    if (liveCoords && workerCoords && activeOrder) {
      if (statusStep === 2 || statusStep === 3) {
        setEta(0);
        setCalculatedDistanceKm(0);
        setWorkerPos({ x: 50, y: 50 });
      } else {
        const dist = calculateDistanceKm(liveCoords.lat, liveCoords.lng, workerCoords.lat, workerCoords.lng);
        setCalculatedDistanceKm(parseFloat(dist.toFixed(1)));
        setEta(Math.max(1, Math.round(dist * 4)));
        updateRadarProjection(liveCoords, workerCoords);
      }
    }
  }, [liveCoords?.lat, liveCoords?.lng, workerCoords?.lat, workerCoords?.lng, statusStep, activeOrder?.id]);

  // 4b. Simulation: Move the technician towards the customer in real-time when "Out for Service"
  useEffect(() => {
    if (!activeOrder || statusStep !== 1) return;

    // Check distance; if they are too close to start, offset them for a nice simulation journey
    const initialDistance = calculateDistanceKm(liveCoords.lat, liveCoords.lng, workerCoords.lat, workerCoords.lng);
    if (initialDistance < 0.2) {
      // Offset by ~1.5 - 2km to create a visible journey
      setWorkerCoords({
        lat: liveCoords.lat - 0.015,
        lng: liveCoords.lng - 0.015
      });
    }

    const intervalId = setInterval(() => {
      setWorkerCoords((prev) => {
        const dLat = liveCoords.lat - prev.lat;
        const dLng = liveCoords.lng - prev.lng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);

        // Standard lat/lng delta to trigger arrival (less than ~0.0006 degrees is roughly ~60 meters)
        if (distance < 0.0006) {
          clearInterval(intervalId);
          // Update status in Firestore so worker dashboard reflects it too
          // FE-05: Require authenticated user before Firestore writes
          if (activeOrder?.id && auth.currentUser?.uid) {
            updateDoc(doc(db, 'orders', activeOrder.id), { status: 'Arrived' })
              .catch(err => console.warn("Firestore status update failed:", err));
          }
          setStatusStep(2);
          setEta(0);
          setCalculatedDistanceKm(0);
          return liveCoords;
        }

        // Interpolate position: move closer by 8% each tick
        const nextLat = prev.lat + dLat * 0.08;
        const nextLng = prev.lng + dLng * 0.08;
        return { lat: nextLat, lng: nextLng };
      });
    }, 4000); // simulation tick every 4 seconds

    return () => clearInterval(intervalId);
  }, [statusStep, activeOrder?.id, liveCoords.lat, liveCoords.lng]);

  // 5. User action: Refresh and Sync Live GPS
  const handleManualTrack = () => {
    syncLiveGpsPosition(true);
  };

  // 6. Real messaging handler
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text, time: 'Just now' }]);
    setChatInput('');
  };

  // 7. Cancel booking handler
  const handleCancelBooking = async () => {
    setIsCancelling(true);
    const orderId = activeOrder?.id || `PX-${Date.now()}`;

    try {
      // FE-05: Require authenticated user before Firestore writes
      if (activeOrder?.id && auth.currentUser?.uid) {
        await updateDoc(doc(db, 'orders', activeOrder.id), {
          status: 'Cancelled',
          cancelReason,
          cancelDetails: cancelExplanation,
          cancelledAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Firestore cancel error:", e);
    }

    try {
      const raw = localStorage.getItem('punchx_order_history') || '[]';
      const history = JSON.parse(raw);
      const updated = history.map((o: any) => {
        if (o.id === activeOrder?.id) {
          return { ...o, status: 'Cancelled', cancelReason, cancelDetails: cancelExplanation };
        }
        return o;
      });
      localStorage.setItem('punchx_order_history', JSON.stringify(updated));
      localStorage.removeItem('punchx_active_order');
    } catch (e) {
      console.warn("Local storage cancel error:", e);
    }

    setTimeout(() => {
      setIsCancelling(false);
      setCancellationComplete(true);
      setTimeout(() => {
        setShowCancelModal(false);
        setActiveOrder(null);
        onTransition('home');
      }, 2000);
    }, 1500);
  };

  // 8. Copy OTP Helper
  const handleCopyOtp = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  // If no active booking exists in progress, display clean No Live Booking screen
  if (!activeOrder || !isLiveActiveBooking(activeOrder)) {
    return (
      <div id="no-order-tracker" className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col justify-between py-16 px-4">
        <header className="fixed top-0 left-0 w-full z-50 bg-[#07122a]/95 backdrop-blur-md h-16 flex items-center justify-between px-6 border-b border-[#c5a059]/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTransition('home')}
              className="text-[#c5a059] p-1.5 hover:bg-zinc-800 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-sans font-bold text-base text-[#c5a059] tracking-tight">Live Service Tracking</h1>
          </div>
        </header>

        <div className="m-auto max-w-md w-full bg-[#111415] border border-[#c5a059]/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl mt-12">
          <div className="w-16 h-16 bg-[#c5a059]/10 rounded-full flex items-center justify-center mx-auto border border-[#c5a059]/30">
            <Compass className="w-8 h-8 text-[#e9c176] animate-spin-slow" />
          </div>
          <div className="space-y-2">
            <h2 className="font-sans font-bold text-xl text-white">No Live Booking Found</h2>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
              You currently do not have any active service appointment in progress. Book an expert specialist to activate real-time GPS telemetry and live route tracking.
            </p>
          </div>

          {availableOrders.length > 0 && (
            <div className="text-left space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-mono font-bold text-[#c5a059] uppercase tracking-wider">
                Recent Orders in History:
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableOrders.slice(0, 3).map((ord) => {
                  const isOrdActive = isLiveActiveBooking(ord);
                  return (
                    <div
                      key={ord.id}
                      className="w-full p-2.5 bg-[#151f37]/60 border border-zinc-800 rounded-xl flex items-center justify-between text-left text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{ord.category}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{ord.id} • {ord.status || 'Completed'}</span>
                      </div>
                      {isOrdActive ? (
                        <button
                          onClick={() => {
                            setActiveOrder(ord);
                            localStorage.setItem('punchx_active_order', JSON.stringify(ord));
                          }}
                          className="text-[10px] font-bold text-[#e9c176] hover:underline flex items-center gap-1 font-mono uppercase cursor-pointer"
                        >
                          Track <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onTransition('home')}
                          className="text-[10px] font-bold text-zinc-400 hover:text-[#c5a059] flex items-center gap-1 font-mono uppercase cursor-pointer"
                        >
                          Rebook
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => onTransition('home')}
            className="w-full py-3.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#c5a059]/20"
          >
            Explore Services & Book
          </button>
        </div>

        <nav className="fixed bottom-0 left-0 w-full z-45 bg-[#07122a] border-t border-[#c5a059]/20 flex justify-around items-center h-16 shadow-2xl px-6">
          <button
            onClick={() => onTransition('home')}
            className="flex flex-col items-center justify-center gap-1 text-[#e9c176]"
          >
            <ArrowLeft className="w-5 h-5 text-[#e9c176]" />
            <span className="text-[10px] font-sans">Return Home</span>
          </button>
        </nav>
      </div>
    );
  }

  // Active tracking view
  return (
    <div id="live-tracking-panel" className="relative min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans overflow-x-hidden pb-24">
      {/* Top Header Bar */}
      <header id="tracking-header" className="sticky top-0 z-40 w-full bg-[#07122a]/95 backdrop-blur-md shadow-md py-3 px-4 flex items-center justify-between border-b border-[#c5a059]/20">
        <div className="flex items-center gap-3">
          <button
            id="tracking-back-btn"
            onClick={() => onTransition('home')}
            className="text-[#c5a059] active:scale-95 duration-200 cursor-pointer p-1.5 hover:bg-zinc-800 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-[#c5a059]" />
          </button>
          <div>
            <h1 className="font-sans font-bold text-base text-[#c5a059] tracking-tight">Live Service Tracking</h1>
            <p className="text-[9px] font-mono text-zinc-400">Order ID: {activeOrder.id || 'PX-ACTIVE'}</p>
          </div>
        </div>

        {/* Live GPS Sync Status badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncLiveGpsPosition(true)}
            disabled={isTrackingLocation}
            className="px-2.5 py-1.5 bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#e9c176] hover:text-black rounded-lg border border-[#c5a059]/40 text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            title="Re-scan and Sync GPS"
          >
            <RefreshCw className={`w-3 h-3 ${isTrackingLocation ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync GPS</span>
          </button>

          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="w-full max-w-7xl mx-auto pt-4 pb-20 px-3 sm:px-6 lg:px-8 relative z-10 space-y-4">
        {/* Quick telemetry notification toast */}
        {trackingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-2.5 px-4 rounded-xl bg-[#101b33] border border-[#c5a059]/50 text-xs font-mono text-[#e9c176] shadow-xl flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-[#c5a059] animate-spin" />
            <span className="font-bold">{trackingNotification}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Segmented View Selector & Map Container */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-3">
            {/* View Mode Segmented Controls */}
            <div className="flex items-center justify-between gap-2 bg-[#0c1525]/90 border border-[#c5a059]/20 p-2 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-zinc-400 pl-2">TELEMETRY VIEW:</span>
              <div className="flex bg-[#07122a] p-1 rounded-xl border border-[#c5a059]/10">
                <button
                  onClick={() => setMapViewMode('map')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mapViewMode === 'map'
                      ? 'bg-[#c5a059] text-black shadow-md'
                      : 'text-[#e9c176] hover:bg-zinc-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Real-Time Map</span>
                </button>
                <button
                  onClick={() => setMapViewMode('radar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    mapViewMode === 'radar'
                      ? 'bg-[#c5a059] text-black shadow-md'
                      : 'text-[#e9c176] hover:bg-zinc-800'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Radar HUD</span>
                </button>
              </div>
            </div>

            {/* Radar / Satellite Map Canvas */}
            <div
              id="tracking-radar-map"
              className="relative w-full h-[320px] sm:h-[380px] lg:h-[580px] bg-[#030d25] rounded-3xl border border-[#c5a059]/30 overflow-hidden shadow-2xl"
            >
              {mapViewMode === 'map' ? (
                // Google Maps View
                (() => {
                  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
                  if (!apiKey) {
                    return (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07122a]/95 p-6 text-center space-y-4 z-30">
                        <div className="w-16 h-16 bg-[#c5a059]/10 rounded-full flex items-center justify-center border border-[#c5a059]/30">
                          <Compass className="w-8 h-8 text-[#e9c176] animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h3 className="text-base font-bold text-white">Google Maps API Key Required</h3>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            To view the active GPS route of your specialist on a live Google Map, please configure the <code className="px-1.5 py-0.5 bg-black/40 rounded text-amber-400 font-mono">VITE_GOOGLE_MAPS_API_KEY</code> environment variable in your <code className="px-1.5 py-0.5 bg-black/40 rounded text-amber-400 font-mono">.env</code> file.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center pt-2">
                          <a
                            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-[#c5a059] hover:bg-[#e9c176] text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <span>Get Maps Demo Key</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setMapViewMode('radar')}
                            className="px-4 py-2 bg-[#101b33] hover:bg-[#152342] border border-[#c5a059]/40 text-xs font-bold text-[#e9c176] rounded-xl transition-all cursor-pointer"
                          >
                            Use Simulated Radar HUD
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="w-full h-full relative z-10">
                      <APIProvider apiKey={apiKey}>
                        <Map
                          mapId="DEMO_MAP_ID"
                          style={{ width: '100%', height: '100%' }}
                          defaultCenter={liveCoords}
                          defaultZoom={14}
                          center={liveCoords}
                          disableDefaultUI={true}
                          gestureHandling={'cooperative'}
                          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                        >
                          {/* Route line connecting technician and customer */}
                          <Polyline path={[workerCoords, liveCoords]} />

                          {/* Customer Location Pin */}
                          <AdvancedMarker position={liveCoords}>
                            <div className="flex flex-col items-center">
                              <div className="p-2 bg-emerald-500 rounded-full shadow-lg border-2 border-white text-black animate-pulse">
                                <MapPin className="w-4 h-4 fill-black text-black" />
                              </div>
                              <span className="mt-1 bg-black/90 px-2 py-0.5 rounded text-[9px] text-emerald-300 font-mono font-bold border border-emerald-500/40 shadow-xl whitespace-nowrap">
                                YOU
                              </span>
                            </div>
                          </AdvancedMarker>

                          {/* Moving Technician Location Pin */}
                          <AdvancedMarker position={workerCoords}>
                            <div className="flex flex-col items-center">
                              <div className="relative">
                                <div className="absolute -inset-1 bg-[#c5a059] rounded-full blur-sm opacity-70 animate-ping"></div>
                                <div className="relative p-2.5 bg-[#0a1428] rounded-full shadow-2xl border-2 border-[#c5a059] flex items-center justify-center text-[#e9c176]">
                                  <Navigation2 className="w-4 h-4 rotate-45 text-[#e9c176]" />
                                </div>
                              </div>
                              <span className="mt-1 bg-[#0a1428]/95 px-2.5 py-0.5 rounded-md text-[9px] text-[#e9c176] font-mono font-extrabold uppercase border border-[#c5a059]/50 shadow-xl whitespace-nowrap">
                                {activeOrder.workerName || 'Technician'} • {eta > 0 ? `${eta}m away` : 'Arrived'}
                              </span>
                            </div>
                          </AdvancedMarker>
                        </Map>
                      </APIProvider>

                      {/* Top HUD Badges over map */}
                      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
                        <div className="bg-[#07122a]/95 border border-[#c5a059]/50 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          <span className="font-mono text-[10px] font-extrabold text-[#e9c176] uppercase">
                            {statusStep === 0 ? 'Assigned' : statusStep === 1 ? 'Out for Service' : statusStep === 2 ? 'Arrived' : 'Service Completed'}
                          </span>
                        </div>
                        <div className="bg-[#07122a]/95 border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-xl font-mono text-[10px] text-zinc-300">
                          <Clock className="w-3 h-3 text-[#c5a059]" />
                          <span>{eta > 0 ? `ETA: ${eta} mins` : 'Arrived'}</span>
                          <span className="text-zinc-500">•</span>
                          <span>{calculatedDistanceKm} km</span>
                        </div>
                      </div>

                      {/* Bottom Floating Map Controls */}
                      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                        <button
                          onClick={handleManualTrack}
                          className="p-2.5 bg-[#07122a]/90 hover:bg-[#c5a059] hover:text-black text-[#e9c176] border border-[#c5a059]/40 rounded-xl shadow-xl transition-all cursor-pointer"
                          title="Recenter and scan GPS"
                        >
                          <Compass className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Radar HUD Simulation View
                <>
                  {/* Map background imagery */}
                  <img
                    alt="Satellite GPS Grid"
                    className="w-full h-full object-cover opacity-35 grayscale contrast-125 brightness-60"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxXiIqRoq-vYxFfQWmh6nEJJVEZLuG8_XTloJupDAGo2KWEJare7l0lhFePpI4RBeHQPKLEls1Uq-y3NPjeNJX2LjJ673Y6rMncGzquudeN-dAeLsSPD77j1C0d-Xmd-hUfyTyD3nzJnIZ9Umfw67crjYLaYmNKoQnAym9LdhqNDzx2lDLM6AktT4POIRyNHM_MlEdhEcQDKxhKCKdiqvbBMGTDHa1G-R-ES3bAbsdN1kDhH05W21Z_9hcjIO7ZdktPvds37JFxwE"
                    referrerPolicy="no-referrer"
                  />

                  {/* Radar Sweep Effect & Concentric Distance Rings */}
                  <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(197,160,89,0.2)_100%)]"></div>
                  
                  {/* Concentric Satellite Radar Circles */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[72%] h-[72%] rounded-full border border-[#c5a059]/20 flex items-center justify-center">
                      <span className="text-[8px] font-mono text-[#c5a059]/40 absolute top-2">5 KM RADIUS</span>
                      <div className="w-[60%] h-[60%] rounded-full border border-[#c5a059]/25 flex items-center justify-center">
                        <span className="text-[8px] font-mono text-[#c5a059]/40 absolute top-2">2.5 KM</span>
                        <div className="w-[45%] h-[45%] rounded-full border border-emerald-500/30 flex items-center justify-center">
                          <span className="text-[7px] font-mono text-emerald-400/50 absolute top-1">1 KM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Animated Live Route SVG */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <defs>
                      <linearGradient id="route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#c5a059" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    {/* Glowing flight trajectory from Worker to Customer */}
                    <path
                      d={`M ${workerPos.x} ${workerPos.y} Q ${(workerPos.x + 50) / 2 - 3} ${(workerPos.y + 50) / 2 + 4} 50 50`}
                      fill="none"
                      stroke="url(#route-gradient)"
                      strokeWidth="1.5"
                      strokeDasharray="4, 2"
                      strokeLinecap="round"
                      className="animate-[shimmer_1.5s_linear_infinite]"
                    />

                    {/* Target radar ping at center (Customer) */}
                    <circle cx="50" cy="50" r="3.5" fill="none" stroke="#10b981" strokeWidth="0.8" className="animate-ping" />
                    <circle cx="50" cy="50" r="1.8" fill="#10b981" />
                  </svg>

                  {/* Customer Location Pin (Destination Centered at 50%, 50%) */}
                  <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none">
                    <div className="p-2 bg-emerald-500 rounded-full shadow-lg border-2 border-white text-black animate-pulse">
                      <MapPin className="w-4 h-4 fill-black text-black" />
                    </div>
                    <span className="mt-1 bg-black/90 px-2 py-0.5 rounded text-[9px] text-emerald-300 font-mono font-bold border border-emerald-500/40 shadow-xl whitespace-nowrap">
                      YOU ({liveCoords.lat.toFixed(4)}°, {liveCoords.lng.toFixed(4)}°)
                    </span>
                  </div>

                  {/* Moving Technician Pin */}
                  <div
                    className="absolute flex flex-col items-center duration-1000 transition-all ease-out z-20 pointer-events-none"
                    style={{ left: `${workerPos.x}%`, top: `${workerPos.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="relative">
                      <div className="absolute -inset-1 bg-[#c5a059] rounded-full blur-sm opacity-70 animate-ping"></div>
                      <div className="relative p-2.5 bg-[#0a1428] rounded-full shadow-2xl border-2 border-[#c5a059] flex items-center justify-center text-[#e9c176]">
                        <Navigation2 className="w-4 h-4 rotate-45 animate-pulse text-[#e9c176]" />
                      </div>
                    </div>
                    <span className="mt-1 bg-[#0a1428]/95 px-2.5 py-0.5 rounded-md text-[9px] text-[#e9c176] font-mono font-extrabold uppercase border border-[#c5a059]/50 shadow-xl whitespace-nowrap">
                      {activeOrder.workerName || 'Technician'} • {eta > 0 ? `${eta}m away` : 'Arrived'}
                    </span>
                  </div>

                  {/* Top HUD Badges */}
                  <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
                    <div className="bg-[#07122a]/95 border border-[#c5a059]/50 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-mono text-[10px] font-extrabold text-[#e9c176] uppercase">
                        {statusStep === 0 ? 'Assigned' : statusStep === 1 ? 'Out for Service' : statusStep === 2 ? 'Arrived at Doorstep' : 'Service Completed'}
                      </span>
                    </div>
                    <div className="bg-[#07122a]/95 border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-xl font-mono text-[10px] text-zinc-300">
                      <Clock className="w-3 h-3 text-[#c5a059]" />
                      <span>{eta > 0 ? `ETA: ${eta} mins` : 'Arrived'}</span>
                      <span className="text-zinc-500">•</span>
                      <span>{calculatedDistanceKm} km</span>
                    </div>
                  </div>

                  {/* Bottom Floating Map Controls */}
                  <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                    <button
                      onClick={handleManualTrack}
                      className="p-2.5 bg-[#07122a]/90 hover:bg-[#c5a059] text-[#e9c176] hover:text-black border border-[#c5a059]/40 rounded-xl shadow-xl transition-all cursor-pointer"
                      title="Recenter and scan GPS"
                    >
                      <Compass className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Tracking Details & Interactive Controls */}
          <div id="tracking-card-overlay" className="w-full lg:col-span-6 xl:col-span-5 space-y-4">
            <div className="bg-[#0c1525]/95 border border-[#c5a059]/30 backdrop-blur-xl rounded-3xl p-5 shadow-2xl space-y-5">
              
              {/* Technician Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-2xl border-2 border-[#c5a059] p-0.5 overflow-hidden bg-zinc-900">
                    <img
                      alt={`${activeOrder.workerName} avatar`}
                      className="w-full h-full rounded-xl object-cover"
                      src={activeOrder.workerAvatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAqGSkUfdfY3HcncTIY6PcfYdkpVlEw562C-in1-G55qC0H9bSKFW8cqmF3xtLQBiLByv5gRtdxWkYekhxeENWyFwDm8ul37KWcjYkERdCJIh3koj0rjMu5e_gD3YlqWbGhl-QHhYi6ut8VbLAlzAtiB0EsJQi8z-zzFZcQ7woGa9eEX8eNwTef7-3MnRen3OP5KenmJgDdlswqLaCtAAmMZ5DF5bLC6SCpZg_YiJm3UtNjd--OeKUw_xIodwne7y1Lg0eex3BtxJQ"}
                      referrerPolicy="no-referrer"
                    />
                    <CategoryProfileBadge category={activeOrder.category} sizeClassName="w-5 h-5 p-0.5" className="-top-1 -right-1" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-sans font-bold text-white text-base">{activeOrder.workerName || 'Assigned Specialist'}</h2>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-[#e9c176] text-[#e9c176]" />
                      <span>{activeOrder.workerRating || 4.9} ★ {activeOrder.category || 'Specialist'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest block">Live ETA</span>
                  <span className="text-2xl font-mono font-extrabold text-[#c5a059] animate-pulse block">
                    {eta > 0 ? `${eta} mins` : 'Arrived!'}
                  </span>
                </div>
              </div>

              {/* 6-Tier High Trust Verification Badges */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[9px] font-sans">
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Identity Verified</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <Award className="w-3 h-3 text-[#e9c176] shrink-0" />
                  <span className="truncate">Skill Tested</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Police Cleared</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <ShieldAlert className="w-3 h-3 text-[#e9c176] shrink-0" />
                  <span className="truncate">₹10K Insured</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <Wrench className="w-3 h-3 text-[#e9c176] shrink-0" />
                  <span className="truncate">1,245+ Jobs</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101b33] border border-[#c5a059]/20 flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">97% On-Time</span>
                </div>
              </div>

              {/* 30-Day Guarantee & Emergency Indicators */}
              {(activeOrder.hasWarrantyGuarantee || activeOrder.isEmergency) && (
                <div className="flex gap-2 flex-wrap text-left">
                  {activeOrder.hasWarrantyGuarantee && (
                    <div className="flex items-center gap-1.5 bg-[#c5a059]/15 border border-[#c5a059]/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#e9c176]">
                      <span>🛡️ 30-Day Free Revisit Guarantee Active</span>
                    </div>
                  )}
                  {activeOrder.isEmergency && (
                    <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/60 px-2.5 py-1 rounded-xl text-[10px] font-bold text-red-400 animate-pulse">
                      <Zap className="w-3 h-3 text-red-400" />
                      <span>SOS Emergency Fast-Track Dispatch</span>
                    </div>
                  )}
                </div>
              )}

              {/* Arrival Quality Check Alert Banner */}
              <div className="bg-[#151f37]/80 border border-[#c5a059]/40 rounded-2xl p-3.5 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#e9c176]" />
                    <span className="text-xs font-bold text-white font-sans">
                      Arrival Quality & Tool Verification
                    </span>
                  </div>
                  {isQualityAlerted && (
                    <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                      10% DISCOUNT APPLIED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                  Did the technician bring proper equipment? Verify tools and behaviour for our 10% quality discount guarantee.
                </p>
                <button
                  onClick={() => setShowArrivalQualityModal(true)}
                  className="w-full py-2 bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#e9c176] hover:text-black border border-[#c5a059]/50 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Verify Technician Arrival (Quality Check)</span>
                </button>
              </div>

              {/* Service Destination Location Card */}
              <div className="bg-[#101b33]/60 border border-[#c5a059]/20 rounded-2xl p-3.5 flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-xl bg-[#c5a059]/10 flex items-center justify-center text-[#e9c176] shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#e9c176] animate-pulse" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest font-extrabold text-[#c5a059] uppercase">
                      Destination Address
                    </span>
                    <span className="text-[8px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase">
                      GPS LOCKED
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1 truncate">
                    {liveAddressName || activeOrder.customerAddress || 'Indiranagar, Sector 2, Bengaluru'}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    Lat: {liveCoords.lat.toFixed(5)}° • Lng: {liveCoords.lng.toFixed(5)}°
                  </p>
                </div>
              </div>

              {/* 4-Step Live Tracking Progress Flow */}
              <div className="space-y-2 text-left">
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Service Stage
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { label: 'Assigned', step: 0 },
                    { label: 'Out for Service', step: 1 },
                    { label: 'Arrived', step: 2 },
                    { label: 'Completed', step: 3 }
                  ].map((s) => {
                    const isDone = statusStep >= s.step;
                    const isCurrent = statusStep === s.step;
                    return (
                      <div
                        key={s.step}
                        className={`p-2 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#e9c176] font-bold'
                            : isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {isDone ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-zinc-700"></div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono block leading-tight">{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Verification OTP Box */}
              <div id="service-otp-box" className="p-4 bg-[#0a1120] border border-[#c5a059]/30 rounded-2xl text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                    <span className="text-[10px] font-mono tracking-wider font-bold text-[#e1e3e4] uppercase">
                      Service Security OTP
                    </span>
                  </div>
                  <button
                    onClick={handleCopyOtp}
                    className="flex items-center gap-1 text-[9px] font-mono text-[#e9c176] hover:text-white bg-[#c5a059]/10 px-2 py-0.5 rounded cursor-pointer border border-[#c5a059]/20"
                  >
                    {copiedOtp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedOtp ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>

                {/* OTP Digit Display */}
                <div className="flex gap-2 justify-center py-1">
                  {otp.split('').map((char, index) => (
                    <div
                      key={index}
                      className="w-11 h-13 rounded-xl bg-[#07122a] border border-[#c5a059]/50 flex items-center justify-center font-mono text-2xl font-extrabold text-[#e9c176] shadow-lg"
                    >
                      {char}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] font-mono text-amber-400/90 leading-tight text-center font-semibold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  ⚠️ Share this OTP with the technician ONLY after the service is fully completed.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  id="track-live-location-btn"
                  onClick={handleManualTrack}
                  disabled={isTrackingLocation}
                  className="w-full py-3.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono text-xs font-extrabold tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#c5a059]/20 uppercase"
                >
                  <Compass className={`w-4 h-4 ${isTrackingLocation ? 'animate-spin' : ''}`} />
                  <span>{isTrackingLocation ? 'Updating Telemetry...' : 'Refresh Live GPS & Route'}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsCalling(true)}
                    className="py-3 bg-[#101b33] hover:bg-[#152342] border border-[#c5a059]/30 hover:border-[#c5a059] text-[#e9c176] font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Worker</span>
                  </button>

                  <button
                    onClick={() => setShowChatModal(true)}
                    className="py-3 bg-[#101b33] hover:bg-[#152342] border border-[#c5a059]/30 hover:border-[#c5a059] text-[#e9c176] font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>In-App Chat</span>
                  </button>
                </div>

                {statusStep <= 1 && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-800/30 text-red-400 font-mono text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center uppercase"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* In-App Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0c1525] border border-[#c5a059]/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]"
            >
              {/* Chat Header */}
              <div className="p-4 bg-[#101b33] border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={activeOrder.workerAvatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAqGSkUfdfY3HcncTIY6PcfYdkpVlEw562C-in1-G55qC0H9bSKFW8cqmF3xtLQBiLByv5gRtdxWkYekhxeENWyFwDm8ul37KWcjYkERdCJIh3koj0rjMu5e_gD3YlqWbGhl-QHhYi6ut8VbLAlzAtiB0EsJQi8z-zzFZcQ7woGa9eEX8eNwTef7-3MnRen3OP5KenmJgDdlswqLaCtAAmMZ5DF5bLC6SCpZg_YiJm3UtNjd--OeKUw_xIodwne7y1Lg0eex3BtxJQ"}
                    alt="worker avatar"
                    className="w-9 h-9 rounded-full object-cover border border-[#c5a059]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-white">{activeOrder.workerName || 'Rajesh Kumar'}</h3>
                    <p className="text-[10px] text-emerald-400 font-mono">● Online & En Route</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                        msg.sender === 'user'
                          ? 'bg-[#c5a059] text-black font-bold'
                          : 'bg-[#151f37] text-zinc-200 border border-zinc-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input Box */}
              <div className="p-3 bg-[#101b33] border-t border-zinc-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask technician for arrival time, landmark..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-grow bg-[#07122a] border border-zinc-700 focus:border-[#c5a059] rounded-xl px-3 py-2 text-xs outline-none text-white"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2.5 bg-[#c5a059] text-black rounded-xl hover:bg-[#e9c176] transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Call Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-[#07122a]/95 flex flex-col items-center justify-between py-16 px-6 backdrop-blur-2xl text-center"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-[#e9c176] font-mono tracking-[0.2em] uppercase">Direct Dispatch Channel</span>
              <h2 className="font-sans font-bold text-lg text-white">Voice Call Connect</h2>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#c5a059]/20 rounded-full blur-xl animate-ping"></div>
                <img
                  src={activeOrder.workerAvatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAqGSkUfdfY3HcncTIY6PcfYdkpVlEw562C-in1-G55qC0H9bSKFW8cqmF3xtLQBiLByv5gRtdxWkYekhxeENWyFwDm8ul37KWcjYkERdCJIh3koj0rjMu5e_gD3YlqWbGhl-QHhYi6ut8VbLAlzAtiB0EsJQi8z-zzFZcQ7woGa9eEX8eNwTef7-3MnRen3OP5KenmJgDdlswqLaCtAAmMZ5DF5bLC6SCpZg_YiJm3UtNjd--OeKUw_xIodwne7y1Lg0eex3BtxJQ"}
                  alt="worker"
                  className="w-28 h-28 rounded-full border-4 border-[#c5a059] object-cover shadow-2xl relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-bold text-xl text-white">{activeOrder.workerName || 'Rajesh Kumar'}</h3>
              <p className="text-xs text-emerald-400 font-mono animate-pulse">Ringing specialist phone...</p>
            </div>

            <div className="space-y-4 w-full max-w-xs">
              <button
                onClick={() => setIsCalling(false)}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white mx-auto shadow-2xl cursor-pointer transition-all active:scale-95"
              >
                <X className="w-8 h-8 text-white" />
              </button>
              <p className="text-[10px] text-zinc-500 font-mono">Tap red button to end connection</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0c1525] border border-red-900/40 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              {isCancelling ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-t-red-500 border-red-500/20 rounded-full animate-spin mx-auto"></div>
                  <h3 className="font-bold text-white">Cancelling booking...</h3>
                  <p className="text-xs text-zinc-400">Releasing technician and updating service records.</p>
                </div>
              ) : cancellationComplete ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/25 mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">Cancelled Successfully</h3>
                  <p className="text-xs text-zinc-400">Your booking has been cancelled.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">Cancel Booking</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Please select the reason for cancellation:</p>
                    </div>
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[
                      'Change of plans / Not needed',
                      'Technician is taking too long',
                      'Booked another service',
                      'Price or service query',
                      'Other'
                    ].map((r) => (
                      <button
                        key={r}
                        onClick={() => setCancelReason(r)}
                        className={`w-full p-2.5 rounded-xl border text-xs text-left transition-all ${
                          cancelReason === r
                            ? 'bg-red-500/10 border-red-500/40 text-[#e9c176] font-bold'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Details (optional)</label>
                    <textarea
                      rows={2}
                      value={cancelExplanation}
                      onChange={(e) => setCancelExplanation(e.target.value)}
                      placeholder="Type details..."
                      className="w-full bg-[#07122a] border border-zinc-700 focus:border-[#c5a059] rounded-xl p-2 text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                    >
                      Keep Booking
                    </button>
                    <button
                      onClick={handleCancelBooking}
                      className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <nav id="tracking-bottom-navbar" className="fixed bottom-0 left-0 w-full z-45 bg-[#07122a] border-t border-[#c5a059]/20 flex justify-around items-center h-16 shadow-2xl px-6">
        <button
          onClick={() => onTransition('home')}
          className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#e9c176] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-sans">Back Home</span>
        </button>

        <button
          className="flex flex-col items-center justify-center gap-1 text-[#e9c176] bg-[#c5a059]/10 px-4 py-1 rounded-xl border border-[#c5a059]/30"
        >
          <Compass className="w-5 h-5 animate-spin-slow" />
          <span className="text-[10px] font-bold font-sans uppercase">Tracking</span>
        </button>
      </nav>

      {/* Arrival Quality Check Modal */}
      {showArrivalQualityModal && activeOrder && (
        <ArrivalQualityModal
          order={activeOrder}
          isOpen={showArrivalQualityModal}
          onClose={() => setShowArrivalQualityModal(false)}
          onFeedbackProcessed={(discountAmount, isNegative) => {
            if (isNegative) {
              setQualityDiscount(discountAmount);
              setIsQualityAlerted(true);
            }
          }}
          showNotification={(msg) => {
            setTrackingNotification(msg);
            setTimeout(() => setTrackingNotification(null), 5000);
          }}
        />
      )}

      {/* 30-Day Free Revisit Guarantee Claim Modal */}
      {showWarrantyModal && activeOrder && (
        <WarrantyClaimModal
          order={activeOrder}
          isOpen={showWarrantyModal}
          onClose={() => setShowWarrantyModal(false)}
          onSubmitSuccess={(claim) => {
            setTrackingNotification(`✓ 30-Day Guarantee Claim ${claim.id} logged.`);
            setTimeout(() => setTrackingNotification(null), 5000);
          }}
          showNotification={(msg) => {
            setTrackingNotification(msg);
            setTimeout(() => setTrackingNotification(null), 5000);
          }}
        />
      )}
    </div>
  );
}
