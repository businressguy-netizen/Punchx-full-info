import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, ShieldCheck, MapPin, Bell, User, Phone, LogOut, ChevronDown, 
  Menu, X, Sparkles, Navigation, Clock, Shield, Search, Zap, CheckCircle2,
  Calendar, CreditCard, Award, ExternalLink, Grid
} from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';
import { useAuth } from '../lib/authContext';
import { getStoredPushNotifications } from '../lib/pushNotifications';
import ServiceCategoryModal from './ServiceCategoryModal';
import { PUNCHX_50_CATEGORIES } from '../data/categories';

interface WebsiteNavbarProps {
  currentScreen: AppScreen;
  onTransition: (target: AppScreen) => void;
  activePanelRole: 'customer' | 'worker' | 'admin';
  setActivePanelRole: (role: 'customer' | 'worker' | 'admin') => void;
  citizenName: string;
  citizenAddress: string;
  onOpenNotificationCenter: () => void;
  onOpenProfile?: () => void;
  onSelectCategory?: (category: string) => void;
  showNotification: (msg: string) => void;
  hasActiveBooking?: boolean;
}

export default function WebsiteNavbar({
  currentScreen,
  onTransition,
  activePanelRole,
  setActivePanelRole,
  citizenName,
  citizenAddress,
  onOpenNotificationCenter,
  onOpenProfile,
  onSelectCategory,
  showNotification,
  hasActiveBooking = false,
}: WebsiteNavbarProps) {
  const { currentUser, userProfile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const categories = [
    { name: 'Electrician', desc: 'Wiring, MCB & Switches', icon: '⚡' },
    { name: 'Plumber', desc: 'Pipes, Taps & Drain Leakages', icon: '🔧' },
    { name: 'AC Technician', desc: 'Jet Clean, Gas & Board Service', icon: '❄️' },
    { name: 'Carpenter', desc: 'Furniture, Locks & Modular Fit', icon: '🪚' },
    { name: 'Painter', desc: 'Wall Painting & Waterproofing', icon: '🎨' },
    { name: 'Cleaner/Housekeeper', desc: 'Deep Sanitization & Housekeeping', icon: '✨' },
    { name: 'CCTV Technician', desc: 'Security Camera & DVR Setup', icon: '📹' },
    { name: 'Car Mechanic', desc: 'Breakdown & Maintenance', icon: '🚗' },
  ];

  useEffect(() => {
    const checkNotifications = () => {
      const all = getStoredPushNotifications();
      const unread = all.filter((n) => !n.read).length;
      setUnreadCount(unread);
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (screen: AppScreen) => {
    setIsMobileMenuOpen(false);
    setIsServicesDropdownOpen(false);
    setIsProfileDropdownOpen(false);
    onTransition(screen);
  };

  const handleCategorySelect = (categoryName: string) => {
    if (onSelectCategory) {
      onSelectCategory(categoryName);
    }
    setIsServicesDropdownOpen(false);
    setIsMobileMenuOpen(false);
    onTransition('providers');
    showNotification(`⚡ Viewing verified specialists for ${categoryName}`);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsProfileDropdownOpen(false);
      showNotification('✓ Signed out successfully.');
      onTransition('panel-select');
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  };

  return (
    <header
      id="punchx-website-navbar"
      className="sticky top-0 z-50 w-full bg-[#07122a]/95 backdrop-blur-md border-b border-[#c5a059]/25 shadow-[0_4px_30px_rgba(0,0,0,0.5)] select-none"
    >
      {/* Top Website Announcement & Status Bar */}
      <div className="hidden lg:flex w-full bg-[#040914] border-b border-zinc-800/80 px-6 py-1.5 justify-between items-center text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#e9c176] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            PAN-Kolkata HIGH-SPEED SMART DISPATCH ACTIVE
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />
            100% Background-Verified Master Specialists
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-zinc-300">
            24/7 Priority Hotline:{' '}
            <strong className="text-white hover:text-[#c5a059] transition-colors cursor-pointer">
              1800-PUNCHX-24
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavClick('founder')}
              className="text-zinc-300 hover:text-[#e9c176] font-semibold transition-colors cursor-pointer"
            >
              Founders &amp; Leadership
            </button>
            <span className="text-zinc-600">•</span>
            <button
              onClick={() => {
                setActivePanelRole('worker');
                onTransition('worker-dashboard');
              }}
              className="text-[#c5a059] hover:text-[#e9c176] font-bold transition-colors cursor-pointer hover:underline"
            >
              Specialist Hub
            </button>
            <span className="text-zinc-600">•</span>
            <button
              onClick={() => {
                setActivePanelRole('admin');
                onTransition('admin-dashboard');
              }}
              className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          id="website-nav-logo"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white border-2 border-[#c5a059]/60 flex items-center justify-center p-1 shadow-[0_0_15px_rgba(197,160,89,0.3)] group-hover:scale-105 transition-transform duration-300">
            <img src={PUNCHX_LOGO} alt="PunchX Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-xl tracking-tight text-white leading-none group-hover:text-[#e9c176] transition-colors">
              PUNCH<span className="text-[#c5a059]">X</span>
            </span>
            <span className="font-mono text-[9px] text-[#c5a059] tracking-[0.2em] uppercase font-bold mt-0.5">
              PRESTIGE SERVICE UTILITY
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 font-sans text-xs lg:text-sm font-semibold text-zinc-300">
          <button
            id="nav-link-home"
            onClick={() => handleNavClick('home')}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentScreen === 'home'
                ? 'text-[#e9c176] bg-[#c5a059]/15 font-bold shadow-sm'
                : 'hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            Home
          </button>

          {/* Services Dropdown */}
          <div className="relative">
            <button
              id="nav-link-services"
              onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
              onMouseEnter={() => setIsServicesDropdownOpen(true)}
              className="px-3 py-2 rounded-lg flex items-center gap-1 hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer"
            >
              <span>Services</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isServicesDropdownOpen ? 'rotate-180 text-[#c5a059]' : ''}`} />
            </button>

            <AnimatePresence>
              {isServicesDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onMouseLeave={() => setIsServicesDropdownOpen(false)}
                  className="absolute top-full left-0 mt-2 w-72 bg-[#0a152e] border border-[#c5a059]/30 rounded-2xl shadow-2xl p-3 z-50 grid grid-cols-1 gap-1 backdrop-blur-xl"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono text-[#e9c176] uppercase tracking-wider font-bold border-b border-zinc-800 flex justify-between items-center">
                    <span>Instant Bangalore Services</span>
                    <span className="text-zinc-500">50 Total</span>
                  </div>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => handleCategorySelect(cat.name)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#111f3d] flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">{cat.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-[#e9c176]">{cat.name}</span>
                        <span className="text-[10px] text-zinc-400">{cat.desc}</span>
                      </div>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => {
                      setIsServicesDropdownOpen(false);
                      setIsCategoryModalOpen(true);
                    }}
                    className="mt-1 w-full p-2.5 bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#e9c176] hover:text-black border border-[#c5a059]/40 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Browse All 50 Categories →</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            id="nav-link-tracking"
            onClick={() => handleNavClick('tracking')}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              currentScreen === 'tracking'
                ? 'text-[#e9c176] bg-[#c5a059]/15 font-bold'
                : 'hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>Live Tracking</span>
            {hasActiveBooking && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          <button
            id="nav-link-providers"
            onClick={() => handleNavClick('providers')}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentScreen === 'providers'
                ? 'text-[#e9c176] bg-[#c5a059]/15 font-bold'
                : 'hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            Find Specialists
          </button>

          <button
            id="nav-link-founder"
            onClick={() => handleNavClick('founder')}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentScreen === 'founder'
                ? 'text-[#e9c176] bg-[#c5a059]/15 font-bold'
                : 'hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            Founding Team
          </button>

          <button
            id="nav-link-portals"
            onClick={() => handleNavClick('panel-select')}
            className="px-3 py-2 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>Switch Portal</span>
          </button>
        </nav>

        {/* Right Action Icons & Profile Controls */}
        <div className="flex items-center gap-3">
          {/* Notification Center Trigger */}
          <button
            id="navbar-notifications-btn"
            onClick={onOpenNotificationCenter}
            className="p-2 rounded-full bg-[#0a152e] hover:bg-[#111f3d] border border-zinc-800 hover:border-[#c5a059]/40 text-[#c5a059] transition-all cursor-pointer relative shadow-md"
            title="Push Notification Center"
          >
            <Bell className="w-4 h-4 text-[#c5a059]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-black flex items-center justify-center shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Account / Profile Dropdown */}
          {currentUser ? (
            <div className="relative">
              <button
                id="navbar-user-profile-btn"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-[#0a152e] hover:bg-[#111f3d] border border-[#c5a059]/40 text-white transition-all cursor-pointer shadow-md"
              >
                <div className="w-7 h-7 rounded-full bg-[#c5a059]/20 border border-[#c5a059] flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-[#e9c176]" />
                </div>
                <span className="hidden sm:inline text-xs font-bold text-[#e9c176] max-w-[120px] truncate">
                  {citizenName || userProfile?.name || 'Citizen Member'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-[#0a152e] border border-[#c5a059]/30 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl"
                  >
                    <div className="p-3 bg-[#071024] rounded-xl border border-zinc-800 mb-2">
                      <p className="text-xs font-bold text-white truncate">{citizenName || 'PunchX Member'}</p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{citizenAddress}</p>
                      <span className="inline-block mt-2 text-[9px] font-mono bg-[#c5a059]/20 text-[#e9c176] px-2 py-0.5 rounded border border-[#c5a059]/40 font-bold uppercase">
                        CITIZEN VERIFIED
                      </span>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          if (onOpenProfile) {
                            onOpenProfile();
                          } else {
                            handleNavClick('home');
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#c5a059]" />
                        <span>Manage Account & Orders</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleNavClick('tracking');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#c5a059]" />
                        <span>Live Service Tracker</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setIsCategoryModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Grid className="w-3.5 h-3.5 text-[#c5a059]" />
                        <span>Browse 50 Categories</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onOpenNotificationCenter();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#c5a059]" />
                        <span>Dispatch & Push Alerts</span>
                      </button>

                      <div className="border-t border-zinc-800 my-1"></div>

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              id="navbar-login-cta-btn"
              onClick={() => handleNavClick('auth')}
              className="px-4 py-2 bg-gradient-to-r from-[#c5a059] to-[#e9c176] hover:from-[#e9c176] hover:to-[#c5a059] text-black font-extrabold text-xs rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(197,160,89,0.4)] transition-all cursor-pointer uppercase tracking-wider"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            id="navbar-mobile-toggle"
            aria-label="Toggle mobile menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#0a152e] border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#07122a] border-b border-[#c5a059]/30 px-4 py-4 space-y-3.5 overflow-hidden"
          >
            {/* Mobile User Profile Card */}
            {currentUser ? (
              <div className="bg-[#0b162e] border border-[#c5a059]/30 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-[#c5a059]/20 border-2 border-[#c5a059] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <User className="w-5 h-5 text-[#e9c176]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{citizenName || userProfile?.name || 'PunchX Member'}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{citizenAddress}</p>
                    <span className="inline-block mt-1 text-[8.5px] font-mono bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">
                      NamoID Verified
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                    else handleNavClick('home');
                  }}
                  className="px-3 py-1.5 bg-[#c5a059] hover:bg-[#e9c176] text-black font-mono font-extrabold text-[10px] uppercase rounded-xl flex-shrink-0 ml-2 shadow cursor-pointer"
                >
                  My Profile
                </button>
              </div>
            ) : (
              <div className="bg-[#0b162e] border border-zinc-800 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Join PunchX Premium</p>
                  <p className="text-[10px] text-zinc-400">Book verified master specialists pan-Kolkata</p>
                </div>
                <button
                  onClick={() => handleNavClick('auth')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-extrabold text-xs rounded-xl shadow cursor-pointer uppercase"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Core Action Grid */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-zinc-800">
              <button
                onClick={() => handleNavClick('home')}
                className="py-2.5 px-3 bg-[#0a152e] rounded-xl text-xs font-bold text-white hover:bg-zinc-800 flex items-center justify-center gap-1.5 border border-zinc-800"
              >
                <span>🏠 Home</span>
              </button>
              <button
                onClick={() => handleNavClick('tracking')}
                className="py-2.5 px-3 bg-[#0a152e] rounded-xl text-xs font-bold text-[#e9c176] hover:bg-zinc-800 flex items-center justify-center gap-1.5 border border-[#c5a059]/30"
              >
                <span>📍 Live Tracking</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenProfile) onOpenProfile();
                  else handleNavClick('home');
                }}
                className="py-2.5 px-3 bg-[#0a152e] rounded-xl text-xs font-bold text-emerald-400 hover:bg-zinc-800 flex items-center justify-center gap-1.5 border border-emerald-500/30"
              >
                <span>📋 My Bookings</span>
              </button>
              <button
                onClick={() => handleNavClick('providers')}
                className="py-2.5 px-3 bg-[#0a152e] rounded-xl text-xs font-bold text-white hover:bg-zinc-800 flex items-center justify-center gap-1.5 border border-zinc-800"
              >
                <span>⚡ Specialists</span>
              </button>
            </div>

            {/* Additional Useful Actions Suite */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNotificationCenter();
                }}
                className="py-2 px-3 bg-[#0a152e] rounded-xl text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 border border-zinc-800"
              >
                <Bell className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Alerts ({unreadCount})</span>
              </button>
              <button
                onClick={() => handleNavClick('founder')}
                className="py-2 px-3 bg-[#0a152e] rounded-xl text-xs font-semibold text-white hover:text-[#e9c176] flex items-center justify-center gap-1.5 border border-zinc-800"
              >
                <span>👥 Founders</span>
              </button>
            </div>

            {/* Quick Category Jump */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-mono text-[#c5a059] uppercase tracking-wider font-bold px-1">
                Quick Category Jump
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleCategorySelect(c.name)}
                    className="p-2 text-left bg-[#09142b] rounded-lg text-xs text-zinc-300 hover:text-white flex items-center gap-2 border border-zinc-850"
                  >
                    <span>{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCategoryModalOpen(true);
                }}
                className="w-full mt-2 p-2.5 bg-gradient-to-r from-[#c5a059] to-[#e9c176] text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Grid className="w-4 h-4" />
                <span>Search All 50 Services</span>
              </button>

              {currentUser && (
                <button
                  onClick={handleSignOut}
                  className="w-full mt-2 py-2 text-center text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 50 Worker Categories Selection Modal */}
      <ServiceCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        mode="citizen"
        onSelectCategory={(catName) => {
          handleCategorySelect(catName);
        }}
      />
    </header>
  );
}
