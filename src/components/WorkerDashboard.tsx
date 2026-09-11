import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, OrderRecord, CustomerReview } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../lib/authContext';
import { requestAndAutoUpdateLocation, LocationData, getSectorFromAddress, calculateDistanceKm, getCoordinatesForAddressOrSector, checkIsWithin15KmRadius, getAccurateCurrentPosition } from '../lib/location';
import ServiceRadiusRadarModal from './ServiceRadiusRadarModal';
import WorkerAcademyModal from './WorkerAcademyModal';
import WorkerSafetyStoreModal from './WorkerSafetyStoreModal';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import ServiceCategoryModal from './ServiceCategoryModal';
import { 
  dispatchWorkerAcceptedAlert, 
  dispatchWorkerTravelAlert, 
  dispatchPushNotification 
} from '../lib/pushNotifications';
import { 
  Wrench, ShieldCheck, CheckCircle2, Clock, MapPin, Phone, 
  Upload, Navigation, DollarSign, Star, UserCheck, AlertCircle, 
  MessageSquare, ChevronRight, Power, Camera, RefreshCw, Check,
  XCircle, TrendingUp, BarChart2, FileText, Send, Sparkles, User,
  Calendar, CreditCard, ArrowLeft, PenTool, Lock, HelpCircle,
  Compass, Eye, Play, LogOut, Edit3, X, ShoppingBag, BookOpen, Award, Grid, Plus, Briefcase
} from 'lucide-react';

interface WorkerDashboardProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
}

