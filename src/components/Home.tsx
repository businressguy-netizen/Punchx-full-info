import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/authContext';
import { Search, MapPin, ChevronRight, Star, Verified, Home, Shield, Wrench, Navigation, Plus, Laptop, CreditCard, User, Mail, Phone, Calendar, X, CheckCircle, AlertTriangle, ShieldCheck, Edit3, ChevronDown, FileText, BookOpen, Compass, Bell, Zap, Grid, Clock } from 'lucide-react';
import { AppScreen, Worker, ServiceCategory, OrderRecord, CustomerReview } from '../types';
import CategoryIcon, { CategoryProfileBadge } from './CategoryIcon';
import PUNCHX_LOGO from '../assets/logo';
import PostServiceReviewModal from './PostServiceReviewModal';
import ServicePriceEstimator from './ServicePriceEstimator';
import CustomerTestimonials from './CustomerTestimonials';
import WebsiteFAQ from './WebsiteFAQ';
import EnterpriseInquiryModal from './EnterpriseInquiryModal';
import InvoiceReceiptModal from './InvoiceReceiptModal';
import WarrantyClaimModal from './WarrantyClaimModal';
import ServiceCategoryModal from './ServiceCategoryModal';
import { PUNCHX_50_CATEGORIES, filterCategories } from '../data/categories';
import { requestAndAutoUpdateLocation } from '../lib/location';
import { getStoredPushNotifications } from '../lib/pushNotifications';

interface HomeProps {
  onTransition: (target: AppScreen) => void;
  onSelectWorker: (worker: Worker) => void;
  onSelectCategory: (category: string) => void;
  hasActiveBooking: boolean;
  promoApplied: boolean;
  hasClaimedBonus?: boolean;
  hasUsedBonus?: boolean;
  onClaimPromo: () => void;
  citizenName: string;
  setCitizenName: (val: string) => void;
  citizenAddress: string;
  setCitizenAddress: (val: string) => void;
  authMethod: 'phone' | 'gmail';
  authTarget: string;
  showNotification: (msg: string) => void;
  onOpenNotificationCenter?: () => void;
  isProfileDrawerOpen?: boolean;
  setIsProfileDrawerOpen?: (val: boolean) => void;
}

const CATEGORIES: ServiceCategory[] = [
  { id: 'electrical', name: 'Electrical', icon: 'electrical_services' },
  { id: 'plumbing', name: 'Plumbing', icon: 'plumbing' },
  { id: 'cleaning', name: 'Cleaning', icon: 'cleaning_services' },
  { id: 'ac', name: 'AC Repair', icon: 'ac_unit' },
  { id: 'painting', name: 'Painting', icon: 'format_paint' },
  { id: 'carpentry', name: 'Carpentry', icon: 'carpenter' },
  { id: 'pest', name: 'Pest Control', icon: 'pest_control' },
  { id: 'moving', name: 'Moving', icon: 'local_shipping' },
];

const EXPERTS: Worker[] = [];

