import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppScreen, OrderRecord, WorkerApplication, WarrantyClaim, ComplaintRecord } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { 
  Building2, TrendingUp, Users, ShieldAlert, CheckCircle2, 
  Search, Filter, RefreshCw, BarChart3, Settings, DollarSign, 
  Wrench, ArrowUpRight, ShieldCheck, AlertTriangle, Eye, Star, 
  MapPin, Clock, Lock, UserCheck, XCircle, LogOut, Phone,
  User, Calendar, Activity, ChevronRight, Layers, Download,
  PlusCircle, Radio, Navigation, FileSpreadsheet, Check, Send,
  Sparkles, MessageSquare, AlertCircle, Trash2
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { purgeMockUsersAndData } from '../lib/purgeMockData';
import { useAuth } from '../lib/authContext';
import WarrantyClaimsManager from './admin/WarrantyClaimsManager';
import ComplaintsManager from './admin/ComplaintsManager';
import PlatformSettingsManager from './admin/PlatformSettingsManager';

interface AdminDashboardProps {
  onTransition: (target: AppScreen) => void;
  showNotification: (msg: string) => void;
}

const DEFAULT_ORDERS: OrderRecord[] = [];

const DEFAULT_WORKER_APPS: WorkerApplication[] = [];

export default function AdminDashboard({ onTransition, showNotification }: AdminDashboardProps) {
  const { currentUser, userProfile } = useAuth();

// Admin access is controlled exclusively by Firebase Authentication
  // and the admin role stored in Firestore.
  const isUnlocked = userProfile?.role === 'admin';
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [workerApps, setWorkerApps] = useState<WorkerApplication[]>([]);
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  
  // Tab segments: live_services | registrations | customers | workers | reviews | overview | warranty_claims | complaints | platform_mgmt
  const [activeTab, setActiveTab] = useState<'live_services' | 'registrations' | 'customers' | 'workers' | 'reviews' | 'overview' | 'warranty_claims' | 'complaints' | 'platform_mgmt'>('live_services');
  
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(26);

  // Modal states
  const [reassignModal, setReassignModal] = useState<{ open: boolean; orderId: string; currentWorker: string } | null>(null);
  const [inspectModal, setInspectModal] = useState<OrderRecord | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; appId: string; applicantName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Incomplete Identity Documentation');

  // Manual Dispatch Modal State
  const [newDispatchModal, setNewDispatchModal] = useState(false);
  const [newCategory, setNewCategory] = useState('Air Conditioner Jet Service');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newPrice, setNewPrice] = useState(699);
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Emergency SOS state
  const [emergencyAlerts, setEmergencyAlerts] = useState<Array<{ id: string; worker: string; location: string; time: string; issue: string }>>([]);

  // Customer Reviews State
  const [customerReviews, setCustomerReviews] = useState<any[]>([]);

 useEffect(() => {
  if (!isUnlocked) return;

  let unsubs: (() => void)[] = [];
    try {
      // 1. Reviews
      const reviewsCol = collection(db, 'reviews');
      const unsubReviews = onSnapshot(reviewsCol, (snapshot) => {
        const live: any[] = [];
        snapshot.forEach((docSnap) => {
          live.push({ id: docSnap.id, ...docSnap.data() });
        });
        setCustomerReviews(live);
      }, (err) => {
        console.warn('Firestore review subscription offline:', err);
      });
      unsubs.push(unsubReviews);

      // 2. Orders
      const ordersCol = collection(db, 'orders');
      const unsubOrders = onSnapshot(ordersCol, (snapshot) => {
        const liveOrders: OrderRecord[] = [];
        snapshot.forEach((docSnap) => {
          liveOrders.push({ id: docSnap.id, ...docSnap.data() } as OrderRecord);
        });
        setOrders(liveOrders);
        
      }, (err) => {
        console.warn('Firestore orders subscription offline:', err);
      });
      unsubs.push(unsubOrders);

      // 3. Worker Applications
      const appsCol = collection(db, 'workerApplications');
      const unsubApps = onSnapshot(appsCol, (snapshot) => {
        const liveApps: WorkerApplication[] = [];
        snapshot.forEach((docSnap) => {
          liveApps.push({ id: docSnap.id, ...docSnap.data() } as WorkerApplication);
        });
        setWorkerApps(liveApps);
        
      }, (err) => {
        console.warn('Firestore applications subscription offline:', err);
      });
      unsubs.push(unsubApps);

      // 4. Warranty Claims
      const claimsCol = collection(db, 'warranty_claims');
      const unsubClaims = onSnapshot(claimsCol, (snapshot) => {
        const liveClaims: WarrantyClaim[] = [];
        snapshot.forEach((docSnap) => {
          liveClaims.push({ id: docSnap.id, ...docSnap.data() } as WarrantyClaim);
        });
        setWarrantyClaims(liveClaims);
        
      }, (err) => {
        console.warn('Firestore claims subscription offline:', err);
      });
      unsubs.push(unsubClaims);

      // 5. Complaints
      const complaintsCol = collection(db, 'complaints');
      const unsubComplaints = onSnapshot(complaintsCol, (snapshot) => {
        const liveComplaints: ComplaintRecord[] = [];
        snapshot.forEach((docSnap) => {
          liveComplaints.push({ id: docSnap.id, ...docSnap.data() } as ComplaintRecord);
        });
        setComplaints(liveComplaints);
      
      }, (err) => {
        console.warn('Firestore complaints subscription offline:', err);
      });
      unsubs.push(unsubComplaints);

    } catch (e) {
      console.warn('Firestore listeners setup error:', e);
    }

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, []);

  // Activity log feed
  const [activityLogs, setActivityLogs] = useState<Array<{ id: string; time: string; text: string; tag: string }>>([]);

  // Load orders and worker applications from shared localStorage data
  const loadData = () => {
    const rawHistory = localStorage.getItem('punchx_order_history') || '[]';
    try {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        setOrders(parsed);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }

    const rawApps = localStorage.getItem('punchx_worker_applications') || '[]';
    try {
      const parsedApps = JSON.parse(rawApps);
      if (Array.isArray(parsedApps)) {
        setWorkerApps(parsedApps);
      } else {
        setWorkerApps([]);
      }
    } catch {
      setWorkerApps([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addActivityLog = (text: string, tag: string) => {
    const newLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      tag
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 15)]);
  };

  // Handle Approving Worker Registration
  const handleApproveWorker = async (appId: string) => {
    const target = workerApps.find(a => a.id === appId);
    const updated = workerApps.map(a => a.id === appId ? { ...a, status: 'APPROVED' as const } : a);
    setWorkerApps(updated);
    localStorage.setItem('punchx_worker_applications', JSON.stringify(updated));

    // Update credential mapping if phone is known
    if (target?.phone) {
      const credKey = `punchx_worker_cred_${target.phone}`;
      try {
        const existingCred = JSON.parse(localStorage.getItem(credKey) || '{}');
        localStorage.setItem(credKey, JSON.stringify({ ...existingCred, status: 'APPROVED' }));
      } catch (e) {
        console.warn(e);
      }
    }

    // Set approval signal and trigger storage event
    localStorage.setItem('punchx_worker_approved', JSON.stringify({ appId, phone: target?.phone, status: 'APPROVED', timestamp: Date.now() }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('punchx_worker_approved', { detail: { appId, phone: target?.phone, status: 'APPROVED' } }));
    }

    try {
      await setDoc(doc(db, 'workerApplications', appId), { status: 'APPROVED', approvedAt: new Date().toISOString() }, { merge: true });
      
      // Also query users collection for matching phone/applicationId
      const usersCol = collection(db, 'users');
      const userSnaps = await getDocs(usersCol);
      userSnaps.forEach(async (uDoc) => {
        const uData = uDoc.data();
        if (uData.applicationId === appId || (target?.phone && uData.phone === target.phone) || (target?.email && uData.email === target.email)) {
          await updateDoc(doc(db, 'users', uDoc.id), { status: 'APPROVED', approvedAt: new Date().toISOString() });
        }
      });
    } catch (e) {
      console.error("Error updating worker application status in Firestore:", e);
    }

    showNotification(`🎉 Registration ${appId} (${target?.legalName || 'Worker'}) ACCEPTED! Worker authorized to access panel.`);
    addActivityLog(`Registration ${appId} (${target?.legalName}) APPROVED`, 'WORKER');
  };

  // Handle Rejecting Worker Registration
  const handleRejectWorker = async () => {
    if (!rejectModal) return;
    const { appId, applicantName } = rejectModal;
    const target = workerApps.find(a => a.id === appId);
    const updated = workerApps.map(a => a.id === appId ? { ...a, status: 'REJECTED' as const } : a);
    setWorkerApps(updated);
    localStorage.setItem('punchx_worker_applications', JSON.stringify(updated));

    if (target?.phone) {
      const credKey = `punchx_worker_cred_${target.phone}`;
      try {
        const existingCred = JSON.parse(localStorage.getItem(credKey) || '{}');
        localStorage.setItem(credKey, JSON.stringify({ ...existingCred, status: 'REJECTED' }));
      } catch (e) {
        console.warn(e);
      }
    }

    localStorage.setItem('punchx_worker_approved', JSON.stringify({ appId, phone: target?.phone, status: 'REJECTED', timestamp: Date.now() }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('punchx_worker_approved', { detail: { appId, phone: target?.phone, status: 'REJECTED' } }));
    }

    try {
      await setDoc(doc(db, 'workerApplications', appId), { status: 'REJECTED', rejectionReason, rejectedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error("Error updating worker application status in Firestore:", e);
    }

    showNotification(`❌ Registration ${appId} (${applicantName}) DECLINED. Reason: ${rejectionReason}`);
    addActivityLog(`Registration ${appId} DECLINED (${rejectionReason})`, 'WORKER');
    setRejectModal(null);
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderRecord['status']) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem('punchx_order_history', JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) {
      console.error("Error updating order status in Firestore:", e);
    }

    showNotification(`✓ Order ${orderId} status updated to: ${newStatus}`);
    addActivityLog(`Order ${orderId} updated to ${newStatus}`, 'ORDER');
  };

  // Reassign technician for a service booking
  const handleReassignWorker = async (newWorkerName: string) => {
    if (!reassignModal) return;
    const { orderId } = reassignModal;
    const updated = orders.map(o => o.id === orderId ? { ...o, workerName: newWorkerName } : o);
    setOrders(updated);
    localStorage.setItem('punchx_order_history', JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'orders', orderId), { workerName: newWorkerName });
    } catch (e) {
      console.error("Error reassigning worker in Firestore:", e);
    }

    showNotification(`🔄 Service ${orderId} reassigned to technician: ${newWorkerName}`);
    addActivityLog(`Order ${orderId} reassigned to ${newWorkerName}`, 'REASSIGN');
    setReassignModal(null);
  };

  // Create manual dispatch order
  const handleCreateManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerAddress.trim()) {
      showNotification('⚠️ Please specify customer name and service address');
      return;
    }
    const newId = `PX-${Math.floor(9050 + Math.random() * 100)}`;
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const createdOrder: OrderRecord = {
      id: newId,
      category: newCategory,
      workerName: newWorkerName,
      price: Number(newPrice) || 500,
      date: 'Today, Just Now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'In-Progress',
      customerName: newCustomerName,
      customerAddress: newCustomerAddress,
      customerPhone: newCustomerPhone || '+91 98765 43210',
      otpCode,
      paymentMethod: 'UPI (Dispatched)',
      issueDescription: newIssueDesc || 'Manual dispatch booking created via Enterprise Admin Console',
      createdAt: new Date().toISOString()
    };

    const updated = [createdOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('punchx_order_history', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'orders', newId), createdOrder);
      console.log('Manual dispatch order saved to Firestore:', newId);
    } catch (e) {
      console.error('Error writing manual dispatch order to Firestore:', e);
    }

    showNotification(`🚀 Dispatch #${newId} assigned to ${newWorkerName} for ${newCustomerName}!`);
    addActivityLog(`Manual Order #${newId} dispatched to ${newWorkerName}`, 'DISPATCH');
    setNewDispatchModal(false);

    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setNewIssueDesc('');
  };

  const handleResolveEmergency = (sosId: string) => {
    setEmergencyAlerts(prev => prev.filter(e => e.id !== sosId));
    showNotification(`🚨 Emergency SOS ${sosId} resolved & technician safety cleared.`);
    addActivityLog(`Emergency SOS Alert ${sosId} marked resolved by Admin`, 'SYSTEM');
  };

  // Export CSV Data
  const handleExportCSV = () => {
    let csv = 'Type,ID,Name/Customer,Category/Skill,Amount/Phone,Status,Date\n';
    orders.forEach(o => {
      csv += `Order,${o.id},"${o.customerName || 'Customer'}","${o.category}",₹${o.price},${o.status},"${o.date}"\n`;
    });
    workerApps.forEach(a => {
      csv += `Registration,${a.id},"${a.legalName}","${a.skill}",${a.phone},${a.status},"${a.appliedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PunchX_Enterprise_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showNotification('📄 Enterprise Ledger CSV exported successfully!');
  };

  // One-click Purge Mock & Test Data function
  const handlePurgeMockData = async () => {
    const confirmed = window.confirm(
      "⚠️ PURGE TEST / MOCK RECORDS\n\nThis will permanently remove all test/mock accounts, dummy orders, placeholder reviews, and seed worker profiles from Firestore and local storage.\n\nReal user profiles will NOT be deleted.\n\nDo you wish to proceed?"
    );
    if (!confirmed) return;

    setIsPurging(true);
    showNotification("🧹 Purging test and mock records across database...");
    try {
      const summary = await purgeMockUsersAndData();
      showNotification(`✅ Purge complete: ${summary.deletedUsers} test users, ${summary.deletedWorkerApplications} workers, ${summary.deletedOrders} orders, ${summary.deletedReviews} reviews removed.`);
      addActivityLog(`Database Mock Purge executed: ${JSON.stringify(summary)}`, 'SYSTEM');
      await loadData();
    } catch (err) {
      console.error("Purge error:", err);
      showNotification("❌ Error during database purge. Check console for details.");
    } finally {
      setIsPurging(false);
    }
  };

  // Compute live analytical totals
  const totalRevenue = orders.reduce((acc, o) => acc + (o.status === 'Done' ? o.price : 0), 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  const liveInProgressCount = orders.filter(o => o.status === 'In-Progress').length;
  const completedCount = orders.filter(o => o.status === 'Done').length;
  const pendingRegistrationsCount = workerApps.filter(a => a.status === 'PENDING').length;

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          o.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          (o.customerName || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
                          o.workerName.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Real monthly orders graph derived strictly from database records
  const monthlyOrdersData = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const dayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      return d.getDate() === day;
    });
    const dayRevenue = dayOrders.reduce((acc, curr) => acc + (curr.price || 0), 0);
    return {
      day,
      ordersCount: dayOrders.length,
      revenue: dayRevenue
    };
  });
  const maxOrdersInDay = Math.max(1, ...monthlyOrdersData.map(d => d.ordersCount));
  if (!currentUser) {
  return (
    <div className="min-h-screen bg-[#07122a] text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-sm text-zinc-400 mt-2">
          Please sign in with your NamoID account first.
        </p>
      </div>
    </div>
  );
}

if (!isUnlocked) {
  return (
    <div className="min-h-screen bg-[#07122a] text-white flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Admin Access Denied</h2>
        <p className="text-sm text-zinc-400 mt-2">
          Your account is authenticated but does not have administrator privileges.
        </p>
        <button
          onClick={() => onTransition('panel-select')}
          className="mt-5 px-4 py-2 rounded-xl bg-[#c5a059] text-black font-bold text-sm"
        >
          Back to Panel Selection
        </button>
      </div>
    </div>
  );
}
    <div id="admin-dashboard-root" className="w-full min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans pb-24 overflow-x-hidden">
      
      {/* Top Navigation Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#07122a]/95 backdrop-blur-md border-b border-[#c5a059]/30 px-4 sm:px-8 py-3 flex flex-wrap justify-between items-center gap-3 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white border border-[#c5a059]/40 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0 shadow-md">
            <img src={PUNCHX_LOGO} alt="PunchX Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2 flex-wrap truncate">
              PUNCH<span className="text-[#c5a059]">X</span> ENTERPRISE COMMAND
              <span className="text-[9px] font-mono uppercase bg-[#c5a059]/20 text-[#e9c176] px-2 py-0.5 rounded border border-[#c5a059]/30 flex-shrink-0">
                PRO DASHBOARD
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono truncate">Live Booking Dispatch & Registration Approval Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-[#15203b] border border-[#c5a059]/30 text-[#e9c176] hover:bg-[#c5a059] hover:text-black transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold whitespace-nowrap shadow-sm active:scale-95"
            title="Download CSV Ledger"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </button>

          <button
            onClick={loadData}
            className="px-3 py-2 rounded-xl bg-[#15203b] border border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold whitespace-nowrap shadow-sm active:scale-95"
            title="Sync Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SYNC</span>
          </button>

          <button
            onClick={handlePurgeMockData}
            disabled={isPurging}
            className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold whitespace-nowrap shadow-sm active:scale-95 disabled:opacity-50"
            title="Purge Test/Mock Data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPurging ? 'PURGING...' : 'PURGE MOCK DATA'}</span>
          </button>

          <button
           onClick={async () => {
  try {
    await signOut(auth);
    showNotification('🚪 Logged out from Company Admin Dashboard');
    onTransition('panel-select');
  } catch (error) {
    console.error('Admin logout failed:', error);
    showNotification('❌ Logout failed. Please try again.');
  }
}}
            className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-5 space-y-6">

        {/* Primary Tab Switcher */}
        <div className="bg-[#11192e] border border-[#c5a059]/30 p-2 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar pb-1 md:pb-0">
            
            {/* 1. Live & Booked Services Tab */}
            <button
              onClick={() => setActiveTab('live_services')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'live_services'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Radio className={`w-4 h-4 ${activeTab === 'live_services' ? 'text-black' : 'text-emerald-400 animate-pulse'}`} />
              <span>Live & Booked Services</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'live_services' ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {orders.length}
              </span>
            </button>

            {/* 2. New Registrations Tab (Accept / Decline) */}
            <button
              onClick={() => setActiveTab('registrations')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'registrations'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>New Registrations</span>
              {pendingRegistrationsCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-bounce ${
                  activeTab === 'registrations' ? 'bg-black text-[#c5a059]' : 'bg-amber-400 text-black'
                }`}>
                  {pendingRegistrationsCount} NEW
                </span>
              )}
            </button>

            {/* 3. Customer Analytics Tab */}
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Customer Analytics</span>
            </button>

            {/* 4. Worker Fleet Directory */}
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'workers'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Worker Fleet ({workerApps.filter(a => a.status === 'APPROVED').length})</span>
            </button>

            {/* 5. Customer Reviews Tab */}
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Reviews ({customerReviews.length})</span>
            </button>

            {/* 6. 30-Day Guarantee Claims Tab */}
            <button
              onClick={() => setActiveTab('warranty_claims')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'warranty_claims'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#e9c176]" />
              <span>30-Day Guarantee</span>
              {warrantyClaims.filter(c => c.status === 'PENDING_ADMIN_REVIEW').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-black font-extrabold animate-bounce">
                  {warrantyClaims.filter(c => c.status === 'PENDING_ADMIN_REVIEW').length} NEW
                </span>
              )}
            </button>

            {/* 7. Arrival Quality & Complaints Tab */}
            <button
              onClick={() => setActiveTab('complaints')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'complaints'
                  ? 'bg-rose-500 text-white shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${complaints.filter(c => c.status === 'CRITICAL_PENDING_ADMIN').length > 0 ? 'text-rose-400 animate-pulse' : 'text-zinc-400'}`} />
              <span>Quality Escalations</span>
              {complaints.filter(c => c.status === 'CRITICAL_PENDING_ADMIN').length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                  {complaints.filter(c => c.status === 'CRITICAL_PENDING_ADMIN').length} CRITICAL
                </span>
              )}
            </button>

            {/* 8. Enterprise Command Overview */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Command Overview</span>
            </button>

            {/* 9. Dynamic Platform & Service Management */}
            <button
              onClick={() => setActiveTab('platform_mgmt')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'platform_mgmt'
                  ? 'bg-[#c5a059] text-black shadow-lg scale-[1.02]'
                  : 'bg-[#07122a] text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Config</span>
            </button>

          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
            {/* Quick Manual Dispatch Creator Button */}
            <button
              onClick={() => setNewDispatchModal(true)}
              className="px-3 py-2 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-lg active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ CREATE DISPATCH</span>
            </button>
          </div>
        </div>

        {/* Emergency SOS & Safety Escalations Banner */}
        {emergencyAlerts.length > 0 && (
          <div className="bg-rose-500/15 border-2 border-rose-500/50 p-4 rounded-2xl shadow-xl space-y-2 animate-pulse">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                CRITICAL FIELD ESCALATION / TECHNICIAN EMERGENCY SOS
              </span>
              <span className="text-[10px] font-mono bg-rose-500 text-white px-2 py-0.5 rounded font-extrabold">
                IMMEDIATE ACTION REQUIRED
              </span>
            </div>
            {emergencyAlerts.map(alert => (
              <div key={alert.id} className="bg-[#07122a] border border-rose-500/30 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold">{alert.worker}</span>
                    <span className="text-zinc-400 text-[10px] font-mono">({alert.location})</span>
                  </div>
                  <p className="text-rose-300 font-mono text-[11px]">{alert.issue}</p>
                </div>
                <button
                  onClick={() => handleResolveEmergency(alert.id)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-extrabold text-xs rounded-lg transition-all cursor-pointer flex-shrink-0"
                >
                  Clear SOS Incident
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Top Summary KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#11192e] border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-1">
            <div className="flex justify-between items-center text-zinc-400 text-[10px] font-mono font-bold uppercase">
              <span>Booked Services</span>
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{orders.length} Applications</div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span>⚡ {liveInProgressCount} Live Dispatches Active</span>
            </div>
          </div>

          <div className="bg-[#11192e] border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-1">
            <div className="flex justify-between items-center text-zinc-400 text-[10px] font-mono font-bold uppercase">
              <span>Pending Registrations</span>
              <UserCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">{pendingRegistrationsCount} Applicants</div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Action needed to Accept or Decline
            </div>
          </div>

          <div className="bg-[#11192e] border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-1">
            <div className="flex justify-between items-center text-zinc-400 text-[10px] font-mono font-bold uppercase">
              <span>Gross Ledger Revenue</span>
              <DollarSign className="w-4 h-4 text-[#e9c176]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#e9c176]">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +18.4% Monthly Revenue
            </div>
          </div>

          <div className="bg-[#11192e] border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-1">
            <div className="flex justify-between items-center text-zinc-400 text-[10px] font-mono font-bold uppercase">
              <span>On-Duty Specialists</span>
              <Wrench className="w-4 h-4 text-[#c5a059]" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{workerApps.filter(a => a.status === 'APPROVED').length} Active</div>
            <div className="text-[10px] text-zinc-400 font-mono">Out of {workerApps.length} Total Registered</div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LIVE & BOOKED SERVICE APPLICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'live_services' && (
          <section className="space-y-6">
            <div className="bg-[#11192e] border border-[#c5a059]/30 rounded-3xl p-6 shadow-xl space-y-5">
              
              {/* Header Controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    Live & Scheduled Service Applications Directory
                  </h2>
                  <p className="text-xs text-zinc-400">Monitor live active dispatches, assign field technicians & update statuses</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer, order, worker..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-[#07122a] border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#c5a059]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#07122a] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="In-Progress">In-Progress (Live)</option>
                    <option value="Pending">Pending Dispatch</option>
                    <option value="Done">Completed (Done)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Service Applications Grid Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOrders.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs bg-[#07122a] rounded-2xl border border-zinc-800">
                    No service applications match current filter.
                  </div>
                ) : (
                  filteredOrders.map(order => (
                    <div 
                      key={order.id}
                      className="bg-[#07122a] border border-zinc-800 hover:border-[#c5a059]/40 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
                    >
                      {/* Top Row: Order ID, Category, Status */}
                      <div className="flex justify-between items-start gap-2 border-b border-zinc-800/80 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-[#e9c176]">{order.id}</span>
                            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              order.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              order.status === 'In-Progress' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' :
                              order.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {order.status === 'In-Progress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>}
                              {order.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white mt-1">{order.category}</h3>
                        </div>

                        <div className="text-right">
                          <p className="font-mono font-extrabold text-base text-[#e9c176]">₹{order.price}</p>
                          <p className="text-[10px] font-mono text-zinc-400">{order.date}</p>
                        </div>
                      </div>

                      {/* Customer Details & Issue Description */}
                      <div className="space-y-1.5 text-xs text-zinc-300 bg-[#11192e] p-3 rounded-xl border border-zinc-800/80">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <User className="w-3.5 h-3.5 text-[#c5a059]" />
                          <span>Customer: {order.customerName || 'Anonymous Customer'}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({order.customerPhone || '+91 98765 00000'})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="truncate">{order.customerAddress || 'HSR Layout, Sector 1, Bengaluru'}</span>
                        </div>
                        {order.issueDescription && (
                          <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-800/60">
                            "{order.issueDescription}"
                          </p>
                        )}
                      </div>

                      {/* Assigned Specialist & Reassign Button */}
                      <div className="flex items-center justify-between bg-[#15203b]/60 p-3 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#07122a] border border-[#c5a059]/40 flex items-center justify-center p-0.5 overflow-hidden">
                            <Wrench className="w-4 h-4 text-[#c5a059]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-zinc-400 uppercase">Assigned Technician</p>
                            <p className="text-xs font-bold text-white font-mono">{order.workerName}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setReassignModal({ open: true, orderId: order.id, currentWorker: order.workerName })}
                          className="px-2.5 py-1.5 bg-[#07122a] hover:bg-[#c5a059] text-[#e9c176] hover:text-black border border-[#c5a059]/30 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Reassign
                        </button>
                      </div>

                      {/* Action Buttons Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => setInspectModal(order)}
                          className="px-3 py-1.5 bg-[#11192e] hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-mono font-bold border border-zinc-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#c5a059]" /> Dispatch Details
                        </button>

                        <div className="flex items-center gap-1.5">
                          {order.status !== 'In-Progress' && order.status !== 'Done' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'In-Progress')}
                              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-blue-500/40 cursor-pointer"
                            >
                              Dispatch Live
                            </button>
                          )}

                          {order.status !== 'Done' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Done')}
                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black rounded-xl text-xs font-mono font-bold border border-emerald-500/40 cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}

                          {order.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-rose-500/30 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: NEW WORKER REGISTRATIONS (ACCEPT / DECLINE) */}
        {/* ========================================================================= */}
        {activeTab === 'registrations' && (
          <section className="space-y-6">
            <div className="bg-[#11192e] border border-[#c5a059]/40 rounded-3xl p-6 shadow-xl space-y-5">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#c5a059]" />
                    Incoming Worker Application Registrations
                  </h2>
                  <p className="text-xs text-zinc-400">Review technician credentials, background info & Accept or Decline registration</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {pendingRegistrationsCount} Pending Action
                  </span>
                </div>
              </div>

              {/* Registration Cards List */}
              <div className="space-y-4">
                {workerApps.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs bg-[#07122a] rounded-2xl border border-zinc-800">
                    No incoming worker applications registered yet. Registered technician applications from the Worker Panel will appear here for review.
                  </div>
                ) : (
                  workerApps.map(app => (
                    <div 
                      key={app.id}
                      className={`bg-[#07122a] border rounded-2xl p-5 shadow-lg space-y-4 transition-all ${
                        app.status === 'PENDING' 
                          ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                          : app.status === 'APPROVED' 
                          ? 'border-emerald-500/30' 
                          : 'border-rose-500/30'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#15203b] border border-[#c5a059]/40 flex items-center justify-center text-[#e9c176] font-mono font-bold text-lg flex-shrink-0">
                            {(app.legalName || 'Worker').charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-extrabold text-white">{app.legalName || 'Authorized Specialist'}</h3>
                              <span className="text-xs font-mono font-bold text-[#e9c176]">{app.id}</span>
                              <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold ${
                                app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                app.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {app.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#e9c176] font-mono font-bold mt-0.5">
                              Skill: {app.skill} • {app.experienceYears}
                            </p>
                            {app.categories && app.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {app.categories.map((c, i) => (
                                  <span key={i} className="text-[10px] bg-[#c5a059]/15 text-[#e9c176] px-2 py-0.5 rounded border border-[#c5a059]/30 font-mono font-semibold">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-xs font-mono text-zinc-400">
                          <p>Applied Date: {app.appliedAt}</p>
                          <p className="text-[10px] text-emerald-400">✓ Terms & Background Consent Signed</p>
                        </div>
                      </div>

                      {/* Contact & Address Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#11192e] p-3 rounded-xl border border-zinc-800">
                        <div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Contact Phone</p>
                          <p className="text-zinc-200 font-mono font-bold flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#c5a059]" /> {app.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Email Address</p>
                          <p className="text-zinc-200 font-mono font-bold truncate mt-0.5">{app.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Base Location</p>
                          <p className="text-zinc-200 font-mono font-bold truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#c5a059]" /> {app.address}
                          </p>
                        </div>
                      </div>

                      {/* Accept / Decline Action Controls */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-zinc-400">
                          {app.status === 'PENDING' ? '⚡ Action required: Review credentials & approve technician' : `Status locked: ${app.status}`}
                        </span>

                        <div className="flex items-center gap-2">
                          {app.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleApproveWorker(app.id)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-extrabold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" /> ACCEPT & AUTHORIZE
                            </button>
                          )}

                          {app.status !== 'REJECTED' && (
                            <button
                              onClick={() => setRejectModal({ open: true, appId: app.id, applicantName: app.legalName })}
                              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                            >
                              <XCircle className="w-4 h-4" /> DECLINE
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CUSTOMER ANALYTICS & GRAPH */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <section className="space-y-6">
            <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#c5a059]" />
                    Daily Service Orders Graph Across Days of Month (Day 1 - Day 31)
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">Interactive demand curves and order volume distribution</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#07122a] border border-[#c5a059]/40 text-[#e9c176] font-bold">
                    July 2026 Tally
                  </span>
                  {selectedMonthDay && (
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Day {selectedMonthDay}: {monthlyOrdersData[selectedMonthDay - 1]?.ordersCount} Orders
                    </span>
                  )}
                </div>
              </div>

              {/* Bar Chart Visual */}
              <div className="space-y-3">
                <div className="h-48 w-full bg-[#07122a] border border-zinc-800/80 rounded-2xl p-4 flex items-end gap-1.5 overflow-x-auto relative shadow-inner">
                  {monthlyOrdersData.map((d) => {
                    const heightPercent = Math.max(12, Math.round((d.ordersCount / maxOrdersInDay) * 100));
                    const isSelected = selectedMonthDay === d.day;
                    const isToday = d.day === 26;

                    return (
                      <div
                        key={d.day}
                        onClick={() => setSelectedMonthDay(d.day)}
                        className="flex-1 min-w-[18px] flex flex-col items-center gap-1 group cursor-pointer"
                      >
                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-extrabold px-1 rounded bg-[#c5a059] text-black mb-1 whitespace-nowrap shadow ${isSelected ? 'opacity-100' : ''}`}>
                          {d.ordersCount}
                        </div>

                        <div className="w-full relative flex items-end justify-center rounded-t-md overflow-hidden bg-zinc-800/40" style={{ height: '120px' }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.4, delay: d.day * 0.01 }}
                            className={`w-full rounded-t-md transition-all ${
                              isToday
                                ? 'bg-gradient-to-t from-[#c5a059] to-[#ffdea5] shadow-[0_0_12px_rgba(197,160,89,0.8)]'
                                : isSelected
                                ? 'bg-emerald-400'
                                : 'bg-[#c5a059]/40 group-hover:bg-[#c5a059]/80'
                            }`}
                          />
                        </div>

                        <span className={`text-[9px] font-mono font-bold ${isToday ? 'text-[#e9c176]' : 'text-zinc-500'}`}>
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 px-1">
                  <span>Day 1 (Start)</span>
                  <span className="text-[#e9c176] font-bold">▲ Day 26 (Today Peak Volume)</span>
                  <span>Day 31 (End)</span>
                </div>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-[#07122a] border border-zinc-800 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>Active Revenue & Orders</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Bookings:</span>
                      <span className="text-white font-bold">{totalOrdersCount} Orders</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Completed Volume:</span>
                      <span className="text-[#e9c176] font-bold">{completedCount} Orders</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-emerald-400 font-bold">
                      <span>Gross Realized:</span>
                      <span>₹{totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#07122a] border border-zinc-800 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>Fulfillment Metrics</span>
                    <Activity className="w-4 h-4 text-[#c5a059]" />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>In-Progress / Dispatched:</span>
                      <span className="text-white font-bold">{liveInProgressCount} Active</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Pending Dispatch:</span>
                      <span className="text-[#e9c176] font-bold">{pendingOrdersCount}</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-emerald-400 font-bold">
                      <span>Completion Rate:</span>
                      <span>{totalOrdersCount > 0 ? ((completedCount / totalOrdersCount) * 100).toFixed(1) : '100'}% Success</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#07122a] border border-zinc-800 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>Fleet & Category Distribution</span>
                    <Wrench className="w-4 h-4 text-[#e9c176]" />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Verified Field Specialists:</span>
                      <span className="text-[#e9c176] font-bold">{workerApps.filter(a => a.status === 'APPROVED').length} Active</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Pending Applications:</span>
                      <span className="text-white font-bold">{pendingRegistrationsCount}</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-zinc-300">
                      <span>Open Warranty Claims:</span>
                      <span className="text-amber-400 font-bold">{warrantyClaims.filter(c => c.status === 'PENDING_ADMIN_REVIEW').length}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WORKER FLEET DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'workers' && (
          <section className="space-y-6">
            <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#c5a059]" />
                    Authorized Specialist Worker Network
                  </h2>
                  <p className="text-xs text-zinc-400">Complete details, duty status & direct phone contact of all active technicians</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#e9c176] bg-[#07122a] px-3 py-1.5 rounded-xl border border-[#c5a059]/30">
                  {workerApps.filter(a => a.status === 'APPROVED').length} Verified Field Specialists
                </span>
              </div>

              {/* Grid of Worker Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workerApps.filter(a => a.status === 'APPROVED').length > 0 ? (
                  workerApps.filter(a => a.status === 'APPROVED').map((app, idx) => (
                    <div 
                      key={app.id} 
                      className="bg-[#07122a] border border-zinc-800 hover:border-[#c5a059]/50 rounded-2xl p-5 space-y-4 transition-all hover:shadow-xl group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-[#15203b] border-2 border-[#c5a059] flex items-center justify-center font-bold text-white shadow-md">
                            {(app.legalName || 'Worker').charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-white group-hover:text-[#e9c176] transition-colors">
                              {app.legalName || 'Authorized Specialist'}
                            </h4>
                            <p className="text-xs text-[#e9c176] font-mono font-bold">{app.skill}</p>
                            <span className="text-[10px] text-zinc-400 font-mono">ID: {app.id}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-extrabold border flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          AUTHORIZED
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs bg-[#11192e] p-2.5 rounded-xl border border-zinc-800 font-mono">
                        <span className="text-[#e9c176] font-bold">Exp: {app.experienceYears}</span>
                        <span className="bg-[#c5a059]/20 text-[#e9c176] px-2 py-0.5 rounded border border-[#c5a059]/30 text-[10px] uppercase font-bold">
                          ACTIVE FLEET
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs border-t border-zinc-800/80">
                        <div className="flex justify-between text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" /> Phone:
                          </span>
                          <span className="text-zinc-300 font-mono text-[11px]">{app.phone}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Location:
                          </span>
                          <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[160px]">{app.address}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 px-6 border border-dashed border-[#c5a059]/30 bg-[#07122a] rounded-3xl text-center space-y-3">
                    <UserCheck className="w-10 h-10 text-[#c5a059] mx-auto opacity-75" />
                    <h3 className="font-bold text-base text-white">No Authorized Workers in Fleet Yet</h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                      Technicians who apply and get approved will appear here in the active fleet directory.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CUSTOMER REVIEWS & SATISFACTION FEEDBACK */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && (() => {
          const avgRating = customerReviews.length > 0
            ? (customerReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / customerReviews.length).toFixed(2)
            : '5.0';
          return (
            <section className="space-y-6">
              <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      Customer Reviews & Feedback Ratings
                    </h2>
                    <p className="text-xs text-zinc-400">Verified service ratings and user satisfaction audit</p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#07122a] px-3 py-1.5 rounded-xl border border-[#c5a059]/30">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-extrabold text-white font-mono">{avgRating} / 5.0</span>
                    <span className="text-xs text-zinc-400 font-mono">({customerReviews.length} verified ratings)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {customerReviews.length === 0 ? (
                    <div className="col-span-full py-12 px-6 border border-dashed border-[#c5a059]/30 bg-[#07122a] rounded-3xl text-center space-y-3">
                      <Star className="w-10 h-10 text-amber-400 mx-auto opacity-75" />
                      <h3 className="font-bold text-base text-white">No Customer Reviews Yet</h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Customer ratings submitted after completed orders will appear here automatically.
                      </p>
                    </div>
                  ) : (
                    customerReviews.map(rev => (
                      <div key={rev.id} className="bg-[#07122a] border border-zinc-800 p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-white">{rev.customer || 'Customer'}</h4>
                            <span className="text-[10px] font-mono text-[#e9c176]">{rev.category || 'Service'}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-300 italic">"{rev.comment || 'Service completed with high quality and verified workmanship.'}"</p>
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
                          <span>Verified Customer</span>
                          <span>{rev.date || 'Recent'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 6: ENTERPRISE COMMAND OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <section className="space-y-6">
            
            {/* Live System Activity Log Feed */}
            <div className="bg-[#11192e] border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#c5a059]" />
                  Enterprise Activity Audit Stream
                </h3>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  ● Real-time Logging Active
                </span>
              </div>

              <div className="space-y-2">
                {activityLogs.map(log => (
                  <div key={log.id} className="bg-[#07122a] border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono uppercase bg-[#c5a059]/20 text-[#e9c176] px-2 py-0.5 rounded border border-[#c5a059]/30 font-bold">
                        {log.tag}
                      </span>
                      <span className="text-zinc-200 font-medium">{log.text}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Broadcast Panel */}
            <div className="bg-gradient-to-r from-[#11192e] via-[#15203b] to-[#07122a] border border-[#c5a059]/40 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-amber-400" />
                  Technician Broadcast Emergency Dispatch Channel
                </h3>
                <p className="text-xs text-zinc-400">Broadcast high-priority urgent service demands to all on-duty specialists in Bengaluru.</p>
              </div>

              <button
                onClick={() => showNotification("📢 Broadcast alert sent to 8 On-Duty Technicians across Bengaluru!")}
                className="px-5 py-3 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 whitespace-nowrap"
              >
                <Send className="w-4 h-4" /> Broadcast Urgent Alert
              </button>
            </div>

          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: 30-DAY FREE REVISIT GUARANTEE CLAIMS */}
        {/* ========================================================================= */}
        {activeTab === 'warranty_claims' && (
          <WarrantyClaimsManager
            claims={warrantyClaims}
            onClaimUpdated={loadData}
            showNotification={showNotification}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 8: ARRIVAL QUALITY ESCALATIONS & COMPLAINTS */}
        {/* ========================================================================= */}
        {activeTab === 'complaints' && (
          <ComplaintsManager
            complaints={complaints}
            onComplaintUpdated={loadData}
            showNotification={showNotification}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 9: DYNAMIC PLATFORM, SERVICES & PRICING CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'platform_mgmt' && (
          <PlatformSettingsManager
            showNotification={showNotification}
          />
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: REASSIGN TECHNICIAN MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {reassignModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border border-[#c5a059]/40 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#c5a059]" /> Reassign Technician ({reassignModal.orderId})
                </h3>
                <button 
                  onClick={() => setReassignModal(null)}
                  className="text-zinc-400 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-300 font-mono">
                Currently assigned: <span className="text-[#e9c176] font-bold">{reassignModal.currentWorker}</span>
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pt-1">
                {workerApps.filter(a => a.status === 'APPROVED').length > 0 ? (
                  workerApps.filter(a => a.status === 'APPROVED').map(expert => (
                    <button
                      key={expert.id}
                      onClick={() => handleReassignWorker(expert.legalName || 'Authorized Worker')}
                      className="w-full bg-[#07122a] hover:bg-[#15203b] border border-zinc-800 hover:border-[#c5a059] p-3 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#15203b] border border-[#c5a059] flex items-center justify-center font-bold text-white text-xs">
                          {(expert.legalName || 'W').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{expert.legalName || 'Authorized Worker'}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{expert.skill} • ID: {expert.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#e9c176] font-bold bg-[#c5a059]/20 px-2 py-1 rounded">
                        Select
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-500 font-mono">
                    No approved technicians in fleet yet.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: INSPECT DISPATCH & OTP MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {inspectModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border border-[#c5a059]/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#c5a059]" /> Service Dispatch Dossier ({inspectModal.id})
                </h3>
                <button 
                  onClick={() => setInspectModal(null)}
                  className="text-zinc-400 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Service Category:</span>
                    <span className="text-white font-bold">{inspectModal.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Customer Name:</span>
                    <span className="text-[#e9c176] font-bold">{inspectModal.customerName || 'Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Customer Phone:</span>
                    <span className="text-white font-mono">{inspectModal.customerPhone || '+91 98765 43210'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Full Address:</span>
                    <span className="text-zinc-300 font-mono text-right max-w-[240px] truncate">{inspectModal.customerAddress || 'HSR Layout, Bengaluru'}</span>
                  </div>
                </div>

                <div className="bg-[#07122a] p-3.5 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Verification OTP Code:</span>
                    <span className="px-3 py-1 bg-[#c5a059] text-black font-mono font-extrabold rounded text-sm tracking-widest">
                      {inspectModal.otpCode || '8492'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payment Mode:</span>
                    <span className="text-emerald-400 font-mono font-bold">{inspectModal.paymentMethod || 'UPI Paid'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Assigned Worker:</span>
                    <span className="text-white font-mono font-bold">{inspectModal.workerName}</span>
                  </div>
                </div>

                {inspectModal.issueDescription && (
                  <div className="bg-[#07122a] p-3 rounded-xl border border-zinc-800 space-y-1">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Customer Issue Description</p>
                    <p className="text-zinc-300 italic">"{inspectModal.issueDescription}"</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setInspectModal(null)}
                className="w-full py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT WORKER REGISTRATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border border-rose-500/40 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-400" /> Decline Registration Application
                </h3>
                <button 
                  onClick={() => setRejectModal(null)}
                  className="text-zinc-400 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-300">
                You are about to decline registration application for <span className="text-white font-bold">{rejectModal.applicantName}</span> ({rejectModal.appId}).
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold">Select Decline Reason</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500 font-mono cursor-pointer"
                >
                  <option value="Incomplete Identity Documentation">Incomplete Identity Documentation</option>
                  <option value="Skill Certification Unverified">Skill Certification Unverified</option>
                  <option value="Does Not Meet 3+ Years Experience Threshold">Does Not Meet 3+ Years Experience Threshold</option>
                  <option value="Location Outside Service Zone">Location Outside Service Zone</option>
                  <option value="Failed Background Verification Check">Failed Background Verification Check</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setRejectModal(null)}
                  className="flex-1 py-2.5 bg-[#07122a] hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-mono font-bold border border-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectWorker}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-mono font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE MANUAL SERVICE DISPATCH MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {newDispatchModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11192e] border border-[#c5a059]/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#c5a059]" /> Create & Dispatch Manual Service Booking
                </h3>
                <button 
                  onClick={() => setNewDispatchModal(false)}
                  className="text-zinc-400 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateManualDispatch} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Service Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059] font-mono"
                  >
                    <option value="Air Conditioner Jet Service">Air Conditioner Jet Service</option>
                    <option value="Electrical Circuit & Fuse Repair">Electrical Circuit & Fuse Repair</option>
                    <option value="Full House Deep Cleaning">Full House Deep Cleaning</option>
                    <option value="Sanitary & Pipe Leakage Repair">Sanitary & Pipe Leakage Repair</option>
                    <option value="Washing Machine Repair & Service">Washing Machine Repair & Service</option>
                    <option value="Refrigerator Cooling Repair">Refrigerator Cooling Repair</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Customer Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Verma"
                      required
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Customer Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Full Service Address *</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 301, Brigade Residency, Koramangala"
                    required
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Assign Technician</label>
                    <select
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059] font-mono"
                    >
                      {workerApps.filter(a => a.status === 'APPROVED').length > 0 ? (
                        workerApps.filter(a => a.status === 'APPROVED').map(exp => (
                          <option key={exp.id} value={exp.legalName}>{exp.legalName} ({exp.skill})</option>
                        ))
                      ) : (
                        <option value="">No approved technician available</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Booking Price (₹)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059] font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Special Job Instructions / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide specific instructions for technician..."
                    value={newIssueDesc}
                    onChange={(e) => setNewIssueDesc(e.target.value)}
                    className="w-full bg-[#07122a] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#c5a059]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewDispatchModal(false)}
                    className="flex-1 py-2.5 bg-[#07122a] hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-mono font-bold border border-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    Dispatch Now
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  ;
}
