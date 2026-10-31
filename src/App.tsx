import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PushNotificationBanner from './components/PushNotificationBanner';
import WebsiteNavbar from './components/WebsiteNavbar';
import WebsiteFooter from './components/WebsiteFooter';
import { AppScreen, Worker, WorkerApplication } from './types';
import { AuthProvider, useAuth } from './lib/authContext';
import { auth } from './lib/firebase';

const Splash = lazy(() => import('./components/Splash'));
const Auth = lazy(() => import('./components/Auth'));
const OtpVerify = lazy(() => import('./components/OtpVerify'));
const NamoIDAuthShell = lazy(() => import('./components/NamoIDAuthShell'));
const PanelSelect = lazy(() => import('./components/PanelSelect'));
const DragoAssistant = lazy(() => import('./components/DragoAssistant'));
const MobileQRModal = lazy(() => import('./components/MobileQRModal'));
const NotificationCenterModal = lazy(() => import('./components/NotificationCenterModal'));
const CitizenProfileDrawer = lazy(() => import('./components/CitizenProfileDrawer'));

const HomeDashboard = lazy(() => import('./components/Home'));
const InteractivePriceCatalogue = lazy(() => import('./components/InteractivePriceCatalogue'));
const ProvidersList = lazy(() => import('./components/ProvidersList'));
const ProviderDetails = lazy(() => import('./components/ProviderDetails'));
const ConfirmBooking = lazy(() => import('./components/ConfirmBooking'));
const ChoosePayment = lazy(() => import('./components/ChoosePayment'));
const LiveTracking = lazy(() => import('./components/LiveTracking'));
const WorkerDashboard = lazy(() => import('./components/WorkerPartnerPanel'));