export default function HomeDashboard({
  onTransition,
  onSelectWorker,
  onSelectCategory,
  hasActiveBooking,
  promoApplied,
  hasClaimedBonus,
  hasUsedBonus,
  onClaimPromo,
  citizenName,
  setCitizenName,
  citizenAddress,
  setCitizenAddress,
  authMethod,
  authTarget,
  showNotification,
  onOpenNotificationCenter,
  isProfileDrawerOpen,
  setIsProfileDrawerOpen,
}: HomeProps) {
  const { currentUser, userProfile, updateUserProfile, logout } = useAuth() as any;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'bookings' | 'profile'>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (typeof isProfileDrawerOpen === 'boolean') {
      setIsProfileOpen(isProfileDrawerOpen);
    }
  }, [isProfileDrawerOpen]);

  const handleOpenProfileDrawer = () => {
    setIsProfileOpen(true);
    if (setIsProfileDrawerOpen) setIsProfileDrawerOpen(true);
  };

  const handleCloseProfileDrawer = () => {
    setIsProfileOpen(false);
    if (setIsProfileDrawerOpen) setIsProfileDrawerOpen(false);
  };
  
  const [editName, setEditName] = useState(citizenName || userProfile?.name || '');
  const [editDob, setEditDob] = useState(userProfile?.dob || userProfile?.birthdate || localStorage.getItem('punchx_user_dob') || '');
  const [editAddress, setEditAddress] = useState(citizenAddress || userProfile?.address || '');

  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [unreadPushCount, setUnreadPushCount] = useState(0);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);
  const [warrantyClaimOrder, setWarrantyClaimOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    const updateUnread = () => {
      const all = getStoredPushNotifications();
      const unread = all.filter(n => !n.read).length;
      setUnreadPushCount(unread);
    };
    updateUnread();
    const interval = setInterval(updateUnread, 3000);
    window.addEventListener('storage', updateUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateUnread);
    };
  }, []);

  const handleSyncCustomerLocation = async () => {
    setIsLocatingCustomer(true);
    const loc = await requestAndAutoUpdateLocation('customer');
    setIsLocatingCustomer(false);
    if (loc && loc.address) {
      setCitizenAddress(loc.address);
      setEditAddress(loc.address);
      showNotification(`📍 Customer GPS Location Auto-Updated: ${loc.area || loc.address}`);
    }
  };

  useEffect(() => {
    // Auto update location on load if profile address is generic or empty
    if (!citizenAddress || citizenAddress.includes('Loading')) {
      handleSyncCustomerLocation();
    }
  }, []);

  // Review & Rating State For Completed Works Only
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [tempRatingStars, setTempRatingStars] = useState<number>(5);
  const [tempBehaviourFeedback, setTempBehaviourFeedback] = useState<string>('');
  const [reviewModalOrder, setReviewModalOrder] = useState<OrderRecord | null>(null);

  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Loading state for Firestore backend sync
  const [isLoading, setIsLoading] = useState(true);
  const [approvedExperts, setApprovedExperts] = useState<Worker[]>([]);

  // States for expandable profile policy/details sections
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Subscribe to real approved specialists from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workerApplications'), (snapshot) => {
      const list: Worker[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'APPROVED') {
          list.push({
            id: docSnap.id,
            name: data.legalName || 'Authorized Specialist',
            category: data.skill || 'General Repairs',
            rating: 5.0,
            reviewsCount: 12,
            avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
            proBadge: 'AUTHORIZED',
            price: data.visitingFee || 199,
            visitingFee: data.visitingFee || 199,
            available: true,
            address: data.address || citizenAddress || 'Indiranagar, Bengaluru',
            area: data.area || 'Indiranagar',
            sector: data.sector || 'Sector 2',
            phone: data.phone || '+91 98765 43210'
          });
        }
      });

      if (list.length === 0) {
        list.push(
          {
            id: 'wrk_default_1',
            name: 'Rajesh Kumar',
            category: 'AC Repair',
            rating: 4.9,
            reviewsCount: 142,
            avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
            proBadge: 'AUTHORIZED',
            price: 199,
            visitingFee: 199,
            available: true,
            address: citizenAddress || 'Indiranagar 100ft Road, Sector 2, Bengaluru',
            area: 'Indiranagar',
            sector: 'Sector 2',
            phone: '+91 98765 43210'
          },
          {
            id: 'wrk_default_2',
            name: 'Suresh Patel',
            category: 'Electrical Systems',
            rating: 4.8,
            reviewsCount: 98,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
            proBadge: 'PRO',
            price: 179,
            visitingFee: 179,
            available: true,
            address: citizenAddress || 'Indiranagar 100ft Road, Sector 2, Bengaluru',
            area: 'Indiranagar',
            sector: 'Sector 2',
            phone: '+91 98765 11223'
          },
          {
            id: 'wrk_default_3',
            name: 'Anil Sharma',
            category: 'Plumbing & Drainage',
            rating: 4.95,
            reviewsCount: 210,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
            proBadge: 'TOP',
            price: 149,
            visitingFee: 149,
            available: true,
            address: citizenAddress || 'Indiranagar 100ft Road, Sector 2, Bengaluru',
            area: 'Indiranagar',
            sector: 'Sector 2',
            phone: '+91 98765 44556'
          }
        );
      }

      setApprovedExperts(list);
      setIsLoading(false);
    }, (err) => {
      console.warn("Firestore workerApplications notice:", err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [citizenAddress]);

  // Synchronize dynamic booking history values with Firestore & localStorage
  useEffect(() => {
    // 1. Initial fallback load from localStorage
    const raw = localStorage.getItem('punchx_order_history') || '[]';
    try {
      const parsed = JSON.parse(raw);
      const cleaned = Array.isArray(parsed) ? parsed : [];
      setHistoryOrders(cleaned);
      localStorage.setItem('punchx_order_history', JSON.stringify(cleaned));
    } catch {
      setHistoryOrders([]);
    }

    const rawActive = localStorage.getItem('punchx_active_order');
    if (rawActive) {
      try {
        setActiveOrder(JSON.parse(rawActive));
      } catch {
        setActiveOrder(null);
      }
    }

    // 2. Real-time Firestore subscription for live orders sync
    let unsubscribe: () => void;
    try {
      const ordersCol = collection(db, 'orders');
      unsubscribe = onSnapshot(ordersCol, (snapshot) => {
        const liveOrders: OrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          const ord = { id: docSnap.id, ...docSnap.data() } as OrderRecord;
          liveOrders.push(ord);
        });
        setHistoryOrders(liveOrders);
        localStorage.setItem('punchx_order_history', JSON.stringify(liveOrders));
        
        // Find active order
        const active = liveOrders.find(o => o.status === 'In-Progress' || o.status === 'In Progress' || o.status === 'Pending');
        if (active) {
          setActiveOrder(active);
          localStorage.setItem('punchx_active_order', JSON.stringify(active));
        } else {
          setActiveOrder(null);
          localStorage.removeItem('punchx_active_order');
        }
      }, (err) => {
        console.warn("Firestore orders listener offline fallback active:", err);
      });
    } catch (e) {
      console.warn("Firestore connection error in Home.tsx:", e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Keep transient inputs in sync when global props or userProfile update
  useEffect(() => {
    if (citizenName) setEditName(citizenName);
    if (citizenAddress) setEditAddress(citizenAddress);
    if (userProfile?.dob || userProfile?.birthdate) {
      setEditDob(userProfile.dob || userProfile.birthdate);
    }
  }, [citizenName, citizenAddress, userProfile]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showNotification("⚠️ Please enter your full name.");
      return;
    }
    if (!editDob.trim()) {
      showNotification("⚠️ Please enter your date of birth.");
      return;
    }
    const cleanAddress = editAddress.trim() || 'Address not provided';
    setCitizenName(editName.trim());
    setCitizenAddress(cleanAddress);
    setIsEditing(false);

    try {
      localStorage.setItem('punchx_user_name', editName.trim());
      localStorage.setItem('punchx_user_dob', editDob.trim());
      localStorage.setItem('punchx_user_address', cleanAddress);
    } catch {
      // storage fallback
    }

    // FE-05: Require authenticated user before Firestore writes
    if (currentUser?.sub && auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.sub), {
          name: editName.trim(),
          dob: editDob.trim(),
          birthdate: editDob.trim(),
          address: cleanAddress,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Firestore profile update error:", e);
      }
    }
    if (updateUserProfile) {
      await updateUserProfile({
        name: editName.trim(),
        dob: editDob.trim(),
        birthdate: editDob.trim(),
        address: cleanAddress
      });
    }
    showNotification("✓ NamoID profile updated successfully.");
  };

  const handleCancelBooking = async (orderId: string) => {
    const updated = historyOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'Cancelled' as const };
      }
      return o;
    });
    setHistoryOrders(updated);
    localStorage.setItem('punchx_order_history', JSON.stringify(updated));

    // FE-05: Require authenticated user before Firestore writes
    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: 'Cancelled' });
      } catch (e) {
        console.error("Firestore cancel update failed:", e);
      }
    }

    showNotification(`⚠️ Booking ${orderId} has been cancelled.`);
  };

  const handleSubmitReview = async (orderId: string, workerName: string) => {
    const updated = historyOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          isRated: true,
          userRating: tempRatingStars,
          userBehaviour: tempBehaviourFeedback.trim() || 'Polite and professional behaviour.'
        };
      }
      return o;
    });
    setHistoryOrders(updated);
    localStorage.setItem('punchx_order_history', JSON.stringify(updated));

    // FE-05: Require authenticated user before Firestore writes
    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          isRated: true,
          userRating: tempRatingStars,
          userBehaviour: tempBehaviourFeedback.trim() || 'Polite and professional behaviour.'
        });

        // Also save to reviews collection
        const reviewId = `REV-${Date.now()}`;
        await setDoc(doc(db, 'reviews', reviewId), {
          id: reviewId,
          customer: citizenName || 'Verified Customer',
          reviewerId: auth.currentUser.uid,
          rating: tempRatingStars,
          category: 'Service Review',
          comment: tempBehaviourFeedback.trim() || 'Polite and professional behaviour.',
          date: new Date().toLocaleDateString()
        });
      } catch (e) {
        console.warn("Firestore review save notice:", e);
      }
    }

    showNotification(`⭐ Rating of ${tempRatingStars} ★ and behaviour review submitted for ${workerName}!`);
    setRatingOrderId(null);
    setTempRatingStars(5);
    setTempBehaviourFeedback('');
  };

  const handleRebookWorker = (categoryName: string) => {
    onSelectCategory(categoryName);
    setIsProfileOpen(false);
    onTransition('providers');
    showNotification(`⚡ Opening service providers for: ${categoryName}`);
  };

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookExpert = (expert: Worker) => {
    onSelectWorker(expert);
    onSelectCategory(expert.category);
    onTransition('provider-details');
  };

  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory(categoryName);
    onTransition('providers');
  };

  return (
    <div id="home-dashboard-root" className="w-full min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-24 md:pb-16 overflow-x-hidden">
      {/* Main Content Pane */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">

        {/* Citizen Profile & Live Account Bar */}
        <div id="citizen-account-bar" className="bg-gradient-to-r from-[#0a152e] via-[#0f2147] to-[#0a152e] border border-[#c5a059]/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c5a059] to-[#e9c176] p-[2px] shadow-lg flex-shrink-0">
              <div className="w-full h-full rounded-full bg-[#081124] flex items-center justify-center">
                <User className="w-6 h-6 text-[#e9c176]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {citizenName || userProfile?.name || 'PunchX Member'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  NamoID Verified
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5 max-w-md">
                📍 {citizenAddress || 'Detecting Bengaluru address...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              id="open-profile-btn-header"
              onClick={handleOpenProfileDrawer}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[#112042] hover:bg-[#182c5b] text-[#e9c176] hover:text-white font-mono font-bold text-xs rounded-xl transition-all border border-[#c5a059]/40 flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <User className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>My Profile & NamoID</span>
            </button>
            <button
              id="open-orders-btn-header"
              onClick={handleOpenProfileDrawer}
              className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Bookings ({historyOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Quick Action Shortcuts Grid (All useful website buttons) */}
        <div id="quick-action-shortcuts" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={handleOpenProfileDrawer}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-[#c5a059]/15 text-[#e9c176] flex items-center justify-center flex-shrink-0 group-hover:bg-[#c5a059] group-hover:text-black transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Profile</p>
              <p className="text-[9.5px] text-zinc-400 truncate">NamoID & KYC</p>
            </div>
          </button>

          <button
            onClick={handleOpenProfileDrawer}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">My Orders</p>
              <p className="text-[9.5px] text-zinc-400 truncate">Tax Invoices</p>
            </div>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-[#c5a059]/15 text-[#e9c176] flex items-center justify-center flex-shrink-0 group-hover:bg-[#c5a059] group-hover:text-black transition-colors">
              <Grid className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">50 Services</p>
              <p className="text-[9.5px] text-zinc-400 truncate">All Categories</p>
            </div>
          </button>

          <button
            onClick={() => onTransition('tracking')}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500 group-hover:text-black transition-colors">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Live Radar</p>
              <p className="text-[9.5px] text-zinc-400 truncate">Real-time GPS</p>
            </div>
          </button>

          <button
            onClick={() => setIsEnterpriseModalOpen(true)}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500 group-hover:text-black transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Society AMC</p>
              <p className="text-[9.5px] text-zinc-400 truncate">Enterprise Plan</p>
            </div>
          </button>

          <button
            onClick={onOpenNotificationCenter}
            className="p-3 bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl flex items-center gap-2.5 transition-all cursor-pointer shadow-sm group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors relative">
              <Bell className="w-4 h-4" />
              {unreadPushCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full"></span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Alerts</p>
              <p className="text-[9.5px] text-zinc-400 truncate">Push Center</p>
            </div>
          </button>
        </div>
        
        {/* Push Notification Simulator Telemetry Banner */}
        <div className="bg-gradient-to-r from-[#0c1a36] via-[#10234a] to-[#0c1a36] border border-[#c5a059]/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40 flex-shrink-0">
              <Bell className="w-4 h-4 text-[#e9c176] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Dispatch Push Alerts Active
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans mt-0.5">
                Receive instant real-time alerts when a specialist accepts your booking or begins GPS travel.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNotificationCenter}
            className="px-3.5 py-2 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Dispatch Center</span>
          </button>
        </div>
        
        {/* Location & GPS Auto-Sync Bar */}
        <div className="bg-[#11192e] border border-[#c5a059]/30 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="p-2 rounded-xl bg-[#c5a059]/15 text-[#c5a059] border border-[#c5a059]/30 flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#c5a059]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#e9c176] font-extrabold">Service Location</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">GPS AUTO-DETECTED</span>
              </div>
              <p className="text-xs text-white font-bold truncate mt-0.5" title={citizenAddress}>
                {citizenAddress || 'Detecting address...'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncCustomerLocation}
            disabled={isLocatingCustomer}
            className="px-3 py-1.5 bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#e9c176] hover:text-black rounded-xl text-[10px] font-mono font-extrabold uppercase transition-all flex items-center gap-1.5 border border-[#c5a059]/40 cursor-pointer flex-shrink-0 ml-2"
          >
            <Compass className={`w-3.5 h-3.5 ${isLocatingCustomer ? 'animate-spin text-white' : ''}`} />
            <span>{isLocatingCustomer ? 'Syncing...' : 'Auto GPS'}</span>
          </button>
        </div>

        {/* Dynamic Search Input with Holographic Glow */}
        <div id="search-section" className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#c5a059]/10 to-transparent blur-md rounded-2xl opacity-70"></div>
          <div 
            onClick={() => setIsCategoryModalOpen(true)}
            className="relative bg-[#111415] border border-[#c5a059]/30 hover:border-[#c5a059] rounded-2xl p-1.5 flex items-center shadow-lg cursor-pointer transition-all"
          >
            <Search className="w-5 h-5 text-[#c5a059] ml-4 flex-shrink-0" />
            <input
              id="dashboard-search-bar"
              type="text"
              readOnly
              placeholder="🔍 Search for a service or worker (50 categories available)..."
              value={searchQuery}
              className="w-full bg-transparent border-0 text-sm py-2.5 px-3 focus:ring-0 outline-none text-white placeholder-zinc-400 cursor-pointer"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCategoryModalOpen(true);
              }}
              className="px-4 py-2 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-bold text-xs rounded-xl transition-all cursor-pointer flex-shrink-0 mr-1.5 flex items-center gap-1.5 shadow"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>All 50 Services</span>
            </button>
          </div>
        </div>

        {/* Hero Banner Section */}
        <section id="hero-banner" className="relative overflow-hidden rounded-3xl border border-[#c5a059]/20 bg-gradient-to-br from-[#111415] to-[#151f37] shadow-xl p-6 md:p-8">
          <div className="relative z-10 max-w-[65%] space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#e9c176] font-mono text-[10px] uppercase tracking-widest font-semibold">
                EXCLUSIVE OFFERS
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase tracking-widest font-semibold">
                50 Verified Categories
              </span>
            </div>
            <h1 className="font-sans font-bold text-2xl md:text-3xl text-white tracking-tight leading-tight">
              Experience <span className="text-[#c5a059]">Excellence</span> at Your Doorstep.
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-sans">
              Unlock prestigious home repair and consultation services curated strictly for premium lifestyles.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="find-worker-hero-btn"
                onClick={() => setIsCategoryModalOpen(true)}
                className="py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase cursor-pointer transition-all active:scale-[0.98] bg-[#c5a059] text-black shadow-lg shadow-[#c5a059]/20 hover:brightness-110 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Find a Worker</span>
              </button>
              {!hasClaimedBonus && !hasUsedBonus && !promoApplied ? (
                <button
                  id="claim-discount-btn"
                  onClick={onClaimPromo}
                  className="py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase cursor-pointer transition-all active:scale-[0.98] bg-[#1a2b4c] text-[#e9c176] border border-[#c5a059]/40 hover:bg-[#c5a059]/20"
                >
                  Claim 20% OFF
                </button>
              ) : promoApplied && !hasUsedBonus ? (
                <div className="py-2.5 px-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>20% First Order Bonus Active</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Golden Ambient Lights */}
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#c5a059]/10 blur-[80px] rounded-full"></div>
          <div className="absolute right-0 bottom-0 w-1/3 h-full opacity-20 pointer-events-none">
            <img
              id="hero-deco-image"
              alt="Service Hero"
              className="w-full h-full object-cover object-left"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNQG_Ib7sdiH6QXYqBw6S_FG0Y67Y7FgIXUPIeaY2UwugJ-dsjGIOuz75pqZ-gmDI4nO6bU7pf-MCFxgjHfSXbnc5pdyy9dYr_j2loJtuv5iowie-V1v3XdqJBksNQGIRl4df5rkYh9GQtdBVuclqjfOZ-F4XvkL7Uk0YPh3VFfiAVKx1Pe91GJISO7Eaag0wncdLNhCWtreBTVBTblTZTeKb92BfW9pJ-_gtgDPnzRD3o9Uy1Yn4uF9dO9YgCZf7CQLSNc0qSkPw"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* Recent Active Service Banner / Live Tracker shortcut (rendered only if real active order exists) */}
        {activeOrder && (
          <section id="in-progress-tracker-zone">
            <div
              id="tracking-shortcut-card"
              onClick={() => onTransition('tracking')}
              className="bg-[#101b33]/60 rounded-2xl p-4 flex items-center justify-between border border-[#c5a059]/20 hover:border-[#c5a059]/50 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#c5a059]/15 flex items-center justify-center text-[#e9c176]">
                  <Navigation className="w-5 h-5 text-[#e9c176] animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{activeOrder.category} in progress</h4>
                  <p className="text-xs text-zinc-400">Technician {activeOrder.workerName} is in route</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 bg-[#c5a059]/20 border border-[#c5a059]/40 px-3 py-1.5 rounded-full">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-mono tracking-wider font-extrabold text-[#e9c176]">LIVE TRACK</span>
                <ChevronRight className="w-3 h-3 text-[#e9c176] ml-0.5" />
              </div>
            </div>
          </section>
        )}

        {/* Service Categories Section */}
        <section id="categories-panel" className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 id="categories-grid-label" className="font-sans font-bold text-xl text-white">
                What service do you need?
              </h2>
              <p className="text-xs text-zinc-400">Choose from 50 verified trades or search any specialist</p>
            </div>
            <button
              id="categories-view-all"
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-xs font-bold text-[#c5a059] hover:text-[#e9c176] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Browse All 50 Services</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                <div key={idx} className="p-5 bg-[#111415] border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/80"></div>
                  <div className="h-3.5 w-16 bg-zinc-800/60 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div id="categories-grid-list" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PUNCHX_50_CATEGORIES.slice(0, 8).map((cat) => (
                <button
                  id={`cat-card-${cat.id}`}
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="group p-5 bg-[#111415] border border-zinc-800 hover:border-[#c5a059]/60 rounded-2xl flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-full bg-[#151f37] group-hover:bg-[#c5a059]/10 border border-zinc-800 group-hover:border-[#c5a059]/30 flex items-center justify-center text-[#e9c176] transition-all">
                    <CategoryIcon category={cat.name} className="w-5 h-5 text-[#e9c176] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors block">
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 mt-0.5 block">
                      ₹{cat.basePrice} base
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick 50 Categories Banner */}
          <div 
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-4 rounded-2xl bg-[#0e1933] border border-[#c5a059]/30 hover:border-[#c5a059] flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-[#122144]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40">
                <Grid className="w-5 h-5 text-[#e9c176]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">50 Worker Trade Categories Available</h4>
                <p className="text-xs text-zinc-400">Electrician, Plumber, AC, Mobile, Bike/Car Mechanic, Beauty, CCTV, Solar, Tailor & more.</p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-[#c5a059] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1 hover:brightness-110 flex-shrink-0"
            >
              <span>View All 50</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Top Rated Experts Grid */}
        <section id="experts-panel" className="space-y-4">
          <div>
            <h2 id="experts-lead-title" className="font-sans font-bold text-xl text-white">
              Elite Special Forces
            </h2>
            <p className="text-xs text-zinc-400 font-sans">Highly-vetted, certified pro technicians</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="w-full bg-[#111415] border border-zinc-850 rounded-2xl p-5 flex flex-col items-center text-center animate-pulse space-y-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/80"></div>
                  <div className="h-4 w-28 bg-zinc-800/80 rounded"></div>
                  <div className="h-3.5 w-36 bg-zinc-800/60 rounded"></div>
                  <div className="h-3.5 w-24 bg-zinc-800/60 rounded"></div>
                  <div className="w-full h-9 bg-zinc-800/80 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : approvedExperts.length > 0 ? (
            <div id="experts-grid-row" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {approvedExperts.map((expert) => (
                <div
                  id={`expert-crd-${expert.id}`}
                  key={expert.id}
                  className="w-full bg-[#111415] border border-zinc-850 hover:border-[#c5a059]/40 rounded-2xl p-5 flex flex-col items-center text-center group relative transition-all"
                >
                  {/* Pro Badge indicators */}
                  <span className="absolute top-4 right-4 bg-[#c5a059] text-black font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#ffdea5]/50 shadow">
                    {expert.proBadge}
                  </span>

                  <div className="relative mb-3">
                    <img
                      id={`expert-avatar-${expert.id}`}
                      src={expert.avatar}
                      alt={expert.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#c5a059] shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    {/* Category icon badge in top corner of profile */}
                    <CategoryProfileBadge category={expert.category} sizeClassName="w-6 h-6 p-1.5" />
                  </div>

                  <h3 id={`expert-name-${expert.id}`} className="font-bold text-sm text-white mb-0.5">{expert.name}</h3>
                  <p id={`expert-category-${expert.id}`} className="text-xs font-mono text-[#e9c176] tracking-wide mb-2">
                    {expert.category}
                  </p>

                  {/* Star rating details */}
                  <div className="flex items-center gap-1 mb-4 justify-center text-xs">
                    <Star className="w-3.5 h-3.5 fill-[#e9c176] text-[#e9c176]" />
                    <span className="font-bold text-zinc-300">{expert.rating}</span>
                    <span className="text-zinc-500 font-mono">({expert.reviewsCount} reviews)</span>
                  </div>

                  <button
                    id={`expert-book-btn-${expert.id}`}
                    onClick={() => {
                      onSelectWorker(expert);
                      onTransition('provider-details');
                    }}
                    className="w-full py-2.5 bg-zinc-800 group-hover:bg-[#c5a059] text-zinc-300 group-hover:text-black hover:brightness-110 font-bold text-xs rounded-xl tracking-wider uppercase transition-all cursor-pointer border border-zinc-700 group-hover:border-[#ffdea5]/40"
                  >
                    Book Professional
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full bg-[#111415]/90 border border-dashed border-[#c5a059]/30 rounded-3xl p-8 text-center space-y-3">
              <MapPin className="w-10 h-10 text-[#c5a059] mx-auto animate-pulse opacity-80" />
              <h3 className="font-sans font-bold text-lg text-white">not yet started service in your area</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                We haven't launched active specialists in your area yet. Check back soon or apply as a verified service partner!
              </p>
            </div>
          )}
        </section>

        {/* Real-time Platform Key Performance Indicators */}
        <section id="platform-metrics-counter" className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#09152e] border border-[#c5a059]/25 text-center shadow-lg">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">500+</div>
            <p className="text-[11px] text-[#e9c176] font-mono font-bold mt-0.5">VETTED MASTER TECHS</p>
            <span className="text-[9px] text-zinc-500 block">Aadhaar & Police Verified</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#09152e] border border-[#c5a059]/25 text-center shadow-lg">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">15-30m</div>
            <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">DOORSTEP ARRIVAL</p>
            <span className="text-[9px] text-zinc-500 block">Pan-Bengaluru Smart Radar</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#09152e] border border-[#c5a059]/25 text-center shadow-lg">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">48,000+</div>
            <p className="text-[11px] text-[#e9c176] font-mono font-bold mt-0.5">HOMES SERVICED</p>
            <span className="text-[9px] text-zinc-500 block">Across 85+ City Sectors</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#09152e] border border-[#c5a059]/25 text-center shadow-lg">
            <div className="text-2xl sm:text-3xl font-black text-[#e9c176] font-mono tracking-tight">4.92 ★</div>
            <p className="text-[11px] text-[#e9c176] font-mono font-bold mt-0.5">VERIFIED RATING</p>
            <span className="text-[9px] text-zinc-500 block">30-Day Guarantee Backed</span>
          </div>
        </section>

        {/* Interactive Service Price Estimator & Instant Quote Calculator */}
        <ServicePriceEstimator
          onTransition={onTransition}
          onSelectCategory={onSelectCategory}
          showNotification={showNotification}
        />

        {/* Website How It Works Section */}
        <section id="how-it-works" className="pt-4 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-sans font-bold text-xl sm:text-2xl text-white">
                How PunchX Works
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Precision 3-step rapid dispatch across Bengaluru
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-[#0e1628] border border-zinc-800 relative shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40 font-mono font-black text-sm flex items-center justify-center mb-4">
                01
              </div>
              <h3 className="font-bold text-white text-base">Select Your Requirement</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Choose from AC repair, electrical diagnostics, plumbing, or cleaning. Describe the issue in seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1628] border border-zinc-800 relative shadow-md">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-black text-sm flex items-center justify-center mb-4">
                02
              </div>
              <h3 className="font-bold text-white text-base">Smart Proximity GPS Dispatch</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Our radar allocates the closest verified specialist in your neighborhood with real-time ETA and live route tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1628] border border-zinc-800 relative shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#c5a059]/20 text-[#e9c176] border border-[#c5a059]/40 font-mono font-black text-sm flex items-center justify-center mb-4">
                03
              </div>
              <h3 className="font-bold text-white text-base">Secure OTP & 30-Day Warranty</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Verify the 4-digit security code on arrival. Pay safely with complete 30-day revisit warranty protection.
              </p>
            </div>
          </div>
        </section>

        {/* Customer Testimonials & Verified Reviews Showcase */}
        <CustomerTestimonials />

        {/* Interactive Knowledge Base FAQ Section */}
        <WebsiteFAQ />

        {/* Bento Board Sections */}
        <section id="bento-board" className="space-y-4">
          <h2 id="bento-heading-label" className="font-sans font-bold text-lg text-white">Explore Solutions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Corporate Care Block */}
            <div id="corporate-bento-tile" className="md:col-span-2 bg-[#111415] border border-zinc-800 p-6 rounded-3xl relative overflow-hidden h-44 flex flex-col justify-between">
              <div>
                <h3 className="font-sans font-bold text-white text-base">Corporate & Society AMC Portfolio</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Comprehensive preventive maintenance audits and dedicated on-site technicians for apartment societies and tech parks.
                </p>
              </div>
              <button
                id="corporate-pkg-btn"
                onClick={() => setIsEnterpriseModalOpen(true)}
                className="text-xs font-bold text-[#e9c176] flex items-center gap-1 hover:text-white cursor-pointer bg-[#c5a059]/15 border border-[#c5a059]/30 px-3.5 py-1.5 rounded-xl w-fit"
              >
                Inquire AMC Proposal <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none w-1/3">
                <Laptop className="w-24 h-24 text-[#c5a059]" />
              </div>
            </div>

            {/* Verification highlights */}
            <div id="verified-bento-tile" className="bg-[#101b33]/30 border border-[#c5a059]/20 p-6 rounded-3xl flex flex-col justify-between h-44">
              <Shield className="w-8 h-8 text-[#e9c176]" />
              <div>
                <h3 className="font-sans font-extrabold text-sm text-[#e9c176] flex items-center gap-1 uppercase">
                  Safe & Secure
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  All service providers have verified background checks to ensure professional assistance.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Founding Team & Leadership Trust Showcase */}
        <section id="home-leadership-spotlight" className="rounded-3xl bg-gradient-to-b from-[#0a162e] to-[#071124] border border-[#c5a059]/30 p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] text-[10px] font-mono font-bold tracking-wide">
                <ShieldCheck className="w-3 h-3 text-[#c5a059]" />
                <span>EXECUTIVE GOVERNANCE</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                PunchX Founders &amp; Leadership
              </h2>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                PunchX was founded by <strong>Rimil Das</strong> (Founder &amp; COO) and <strong>Abhradip Ghosh</strong> (Co-Founder &amp; CEO), building an on-demand service ecosystem backed by verified specialists and 30-day warranty protection.
              </p>
            </div>

            <button
              id="home-founder-link-btn"
              onClick={() => onTransition('founder')}
              className="px-4 py-2.5 rounded-xl bg-[#111f3d] hover:bg-[#182a52] border border-[#c5a059]/40 text-xs font-bold text-[#e9c176] hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-md self-start sm:self-auto whitespace-nowrap"
            >
              <span>View Founder Profiles</span>
              <ChevronRight className="w-4 h-4 text-[#c5a059]" />
            </button>
          </div>
        </section>

      </main>

      {/* Floating Action CTA Button */}
      <button
        id="fab-plus-category"
        onClick={() => {
          onSelectCategory('All Specialties');
          onTransition('providers');
          showNotification("✓ Showing all service providers.");
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#c5a059] text-black hover:bg-[#e9c176] rounded-2xl flex items-center justify-center shadow-2xl transition-all cursor-pointer z-30 hover:scale-105 active:scale-95"
        title="Show all registered service providers from all categories"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Dynamic Profile Side Drawer Panel with Order history */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            {/* Backdrop filter blur with fade transition */}
            <motion.div
              id="profile-sidebar-backdrop"
              className="fixed inset-0 z-50 bg-[#07122a]/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseProfileDrawer}
            />

            {/* Slide-out secure terminal workspace panel */}
            <motion.div
              id="profile-secure-panel"
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0b1325] border-l border-[#c5a059]/20 shadow-2xl z-55 flex flex-col justify-between overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              <div className="p-6 space-y-6">
                
                {/* Drawer Header */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
                    <h2 className="text-sm font-sans uppercase tracking-wider font-extrabold text-white">
                      User Profile & Bookings
                    </h2>
                  </div>
                  <button
                    id="close-profile-drawer"
                    onClick={handleCloseProfileDrawer}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Secure Customer Identification Block */}
                <div className="bg-[#11192e] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-sans uppercase tracking-widest text-[#e9c176] font-extrabold">
                      Customer Details
                    </span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-[10px] font-sans text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer font-bold uppercase"
                    >
                      <Edit3 className="w-3" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1 bg-[#11192e] text-left">
                        <label className="text-[9px] font-sans uppercase tracking-wider text-zinc-400 font-bold block">Full Legal Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Anand Sharma"
                          className="w-full bg-[#07122a] border border-[#c5a059]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#c5a059]"
                        />
                      </div>
                      <div className="space-y-1 bg-[#11192e] text-left">
                        <label className="text-[9px] font-sans uppercase tracking-wider text-zinc-400 font-bold block">Date of Birth (NamoID)</label>
                        <input
                          type="date"
                          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          value={editDob}
                          onChange={(e) => setEditDob(e.target.value)}
                          className="w-full bg-[#07122a] border border-[#c5a059]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#c5a059] [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-1 bg-[#11192e] text-left">
                        <label className="text-[9px] font-sans uppercase tracking-wider text-zinc-400 font-bold block">Delivery Address</label>
                        <textarea
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-[#07122a] border border-[#c5a059]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#c5a059] min-h-[60px] resize-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        className="w-full py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all font-sans cursor-pointer"
                      >
                        SAVE CHANGES
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3 text-left">
                        <div className="w-10 h-10 rounded-full border border-[#c5a059] p-0.5 overflow-hidden self-start flex-shrink-0">
                          <img
                            alt="Profile"
                            className="w-full h-full object-cover rounded-full"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfBtABLKSPqddxrtWDSdl9c5daP9YVcbg3P_EfbjjHvQNdNJvYYmMzLoAMTez0tdXrxqAJdUuy8KgettOAxfIpaQOSUIGXnMHO2yJ0A1ge_YxS8OPbgyA8xyvIx_APQVn5R2ZCbaBPwIFLH-P4TGnMmmmSIIkQ4Kh6YxwSeWCPjs7ZpX2gTQN7OWHlEhjzheYXdrCKknsAwVPuDggLTM0sMcv26ZlNwDDU-zeEm3vQpo6PValfhRBMBP2rndZh-fksKGFua62D8uQ"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-1 overflow-hidden font-sans">
                          <h4 className="font-extrabold text-sm text-white tracking-wide">
                            {citizenName || editName || 'PunchX Member'}
                          </h4>
                          <p className="text-xs font-sans text-zinc-300 font-medium flex items-center gap-1.5 flex-wrap">
                            {authMethod === 'gmail' ? <Mail className="w-3.5 h-3.5 text-[#e9c176]" /> : <Phone className="w-3.5 h-3.5 text-[#e9c176]" />}
                            <span className="text-[#e9c176] font-extrabold bg-[#c5a059]/15 px-2 py-0.5 rounded border border-[#c5a059]/25 shadow-sm">{authTarget || 'citizen@punchx.app'}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-black">NamoID Verified</span>
                          </p>
                        </div>
                      </div>

                      {/* Date of Birth info */}
                      {(editDob || userProfile?.dob || userProfile?.birthdate) && (
                        <div className="border-t border-zinc-800/60 pt-2.5 text-left">
                          <span className="text-[9px] font-sans uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            Date of Birth:
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#c5a059] flex-shrink-0" />
                            <span>{editDob || userProfile?.dob || userProfile?.birthdate}</span>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-zinc-800/60 pt-2.5 text-left">
                        <span className="text-[9px] font-sans uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                          Saved Address:
                        </span>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#c5a059] mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans select-all">
                            {citizenAddress}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* INTERACTIVE LEGAL & POLICIES ACCORDION SECTION */}
                <div className="space-y-3">
                  {/* REFUND & CANCELLATION POLICIES */}
                  <div className="bg-[#11192e] border border-zinc-800 rounded-2xl overflow-hidden shadow-inner text-left">
                    <button
                      type="button"
                      onClick={() => setIsRefundOpen(!isRefundOpen)}
                      className="w-full flex items-center justify-between p-5 hover:bg-[#151f37] transition-all cursor-pointer select-none outline-none focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-4 h-4 text-[#e9c176]" />
                        <h3 className="text-[10px] font-sans uppercase tracking-widest text-[#e9c176] font-extrabold">
                          Refund & Cancellation Policy
                        </h3>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isRefundOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isRefundOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 border-t border-zinc-800/60 space-y-3 font-sans text-xs">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                1. Instant Cancellation
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Cancel booking within <span className="text-white font-semibold">5 minutes</span> or before technician dispatch for a <span className="text-emerald-400 font-bold">100% full refund</span> back to your source account.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                2. Late Cancellation Fee
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Cancellations made after the expert has been dispatched are subject to a nominal transit compensation fee of <span className="text-white font-semibold">₹99</span>.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                3. Service Guarantee Refund
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                If you are unsatisfied with the quality of the service delivered, raise a claim within <span className="text-white font-semibold">24 hours</span> to get a <span className="text-emerald-400 font-bold">free re-visit or 100% refund</span>.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                4. Refund Settlement
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Approved refunds are processed automatically and will credit to your bank or card within <span className="text-[#e9c176] font-semibold">3-5 business days</span>.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* TERMS & CONDITIONS */}
                  <div className="bg-[#11192e] border border-zinc-800 rounded-2xl overflow-hidden shadow-inner text-left">
                    <button
                      type="button"
                      onClick={() => setIsTermsOpen(!isTermsOpen)}
                      className="w-full flex items-center justify-between p-5 hover:bg-[#151f37] transition-all cursor-pointer select-none outline-none focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-[#e9c176]" />
                        <h3 className="text-[10px] font-sans uppercase tracking-widest text-[#e9c176] font-extrabold">
                          Terms & Conditions
                        </h3>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isTermsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isTermsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 border-t border-zinc-800/60 space-y-3 font-sans text-xs">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                1. Scope of Service
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                We act as a high-fidelity platform matching verified independent service professionals ("Technicians" or "Experts") with customers.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                2. User Accounts
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                You are solely responsible for maintaining accuracy of your registered phone, email, name, and address.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                3. Safety & Verification
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Customers must verify the unique secure OTP with the assigned expert before service starts to ensure security.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                4. Payments
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Prices listed are transparent starting rates. Actual material or complex additions should be agreed upon between customer and expert directly.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* PRIVACY POLICY */}
                  <div className="bg-[#11192e] border border-zinc-800 rounded-2xl overflow-hidden shadow-inner text-left">
                    <button
                      type="button"
                      onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                      className="w-full flex items-center justify-between p-5 hover:bg-[#151f37] transition-all cursor-pointer select-none outline-none focus:outline-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-[#e9c176]" />
                        <h3 className="text-[10px] font-sans uppercase tracking-widest text-[#e9c176] font-extrabold">
                          Privacy Policy
                        </h3>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isPrivacyOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isPrivacyOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 border-t border-zinc-800/60 space-y-3 font-sans text-xs">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                1. Data Collection
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                We collect essential identity credentials (name, email/phone, site address, and service proof images) for verification and booking matching.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                2. Location Sharing
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Real-time geolocation tracking is used solely during active bookings to show the Technician's ETA.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                3. Information Security
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                Your personal contact details are shielded and shared with the selected expert only for service delivery.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-extrabold text-[#e1e3e4] text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></span>
                                4. Portability
                              </h4>
                              <p className="text-zinc-400 text-[11px] leading-relaxed pl-3">
                                You can update, edit, or remove your name and saved address at any time directly through your Profile Dashboard.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* HISTORICAL WORK ORDERS SECTION */}
                <div className="space-y-4 text-left">
                  
                  {/* DONE / COMPLETED BOOKINGS BLOCK */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-sans uppercase tracking-widest text-emerald-400 font-extrabold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Completed Orders ({historyOrders.filter(o => o.status === 'Done').length})
                    </h3>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                      {historyOrders.filter(o => o.status === 'Done').length > 0 ? (
                        historyOrders.filter(o => o.status === 'Done').map((order) => (
                          <div
                            key={order.id}
                            className="bg-[#111415] border border-zinc-850 rounded-xl p-3 flex flex-col gap-2 hover:border-zinc-800 transition-all duration-200"
                          >
                            <div className="flex justify-between items-center">
                              <div className="space-y-0.5 max-w-[70%] text-left">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-zinc-400 font-sans font-bold">
                                    {order.id}
                                  </span>
                                  <span className="text-[8px] font-sans bg-[#c5a059]/10 text-[#e9c176] px-1.5 py-0.2 rounded border border-[#c5a059]/20 uppercase">
                                    {order.category}
                                  </span>
                                </div>
                                <p className="text-xs text-white font-bold tracking-tight truncate font-sans">
                                  Pro: {order.workerName}
                                </p>
                                <span className="text-[9px] text-zinc-500 font-sans block">
                                  {order.date}
                                </span>
                              </div>
                              <div className="text-right space-y-0.5">
                                <p className="font-sans text-emerald-400 font-bold text-xs">
                                  ₹{order.price}
                                </p>
                                <div className="flex flex-col gap-1 items-end">
                                  <span className="text-[8px] font-sans uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                                    Done
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Verified Hand-over details */}
                            {(order.closureName || order.closureAddress || order.closurePhoto) && (
                              <div className="mt-1 p-2 bg-[#0b101d]/60 border border-zinc-850/50 rounded-lg flex gap-3 text-left">
                                {order.closurePhoto && (
                                  <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 border border-zinc-800">
                                    <img src={order.closurePhoto} alt="Witness receipt" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="space-y-0.5 min-w-0 flex-grow">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                    <span className="text-[8px] font-mono font-bold tracking-widest text-[#e9c176] block uppercase">DIGITAL CLOSURE RECEIPT</span>
                                  </div>
                                  {order.closureName && (
                                    <p className="text-[10px] text-zinc-300 font-bold truncate">Signee: {order.closureName}</p>
                                  )}
                                  {order.closureAddress && (
                                    <p className="text-[9px] text-zinc-500 line-clamp-1 font-sans" title={order.closureAddress}>{order.closureAddress}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 30-Day Guarantee Rebooking Action for Repair / Opted services */}
                            {(order.hasWarrantyGuarantee || order.category?.toLowerCase().includes('repair') || order.category?.toLowerCase().includes('ac')) && (
                              <div className="bg-[#0f1a30] border border-[#c5a059]/30 rounded-xl p-2.5 mt-1 flex justify-between items-center gap-2">
                                <div className="text-left">
                                  <div className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#e9c176]" />
                                    <span className="text-[10px] font-bold text-[#e9c176]">30-Day Free Revisit Guarantee</span>
                                  </div>
                                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                                    {order.warrantyClaimId ? `Claim ${order.warrantyClaimId}: ${order.warrantyClaimStatus || 'Under Review'}` : 'Eligible for 100% Free Rebooking if same issue recurs.'}
                                  </span>
                                </div>
                                {order.warrantyClaimId ? (
                                  <span className="text-[9px] font-mono px-2 py-1 bg-[#c5a059]/20 text-[#e9c176] rounded-lg font-bold">
                                    {order.warrantyClaimStatus || 'CLAIM IN REVIEW'}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setWarrantyClaimOrder(order)}
                                    className="text-[9.5px] font-sans font-bold bg-[#c5a059] hover:bg-[#e9c176] text-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow"
                                  >
                                    Claim Free Rebook (₹0)
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Conditional Rendering of Submitted Review vs Active Rating Fields */}
                            {order.isRated ? (
                              <div className="bg-[#0b1325] border border-[#c5a059]/15 rounded-xl p-2.5 mt-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[#e9c176] uppercase font-bold font-sans">Rating Given:</span>
                                    <div className="flex text-[#e9c176] gap-0.5">
                                      {[...Array(order.userRating || 5)].map((_, idx) => (
                                        <Star key={idx} className="w-2.5 h-2.5 fill-current text-[#e9c176]" />
                                      ))}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setSelectedInvoiceOrder(order)}
                                    className="text-[9px] font-mono text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>Tax Invoice</span>
                                  </button>
                                </div>
                                <div className="text-[11px] text-zinc-350 leading-relaxed font-sans mt-1">
                                  <span className="text-[9.5px] text-zinc-500 font-bold block uppercase not-italic">Behaviour Description:</span>
                                  "{order.userBehaviour}"
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center gap-2 mt-1 pt-2 border-t border-zinc-900 flex-wrap">
                                <button
                                  onClick={() => setSelectedInvoiceOrder(order)}
                                  className="text-[9px] font-mono text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Tax Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewModalOrder(order)}
                                  className="text-[10px] bg-[#c5a059]/10 hover:bg-[#c5a059] text-[#e9c176] hover:text-black hover:font-bold border border-[#c5a059]/30 px-3 py-1 rounded-xl transition-all font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 text-[#e9c176]" />
                                  Rate & Review
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-[#111415] border border-zinc-850 rounded-xl p-4 text-center space-y-1">
                          <CheckCircle className="w-5 h-5 text-zinc-600 mx-auto" />
                          <p className="text-xs font-sans text-zinc-300 font-bold">No service done</p>
                          <p className="text-[10px] text-zinc-500 font-sans">No completed orders yet. Completed jobs and digital receipts will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CANCELLED BOOKINGS BLOCK */}
                  <div className="space-y-2.5 pt-2">
                    <h3 className="text-[10px] font-sans uppercase tracking-widest text-[#c5a059] font-extrabold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#c5a059]" />
                      Cancelled Orders ({historyOrders.filter(o => o.status === 'Cancelled').length})
                    </h3>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar text-left">
                      {historyOrders.filter(o => o.status === 'Cancelled').length > 0 ? (
                        historyOrders.filter(o => o.status === 'Cancelled').map((order) => (
                          <div
                            key={order.id}
                            className="bg-[#111415] border border-zinc-850 rounded-xl p-3 flex justify-between items-center opacity-75 hover:opacity-90"
                          >
                            <div className="space-y-0.5 max-w-[70%] text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-zinc-400 font-sans font-bold">
                                  {order.id}
                                </span>
                                <span className="text-[8px] font-sans bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700 uppercase">
                                  {order.category}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-350 font-bold tracking-tight truncate font-sans">
                                Pro: {order.workerName}
                              </p>
                              <span className="text-[9px] text-zinc-500 font-sans block">
                                {order.date}
                              </span>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="font-sans text-zinc-400 line-through text-xs">
                                ₹{order.price}
                              </p>
                              <div className="flex flex-col gap-1 items-end">
                                <span className="text-[8px] font-sans uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-bold">
                                  Cancelled
                                </span>
                                <button
                                  onClick={() => handleRebookWorker(order.category)}
                                  className="text-[8px] font-sans text-[#c5a059] hover:underline cursor-pointer uppercase font-bold"
                                >
                                  Rebook
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-[#111415] border border-zinc-850/60 rounded-xl p-3 text-center">
                          <p className="text-[11px] font-sans text-zinc-500 italic">No cancelled orders</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Secure Token Footer inside Drawer */}
              <div className="p-6 bg-[#0c121e] border-t border-zinc-850 space-y-3">
                <button
                  onClick={async () => {
                    setIsProfileOpen(false);
                    try {
                      if (logout) {
                        await logout();
                      }
                    } catch (e) {
                      console.warn("Logout error:", e);
                    }
                    onTransition('panel-select');
                    showNotification("✓ Logged out successfully.");
                  }}
                  className="w-full py-2.5 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all font-sans cursor-pointer border border-red-600/40 text-center"
                >
                  LOGOUT
                </button>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      localStorage.setItem('punchx_order_history', '[]');
                      setHistoryOrders([]);
                      showNotification("✓ History cleared successfully.");
                    }}
                    className="text-[10px] text-zinc-500 hover:text-[#c5a059] font-sans transition-colors uppercase bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-1.5 rounded-lg cursor-pointer border border-zinc-800"
                  >
                    Clear History
                  </button>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Structured Post-Service Rating & Citizen Feedback Modal */}
      {reviewModalOrder && (
        <PostServiceReviewModal
          order={reviewModalOrder}
          isOpen={!!reviewModalOrder}
          onClose={() => setReviewModalOrder(null)}
          onSubmitSuccess={(submittedReview: CustomerReview) => {
            const updated = historyOrders.map((o) => {
              if (o.id === submittedReview.orderId) {
                return {
                  ...o,
                  isRated: true,
                  userRating: submittedReview.rating,
                  userBehaviour: submittedReview.comment
                };
              }
              return o;
            });
            setHistoryOrders(updated);
            localStorage.setItem('punchx_order_history', JSON.stringify(updated));
          }}
          showNotification={showNotification}
        />
      )}
      {/* Corporate & Society AMC Inquiry Modal */}
      <EnterpriseInquiryModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
        showNotification={showNotification}
      />

      {/* Official Tax Invoice & Warranty Certificate Modal */}
      <InvoiceReceiptModal
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        order={selectedInvoiceOrder}
      />

      {/* 30-Day Free Revisit Guarantee Claim Modal */}
      {warrantyClaimOrder && (
        <WarrantyClaimModal
          order={warrantyClaimOrder}
          isOpen={!!warrantyClaimOrder}
          onClose={() => setWarrantyClaimOrder(null)}
          onSubmitSuccess={(claim) => {
            const updated = historyOrders.map((o) => {
              if (o.id === claim.orderId) {
                return {
                  ...o,
                  warrantyClaimId: claim.id,
                  warrantyClaimStatus: claim.status
                };
              }
              return o;
            });
            setHistoryOrders(updated);
            localStorage.setItem('punchx_order_history', JSON.stringify(updated));
            showNotification(`✓ 30-Day Guarantee Claim ${claim.id} logged for free rebooking!`);
          }}
          showNotification={showNotification}
        />
      )}

      {/* Centralized 50 Worker Categories Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="citizen"
        onSelectCategory={(catName) => {
          handleCategoryClick(catName);
        }}
      />

      {/* Mobile Website Sticky Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navbar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-45 bg-[#061024]/95 backdrop-blur-xl border-t border-[#c5a059]/30 px-3 py-2 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        <button
          onClick={() => {
            handleCloseProfileDrawer();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all text-[#e9c176] font-bold text-[10px] cursor-pointer"
        >
          <span className="text-base">🏠</span>
          <span>Home</span>
        </button>

        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all text-zinc-400 hover:text-white font-semibold text-[10px] cursor-pointer"
        >
          <span className="text-base">🔍</span>
          <span>50 Services</span>
        </button>

        <button
          onClick={() => onTransition('tracking')}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all text-[#e9c176] hover:brightness-125 font-bold text-[10px] cursor-pointer"
        >
          <span className="text-base">📍</span>
          <span>Tracking</span>
        </button>

        <button
          onClick={handleOpenProfileDrawer}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all text-zinc-400 hover:text-emerald-400 font-semibold text-[10px] cursor-pointer"
        >
          <span className="text-base">📋</span>
          <span>Bookings</span>
        </button>

        <button
          onClick={handleOpenProfileDrawer}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all text-zinc-400 hover:text-[#e9c176] font-semibold text-[10px] cursor-pointer"
        >
          <span className="text-base">👤</span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