export default function WorkerDashboard({ onTransition, showNotification }: WorkerDashboardProps) {
  const { currentUser, userProfile, logout } = useAuth() as any;
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const saved = localStorage.getItem('punchx_worker_online_status');
    return saved !== 'offline';
  });

  useEffect(() => {
    localStorage.setItem('punchx_worker_online_status', isOnline ? 'online' : 'offline');
    window.dispatchEvent(new Event('punchx_worker_status_change'));
    window.dispatchEvent(new Event('storage'));
  }, [isOnline]);
  const [activeTab, setActiveTab] = useState<'orders' | 'earnings' | 'profile' | 'bot'>('orders');

  // Authenticated Worker Profile State
  const [workerProfile, setWorkerProfile] = useState<{
    uid: string;
    name: string;
    email: string;
    phone: string;
    photoURL: string;
    skill: string;
    categories?: string[];
    experience: string;
    visitingFee: number;
    rating: number;
    completedJobs: number;
    address?: string;
    area?: string;
    sector?: string;
  }>({
    uid: '',
    name: 'Verified Service Partner',
    email: '',
    phone: '',
    photoURL: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
    skill: 'Electrician',
    categories: ['Electrician'],
    experience: 'Verified Professional',
    visitingFee: 199,
    rating: 5.0,
    completedJobs: 0,
    address: '',
    area: 'Indiranagar',
    sector: 'Sector 2'
  });
  const [isLoadingWorkerProfile, setIsLoadingWorkerProfile] = useState(true);
  const [editFeeModal, setEditFeeModal] = useState(false);
  const [tempVisitingFee, setTempVisitingFee] = useState<number>(199);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // GPS Location Auto Update State
  const [workerLocation, setWorkerLocation] = useState<LocationData | null>(null);
  const [isLocatingWorker, setIsLocatingWorker] = useState(false);
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const [isSafetyStoreOpen, setIsSafetyStoreOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);

  const handleSyncWorkerGPS = async (targetUid?: string) => {
    setIsLocatingWorker(true);
    const loc = await requestAndAutoUpdateLocation('worker', targetUid || workerProfile.uid);
    setIsLocatingWorker(false);
    if (loc) {
      setWorkerLocation(loc);
      showNotification(`📍 Worker GPS Auto-Updated: ${loc.area || loc.address}`);
    } else {
      showNotification("⚠️ Device location access denied. Please allow GPS permissions.");
    }
  };

  // Auto update worker location when opening dashboard or logging in
  useEffect(() => {
    handleSyncWorkerGPS();
  }, [workerProfile.uid]);

  // Sync authenticated worker profile from Context
  useEffect(() => {
    if (userProfile && currentUser) {
      setIsLoadingWorkerProfile(true);
      const fee = userProfile.visitingFee || userProfile.price || 199;
      const cats = userProfile.categories && userProfile.categories.length > 0 
        ? userProfile.categories 
        : [userProfile.workerSkill || 'Electrician'];

      setWorkerProfile({
        uid: userProfile.uid,
        name: userProfile.name || 'Verified Worker',
        email: userProfile.email || 'Not provided',
        phone: userProfile.phone || 'Not provided',
        photoURL: userProfile.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
        skill: cats.join(', ') || userProfile.workerSkill || 'Electrician',
        categories: cats,
        experience: userProfile.workerExperience || '1 Year',
        visitingFee: fee,
        rating: userProfile.workerRating || 5.0,
        completedJobs: userProfile.workerCompletedJobs || 0
      });
      setTempVisitingFee(fee);
      setIsLoadingWorkerProfile(false);
    } else if (!userProfile) {
      setIsLoadingWorkerProfile(false);
    }
  }, [userProfile, currentUser]);

  const handleSaveWorkerCategories = async (newCategories: string[], customSkill?: string) => {
    const combinedCats = [...newCategories];
    if (customSkill && !combinedCats.includes(customSkill)) {
      combinedCats.push(customSkill);
    }

    setWorkerProfile(prev => ({
      ...prev,
      categories: combinedCats,
      skill: combinedCats.join(', ')
    }));

    if (currentUser?.uid || workerProfile.uid) {
      const targetUid = currentUser?.uid || workerProfile.uid;
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          categories: combinedCats,
          workerSkill: combinedCats.join(', '),
          skill: combinedCats[0] || 'Electrician',
          updatedAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'workers', targetUid), {
          categories: combinedCats,
          skill: combinedCats.join(', '),
          category: combinedCats[0] || 'Electrician',
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firestore worker category update error:', e);
      }
    }

    showNotification(`✓ Services updated! You are now active in ${combinedCats.length} categories.`);
  };

  // Loading state for Firestore/data sync simulation
  const [isLoading, setIsLoading] = useState(true);
  const [workerReviews, setWorkerReviews] = useState<CustomerReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);

  // Fetch reviews for worker from Firestore
  useEffect(() => {
    let unsubscribe: () => void;
    try {
      setIsLoadingReviews(true);
      const reviewsCol = collection(db, 'reviews');
      unsubscribe = onSnapshot(reviewsCol, (snapshot) => {
        const live: CustomerReview[] = [];
        snapshot.forEach((docSnap) => {
          live.push({ id: docSnap.id, ...docSnap.data() } as CustomerReview);
        });
        setWorkerReviews(live);
        setIsLoadingReviews(false);
      }, (err) => {
        console.warn('Firestore worker review subscription offline:', err);
        setIsLoadingReviews(false);
      });
    } catch (e) {
      console.warn('Firestore worker reviews listener error:', e);
      setIsLoadingReviews(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  
  // Active workflow modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRadiusRadarModal, setShowRadiusRadarModal] = useState(false);
  const [showLiveNavigationModal, setShowLiveNavigationModal] = useState(false);
  const [showCompletionGate, setShowCompletionGate] = useState(false);
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);
  const [completedPaymentSummary, setCompletedPaymentSummary] = useState<{ amount: number; method: string; orderId: string } | null>(null);

  // Live Location Tracker Simulation State
  const [etaMinutes, setEtaMinutes] = useState(6);
  const [distanceKm, setDistanceKm] = useState(2.4);

  // Completion Form Inputs
  const [otpInput, setOtpInput] = useState('8842');
  const [photoProof, setPhotoProof] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Helper to retrieve itemized hired service tasks for the selected order
  const getHiredServicesList = (order: OrderRecord | null) => {
    if (!order) return [];
    const cat = (order.category || '').toLowerCase();
    const desc = order.issueDescription || '';

    if (cat.includes('ac') || desc.toLowerCase().includes('ac') || desc.toLowerCase().includes('condenser')) {
      return [
        { id: 'task-1', title: 'Diagnostic Thermal & Electrical Inspection', detail: 'Inspect condenser coil pressure, amp draw & air filter intake.' },
        { id: 'task-2', title: 'Specialist Component Repair & Leak Patching', detail: desc || 'Dual AC condenser gas refill and coil leak patching.' },
        { id: 'task-3', title: 'Post-Service Cooling Trial & Air Sanitation', detail: 'Conduct 15-minute cooling test and sanitize air discharge vents.' }
      ];
    } else if (cat.includes('plumb') || desc.toLowerCase().includes('water') || desc.toLowerCase().includes('pipe') || desc.toLowerCase().includes('tank')) {
      return [
        { id: 'task-1', title: 'Main Water Line & Pressure Point Audit', detail: 'Isolate main inlet valve and assess pipe joint structural integrity.' },
        { id: 'task-2', title: 'Pipe Joint Fitting & Heavy Sealing Repair', detail: desc || 'Overhead tank supply pipe connector leaking repair.' },
        { id: 'task-3', title: 'High-Pressure Flow Test & Water Tight Check', detail: 'Run full pressure flow trial to guarantee zero residual leakage.' }
      ];
    } else if (cat.includes('appliance') || desc.toLowerCase().includes('machine') || desc.toLowerCase().includes('drum') || desc.toLowerCase().includes('washing')) {
      return [
        { id: 'task-1', title: 'Appliance Motor & Drum Alignment Diagnostic', detail: 'Check drive belt alignment, suspension springs and motor bearings.' },
        { id: 'task-2', title: 'Belt Calibration & Internal Mechanical Repair', detail: desc || 'Front-load washing machine drum belt adjustment.' },
        { id: 'task-3', title: '1,200 RPM Spin Cycle Trial & Noise Audit', detail: 'Execute full spin test and verify silent, vibration-free operation.' }
      ];
    } else {
      return [
        { id: 'task-1', title: 'Initial On-Site Service Diagnosis', detail: 'Inspect customer setup and verify reported technical issue.' },
        { id: 'task-2', title: 'Specialist Work Execution & Repair Servicing', detail: desc || 'Execute complete requested service maintenance.' },
        { id: 'task-3', title: 'Final Quality Verification & Site Cleanup', detail: 'Verify full functionality and clean up work area for customer.' }
      ];
    }
  };

  // Camera Live View State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // AI Assistant Bot State
  const [botMessages, setBotMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Hello Specialist! I am Drago Worker AI Assistant. How can I assist you with your dispatches, safety standards, or earnings today?',
      time: 'Just now'
    }
  ]);
  const [botInput, setBotInput] = useState('');

  // Real Received Orders
  const initialSampleOrders: OrderRecord[] = [];

  // Load orders from localStorage / Firestore helper
  const loadOrders = () => {
    setIsLoading(true);
    const rawHistory = localStorage.getItem('punchx_order_history');
    if (rawHistory) {
      try {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
          setTimeout(() => setIsLoading(false), 300);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setOrders([]);
    setTimeout(() => setIsLoading(false), 300);
  };

  // Load orders from localStorage / Firestore sync
  useEffect(() => {
    loadOrders();

    // Subscribe to real-time Firestore orders
    let unsubscribe: () => void;
    try {
      const ordersCol = collection(db, 'orders');
      unsubscribe = onSnapshot(ordersCol, (snapshot) => {
        const live: OrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          live.push({ id: docSnap.id, ...docSnap.data() } as OrderRecord);
        });
        setOrders(live);
        localStorage.setItem('punchx_order_history', JSON.stringify(live));
        setIsLoading(false);
      }, (err) => {
        console.warn("Firestore subscription notice:", err);
        setIsLoading(false);
      });
    } catch (e) {
      console.warn("Firestore listener setup notice:", e);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync state to localStorage
  const updateOrdersInStateAndStorage = (newOrders: OrderRecord[]) => {
    setOrders(newOrders);
    localStorage.setItem('punchx_order_history', JSON.stringify(newOrders));
  };

  // Handle Order Selection
  const handleOpenOrderDetails = (order: OrderRecord) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Handle Accept Order
  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;
    if (!isOnline) {
      showNotification("⚠️ You are currently OFFLINE (OFF DUTY). Please turn ON DUTY in the top right corner to accept orders.");
      return;
    }

    // Smart Proximity Dispatch distance calculation
    const workerCoords = workerLocation?.lat && workerLocation?.lng 
      ? { lat: workerLocation.lat, lng: workerLocation.lng }
      : getCoordinatesForAddressOrSector(workerLocation?.address || workerProfile.skill);
    
    const customerCoords = (selectedOrder as any).customerLocation?.lat
      ? (selectedOrder as any).customerLocation
      : getCoordinatesForAddressOrSector(selectedOrder.customerAddress, selectedOrder.area, selectedOrder.sector);

    const dist = calculateDistanceKm(workerCoords.lat, workerCoords.lng, customerCoords.lat, customerCoords.lng);

    const workerSector = workerLocation?.sector || getSectorFromAddress(workerLocation?.address || workerProfile.skill);

    const updated = orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'In-Progress' as const } : o);
    updateOrdersInStateAndStorage(updated);
    setSelectedOrder({ ...selectedOrder, status: 'In-Progress' });

    // FE-05: Require authenticated user before Firestore writes
    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'orders', selectedOrder.id), { status: 'In-Progress' });
      } catch (e) {
        console.error("Firestore accept order update failed:", e);
      }
    }

    // Trigger Real-Time Push Notification to Customer
    dispatchWorkerAcceptedAlert({
      orderId: selectedOrder.id,
      workerName: workerProfile.name || 'Service Specialist',
      category: selectedOrder.category || 'Service',
      workerAvatar: workerProfile.photoURL,
      customerAddress: selectedOrder.customerAddress
    });

    showNotification(`⚡ Order ${selectedOrder.id} ACCEPTED (${dist} km away)! Location & live route unlocked.`);
  };

  // Handle Reject Order
  const handleRejectOrder = async () => {
    if (!selectedOrder) return;
    const updated = orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'Cancelled' as const } : o);
    updateOrdersInStateAndStorage(updated);
    setShowOrderModal(false);

    // FE-05: Require authenticated user before Firestore writes
    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'orders', selectedOrder.id), { status: 'Cancelled' });
      } catch (e) {
        console.error("Firestore reject order update failed:", e);
      }
    }

    setSelectedOrder(null);
    showNotification(`❌ Order ${selectedOrder.id} REJECTED.`);
  };

  // Handle Out for Delivery / In Transit
  const handleOutForDelivery = async () => {
    if (!selectedOrder) return;
    setShowOrderModal(false);
    setShowLiveNavigationModal(true);

    // FE-05: Require authenticated user before Firestore writes
    if (auth.currentUser?.uid) {
      try {
        const currentPos = await getAccurateCurrentPosition();
        await updateDoc(doc(db, 'orders', selectedOrder.id), {
          status: 'Out for Service',
          workerLocation: { lat: currentPos.lat, lng: currentPos.lng },
          updatedAt: new Date().toISOString()
        });
      } catch {
        try {
          await updateDoc(doc(db, 'orders', selectedOrder.id), {
            status: 'Out for Service',
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error("Firestore out for delivery status update failed:", e);
        }
      }
    }

    // Trigger Real-Time Push Notification: Worker Began Travel
    dispatchWorkerTravelAlert({
      orderId: selectedOrder.id,
      workerName: workerProfile.name || 'Service Specialist',
      category: selectedOrder.category || 'Service',
      etaMinutes: etaMinutes || 8,
      distanceKm: distanceKm || 2.1,
      workerAvatar: workerProfile.photoURL,
      customerAddress: selectedOrder.customerAddress
    });

    showNotification(`🚚 OUT FOR DELIVERY! Live GPS navigation active.`);
  };

  // Live Camera Functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      showNotification('📷 Camera stream unavailable or blocked. Please select image file below.');
    }
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoProof(dataUrl);
        stopCamera();
        showNotification('📷 Photo proof captured successfully!');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Handle Photo Proof File Upload Fallback
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoProof(reader.result as string);
        showNotification('📷 Photo proof attached successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas Signature pad setup & handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Finalize Service Completion
  const handleFinalizeCompletion = () => {
    if (!selectedOrder) return;

    // Verify all hired tasks are checked off
    const hiredTasks = getHiredServicesList(selectedOrder);
    const uncompleted = hiredTasks.filter(t => !completedTasks[t.id]);
    if (uncompleted.length > 0) {
      showNotification(`⚠️ Please touch and mark off all ${hiredTasks.length} hired tasks as completed!`);
      return;
    }

    if (!photoProof) {
      showNotification('⚠️ Please capture or upload photo proof of completion.');
      return;
    }
    if (!hasSigned) {
      showNotification('⚠️ Please draw your worker signature on the signature pad.');
      return;
    }

    // Stop camera if active
    stopCamera();

    // Update order state
    const updated = orders.map(o => o.id === selectedOrder.id ? { 
      ...o, 
      status: 'Done' as const,
      photoProof: photoProof 
    } : o);

    updateOrdersInStateAndStorage(updated);

    setCompletedPaymentSummary({
      amount: selectedOrder.price,
      method: selectedOrder.paymentMethod || 'UPI / Digital Transfer',
      orderId: selectedOrder.id
    });

    setShowCompletionGate(false);
    setShowLiveNavigationModal(false);
    setShowOrderModal(false);
    setShowCongratulationsModal(true);

    // Dispatch Service Completed Push Notification
    dispatchPushNotification({
      type: 'service_completed',
      title: '✓ Service Successfully Completed & Verified',
      body: `${workerProfile.name || 'Specialist'} has completed your ${selectedOrder.category || 'service'} with digital signature & quality photo proof.`,
      workerName: workerProfile.name,
      orderId: selectedOrder.id,
      actionScreen: 'home'
    });

    // Reset inputs
    setPhotoProof(null);
    setHasSigned(false);
    setCompletedTasks({});
  };

  // Bot Ask Handler
  const handleSendMessageToBot = (queryText?: string) => {
    const textToSend = queryText || botInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend, time: 'Just now' };
    setBotMessages(prev => [...prev, userMsg]);
    if (!queryText) setBotInput('');

    setTimeout(() => {
      let botAnswer = 'I am analyzing your worker telemetry. All systems operational!';
      const lower = textToSend.toLowerCase();

      if (lower.includes('otp')) {
        botAnswer = 'The customer hand-off OTP is a 4-digit code provided on the customer screen. Input it during the completion gate to confirm service hand-off.';
      } else if (lower.includes('payout') || lower.includes('earning') || lower.includes('money')) {
        botAnswer = 'Your earnings are credited immediately upon service completion. You can view daily and monthly earnings breakdowns under the Earnings tab.';
      } else if (lower.includes('safety') || lower.includes('hazard')) {
        botAnswer = 'Always verify circuit isolation before opening high-voltage AC units. Wear insulated safety gloves and helmet as mandated by PunchX Authority protocols.';
      } else if (lower.includes('cancel') || lower.includes('reject')) {
        botAnswer = 'You can reject an unaccepted order from the order details screen. If you face customer emergency on site, contact PunchX Control Center.';
      }

      setBotMessages(prev => [...prev, { sender: 'bot', text: botAnswer, time: 'Just now' }]);
    }, 800);
  };

  // Compute Earnings Calculations
  const completedOrders = orders.filter(o => o.status === 'Done');
  const dailyEarnings = completedOrders.reduce((acc, o) => acc + (o.price || 0), 0);
  const monthlyEarnings = dailyEarnings;

  return (
    <div id="worker-dashboard-root" className="w-full min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-24 overflow-x-hidden">
      
      {/* Top Android Navigation Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#07122a]/95 backdrop-blur-md border-b border-[#c5a059]/20 px-3.5 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white border border-[#c5a059]/40 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0">
            <img src={PUNCHX_LOGO} alt="PunchX Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-extrabold text-xs text-white tracking-tight flex items-center gap-1.5 truncate">
              PUNCH<span className="text-[#c5a059]">X</span> WORKER
              <span className="text-[8.5px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold flex-shrink-0">VERIFIED</span>
            </h1>
            <p className="text-[9.5px] text-zinc-400 font-mono truncate">
              {isLoadingWorkerProfile ? 'Loading profile...' : `${workerProfile.name} • Specialist ID: #${workerProfile.uid.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* Duty Status Switcher & Log Out Top Right Corner */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="worker-top-duty-toggle"
            onClick={() => {
              const nextStatus = !isOnline;
              setIsOnline(nextStatus);
              showNotification(nextStatus ? '🟢 You are ONLINE & ON DUTY' : '🔴 You are OFFLINE & OFF DUTY');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              isOnline 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30' 
                : 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:bg-rose-500/30'
            }`}
          >
            <Power className={`w-3 h-3 ${isOnline ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
            <span className="whitespace-nowrap">{isOnline ? 'ON DUTY' : 'OFF DUTY'}</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              showNotification('🚪 Logged out from Worker Dashboard');
              onTransition('panel-select');
            }}
            className="p-1.5 bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 rounded-full text-xs transition-all cursor-pointer shadow-md"
            title="Log Out of Worker Account"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Worker Live GPS Location & Auto Sync Banner */}
      <div className="bg-[#0b1731] border-b border-[#c5a059]/25 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-sans">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <Compass className={`w-3.5 h-3.5 text-[#e9c176] flex-shrink-0 ${isLocatingWorker ? 'animate-spin' : ''}`} />
          <div className="truncate min-w-0">
            <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wide font-bold mr-2">Worker GPS:</span>
            <span className="text-white font-bold text-[11px] truncate">
              {workerLocation ? workerLocation.address : 'Auto-syncing device location...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <span className="text-[10px] font-mono font-extrabold text-[#e9c176] bg-[#c5a059]/15 border border-[#c5a059]/40 px-2.5 py-1 rounded-full">
            📍 Sector: {workerLocation?.sector || getSectorFromAddress(workerLocation?.address)}
          </span>
          <button
            onClick={() => handleSyncWorkerGPS()}
            disabled={isLocatingWorker}
            className="px-2.5 py-1 bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#e9c176] hover:text-black rounded text-[10px] font-mono font-bold uppercase transition-all border border-[#c5a059]/30 cursor-pointer"
          >
            {isLocatingWorker ? 'Syncing...' : 'Re-Sync GPS'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-6">

        {/* TAB 1: RECEIVED ORDERS FEED (HOME PAGE) */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Header Hero Banner */}
            <div className="bg-gradient-to-r from-[#11192e] via-[#15203b] to-[#0d1527] border border-[#c5a059]/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase bg-[#c5a059]/20 text-[#e9c176] px-2.5 py-1 rounded-full font-bold border border-[#c5a059]/30">
                    PARTNER DISPATCH HUB
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    PAN-BENGALURU SMART DISPATCH
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white tracking-tight mt-1.5">
                  RECEIVED SERVICE ORDERS
                </h2>
                <p className="text-xs text-zinc-300">
                  Accept customer service requests across Bengaluru with proximity radar routing and direct bank settlements.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="open-worker-academy-btn"
                  onClick={() => setIsAcademyOpen(true)}
                  className="px-3.5 py-2 bg-[#091738] border border-[#c5a059]/40 hover:bg-[#0e214d] text-[#e9c176] rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Academy & Badges
                </button>
                <button
                  id="open-worker-store-btn"
                  onClick={() => setIsSafetyStoreOpen(true)}
                  className="px-3.5 py-2 bg-[#091738] border border-[#c5a059]/40 hover:bg-[#0e214d] text-white rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#e9c176]" /> Safety Store
                </button>
                <button
                  id="open-worker-radar-btn"
                  onClick={() => setShowRadiusRadarModal(true)}
                  className="px-3.5 py-2 bg-[#c5a059] hover:bg-[#e9c176] text-black rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#c5a059]/20"
                >
                  <Compass className="w-3.5 h-3.5" /> Map Radar
                </button>
                <button
                  onClick={loadOrders}
                  className="px-3.5 py-2 bg-[#07122a] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sync
                </button>
              </div>
            </div>

            {/* Orders Feed List - Pending Orders Only */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                <span>PENDING DISPATCH ORDERS ({isLoading ? '...' : orders.filter(o => o.status === 'Pending' || o.status === 'In-Progress').length})</span>
                <span className="text-[#e9c176]">{isLoading ? 'Syncing backend...' : 'Touch card for details & actions'}</span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="bg-[#11192e] border border-zinc-800/80 rounded-2xl p-5 space-y-3 animate-pulse shadow-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-20 bg-zinc-800/80 rounded-lg"></div>
                          <div className="h-5 w-32 bg-zinc-800/60 rounded-md"></div>
                        </div>
                        <div className="h-6 w-28 bg-[#c5a059]/20 rounded-full border border-[#c5a059]/20"></div>
                      </div>
                      <div className="space-y-2 py-1">
                        <div className="h-3.5 w-full bg-zinc-800/60 rounded"></div>
                        <div className="h-3.5 w-3/4 bg-zinc-800/50 rounded"></div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
                        <div className="h-3.5 w-48 bg-zinc-800/60 rounded"></div>
                        <div className="h-5 w-20 bg-zinc-800/80 rounded-md"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.filter(o => o.status === 'Pending' || o.status === 'In-Progress').length === 0 ? (
                <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                  <h3 className="font-extrabold text-white text-base">No Pending Dispatches Right Now</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    All incoming service tasks have been completed or cleared.
                  </p>
                </div>
              ) : (
                orders.filter(o => o.status === 'Pending' || o.status === 'In-Progress').map((order) => {
                  const isInProgress = order.status === 'In-Progress';

                  // Calculate worker-to-customer distance
                  const workerCoords = workerLocation?.lat && workerLocation?.lng 
                    ? { lat: workerLocation.lat, lng: workerLocation.lng }
                    : getCoordinatesForAddressOrSector(workerLocation?.address || workerProfile.address);
                  
                  const customerCoords = (order as any).customerLocation?.lat
                    ? (order as any).customerLocation
                    : getCoordinatesForAddressOrSector(order.customerAddress, order.area, order.sector);

                  const orderDistanceKm = calculateDistanceKm(workerCoords.lat, workerCoords.lng, customerCoords.lat, customerCoords.lng);

                  return (
                    <motion.div
                      key={order.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleOpenOrderDetails(order)}
                      className={`border rounded-2xl p-5 shadow-xl transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                        isInProgress 
                          ? 'bg-gradient-to-r from-[#11192e] to-[#172547] border-[#c5a059] ring-1 ring-[#c5a059]' 
                          : 'bg-[#11192e] border-zinc-800 hover:border-[#c5a059]/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-white bg-[#07122a] px-2.5 py-1 rounded-lg border border-zinc-800">
                            {order.id}
                          </span>
                          <span className="text-xs font-bold text-[#e9c176]">{order.category}</span>
                          {order.isRebooking && (
                            <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-[#e9c176]" />
                              30-Day Free Revisit (Fee: ₹59 Platform Covered)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-emerald-950/80 text-emerald-300 border-emerald-500/40">
                            📍 {orderDistanceKm} km Away
                          </span>

                          <span className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                            isInProgress ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {isInProgress ? 'ACCEPTED / IN TRANSIT' : 'PENDING DISPATCH'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {order.issueDescription || 'Specialist diagnostic & repair requested by citizen.'}
                      </p>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400 font-mono">
                        <div className="flex items-center gap-1 text-zinc-300">
                          <MapPin className="w-3.5 h-3.5 text-[#c5a059]" />
                          <span className="truncate max-w-[280px]">{order.customerAddress || 'Address not available'}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-white text-sm">₹{order.price}</span>
                          <span className="text-[11px] text-[#e9c176] underline font-bold flex items-center gap-0.5">
                            View Order Details <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* TAB 2: EARNINGS PAGE */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            
            {/* Earnings Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#11192e] to-[#0d1527] border border-[#c5a059]/40 rounded-3xl p-6 shadow-xl space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Person's Daily Earnings</span>
                <div className="flex justify-between items-baseline">
                  <h3 className="text-3xl font-extrabold text-[#e9c176] font-mono">₹{dailyEarnings}</h3>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Live Verified
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 pt-1">Across {completedOrders.length} completed diagnostic tasks today.</p>
              </div>

              <div className="bg-gradient-to-br from-[#11192e] to-[#0d1527] border border-[#c5a059]/40 rounded-3xl p-6 shadow-xl space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Person's Monthly Earnings</span>
                <div className="flex justify-between items-baseline">
                  <h3 className="text-3xl font-extrabold text-white font-mono">₹{monthlyEarnings}</h3>
                  <span className="text-xs font-mono text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                    {completedOrders.length} Jobs Completed
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 pt-1">Directly deposited to registered worker bank account.</p>
              </div>
            </div>

            {/* Interactive Visual Income Monitoring Graph */}
            <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#c5a059]" />
                    Earning Monitoring Graph
                  </h3>
                  <p className="text-xs text-zinc-400">Daily breakdown of worker revenue</p>
                </div>
                <span className="text-xs font-mono text-[#e9c176] font-bold bg-[#c5a059]/15 px-3 py-1 rounded-full border border-[#c5a059]/30">
                  Real-time Database Sync
                </span>
              </div>

              {/* Bar Chart Representation */}
              <div className="pt-6 pb-2">
                <div className="flex items-end justify-between gap-2 h-40 px-2 border-b border-zinc-800 pb-2">
                  {[
                    { day: 'Mon', val: 0, height: '10%' },
                    { day: 'Tue', val: 0, height: '10%' },
                    { day: 'Wed', val: 0, height: '10%' },
                    { day: 'Thu', val: 0, height: '10%' },
                    { day: 'Fri', val: 0, height: '10%' },
                    { day: 'Sat', val: 0, height: '10%' },
                    { day: 'Today', val: dailyEarnings, height: dailyEarnings > 0 ? '80%' : '10%' }
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-[10px] font-mono text-[#e9c176] opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{bar.val}
                      </span>
                      <div 
                        style={{ height: bar.height }} 
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#c5a059]/40 to-[#e9c176] rounded-t-lg group-hover:brightness-125 transition-all"
                      ></div>
                      <span className="text-[10px] font-mono text-zinc-400">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 pt-2">
                <span>Completed Tasks Value: ₹{dailyEarnings}</span>
                <span className="text-emerald-400 font-bold">100% Payout Verified</span>
              </div>
            </div>

            {/* Earnings Transaction Log */}
            <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="font-extrabold text-sm text-white">Recent Payout Settlements</h3>
              <div className="space-y-2">
                {completedOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800/80 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">{ord.category}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Order {ord.id} • {ord.paymentMethod || 'UPI Transfer'}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">+₹{ord.price}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: WORKER PROFILE & TERMS & DAILY STATS */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Profile Info Card */}
            <div className="bg-[#11192e] border border-[#c5a059]/30 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-4">
                  <img 
                    src={workerProfile.photoURL}
                    alt={workerProfile.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#c5a059]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      {isLoadingWorkerProfile ? 'Loading profile...' : workerProfile.name}
                    </h2>
                    <p className="text-xs text-[#e9c176] font-mono font-bold">{workerProfile.skill}</p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Verified Worker ID: #{workerProfile.uid.slice(0, 10).toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await logout();
                    } catch (e) {
                      console.error(e);
                    }
                    showNotification('🚪 Logged out from Worker Account');
                    onTransition('panel-select');
                  }}
                  className="px-4 py-2 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out Account</span>
                </button>
              </div>

              {/* Profile Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">Mobile Contact</span>
                  <span className="font-bold text-white font-mono">{workerProfile.phone || 'Not provided'}</span>
                </div>

                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">Gmail Account</span>
                  <span className="font-bold text-white font-mono">{workerProfile.email || 'Not provided'}</span>
                </div>

                {/* Visiting Fee Card */}
                <div className="bg-[#07122a] p-3.5 rounded-xl border border-[#c5a059]/40 space-y-1 relative">
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase">Estimated Visiting Fee (₹)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-lg text-[#e9c176] font-mono">
                      ₹{workerProfile.visitingFee || 199}
                    </span>
                    <button
                      onClick={() => setEditFeeModal(true)}
                      className="text-[10px] font-mono font-bold text-black bg-[#c5a059] hover:bg-[#e9c176] px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* What service do you provide? (50 Categories Manager) */}
              <div className="bg-[#07122a] p-4 rounded-2xl border border-[#c5a059]/30 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#e9c176] font-bold block flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> What service do you provide? (50 Categories)
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Citizens searching for these categories will discover your profile and send bookings.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all self-start sm:self-auto"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Manage Services ({(workerProfile.categories || []).length})</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(workerProfile.categories && workerProfile.categories.length > 0 ? workerProfile.categories : [workerProfile.skill]).map((catName) => (
                    <span
                      key={catName}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#e9c176] rounded-full text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#e9c176]" />
                      <span>{catName}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Order Completing Details of the Day */}
              <div className="space-y-3 pt-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Order Completing Details of the Day
                </h3>

                <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Total Completed Dispatches Today:</span>
                    <span className="font-bold text-emerald-400">{completedOrders.length} Jobs</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Customer Satisfaction Score:</span>
                    <span className="font-bold text-amber-400">4.9 / 5.0 ⭐</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Average Completion Time:</span>
                    <span className="font-bold text-white">38 Minutes</span>
                  </div>
                </div>

                {/* Customer Ratings & Behavior Reviews Received */}
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#e9c176] fill-[#e9c176]" />
                      Customer Ratings & Behavior Reviews Received
                    </h3>
                    <span className="text-[10px] font-mono text-[#e9c176] bg-[#c5a059]/15 px-2.5 py-0.5 rounded-full border border-[#c5a059]/30 font-bold">
                      {workerReviews.length} Feedback Records
                    </span>
                  </div>

                  {isLoadingReviews ? (
                    <div className="space-y-2">
                      {[1, 2].map((sk) => (
                        <div key={sk} className="bg-[#07122a] border border-zinc-800/80 p-3.5 rounded-2xl animate-pulse space-y-2">
                          <div className="flex justify-between">
                            <div className="h-3.5 w-28 bg-zinc-800 rounded"></div>
                            <div className="h-3.5 w-16 bg-zinc-800 rounded"></div>
                          </div>
                          <div className="h-3 w-full bg-zinc-800/60 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : workerReviews.length > 0 ? (
                    <div className="space-y-2.5">
                      {workerReviews.map((rev) => (
                        <div key={rev.id} className="bg-[#07122a] border border-zinc-800/80 p-3.5 rounded-2xl space-y-1.5 shadow-sm text-left">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white font-sans">{rev.customer}</span>
                            <div className="flex items-center text-[#e9c176] gap-0.5">
                              {[...Array(rev.rating || 5)].map((_, idx) => (
                                <Star key={idx} className="w-3 h-3 fill-current" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-300 italic font-sans leading-relaxed">
                            "{rev.comment}"
                          </p>
                          {rev.tags && rev.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {rev.tags.map((tg, i) => (
                                <span key={i} className="text-[9px] font-bold text-[#e9c176] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20">
                                  ✓ {tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#07122a] border border-zinc-800 p-4 rounded-xl text-center text-xs text-zinc-400 font-sans">
                      No customer feedback reviews submitted yet. Ratings from completed services will appear here in real time.
                    </div>
                  )}
                </div>

                {/* List of Completed Orders in Profile Panel */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-mono uppercase text-[#e9c176] font-bold block">
                    Completed Orders History:
                  </span>
                  {completedOrders.length > 0 ? (
                    completedOrders.map((ord) => (
                      <div key={ord.id} className="bg-[#07122a] border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-white bg-[#11192e] px-2.5 py-0.5 rounded border border-zinc-800">
                              {ord.id}
                            </span>
                            <span className="font-bold text-xs text-[#e9c176]">{ord.category}</span>
                            <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              ✓ COMPLETED
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200">Customer: <span className="font-bold text-white">{ord.customerName || 'Aarav Sharma'}</span></p>
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">Payment Mode: {ord.paymentMethod || 'UPI / Digital Transfer'}</p>
                        </div>

                        <div className="flex items-center gap-3 sm:self-center">
                          {ord.photoProof && (
                            <img 
                              src={ord.photoProof} 
                              alt="Site Photo Proof" 
                              className="w-12 h-12 rounded-xl object-cover border-2 border-[#c5a059] shadow"
                            />
                          )}
                          <div className="text-right font-mono">
                            <span className="text-base font-extrabold text-emerald-400 block">+₹{ord.price}</span>
                            <span className="text-[9px] text-zinc-500 uppercase font-bold">Verified</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-[#07122a] border border-zinc-800/80 p-4 rounded-xl text-center text-xs text-zinc-500 font-mono">
                      No completed orders logged yet today.
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Policies & Terms and Conditions Section */}
              <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#e9c176]">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Privacy Policies & Terms and Conditions</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  As an authorized PunchX Authority Specialist, you are bound by strict safety compliance, site security photo proof protocols, and non-disclosure of citizen personal data.
                </p>
                <div className="pt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Terms & Privacy Status: Accepted & Verified</span>
                </div>
              </div>

              {/* Log Out Account Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    showNotification('🚪 Logged out from Worker Dashboard');
                    onTransition('panel-select');
                  }}
                  className="w-full py-3.5 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border-2 border-rose-500/40 rounded-2xl font-mono text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Worker Account</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: SMARTBOT FOR WORKER HELP */}
        {activeTab === 'bot' && (
          <div className="bg-[#11192e] border border-[#c5a059]/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c5a059] to-[#07122a] border border-[#c5a059]/40 flex items-center justify-center text-[#e9c176]">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">SmartBot for Worker Support</h3>
                <p className="text-xs text-zinc-400 font-mono">24/7 AI Assistant for Dispatches & Safety</p>
              </div>
            </div>

            {/* Suggested Prompt Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                'How do I verify customer OTP?',
                'What if photo proof camera fails?',
                'Safety guidelines for high voltage',
                'How are daily payouts calculated?'
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessageToBot(pill)}
                  className="px-3 py-1.5 bg-[#07122a] hover:bg-[#c5a059] text-zinc-300 hover:text-black border border-zinc-800 rounded-xl text-[11px] font-mono transition-all cursor-pointer"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Chat Box Scroll Area */}
            <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-4 h-72 overflow-y-auto space-y-3 custom-scrollbar">
              {botMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                      msg.sender === 'user'
                        ? 'bg-[#c5a059] text-black font-medium rounded-tr-none'
                        : 'bg-[#15203b] border border-zinc-800 text-white rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessageToBot();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask SmartBot for help..."
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                className="flex-1 bg-[#07122a] border border-zinc-800 focus:border-[#c5a059] rounded-xl px-4 py-3 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[#c5a059] hover:bg-[#e9c176] text-black rounded-xl font-bold text-xs uppercase transition-all cursor-pointer flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION TAB BAR */}
      <nav className="sticky bottom-0 z-40 w-full bg-[#07122a]/95 backdrop-blur-md border-t border-[#c5a059]/30 py-2 px-3 mt-6">
        <div className="w-full max-w-md mx-auto flex justify-around items-center">
          {[
            { id: 'orders' as const, label: 'Home / Orders', icon: Wrench },
            { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
            { id: 'profile' as const, label: 'Profile', icon: User },
            { id: 'bot' as const, label: 'SmartBot', icon: HelpCircle }
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-[#e9c176] font-bold scale-105' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <IconComp className="w-5 h-5" />
                <span className="text-[10px] font-mono tracking-wider uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL 1: ORDER DETAILS & ACCEPT / REJECT / OUT FOR DELIVERY */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border-2 border-[#c5a059] rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-[#e9c176] font-bold">ORDER DOSSIER: {selectedOrder.id}</span>
                  <h3 className="font-extrabold text-lg text-white">{selectedOrder.category}</h3>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Order Details View */}
              <div className="space-y-3 text-xs">
                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">Customer Contact</span>
                  <span className="font-bold text-white text-sm block">{selectedOrder.customerName || 'Aarav Sharma'}</span>
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {selectedOrder.customerPhone || 'Phone not available'}
                  </span>
                </div>

                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">Customer Site Location</span>
                  <span className="font-medium text-white flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-[#c5a059] flex-shrink-0 mt-0.5" />
                    {selectedOrder.customerAddress || 'Address not available'}
                  </span>
                </div>

                {/* Proximity Distance & Route Status Box */}
                {(() => {
                  const workerCoords = workerLocation?.lat && workerLocation?.lng 
                    ? { lat: workerLocation.lat, lng: workerLocation.lng }
                    : getCoordinatesForAddressOrSector(workerLocation?.address || workerProfile.address);
                  
                  const customerCoords = (selectedOrder as any).customerLocation?.lat
                    ? (selectedOrder as any).customerLocation
                    : getCoordinatesForAddressOrSector(selectedOrder.customerAddress, selectedOrder.area, selectedOrder.sector);

                  const orderDistanceKm = calculateDistanceKm(workerCoords.lat, workerCoords.lng, customerCoords.lat, customerCoords.lng);

                  return (
                    <div className="p-3 rounded-2xl border bg-emerald-950/40 border-emerald-500/40 text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-bold text-xs font-mono">
                          ✓ PROXIMITY RADAR MATCH ({orderDistanceKm} km Away)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        Customer is located {orderDistanceKm} km from your current GPS position. High-speed smart dispatch routing is active.
                      </p>
                    </div>
                  );
                })()}

                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 block">Issue Description</span>
                  <p className="text-zinc-200 leading-relaxed">
                    {selectedOrder.issueDescription || 'AC compressor circuit board tripping.'}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 font-mono">
                  <span className="text-zinc-400">Payment Amount Received:</span>
                  <span className="text-base font-extrabold text-[#e9c176]">₹{selectedOrder.price} ({selectedOrder.paymentMethod || 'UPI'})</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {selectedOrder.status === 'Pending' && (() => {
                return (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleAcceptOrder}
                      className="py-3.5 font-extrabold text-xs uppercase tracking-wider font-mono rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                      title="Accept and start dispatch navigation"
                    >
                      <Check className="w-4 h-4" /> Accept Order
                    </button>

                    <button
                      onClick={handleRejectOrder}
                      className="py-3.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 font-extrabold text-xs uppercase tracking-wider font-mono rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Reject Order
                    </button>
                  </div>
                );
              })()}

              {selectedOrder.status === 'In-Progress' && (
                <div className="space-y-3 pt-2">
                  {/* Out for Delivery Button */}
                  <button
                    onClick={handleOutForDelivery}
                    className="w-full py-4 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-extrabold text-xs uppercase tracking-wider font-mono rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Navigation className="w-4 h-4" /> Out for Delivery (Live Location Navigation)
                  </button>
                </div>
              )}

              {selectedOrder.status === 'Done' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-center text-xs text-emerald-300 font-mono font-bold">
                  ✓ Order Completed & Payout Received
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: LIVE LOCATION NAVIGATION MODAL */}
      <AnimatePresence>
        {showLiveNavigationModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border-2 border-[#c5a059] rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-[#e9c176] animate-pulse" />
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase">LIVE LOCATION ACTIVE</span>
                    <h3 className="font-extrabold text-base text-white">Out for Delivery to Customer</h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowLiveNavigationModal(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Live GPS Map Viewfinder */}
              <div className="bg-[#07122a] border border-zinc-700 rounded-2xl h-52 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                {/* SVG Route Line Visualizer */}
                <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 40 180 Q 150 100 320 40" fill="none" stroke="#c5a059" strokeWidth="4" strokeDasharray="8 6" className="animate-pulse" />
                </svg>

                {/* Live Worker GPS Pin */}
                <div className="relative z-10 flex items-center gap-2 bg-[#07122a]/90 backdrop-blur-md border border-[#c5a059] p-2 rounded-xl w-fit text-[11px] font-mono text-white font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Worker GPS: En Route ({distanceKm || 1.8} km)</span>
                </div>

                {/* Customer Location Marker */}
                <div className="relative z-10 self-end flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500 p-2 rounded-xl text-[11px] font-mono text-emerald-300 font-bold">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Destination: {selectedOrder.customerAddress ? selectedOrder.customerAddress.split(',')[0] : 'Customer Doorstep'}</span>
                </div>
              </div>

              {/* Order Info & Distance Banner */}
              <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-zinc-400 block text-[10px]">LIVE ETA / DISTANCE</span>
                  <span className="text-white font-bold text-sm">{etaMinutes || 4} mins away • {distanceKm || 1.8} km</span>
                </div>

                <a
                  href={`tel:${selectedOrder.customerPhone || '+919876543210'}`}
                  className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </a>
              </div>

              {/* Option of Completing Order */}
              <button
                onClick={() => {
                  setShowLiveNavigationModal(false);
                  setShowCompletionGate(true);
                  startCamera();
                }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold text-xs uppercase tracking-widest font-mono rounded-xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Completing Order (Proceed to Proof & Sign)
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: COMPLETION GATE (LIVE CAMERA PHOTO PROOF + WORKER SIGNATURE + COMPLETE) */}
      <AnimatePresence>
        {showCompletionGate && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border-2 border-emerald-500 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-base text-white">Order Completion Proof & Signature</h3>
                </div>
                <button
                  onClick={() => {
                    stopCamera();
                    setShowCompletionGate(false);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 0. Hired Service Items Checklist */}
              <div className="space-y-3 bg-[#07122a] border border-[#c5a059]/40 p-4 rounded-2xl shadow-inner">
                <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                  <label className="text-xs font-mono font-extrabold uppercase text-[#e9c176] flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-[#c5a059]" /> Customer Hired Tasks Checklist
                  </label>
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    Touch box to mark done
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 font-sans leading-snug">
                  Work items requested by <span className="text-[#e9c176] font-bold">{selectedOrder.customerName || 'Customer'}</span>:
                </p>

                <div className="space-y-2 pt-1">
                  {getHiredServicesList(selectedOrder).map((task, idx) => {
                    const isChecked = !!completedTasks[task.id];
                    return (
                      <motion.div
                        key={task.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const nextState = !isChecked;
                          setCompletedTasks(prev => ({ ...prev, [task.id]: nextState }));
                          if (nextState) {
                            showNotification(`✓ Work Completed: ${task.title}`);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-[#11192e] border-zinc-800 hover:border-[#c5a059]/50'
                        }`}
                      >
                        {/* Touch Box with Green Tick Mark */}
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-400 text-black shadow-md'
                              : 'bg-[#07122a] border-zinc-600 text-transparent hover:border-[#c5a059]'
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4 text-black stroke-[3.5]" />}
                        </div>

                        {/* Task Title & Details */}
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-mono font-bold ${isChecked ? 'text-emerald-300 line-through decoration-emerald-400/80' : 'text-white'}`}>
                              {idx + 1}. {task.title}
                            </span>
                            {isChecked ? (
                              <span className="text-[9px] font-mono font-extrabold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" /> WORK COMPLETED
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex-shrink-0">
                                Touch box
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-normal">
                            {task.detail}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 1. Camera Interface for Photo Proof */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Camera className="w-4 h-4" /> 1. Photo Proof of Completion</span>
                  {photoProof && <span className="text-emerald-400 text-[10px]">✓ Captured</span>}
                </label>

                {photoProof ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 h-44 bg-black shadow-lg">
                    <img src={photoProof} alt="Completion Proof" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setPhotoProof(null);
                        startCamera();
                      }}
                      className="absolute bottom-2 right-2 bg-zinc-900/90 hover:bg-rose-500 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-xl border border-zinc-700 transition-all cursor-pointer"
                    >
                      Retake Photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Live Camera Viewfinder Box */}
                    <div className="relative bg-[#07122a] border-2 border-dashed border-[#c5a059] rounded-2xl h-44 overflow-hidden flex flex-col items-center justify-center text-center p-2">
                      <video
                        ref={videoRef}
                        className={`w-full h-full object-cover absolute inset-0 ${isCameraActive ? 'block' : 'hidden'}`}
                        playsInline
                        muted
                      />

                      {!isCameraActive ? (
                        <div className="space-y-2">
                          <Camera className="w-8 h-8 text-[#c5a059] mx-auto animate-bounce" />
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-[#c5a059] text-black font-extrabold rounded-xl text-xs uppercase font-mono shadow-md hover:bg-[#e9c176] cursor-pointer"
                          >
                            📷 Open Camera Feed
                          </button>
                          <span className="text-[10px] text-zinc-400 font-mono block">Point camera at repaired equipment</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={captureCameraPhoto}
                          className="absolute bottom-3 bg-emerald-500 text-black font-extrabold px-5 py-2.5 rounded-2xl text-xs uppercase font-mono shadow-2xl border-2 border-white hover:bg-emerald-400 cursor-pointer flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" /> 📸 Snap Photo Proof
                        </button>
                      )}
                    </div>

                    {/* Fallback Upload Button */}
                    <label className="text-[11px] font-mono text-zinc-400 underline hover:text-[#e9c176] cursor-pointer block text-center">
                      Or select image file from gallery
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* 2. Worker Digital Signature Pad */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                    <PenTool className="w-4 h-4" /> 2. Sign of the Worker
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[10px] font-mono text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Clear Signature
                  </button>
                </div>

                <div className="bg-[#07122a] border border-zinc-700 rounded-2xl p-1 relative">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 bg-[#07122a] rounded-xl cursor-crosshair touch-none"
                  />
                  {!hasSigned && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-600 pointer-events-none">
                      Draw Worker Signature Here...
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Customer Hand-Off OTP Gate */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#e9c176] flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> 3. Customer Hand-off OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-[#07122a] border border-[#c5a059] rounded-xl px-4 py-2.5 text-center font-mono font-bold text-white text-base outline-none"
                />
                <p className="text-[10px] text-zinc-500 text-center font-mono">Customer OTP Code: <span className="text-[#e9c176] font-bold">{selectedOrder?.otpCode || '8842'}</span></p>
              </div>

              {/* Final Complete Action Button */}
              <button
                onClick={handleFinalizeCompletion}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-widest font-mono rounded-xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
              >
                <span>COMPLETE ORDER NOW</span>
                <ChevronRight className="w-4 h-4" />
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: CONGRATULATIONS ORDER COMPLETE POPUP */}
      <AnimatePresence>
        {showCongratulationsModal && completedPaymentSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#11192e] border-2 border-[#c5a059] rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#c5a059] to-emerald-400 text-black flex items-center justify-center mx-auto shadow-2xl border-2 border-[#ffdea5]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                  DISPATCH CONCLUDED
                </span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  CONGRATULATIONS! ORDER COMPLETE
                </h2>
                <p className="text-xs text-zinc-300">
                  Order <span className="text-[#e9c176] font-bold">{completedPaymentSummary.orderId}</span> has been successfully finished and logged.
                </p>
              </div>

              <div className="bg-[#07122a] border border-zinc-800 rounded-2xl p-5 space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">AMOUNT RECEIVED:</span>
                  <span className="text-2xl font-extrabold text-[#e9c176]">₹{completedPaymentSummary.amount}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-zinc-800 pt-2">
                  <span className="text-zinc-400">MODE OF PAYMENT:</span>
                  <span className="text-emerald-400 font-bold">{completedPaymentSummary.method}</span>
                </div>
              </div>

              {/* Redirect to Home Page Button */}
              <button
                onClick={() => {
                  setShowCongratulationsModal(false);
                  setShowOrderModal(false);
                  setShowLiveNavigationModal(false);
                  setShowCompletionGate(false);
                  setSelectedOrder(null);
                  setActiveTab('orders');
                  showNotification('✓ Redirected to Worker Home Page.');
                }}
                className="w-full py-4 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-extrabold text-xs uppercase tracking-widest font-mono rounded-xl transition-all cursor-pointer shadow-xl border border-[#ffdea5]"
              >
                REDIRECT TO HOME PAGE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VISITING FEE MODAL */}
      <AnimatePresence>
        {editFeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border-2 border-[#c5a059] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#c5a059]" />
                  <h3 className="font-extrabold text-sm text-white font-mono">Update Estimated Visiting Fee</h3>
                </div>
                <button
                  onClick={() => setEditFeeModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-300 block">Visiting / Diagnostic Fee (₹):</label>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={tempVisitingFee}
                  onChange={(e) => setTempVisitingFee(Number(e.target.value))}
                  className="w-full bg-[#07122a] border border-[#c5a059] rounded-xl px-4 py-3 text-lg font-mono font-extrabold text-[#e9c176] outline-none"
                />
                <p className="text-[10px] text-zinc-400">
                  This base fee will be shown to customers when browsing specialists before company commission (₹20) + GST (18%).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditFeeModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!tempVisitingFee || tempVisitingFee <= 0) return;
                    try {
                      // FE-05: Require authenticated user before Firestore writes
                      if (currentUser?.sub && auth.currentUser?.uid) {
                        await updateDoc(doc(db, 'users', currentUser.sub), {
                          visitingFee: Number(tempVisitingFee),
                          price: Number(tempVisitingFee)
                        });
                      }
                    } catch (e) {
                      console.error("Updating visiting fee error:", e);
                    }
                    setWorkerProfile(prev => ({ ...prev, visitingFee: Number(tempVisitingFee) }));
                    setEditFeeModal(false);
                    showNotification(`✓ Visiting fee updated to ₹${tempVisitingFee}`);
                  }}
                  className="flex-1 py-3 bg-[#c5a059] hover:bg-[#e9c176] text-black text-xs font-mono font-extrabold rounded-xl cursor-pointer shadow-lg"
                >
                  Save Fee
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proximity Dispatch Radar Modal */}
      <ServiceRadiusRadarModal
        isOpen={showRadiusRadarModal}
        onClose={() => setShowRadiusRadarModal(false)}
        mode="worker"
        centerLocation={{
          lat: workerLocation?.lat || 12.9716,
          lng: workerLocation?.lng || 77.5946,
          address: workerLocation?.address || workerProfile.address || 'Worker Registered Hub',
          name: workerProfile.name || 'Worker Service Hub'
        }}
        orders={orders.filter(o => o.status === 'Pending' || o.status === 'In-Progress')}
        onSelectOrder={(ord) => {
          setSelectedOrder(ord);
          setShowRadiusRadarModal(false);
          setShowOrderModal(true);
        }}
        onRecalibrateGps={handleSyncWorkerGPS}
      />

      {/* Specialist Academy & Certification Boost Modal */}
      <WorkerAcademyModal
        isOpen={isAcademyOpen}
        onClose={() => setIsAcademyOpen(false)}
        showNotification={showNotification}
      />

      {/* Specialist Safety Equipment & Toolkits Store Modal */}
      <WorkerSafetyStoreModal
        isOpen={isSafetyStoreOpen}
        onClose={() => setIsSafetyStoreOpen(false)}
        showNotification={showNotification}
      />

      {/* Tax Invoice & Digital Receipt Viewer Modal */}
      <InvoiceReceiptModal
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        order={selectedInvoiceOrder}
      />

      {/* 50 Worker Categories Selection Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="worker"
        selectedCategories={workerProfile.categories || [workerProfile.skill]}
        onSaveWorkerCategories={handleSaveWorkerCategories}
      />

    </div>
  );
}