const WorkerSignup = lazy(() => import('./components/WorkerSignup'));
const WorkerOtpPass = lazy(() => import('./components/WorkerOtpPass'));
const WorkerPendingApproval = lazy(() => import('./components/WorkerPendingApproval'));
const CustomerLocationSetup = lazy(() => import('./components/CustomerLocationSetup'));
const WorkerLocationSetup = lazy(() => import('./components/WorkerLocationSetup'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const Founder = lazy(() => import('./components/Founder'));
const AuthCallback = lazy(() => import('./components/AuthCallback'));

function AppMain() {
  // Keep the static, crawlable landing visible until React has committed its first screen.
  useEffect(() => {
    document.documentElement.classList.add('app-mounted');
    // Idle prefetching for critical next screens to make transitions instant
    const prefetchKeyRoutes = () => {
      import('./components/Home');
      import('./components/PanelSelect');
      import('./components/ProvidersList');
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prefetchKeyRoutes, { timeout: 2000 });
      } else {
        setTimeout(prefetchKeyRoutes, 1500);
      }
    }
  }, []);
  const { currentUser, userProfile, isLoadingProfile } = useAuth();
  // Native app wrappers pass a role-specific query parameter so each APK opens its own login.
  const urlPunchxAppMode = new URLSearchParams(window.location.search).get('punchxApp')?.toLowerCase();
  const punchxAppMode = urlPunchxAppMode === 'citizen' || urlPunchxAppMode === 'professional'
    ? urlPunchxAppMode
    : (() => { try { return localStorage.getItem('punchx_native_app_mode'); } catch { return null; } })();
  if (urlPunchxAppMode === 'citizen' || urlPunchxAppMode === 'professional') {
    try { localStorage.setItem('punchx_native_app_mode', urlPunchxAppMode); } catch { /* Continue without persistent storage. */ }
  }
  const dedicatedAppRole: 'customer' | 'worker' | null = punchxAppMode === 'professional' ? 'worker' : punchxAppMode === 'citizen' ? 'customer' : null;

  const screenRoutes: Partial<Record<AppScreen, string>> = {
    splash: '/', 'panel-select': '/panel-select', auth: '/login',
    'auth-callback': '/auth/callback', otp: '/verify-otp', 'customer-setup': '/customer/setup',
    'worker-setup': '/worker/setup', 'worker-signup': '/worker-signup',
    'worker-otp-pass': '/worker/verify', 'worker-pending-approval': '/worker/pending',
    home: '/home', catalogue: '/catalogue',
    providers: '/providers', 'provider-details': '/provider-details', booking: '/booking',
    payment: '/payment', tracking: '/tracking', 'worker-dashboard': '/worker/dashboard',
    'admin-dashboard': '/admin/dashboard', 'privacy-policy': '/privacy-policy',
    'terms-and-conditions': '/terms-and-conditions', founder: '/founder',
  };
  const resolveScreenFromLocation = (): AppScreen | null => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const search = window.location.search.toLowerCase();
    if (path === '/auth/callback' || search.includes('code=') || search.includes('state=')) return 'auth-callback';
    const aliases: Record<string, AppScreen> = {
      '/price-catalogue': 'catalogue', '/pricing': 'catalogue', '/privacy': 'privacy-policy',
      '/terms': 'terms-and-conditions', '/terms-of-service': 'terms-and-conditions',
      '/leadership': 'founder', '/founders': 'founder', '/specialists': 'providers', '/services': 'providers', '/landing': 'splash',
      '/worker-signup': 'worker-signup', '/login': 'auth', '/verify-otp': 'otp',
    };
    if (aliases[path]) return aliases[path];
    const entry = Object.entries(screenRoutes).find(([, route]) => route === path);
    return entry ? entry[0] as AppScreen : null;
  };

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    const requestedScreen = resolveScreenFromLocation();
    // Show the branded splash once to first-time visitors, including deep links.
    // Authentication callbacks must never be interrupted.
    if (requestedScreen === 'auth-callback') return 'auth-callback';
    if (dedicatedAppRole) return 'auth';
    try {
      if (localStorage.getItem('punchx_splash_seen') !== 'true') return 'splash';
    } catch {
      if (!requestedScreen || requestedScreen === 'splash') return 'splash';
    }
    return requestedScreen || 'splash';
  });

  useEffect(() => {
    const handlePopState = () => {
      const nextScreen = resolveScreenFromLocation();
      if (nextScreen) {
        setCurrentScreen(nextScreen);
        return;
      }
      // Unknown URLs use a deliberate, loop-free fallback instead of leaving
      // the screen and browser URL out of sync.
      window.history.replaceState({ screen: 'splash' }, '', '/');
      setCurrentScreen('splash');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => setCurrentScreen(dedicatedAppRole ? 'auth' : 'panel-select');
    window.addEventListener('punchx_logout', handleLogoutEvent);
    return () => window.removeEventListener('punchx_logout', handleLogoutEvent);
  }, []);

  const [activePanelRole, setActivePanelRole] = useState<'customer' | 'worker' | 'admin'>(() => {
    if (dedicatedAppRole) return dedicatedAppRole;
    try { return (localStorage.getItem('punchx_auth_role') as 'customer' | 'worker' | 'admin') || 'customer'; } catch { return 'customer'; }
  });
  useEffect(() => { try { localStorage.setItem('punchx_auth_role', activePanelRole); } catch {} }, [activePanelRole]);

  const [workerApplication, setWorkerApplication] = useState<WorkerApplication | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('AC Repair');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [citizenName, setCitizenName] = useState('PunchX Customer');
  const [citizenAddress, setCitizenAddress] = useState('');
  const [authMethod, setAuthMethod] = useState<'phone' | 'gmail'>('phone');
  const [authTarget, setAuthTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [hasClaimedBonus, setHasClaimedBonus] = useState<boolean>(() => { try { return localStorage.getItem('punchx_first_order_coupon_claimed') === 'true'; } catch { return false; } });
  const [hasUsedBonus, setHasUsedBonus] = useState<boolean>(() => { try { return localStorage.getItem('punchx_first_order_coupon_used') === 'true'; } catch { return false; } });
  const [promoApplied, setPromoApplied] = useState<boolean>(() => { try { return localStorage.getItem('punchx_active_coupon_applied') === 'true'; } catch { return false; } });
  const [issueDescription, setIssueDescription] = useState('AC compressor circuit board triggers system short circuit on startup.');
  const [bookingTime, setBookingTime] = useState('11:30 AM');
  const [bookingDate, setBookingDate] = useState('12');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileQrOpen, setIsMobileQrOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isGlobalProfileOpen, setIsGlobalProfileOpen] = useState(false);

  useEffect(() => {
    if (isLoadingProfile && currentUser) {
      setCitizenName('Loading profile...');
      setCitizenAddress('Loading address...');
    } else if (userProfile) {
      setCitizenName(userProfile.name || 'PunchX Member');
      setCitizenAddress(userProfile.address || 'Address not provided');
      if (userProfile.email) { setAuthMethod('gmail'); setAuthTarget(userProfile.email); }
      else if (userProfile.phone) { setAuthMethod('phone'); setAuthTarget(userProfile.phone); }
    }
  }, [userProfile, isLoadingProfile, currentUser]);

  // Keep customer GPS refreshed automatically while PunchX is open. Browser/device
  // location permission is required; coordinates remain local until a service flow uses them.
  useEffect(() => {
    if (!currentUser || activePanelRole !== 'customer' || !navigator.geolocation) return;
    let active = true;
    let watchId: number | null = null;
    let lastGeofenceCheckAt = 0;
    const startWatching = () => {
      if (!active || watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(async (position) => {
        if (!active) return;
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        // Don't claim a precise fence match from a weak GPS fix.
        if (!Number.isFinite(accuracy) || accuracy > 100) return;
        let previous: Record<string, any> = {};
        try {
          previous = JSON.parse(localStorage.getItem('punchx_user_location') || '{}');
          localStorage.setItem('punchx_user_location', JSON.stringify({
            ...previous, lat, lng, accuracy, gpsVerified: true,
            timestamp: new Date().toISOString(), source: 'browser-gps'
          }));
        } catch (error) {
          console.warn('Could not save latest GPS position locally:', error);
        }

        // Re-evaluate service geofence at most once per minute while the page is active.
        const now = Date.now();
        if (now - lastGeofenceCheckAt >= 60000) {
          lastGeofenceCheckAt = now;
          try {
            const response = await fetch('/api/location-services', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat, lng, address: previous.address || userProfile?.address || '' })
            });
            const result = response.ok ? await response.json() : null;
            if (active && result?.geofence) {
              const updated = {
                ...JSON.parse(localStorage.getItem('punchx_user_location') || '{}'),
                geofence: result.geofence,
                coverageStatus: result.coverageStatus,
                gpsVerified: true,
                accuracy,
                timestamp: new Date().toISOString()
              };
              localStorage.setItem('punchx_user_location', JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent('punchx_geofence_updated', { detail: result.geofence }));
            }
          } catch (error) {
            console.warn('PunchX geofence refresh failed:', error);
          }
        }
      }, (error) => {
        // Permission denial is respected. The user can enable location in device/browser settings.
        if (error.code !== error.PERMISSION_DENIED) console.warn('PunchX GPS update unavailable:', error.message);
      }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    };
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permission) => {
        if (!active) return;
        if (permission.state === 'granted' || permission.state === 'prompt') startWatching();
        permission.onchange = () => {
          if (!active) return;
          if (permission.state === 'granted') startWatching();
          if (permission.state === 'denied' && watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
        };
      }).catch(startWatching);
    } else {
      startWatching();
    }
    return () => {
      active = false;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser, activePanelRole]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(prev => prev === message ? null : prev), 4500);
  };

  // Sync worker application status for authenticated user
  useEffect(() => {
    if (!currentUser) {
      setWorkerApplication(null);
      return;
    }
    const checkWorkerStatus = async () => {
      try {
        const backendBase = import.meta.env.VITE_BACKEND_URL || '';
        let idToken = null;
        try {
          if (auth && auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
          }
        } catch {}
        const headers: Record<string, string> = {};
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
        const res = await fetch(`${backendBase}/api/workers/status`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.registered && data.applicationId) {
            setWorkerApplication({
              id: data.applicationId,
              uid: (currentUser as any)?.sub || (currentUser as any)?.id || '',
              legalName: userProfile?.name || 'Applicant Specialist',
              address: userProfile?.address || '',
              skill: data.skill || '',
              categories: data.categories || [],
              experienceYears: 'Verified',
              phone: userProfile?.phone || '',
              email: userProfile?.email || '',
              termsAccepted: true,
              status: data.status,
              appliedAt: data.appliedAt || 'Recent'
            });
          }
        }
      } catch (e) {
        console.warn('Worker status sync notice:', e);
      }
    };
    checkWorkerStatus();
  }, [currentUser, userProfile]);

  useEffect(() => {
    const protectedScreens: AppScreen[] = ['home', 'customer-setup', 'worker-dashboard', 'admin-dashboard', 'tracking', 'booking', 'payment', 'providers', 'provider-details'];
    // Keep worker onboarding in order before dashboard access: signup -> OTP/password
    // verification -> location/service setup -> worker dashboard.
    let workerOnboardingApproved = false;
    try { workerOnboardingApproved = localStorage.getItem('punchx_worker_approved') === 'true'; } catch {}
    const workerDashboardHasOnboardingAccess = currentScreen === 'worker-dashboard' && workerOnboardingApproved;
    if (!isLoadingProfile && !currentUser && protectedScreens.includes(currentScreen) && !workerDashboardHasOnboardingAccess) {
      showToast('🔒 Active session required. Redirecting to portal select...');
      const loginScreen: AppScreen = dedicatedAppRole ? 'auth' : 'panel-select';
      window.history.replaceState({ screen: loginScreen }, '', screenRoutes[loginScreen] || '/');
      setCurrentScreen(loginScreen);
    }

    // Strict Guard for Worker Dashboard: Admin review bypassed for testing
    if (!isLoadingProfile && currentScreen === 'worker-dashboard') {
      setActivePanelRole('worker');
    }

    const onboardingScreens: AppScreen[] = ['worker-signup', 'worker-otp-pass', 'worker-setup', 'worker-pending-approval', 'customer-setup'];
    if (!isLoadingProfile && currentUser && !onboardingScreens.includes(currentScreen) && (currentScreen === 'auth' || currentScreen === 'otp' || currentScreen === 'panel-select')) {
      if (userProfile?.role === 'admin') {
        setActivePanelRole('admin');
        window.history.replaceState({ screen: 'admin-dashboard' }, '', screenRoutes['admin-dashboard'] || '/');
        setCurrentScreen('admin-dashboard');
      } else if (activePanelRole === 'worker' || userProfile?.role === 'worker') {
        setActivePanelRole('worker');
        const hasCompletedWorkerRegistration = Boolean(
          userProfile?.applicationId ||
          userProfile?.workerSkill ||
          (userProfile?.workerCategories && userProfile.workerCategories.length > 0) ||
          workerApplication?.id
        );
        if (hasCompletedWorkerRegistration && localStorage.getItem('punchx_worker_approved') === 'true') {
          window.history.replaceState({ screen: 'worker-dashboard' }, '', screenRoutes['worker-dashboard'] || '/');
          setCurrentScreen('worker-dashboard');
        } else {
          window.history.replaceState({ screen: 'worker-signup' }, '', screenRoutes['worker-signup'] || '/worker-signup');
          setCurrentScreen('worker-signup');
        }
      } else {
        setActivePanelRole('customer');
        window.history.replaceState({ screen: 'home' }, '', screenRoutes.home || '/');
        setCurrentScreen('home');
      }
    }
  }, [currentUser, userProfile, isLoadingProfile, currentScreen, activePanelRole, workerApplication]);

  const onClaimPromo = () => {
    if (hasClaimedBonus || hasUsedBonus) { showToast('⚠️ 20% First Order Bonus coupon has already been claimed.'); return; }
    setPromoApplied(true); setHasClaimedBonus(true);
    try { localStorage.setItem('punchx_first_order_coupon_claimed', 'true'); localStorage.setItem('punchx_active_coupon_applied', 'true'); } catch {}
    showToast('✓ 20% First Order Bonus claimed! Discount applied to checkout.');
  };

  const handleApplyPromoCode = (code: string) => {
    const upper = code.trim().toUpperCase();
    const couponMessages: Record<string, string> = {
      FIRST50: '50% Welcome Discount applied (Max ₹100)',
      PUNCHX100: 'Flat ₹100 Discount applied',
      SAVE20: '20% Special Savings applied (Max ₹150)',
      FREESHIP: 'Platform convenience fee waived',
      WELCOME10: '10% Welcome Discount applied',
      ELITE20: '20% Elite Savings applied',
      PUNCHX20: '20% PunchX Discount applied',
      FIRST20: '20% First Order Discount applied',
      WELCOME20: '20% Welcome Discount applied',
      BONUS20: '20% Bonus applied',
      DISCOUNT20: '20% Discount applied',
    };
    if (couponMessages[upper]) {
      if (hasUsedBonus) { showToast('⚠️ First-order promo coupon has already been redeemed on an earlier order.'); return; }
      setPromoApplied(true); setHasClaimedBonus(true);
      try { localStorage.setItem('punchx_first_order_coupon_claimed', 'true'); localStorage.setItem('punchx_active_coupon_applied', 'true'); } catch {}
      showToast(`✓ ${couponMessages[upper]}`);
    } else {
      showToast('⚠️ Invalid or expired coupon code.');
    }
  };

  const handleTransition = (target: AppScreen) => {
    try {
      if (currentScreen === 'splash' && target === 'panel-select') {
        try { localStorage.setItem('punchx_splash_seen', 'true'); } catch { /* Splash still works if storage is unavailable. */ }
      }
      let resolvedTarget = target;
      // Auto-bypass OTP and Admin Review screens
      if (resolvedTarget === 'worker-otp-pass') resolvedTarget = 'worker-setup';
      if (resolvedTarget === 'worker-pending-approval') resolvedTarget = 'worker-dashboard';
      if (resolvedTarget === 'otp') resolvedTarget = activePanelRole === 'worker' ? 'worker-dashboard' : 'home';
      // Only redirect away from worker-signup if the worker has already filled out and submitted their registration details
      const hasCompletedWorkerRegistration = Boolean(
        userProfile?.applicationId ||
        userProfile?.workerSkill ||
        (userProfile?.workerCategories && userProfile.workerCategories.length > 0)
      );
      if (resolvedTarget === 'worker-signup' && hasCompletedWorkerRegistration && localStorage.getItem('punchx_worker_approved') === 'true' && !localStorage.getItem('punchx_edit_worker_signup')) {
        resolvedTarget = 'worker-dashboard';
      }

      const protectedNavScreens: Record<string, string> = { tracking: '📍 Live Tracking', providers: '🔍 Find Specialists', booking: '📋 Booking', payment: '💳 Payment', 'provider-details': '👤 Specialist Details' };
      if (!currentUser && protectedNavScreens[target]) { showToast(`🔒 Sign in required to access ${protectedNavScreens[target]}. Redirecting to portal...`); resolvedTarget = dedicatedAppRole ? 'auth' : 'panel-select'; }
      else if (target === 'panel-select' && currentUser) {
        if (userProfile?.role === 'admin') resolvedTarget = 'admin-dashboard';
        else if (activePanelRole === 'worker' || userProfile?.role === 'worker') resolvedTarget = 'worker-dashboard';
        else resolvedTarget = 'home';
      } else if (target === 'home' && !currentUser) resolvedTarget = dedicatedAppRole ? 'auth' : 'panel-select';

      const destination = screenRoutes[resolvedTarget] || '/';
      const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (currentPath !== destination) {
        // Every in-app screen gets a history entry so Back returns to the
        // immediately preceding step rather than jumping to the first page.
        window.history.pushState({ screen: resolvedTarget }, '', destination);
      }
      setCurrentScreen(resolvedTarget);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (navError) { console.error('Navigation transition error:', navError); showToast('⚠️ Navigation error occurred. Please try again.'); }
  };

  useEffect(() => {
    try {
      const existing = localStorage.getItem('punchx_order_history');
      if (existing) { const parsed = JSON.parse(existing); localStorage.setItem('punchx_order_history', JSON.stringify(Array.isArray(parsed) ? parsed : [])); }
      else localStorage.setItem('punchx_order_history', '[]');
    } catch { try { localStorage.setItem('punchx_order_history', '[]'); } catch {} }
  }, []);

  const isCitizenExperience = ['home','catalogue','providers','provider-details','booking','payment','tracking'].includes(currentScreen);
  const showWebsiteShell = isCitizenExperience;
  const showAssistant = isCitizenExperience || currentScreen === 'worker-dashboard' || currentScreen === 'admin-dashboard';

  useEffect(() => {
    const updateTime = () => { /* Keep device time local without rendering a stale clock. */ };
    updateTime();
  }, []);

  const authContent = currentScreen === 'auth'
    ? <Auth onTransition={handleTransition} showNotification={showToast} setAuthMethodDetail={(method, target) => { setAuthMethod(method); setAuthTarget(target); }} activePanelRole={activePanelRole} />
    : currentScreen === 'auth-callback'
      ? <AuthCallback onTransition={handleTransition} />
      : null;

  return (
    <div className="relative min-h-screen bg-[#07122a] text-[#e1e3e4] overflow-x-hidden antialiased selection:bg-[#c5a059]/30 flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] right-[10%] w-[35%] h-[35%] bg-[#c5a059]/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] bg-[#e9c176]/5 rounded-full blur-[160px] animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="hidden md:block absolute inset-0 opacity-[0.02] bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {toastMessage && <div id="global-prestige-toast" role="status" aria-live="polite" className="fixed left-1/2 top-5 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-xl border border-[#c5a059] bg-[#0c0f10]/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-lg"><div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#c5a059] animate-ping" /><p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-xs leading-5 tracking-wide text-zinc-100">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="ml-auto flex-shrink-0 rounded-md px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c5a059] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#c5a059]" aria-label="Dismiss notification">OK</button></div>}

      {showWebsiteShell && <WebsiteNavbar currentScreen={currentScreen} onTransition={handleTransition} activePanelRole={activePanelRole} setActivePanelRole={setActivePanelRole} citizenName={citizenName} citizenAddress={citizenAddress} onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)} onOpenProfile={() => { handleTransition('home'); setIsGlobalProfileOpen(true); }} onSelectCategory={setSelectedCategory} showNotification={showToast} hasActiveBooking={false} />}

      <main className={`relative z-10 w-full flex-grow flex flex-col ${isCitizenExperience ? 'punchx-citizen-main' : 'bg-[#07122a]'}`}>
        <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] bg-transparent"><div className="w-12 h-12 border-4 border-[#bfdbfe] border-t-[#2563eb] rounded-full animate-spin" /><p className="mt-4 text-sm font-semibold text-[#64748b]">Loading PunchX…</p></div>}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex-grow flex flex-col w-full h-full"
            >
              {currentScreen === 'auth-callback' && <NamoIDAuthShell>{authContent}</NamoIDAuthShell>}
          {currentScreen === 'splash' && <Splash onTransition={handleTransition} />}
          {currentScreen === 'panel-select' && (
            <PanelSelect 
              onSelectPanel={(panel, action) => { 
                setActivePanelRole(panel);
                try { localStorage.setItem('punchx_auth_role', panel); } catch {}
                if (panel === 'worker') {
                  if (action === 'signup') {
                    localStorage.removeItem('punchx_worker_approved');
                    localStorage.setItem('punchx_edit_worker_signup', 'true');
                    setCurrentScreen('worker-signup');
                  } else if (currentUser) {
                    const hasCompletedWorkerRegistration = Boolean(
                      userProfile?.applicationId ||
                      userProfile?.workerSkill ||
                      (userProfile?.workerCategories && userProfile.workerCategories.length > 0)
                    );
                    if (hasCompletedWorkerRegistration) {
                      setCurrentScreen('worker-dashboard');
                    } else {
                      setCurrentScreen('worker-signup');
                    }
                  } else {
                    setCurrentScreen('auth');
                  }
                } else if (currentUser) {
                  if (panel === 'admin' || userProfile?.role === 'admin') setCurrentScreen('admin-dashboard');
                  else setCurrentScreen('home');
                } else {
                  setCurrentScreen('auth');
                }
              }} 
              showNotification={showToast} 
            />
          )}
          {currentScreen === 'worker-signup' && <WorkerSignup onTransition={handleTransition} showNotification={showToast} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'worker-otp-pass' && <WorkerOtpPass onTransition={handleTransition} showNotification={showToast} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'worker-pending-approval' && <WorkerPendingApproval onTransition={handleTransition} showNotification={showToast} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'auth' && <NamoIDAuthShell>{authContent}</NamoIDAuthShell>}
          {currentScreen === 'otp' && <OtpVerify onTransition={handleTransition} otpCode={otpCode} setOtpCode={setOtpCode} authMethod={authMethod} authTarget={authTarget} activePanelRole={activePanelRole} />}
          {currentScreen === 'customer-setup' && <CustomerLocationSetup onTransition={handleTransition} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} showNotification={showToast} authMethod={authMethod} authTarget={authTarget} />}
          {currentScreen === 'worker-setup' && <WorkerLocationSetup onTransition={handleTransition} showNotification={showToast} authMethod={authMethod} authTarget={authTarget} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'catalogue' && <InteractivePriceCatalogue onTransition={handleTransition} onSelectCategory={setSelectedCategory} showNotification={showToast} />}
          {currentScreen === 'home' && <HomeDashboard onTransition={handleTransition} onSelectWorker={setSelectedWorker} onSelectCategory={setSelectedCategory} hasActiveBooking={false} promoApplied={promoApplied} hasClaimedBonus={hasClaimedBonus} hasUsedBonus={hasUsedBonus} onClaimPromo={onClaimPromo} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} authMethod={authMethod} authTarget={authTarget} showNotification={showToast} onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)} isProfileDrawerOpen={isGlobalProfileOpen} setIsProfileDrawerOpen={setIsGlobalProfileOpen} />}
          {currentScreen === 'providers' && <ProvidersList onTransition={handleTransition} selectedCategory={selectedCategory} onSelectWorker={setSelectedWorker} authMethod={authMethod} authTarget={authTarget} showNotification={showToast} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} />}
          {currentScreen === 'provider-details' && <ProviderDetails onTransition={handleTransition} selectedWorker={selectedWorker} showNotification={showToast} />}
          {currentScreen === 'booking' && <ConfirmBooking onTransition={handleTransition} selectedCategory={selectedCategory} selectedWorker={selectedWorker} promoApplied={promoApplied} issueDescription={issueDescription} setIssueDescription={setIssueDescription} bookingTime={bookingTime} setBookingTime={setBookingTime} bookingDate={bookingDate} setBookingDate={setBookingDate} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} />}
          {currentScreen === 'payment' && <ChoosePayment onTransition={handleTransition} selectedWorker={selectedWorker} promoApplied={promoApplied} hasUsedBonus={hasUsedBonus} onOrderFinalized={() => { if (promoApplied) { setHasUsedBonus(true); setPromoApplied(false); try { localStorage.setItem('punchx_first_order_coupon_used', 'true'); localStorage.removeItem('punchx_active_coupon_applied'); } catch {} } }} onApplyPromo={handleApplyPromoCode} showNotification={showToast} />}
          {currentScreen === 'tracking' && <LiveTracking onTransition={handleTransition} bookingTime={bookingTime} />}
          {currentScreen === 'worker-dashboard' && <WorkerDashboard onTransition={handleTransition} showNotification={showToast} />}

          {currentScreen === 'privacy-policy' && <PrivacyPolicy onTransition={handleTransition} showNotification={showToast} />}
          {currentScreen === 'terms-and-conditions' && <TermsAndConditions onTransition={handleTransition} showNotification={showToast} />}
              {currentScreen === 'founder' && <Founder onTransition={handleTransition} showNotification={showToast} />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {showWebsiteShell && <WebsiteFooter onTransition={handleTransition} onSelectCategory={setSelectedCategory} showNotification={showToast} />}

      {showAssistant && (
        <Suspense fallback={null}>
          <DragoAssistant currentScreen={currentScreen} onAutoFillOtp={code => setOtpCode(code)} onApplyPromo={() => setPromoApplied(true)} onAutoFillBooking={() => setIssueDescription('AC unit short-circuited with smoke coming from compressor board. Needs priority circuit diagnostics.')} />
        </Suspense>
      )}

      {isCitizenExperience && (
        <Suspense fallback={null}>
          {isGlobalProfileOpen && <CitizenProfileDrawer isOpen={isGlobalProfileOpen} onClose={() => setIsGlobalProfileOpen(false)} onTransition={handleTransition} citizenName={citizenName} citizenAddress={citizenAddress} showNotification={showToast} />}
          {isMobileQrOpen && <MobileQRModal isOpen={isMobileQrOpen} onClose={() => setIsMobileQrOpen(false)} />}
          <PushNotificationBanner onOpenCenter={() => setIsNotificationCenterOpen(true)} />
          {isNotificationCenterOpen && <NotificationCenterModal isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />}
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppMain />
    </AuthProvider>
  );
}
