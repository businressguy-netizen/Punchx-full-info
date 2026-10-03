import React, { useState, useEffect, Suspense, lazy } from 'react';
import Splash from './components/Splash';
import Auth from './components/Auth';
import DragoAssistant from './components/DragoAssistant';
import MobileQRModal from './components/MobileQRModal';
import PanelSelect from './components/PanelSelect';
import PushNotificationBanner from './components/PushNotificationBanner';
import NotificationCenterModal from './components/NotificationCenterModal';
import WebsiteNavbar from './components/WebsiteNavbar';
import WebsiteFooter from './components/WebsiteFooter';
import CitizenProfileDrawer from './components/CitizenProfileDrawer';
import { AppScreen, Worker, WorkerApplication } from './types';
import { AuthProvider, useAuth } from './lib/authContext';
import OtpVerify from './components/OtpVerify';
import { Analytics } from '@vercel/analytics/react';
import NamoIDAuthShell from './components/NamoIDAuthShell';

const HomeDashboard = lazy(() => import('./components/Home'));
const ProvidersList = lazy(() => import('./components/ProvidersList'));
const ProviderDetails = lazy(() => import('./components/ProviderDetails'));
const ConfirmBooking = lazy(() => import('./components/ConfirmBooking'));
const ChoosePayment = lazy(() => import('./components/ChoosePayment'));
const LiveTracking = lazy(() => import('./components/LiveTracking'));
const WorkerDashboard = lazy(() => import('./components/WorkerDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
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
  const { currentUser, userProfile, isLoadingProfile } = useAuth();

  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    const rawPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
    const search = window.location.search.toLowerCase();
    if (rawPath === '/auth/callback' || search.includes('code=') || search.includes('state=')) return 'auth-callback';
    if (rawPath === '/privacy-policy' || rawPath === '/privacy' || search.includes('/privacy-policy') || search.includes('/privacy')) return 'privacy-policy';
    if (rawPath === '/terms-and-conditions' || rawPath === '/terms' || rawPath === '/terms-of-service' || search.includes('/terms-and-conditions') || search.includes('/terms')) return 'terms-and-conditions';
    if (rawPath === '/worker-signup' || search.includes('/worker-signup')) return 'worker-signup';
    if (rawPath === '/founder' || rawPath === '/leadership' || rawPath === '/founders' || search.includes('/founder') || search.includes('/founders') || search.includes('/leadership')) return 'founder';
    return 'splash';
  });

  useEffect(() => {
    const handlePopState = () => {
      const rawPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const search = window.location.search.toLowerCase();
      if (rawPath === '/privacy-policy' || rawPath === '/privacy' || search.includes('/privacy-policy') || search.includes('/privacy')) setCurrentScreen('privacy-policy');
      else if (rawPath === '/terms-and-conditions' || rawPath === '/terms' || rawPath === '/terms-of-service' || search.includes('/terms-and-conditions') || search.includes('/terms')) setCurrentScreen('terms-and-conditions');
      else if (rawPath === '/worker-signup' || search.includes('/worker-signup')) setCurrentScreen('worker-signup');
      else if (rawPath === '/founder' || rawPath === '/leadership' || rawPath === '/founders' || search.includes('/founder') || search.includes('/founders') || search.includes('/leadership')) setCurrentScreen('founder');
      else if (rawPath === '' || rawPath === '/') {
        if (currentScreen === 'privacy-policy' || currentScreen === 'terms-and-conditions' || currentScreen === 'founder' || currentScreen === 'worker-signup') setCurrentScreen(currentUser ? 'home' : 'panel-select');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, currentScreen]);

  useEffect(() => {
    const handleLogoutEvent = () => setCurrentScreen('panel-select');
    window.addEventListener('punchx_logout', handleLogoutEvent);
    return () => window.removeEventListener('punchx_logout', handleLogoutEvent);
  }, []);

  const [activePanelRole, setActivePanelRole] = useState<'customer' | 'worker' | 'admin'>(() => {
    try { return (localStorage.getItem('punchx_auth_role') as 'customer' | 'worker' | 'admin') || 'customer'; } catch { return 'customer'; }
  });
  useEffect(() => { try { localStorage.setItem('punchx_auth_role', activePanelRole); } catch {} }, [activePanelRole]);

  const [workerApplication, setWorkerApplication] = useState<WorkerApplication | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('AC Repair');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [citizenName, setCitizenName] = useState('PunchX Citizen');
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

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(prev => prev === message ? null : prev), 4500);
  };

  useEffect(() => {
    const protectedScreens: AppScreen[] = ['home', 'customer-setup', 'worker-setup', 'worker-dashboard', 'admin-dashboard', 'tracking', 'booking', 'payment', 'providers', 'provider-details'];
    if (!isLoadingProfile && !currentUser && protectedScreens.includes(currentScreen)) {
      showToast('🔒 Active session required. Redirecting to portal select...');
      setCurrentScreen('panel-select');
    }
    if (!isLoadingProfile && currentUser && (currentScreen === 'auth' || currentScreen === 'otp' || currentScreen === 'panel-select')) {
      const resolvedRole = userProfile?.role || activePanelRole || 'customer';
      if (resolvedRole === 'worker') { setActivePanelRole('worker'); setCurrentScreen('worker-dashboard'); }
      else if (resolvedRole === 'admin') { setActivePanelRole('admin'); setCurrentScreen('admin-dashboard'); }
      else { setActivePanelRole('customer'); setCurrentScreen('home'); }
    }
  }, [currentUser, userProfile, isLoadingProfile, currentScreen, activePanelRole]);

  const onClaimPromo = () => {
    if (hasClaimedBonus || hasUsedBonus) { showToast('⚠️ 20% First Order Bonus coupon has already been claimed.'); return; }
    setPromoApplied(true); setHasClaimedBonus(true);
    try { localStorage.setItem('punchx_first_order_coupon_claimed', 'true'); localStorage.setItem('punchx_active_coupon_applied', 'true'); } catch {}
    showToast('✓ 20% First Order Bonus claimed! Discount applied to checkout.');
  };

  const handleApplyPromoCode = (code: string) => {
    const upper = code.trim().toUpperCase();
    const validCodes = ['ELITE20', 'PUNCHX20', 'FIRST20', 'WELCOME20', 'BONUS20', 'SAVE20', 'DISCOUNT20'];
    if (validCodes.includes(upper)) {
      if (hasUsedBonus) { showToast('⚠️ First-order promo coupon has already been redeemed on an earlier order.'); return; }
      setPromoApplied(true); setHasClaimedBonus(true);
      try { localStorage.setItem('punchx_first_order_coupon_claimed', 'true'); localStorage.setItem('punchx_active_coupon_applied', 'true'); } catch {}
      showToast(`✓ Coupon '${upper}' applied! 20% discount added to order.`);
    } else showToast("⚠️ Invalid coupon code. Try 'ELITE20' or 'PUNCHX20'.");
  };

  const handleTransition = (target: AppScreen) => {
    try {
      let resolvedTarget = target;
      const protectedNavScreens: Record<string, string> = { tracking: '📍 Live Tracking', providers: '🔍 Find Specialists', booking: '📋 Booking', payment: '💳 Payment', 'provider-details': '👤 Specialist Details' };
      if (!currentUser && protectedNavScreens[target]) { showToast(`🔒 Sign in required to access ${protectedNavScreens[target]}. Redirecting to portal...`); resolvedTarget = 'panel-select'; }
      else if (target === 'panel-select' && currentUser) {
        const resolvedRole = userProfile?.role || activePanelRole || 'customer';
        resolvedTarget = resolvedRole === 'worker' ? 'worker-dashboard' : resolvedRole === 'admin' ? 'admin-dashboard' : 'home';
      } else if (target === 'home' && !currentUser) resolvedTarget = 'panel-select';

      if (resolvedTarget === 'privacy-policy') { window.history.pushState({}, '', '/privacy-policy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (resolvedTarget === 'terms-and-conditions') { window.history.pushState({}, '', '/terms-and-conditions'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (resolvedTarget === 'worker-signup') { window.history.pushState({}, '', '/worker-signup'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (resolvedTarget === 'founder') { window.history.pushState({}, '', '/founder'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else {
        const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
        if (['/privacy-policy','/terms-and-conditions','/terms','/privacy','/worker-signup','/founder','/leadership','/founders'].includes(currentPath)) window.history.pushState({}, '', '/');
      }
      setCurrentScreen(resolvedTarget);
    } catch (navError) { console.error('Navigation transition error:', navError); showToast('⚠️ Navigation error occurred. Please try again.'); }
  };

  useEffect(() => {
    try {
      const existing = localStorage.getItem('punchx_order_history');
      if (existing) { const parsed = JSON.parse(existing); localStorage.setItem('punchx_order_history', JSON.stringify(Array.isArray(parsed) ? parsed : [])); }
      else localStorage.setItem('punchx_order_history', '[]');
    } catch { try { localStorage.setItem('punchx_order_history', '[]'); } catch {} }
  }, []);

  const isCitizenExperience = ['home','providers','provider-details','booking','payment','tracking'].includes(currentScreen);
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

      {toastMessage && <div id="global-prestige-toast" className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-[#0c0f10]/95 border border-[#c5a059] px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2.5 backdrop-blur-lg"><div className="w-2.5 h-2.5 rounded-full bg-[#c5a059] animate-ping flex-shrink-0" /><p className="text-[11px] text-zinc-150 font-sans tracking-wide leading-relaxed">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="text-[#c5a059] hover:text-white ml-auto text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer">OK</button></div>}

      {showWebsiteShell && <WebsiteNavbar currentScreen={currentScreen} onTransition={handleTransition} activePanelRole={activePanelRole} setActivePanelRole={setActivePanelRole} citizenName={citizenName} citizenAddress={citizenAddress} onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)} onOpenProfile={() => { handleTransition('home'); setIsGlobalProfileOpen(true); }} onSelectCategory={setSelectedCategory} showNotification={showToast} hasActiveBooking={false} />}

      <main className={`relative z-10 w-full flex-grow flex flex-col ${isCitizenExperience ? 'punchx-citizen-main' : 'bg-[#07122a]'}`}>
        <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] bg-white"><div className="w-12 h-12 border-4 border-[#bfdbfe] border-t-[#2563eb] rounded-full animate-spin" /><p className="mt-4 text-sm font-semibold text-[#64748b]">Loading PunchX…</p></div>}>
          {currentScreen === 'auth-callback' && <NamoIDAuthShell>{authContent}</NamoIDAuthShell>}
          {currentScreen === 'splash' && <Splash onTransition={handleTransition} />}
          {currentScreen === 'panel-select' && <PanelSelect onSelectPanel={(panel, action) => { setActivePanelRole(panel); if (panel === 'worker' && action === 'signup') setCurrentScreen('worker-signup'); else setCurrentScreen('auth'); }} showNotification={showToast} />}
          {currentScreen === 'worker-signup' && <WorkerSignup onTransition={handleTransition} showNotification={showToast} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'worker-otp-pass' && <WorkerOtpPass onTransition={handleTransition} showNotification={showToast} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'worker-pending-approval' && <WorkerPendingApproval onTransition={handleTransition} showNotification={showToast} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'auth' && <NamoIDAuthShell>{authContent}</NamoIDAuthShell>}
          {currentScreen === 'otp' && <OtpVerify onTransition={handleTransition} otpCode={otpCode} setOtpCode={setOtpCode} authMethod={authMethod} authTarget={authTarget} activePanelRole={activePanelRole} />}
          {currentScreen === 'customer-setup' && <CustomerLocationSetup onTransition={handleTransition} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} showNotification={showToast} authMethod={authMethod} authTarget={authTarget} />}
          {currentScreen === 'worker-setup' && <WorkerLocationSetup onTransition={handleTransition} showNotification={showToast} authMethod={authMethod} authTarget={authTarget} workerApplication={workerApplication} setWorkerApplicationData={setWorkerApplication} />}
          {currentScreen === 'home' && <HomeDashboard onTransition={handleTransition} onSelectWorker={setSelectedWorker} onSelectCategory={setSelectedCategory} hasActiveBooking={false} promoApplied={promoApplied} hasClaimedBonus={hasClaimedBonus} hasUsedBonus={hasUsedBonus} onClaimPromo={onClaimPromo} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} authMethod={authMethod} authTarget={authTarget} showNotification={showToast} onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)} isProfileDrawerOpen={isGlobalProfileOpen} setIsProfileDrawerOpen={setIsGlobalProfileOpen} />}
          {currentScreen === 'providers' && <ProvidersList onTransition={handleTransition} selectedCategory={selectedCategory} onSelectWorker={setSelectedWorker} authMethod={authMethod} authTarget={authTarget} showNotification={showToast} citizenName={citizenName} setCitizenName={setCitizenName} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} />}
          {currentScreen === 'provider-details' && <ProviderDetails onTransition={handleTransition} selectedWorker={selectedWorker} showNotification={showToast} />}
          {currentScreen === 'booking' && <ConfirmBooking onTransition={handleTransition} selectedCategory={selectedCategory} selectedWorker={selectedWorker} promoApplied={promoApplied} issueDescription={issueDescription} setIssueDescription={setIssueDescription} bookingTime={bookingTime} setBookingTime={setBookingTime} bookingDate={bookingDate} setBookingDate={setBookingDate} citizenAddress={citizenAddress} setCitizenAddress={setCitizenAddress} />}
          {currentScreen === 'payment' && <ChoosePayment onTransition={handleTransition} selectedWorker={selectedWorker} promoApplied={promoApplied} hasUsedBonus={hasUsedBonus} onOrderFinalized={() => { if (promoApplied) { setHasUsedBonus(true); setPromoApplied(false); try { localStorage.setItem('punchx_first_order_coupon_used', 'true'); localStorage.removeItem('punchx_active_coupon_applied'); } catch {} } }} onApplyPromo={handleApplyPromoCode} showNotification={showToast} />}
          {currentScreen === 'tracking' && <LiveTracking onTransition={handleTransition} bookingTime={bookingTime} />}
          {currentScreen === 'worker-dashboard' && <WorkerDashboard onTransition={handleTransition} showNotification={showToast} />}
          {currentScreen === 'admin-dashboard' && <AdminDashboard onTransition={handleTransition} showNotification={showToast} />}
          {currentScreen === 'privacy-policy' && <PrivacyPolicy onTransition={handleTransition} showNotification={showToast} />}
          {currentScreen === 'terms-and-conditions' && <TermsAndConditions onTransition={handleTransition} showNotification={showToast} />}
          {currentScreen === 'founder' && <Founder onTransition={handleTransition} showNotification={showToast} />}
        </Suspense>
      </main>

      {showWebsiteShell && <WebsiteFooter onTransition={handleTransition} onSelectCategory={setSelectedCategory} showNotification={showToast} />}

      {showAssistant && <DragoAssistant currentScreen={currentScreen} onAutoFillOtp={code => setOtpCode(code)} onApplyPromo={() => setPromoApplied(true)} onAutoFillBooking={() => setIssueDescription('AC unit short-circuited with smoke coming from compressor board. Needs priority circuit diagnostics.')} />}

      {isCitizenExperience && <>
        <CitizenProfileDrawer isOpen={isGlobalProfileOpen} onClose={() => setIsGlobalProfileOpen(false)} onTransition={handleTransition} citizenName={citizenName} citizenAddress={citizenAddress} showNotification={showToast} />
        <MobileQRModal isOpen={isMobileQrOpen} onClose={() => setIsMobileQrOpen(false)} />
        <PushNotificationBanner onOpenCenter={() => setIsNotificationCenterOpen(true)} />
        <NotificationCenterModal isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      </>}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppMain />
      <Analytics />
    </AuthProvider>
  );
}
