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

export default function HomeDashboard(props: HomeProps) {
  const { currentUser, userProfile, updateUserProfile, logout } = useAuth() as any;
  const { onTransition, onSelectWorker, onSelectCategory, citizenAddress, showNotification } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'bookings' | 'profile'>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(props.citizenName || userProfile?.name || '');
  const [editDob, setEditDob] = useState(userProfile?.dob || userProfile?.birthdate || localStorage.getItem('punchx_user_dob') || '');
  const [editAddress, setEditAddress] = useState(citizenAddress || userProfile?.address || '');
  const [isLocatingCustomer, setIsLocatingCustomer] = useState(false);
  const [unreadPushCount, setUnreadPushCount] = useState(0);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  // BUGFIX: category modal must not open automatically on page load.
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);
  const [warrantyClaimOrder, setWarrantyClaimOrder] = useState<OrderRecord | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [tempRatingStars, setTempRatingStars] = useState<number>(5);
  const [tempBehaviourFeedback, setTempBehaviourFeedback] = useState<string>('');
  const [reviewModalOrder, setReviewModalOrder] = useState<OrderRecord | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedExperts, setApprovedExperts] = useState<Worker[]>([]);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    if (typeof props.isProfileDrawerOpen === 'boolean') setIsProfileOpen(props.isProfileDrawerOpen);
  }, [props.isProfileDrawerOpen]);

  const handleOpenProfileDrawer = () => { setIsProfileOpen(true); props.setIsProfileDrawerOpen?.(true); };
  const handleCloseProfileDrawer = () => { setIsProfileOpen(false); props.setIsProfileDrawerOpen?.(false); };

  useEffect(() => {
    const updateUnread = () => setUnreadPushCount(getStoredPushNotifications().filter(n => !n.read).length);
    updateUnread();
    const interval = setInterval(updateUnread, 3000);
    window.addEventListener('storage', updateUnread);
    return () => { clearInterval(interval); window.removeEventListener('storage', updateUnread); };
  }, []);

  const handleSyncCustomerLocation = async () => {
    setIsLocatingCustomer(true);
    const loc = await requestAndAutoUpdateLocation('customer');
    setIsLocatingCustomer(false);
    if (loc?.address) {
      props.setCitizenAddress(loc.address);
      setEditAddress(loc.address);
      showNotification(`📍 Customer GPS Location Auto-Updated: ${loc.area || loc.address}`);
    }
  };

  useEffect(() => {
    if (!citizenAddress || citizenAddress.includes('Loading')) handleSyncCustomerLocation();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'workerApplications'), (snapshot) => {
      const list: Worker[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'APPROVED') list.push({
          id: docSnap.id, name: data.legalName || 'Authorized Specialist', category: data.skill || 'General Repairs',
          rating: data.rating || 0, reviewsCount: data.reviewsCount || 0,
          avatar: data.photoURL || data.avatar || '',
          proBadge: 'AUTHORIZED', price: data.visitingFee || 199, visitingFee: data.visitingFee || 199,
          available: true, address: data.address || citizenAddress || 'Kolkata', area: data.area || 'Kolkata',
          sector: data.sector || '', phone: data.phone || ''
        });
      });
      setApprovedExperts(list); setIsLoading(false);
    }, (err) => { console.warn('Firestore workerApplications notice:', err); setIsLoading(false); });
    return () => unsub();
  }, [citizenAddress]);

  useEffect(() => {
    const raw = localStorage.getItem('punchx_order_history') || '[]';
    try { setHistoryOrders(Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []); } catch { setHistoryOrders([]); }
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
        const liveOrders: OrderRecord[] = [];
        snapshot.forEach((docSnap) => liveOrders.push({ id: docSnap.id, ...docSnap.data() } as OrderRecord));
        setHistoryOrders(liveOrders); localStorage.setItem('punchx_order_history', JSON.stringify(liveOrders));
        const active = liveOrders.find(o => o.status === 'In-Progress' || o.status === 'In Progress' || o.status === 'Pending');
        setActiveOrder(active || null);
        if (active) localStorage.setItem('punchx_active_order', JSON.stringify(active)); else localStorage.removeItem('punchx_active_order');
      }, (err) => console.warn('Firestore orders listener offline fallback active:', err));
    } catch (e) { console.warn('Firestore connection error in Home.tsx:', e); }
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (props.citizenName) setEditName(props.citizenName);
    if (citizenAddress) setEditAddress(citizenAddress);
    if (userProfile?.dob || userProfile?.birthdate) setEditDob(userProfile.dob || userProfile.birthdate);
  }, [props.citizenName, citizenAddress, userProfile]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return showNotification('⚠️ Please enter your full name.');
    if (!editDob.trim()) return showNotification('⚠️ Please enter your date of birth.');
    const cleanAddress = editAddress.trim() || 'Address not provided';
    props.setCitizenName(editName.trim()); props.setCitizenAddress(cleanAddress); setIsEditing(false);
    localStorage.setItem('punchx_user_name', editName.trim()); localStorage.setItem('punchx_user_dob', editDob.trim()); localStorage.setItem('punchx_user_address', cleanAddress);
    if (currentUser?.sub && auth.currentUser?.uid) {
      try { await updateDoc(doc(db, 'users', currentUser.sub), { name: editName.trim(), dob: editDob.trim(), birthdate: editDob.trim(), address: cleanAddress, updatedAt: new Date().toISOString() }); } catch (e) { console.error('Firestore profile update error:', e); }
    }
    if (updateUserProfile) await updateUserProfile({ name: editName.trim(), dob: editDob.trim(), birthdate: editDob.trim(), address: cleanAddress });
    showNotification('✓ NamoID profile updated successfully.');
  };

  const handleCancelBooking = async (orderId: string) => {
    const updated = historyOrders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' as const } : o);
    setHistoryOrders(updated); localStorage.setItem('punchx_order_history', JSON.stringify(updated));
    if (auth.currentUser?.uid) { try { await updateDoc(doc(db, 'orders', orderId), { status: 'Cancelled' }); } catch (e) { console.error('Firestore cancel update failed:', e); } }
    showNotification(`⚠️ Booking ${orderId} has been cancelled.`);
  };

  const handleRebookWorker = (categoryName: string) => {
    onSelectCategory(categoryName); setIsProfileOpen(false); onTransition('providers');
    showNotification(`⚡ Opening service providers for: ${categoryName}`);
  };

  const filteredCategories = CATEGORIES.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleBookExpert = (expert: Worker) => { onSelectWorker(expert); onSelectCategory(expert.category); onTransition('provider-details'); };

  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory(categoryName);
    // The providers page is the actual booking/search destination; don't leave a modal stuck open.
    setIsCategoryModalOpen(false);
    onTransition('providers');
  };

  const handleOpenCategories = () => setIsCategoryModalOpen(true);
  const handleCloseCategories = () => setIsCategoryModalOpen(false);

  return (
    <div id="home-dashboard-root" className="w-full min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-24 md:pb-16 overflow-x-hidden">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
        <div id="citizen-account-bar" className="bg-gradient-to-r from-[#0a152e] via-[#0f2147] to-[#0a152e] border border-[#c5a059]/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0"><div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c5a059] to-[#e9c176] p-[2px] shadow-lg flex-shrink-0"><div className="w-full h-full rounded-full bg-[#081124] flex items-center justify-center"><User className="w-6 h-6 text-[#e9c176]" /></div></div><div className="min-w-0"><div className="font-bold truncate">{props.citizenName || 'PunchX Customer'}</div><div className="text-xs text-gray-400 truncate">{citizenAddress || 'Set your location'}</div></div></div>
          <div className="flex gap-2"><button type="button" onClick={handleOpenCategories} className="min-h-11 px-4 rounded-xl bg-[#c5a059] text-black font-bold text-sm hover:bg-[#e9c176] focus:outline-none focus:ring-2 focus:ring-[#c5a059]">Browse Services</button><button type="button" onClick={handleSyncCustomerLocation} disabled={isLocatingCustomer} className="min-h-11 px-4 rounded-xl border border-[#c5a059]/40 text-[#e9c176] font-bold text-sm disabled:opacity-60">{isLocatingCustomer ? 'Locating…' : 'Update Location'}</button></div>
        </div>

        <section className="rounded-3xl border border-[#c5a059]/20 bg-[#0a152e] p-5 sm:p-8 shadow-xl">
          <p className="text-xs font-bold tracking-widest text-[#c5a059] uppercase">PunchX Marketplace</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-black leading-tight">Connecting people with trusted local professionals.</h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base text-gray-300">Explore local professionals for everyday services, compare available options and book from one place.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3"><button type="button" onClick={handleOpenCategories} className="min-h-12 px-6 rounded-xl bg-[#c5a059] text-black font-black">Find a Service</button><button type="button" onClick={() => onTransition('worker-signup')} className="min-h-12 px-6 rounded-xl border border-white/15 text-white font-bold">Join as a Professional</button></div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0a152e] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-xl font-black">Popular services</h2><p className="text-xs text-gray-400 mt-1">Choose a category to find professionals.</p></div><button type="button" onClick={handleOpenCategories} className="text-sm font-bold text-[#e9c176]">View all</button></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{CATEGORIES.map(cat => <button key={cat.id} type="button" onClick={() => handleCategoryClick(cat.name)} className="min-h-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-[#c5a059]/60 hover:bg-[#c5a059]/10 focus:outline-none focus:ring-2 focus:ring-[#c5a059]"><CategoryIcon category={cat.name} className="w-7 h-7 mb-2 text-[#e9c176]" /><span className="block text-sm font-bold">{cat.name}</span></button>)}</div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 p-5 bg-[#0a152e]"><ShieldCheck className="text-[#e9c176]"/><h3 className="font-bold mt-3">Local professionals</h3><p className="text-xs text-gray-400 mt-1">Explore available local service providers.</p></div><div className="rounded-2xl border border-white/10 p-5 bg-[#0a152e]"><CreditCard className="text-[#e9c176]"/><h3 className="font-bold mt-3">Secure booking</h3><p className="text-xs text-gray-400 mt-1">Keep booking and payment steps clear.</p></div><div className="rounded-2xl border border-white/10 p-5 bg-[#0a152e]"><Navigation className="text-[#e9c176]"/><h3 className="font-bold mt-3">Service tracking</h3><p className="text-xs text-gray-400 mt-1">Follow active jobs from your account.</p></div></section>
      </main>

      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategories}
        onSelectCategory={handleCategoryClick}
        mode="citizen"
      />
    </div>
  );
}
