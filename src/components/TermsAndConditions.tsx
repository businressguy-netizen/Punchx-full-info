import React, { useEffect, useState } from 'react';
import { 
  FileText, Shield, ShieldCheck, Scale, ArrowLeft, ArrowRight, ExternalLink, 
  Copy, Check, Printer, ChevronRight, Mail, Globe, Users, AlertTriangle, 
  Handshake, CreditCard, Ban, HelpCircle, CheckCircle2
} from 'lucide-react';
import { AppScreen } from '../types';
import PUNCHX_LOGO from '../assets/logo';

interface TermsAndConditionsProps {
  onTransition: (target: AppScreen) => void;
  showNotification?: (msg: string) => void;
}

export default function TermsAndConditions({ onTransition, showNotification }: TermsAndConditionsProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('section-1');

  useEffect(() => {
    // Set official SEO document title as requested
    const previousTitle = document.title;
    document.title = "PunchX Terms & Conditions";
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Canonical link tag update/insertion
    let canonicalTag = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    const previousCanonical = canonicalTag ? canonicalTag.href : null;
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.rel = "canonical";
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = "https://www.punchxapp.co.in/terms-and-conditions";

    return () => {
      document.title = previousTitle;
      if (canonicalTag && previousCanonical) {
        canonicalTag.href = previousCanonical;
      }
    };
  }, []);

  const handleCopyLink = () => {
    const url = "https://www.punchxapp.co.in/terms-and-conditions";
    navigator.clipboard.writeText(url);
    setCopied(true);
    if (showNotification) showNotification("✓ Terms & Conditions link copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90; // offset for sticky navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'section-1', num: '1', title: 'About PunchX' },
    { id: 'section-2', num: '2', title: 'User Types' },
    { id: 'section-3', num: '3', title: 'Eligibility and Account Registration' },
    { id: 'section-4', num: '4', title: 'Customer Responsibilities' },
    { id: 'section-5', num: '5', title: 'Service Provider Responsibilities' },
    { id: 'section-6', num: '6', title: 'Provider Verification' },
    { id: 'section-7', num: '7', title: 'Bookings and Service Arrangements' },
    { id: 'section-8', num: '8', title: 'Payments' },
    { id: 'section-9', num: '9', title: 'Cancellations and Refunds' },
    { id: 'section-10', num: '10', title: 'Communication Between Users' },
    { id: 'section-11', num: '11', title: 'Ratings and Reviews' },
    { id: 'section-12', num: '12', title: 'Acceptable Use' },
    { id: 'section-13', num: '13', title: 'Platform Role & Independent Providers' },
    { id: 'section-14', num: '14', title: 'Safety' },
    { id: 'section-15', num: '15', title: 'Intellectual Property' },
    { id: 'section-16', num: '16', title: 'Suspension or Termination' },
    { id: 'section-17', num: '17', title: 'Availability of the Platform' },
    { id: 'section-18', num: '18', title: 'Disclaimer' },
    { id: 'section-19', num: '19', title: 'Limitation of Liability' },
    { id: 'section-20', num: '20', title: 'Changes to These Terms' },
    { id: 'section-21', num: '21', title: 'Governing Law' },
    { id: 'section-22', num: '22', title: 'Contact Us' },
  ];

  return (
    <div id="punchx-terms-page" className="min-h-screen bg-[#07122a] text-[#e1e3e4] py-8 px-4 sm:px-6 lg:px-8 selection:bg-[#c5a059]/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Breadcrumb Bar */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400 mb-6">
          <button 
            onClick={() => onTransition('home')}
            className="hover:text-[#e9c176] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-500">Legal</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[#e9c176] font-bold">Terms & Conditions</span>
        </nav>

        {/* Hero Header Card */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#0d1c3d] to-[#0a152e] border border-[#c5a059]/35 p-6 sm:p-10 mb-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] text-xs font-mono font-bold tracking-wide">
                <Scale className="w-3.5 h-3.5 text-[#e9c176]" />
                <span>OFFICIAL PLATFORM AGREEMENT</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                PunchX Terms and Conditions
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Governing Law: <strong className="text-white">India</strong>
                </span>
                <span className="hidden sm:inline text-zinc-600">•</span>
                <span>Last Updated: <strong className="text-zinc-300">27 August 2026</strong></span>
                <span className="hidden sm:inline text-zinc-600">•</span>
                <span className="text-[#e9c176]">Production URL: https://www.punchxapp.co.in/terms-and-conditions</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-[#111f3d] hover:bg-[#182a52] border border-[#c5a059]/30 text-xs font-semibold text-[#e9c176] flex items-center gap-2 transition-all cursor-pointer shadow-md"
                title="Copy Terms & Conditions URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#c5a059]" />}
                <span>{copied ? "Copied!" : "Share URL"}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-[#0a152e] hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-2 transition-all cursor-pointer shadow-md"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>

              <button
                onClick={() => {
                  onTransition('privacy-policy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#e9c176] hover:from-[#e9c176] hover:to-[#c5a059] text-black font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <span>Privacy Policy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Cross-Link Warning / Quick Switch Banner */}
        <div className="rounded-xl bg-[#0a152e] border border-zinc-800 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-[#c5a059] flex-shrink-0" />
            <span>Looking for how we collect, protect, and handle personal data? Read our official <strong>Privacy Policy</strong>.</span>
          </div>
          <button
            onClick={() => {
              onTransition('privacy-policy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#e9c176] hover:text-white font-bold inline-flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0 underline decoration-[#c5a059]/40 underline-offset-4"
          >
            <span>View Privacy Policy</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Two-Column Layout: Sticky Navigation Sidebar + Terms Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 rounded-2xl bg-[#0a152e] border border-zinc-800 p-5 shadow-lg space-y-3 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-mono font-bold uppercase tracking-wider text-[#c5a059]">
                <Scale className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Agreement Sections</span>
              </div>
              <ul className="space-y-1 text-xs">
                {sections.map((sec) => (
                  <li key={sec.id}>
                    <button
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left py-1 px-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                        activeSection === sec.id
                          ? 'bg-[#111f3d] text-[#e9c176] font-bold border-l-2 border-[#c5a059]'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-zinc-500">{sec.num}.</span>
                      <span className="truncate">{sec.title}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <div className="p-3 rounded-xl bg-[#071024] border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                  <p className="font-bold text-white">PunchX Official Support</p>
                  <p className="text-zinc-400">Email: businressguy@gmail.com</p>
                  <p className="text-zinc-400">Web: www.punchxapp.co.in</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Legal Content */}
          <main className="lg:col-span-8 space-y-8">

            {/* Intro Card */}
            <div className="rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-white">Welcome to PunchX.</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                These Terms and Conditions govern your access to and use of the PunchX website, mobile application, and related services.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                By accessing PunchX, creating an account, booking a service, offering services, or otherwise using the platform, you agree to these Terms.
              </p>
            </div>

            {/* Section 1 */}
            <section id="section-1" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  1
                </span>
                <h3 className="text-lg font-bold text-white">About PunchX</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX is a startup technology platform designed to help customers connect with workers and service providers for household and day-to-day service needs.
              </p>
              <p className="text-sm text-zinc-300 font-semibold">PunchX may facilitate:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Discovery of service providers</li>
                <li>- Service requests</li>
                <li>- Bookings</li>
                <li>- Communication between relevant users</li>
                <li>- Provider verification</li>
                <li>- Ratings and reviews</li>
                <li>- Payment-related processes</li>
              </ul>
              <div className="p-3.5 rounded-xl bg-[#071024] border border-[#c5a059]/30 text-xs text-[#e9c176]">
                Unless explicitly stated otherwise, PunchX acts as a technology platform facilitating interactions between users and independent service providers.
              </div>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  2
                </span>
                <h3 className="text-lg font-bold text-white">User Types</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may have different types of users, including:
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Customers</li>
                <li>- Service providers or workers</li>
                <li>- Administrators and authorised platform personnel</li>
              </ul>
              <p className="text-sm text-zinc-400">
                Different features, responsibilities, and verification requirements may apply to different types of users.
              </p>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  3
                </span>
                <h3 className="text-lg font-bold text-white">Eligibility and Account Registration</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                You must provide accurate, current, and complete information when creating and maintaining a PunchX account.
              </p>
              <p className="text-sm text-zinc-300 font-semibold">You agree to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Provide truthful information</li>
                <li>- Keep your account information updated</li>
                <li>- Protect your login credentials</li>
                <li>- Not share your account in an unauthorised manner</li>
                <li>- Notify PunchX of suspected unauthorised account access</li>
              </ul>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Users must be legally permitted to use the relevant services and enter into applicable agreements. Where a user is a minor, use of certain services may require legally appropriate consent or supervision.
              </p>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  4
                </span>
                <h3 className="text-lg font-bold text-white">Customer Responsibilities</h3>
              </div>
              <p className="text-sm text-zinc-300 font-semibold">Customers agree to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Provide accurate service requirements</li>
                <li>- Provide correct booking and contact information</li>
                <li>- Provide an appropriate service location when required</li>
                <li>- Treat service providers respectfully</li>
                <li>- Not request illegal, dangerous, fraudulent, or prohibited services</li>
                <li>- Pay applicable charges according to the booking or payment terms</li>
                <li>- Follow applicable cancellation and refund rules</li>
              </ul>
              <p className="text-sm text-zinc-400">
                Customers are responsible for ensuring that the information they provide regarding a service request is accurate.
              </p>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  5
                </span>
                <h3 className="text-lg font-bold text-white">Service Provider Responsibilities</h3>
              </div>
              <p className="text-sm text-zinc-300 font-semibold">Service providers agree to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Provide accurate information about their identity, services, skills, availability, and pricing</li>
                <li>- Complete verification requirements requested by PunchX, where applicable</li>
                <li>- Provide services lawfully and professionally</li>
                <li>- Treat customers respectfully</li>
                <li>- Not provide false, misleading, or fraudulent information</li>
                <li>- Maintain any licences, qualifications, permissions, or registrations required for their services</li>
                <li>- Follow applicable booking, payment, cancellation, and platform rules</li>
              </ul>
              <p className="text-sm text-zinc-400">
                Service providers remain responsible for the services they independently provide.
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  6
                </span>
                <h3 className="text-lg font-bold text-white">Provider Verification</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may conduct verification checks or request documents and information from service providers.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Verification is intended to improve platform trust and safety. However, verification does not constitute an absolute guarantee regarding a provider's identity, qualifications, conduct, suitability, or future performance.
              </p>
              <p className="text-sm text-zinc-400">
                Users should exercise reasonable judgment when engaging with others through the platform.
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  7
                </span>
                <h3 className="text-lg font-bold text-white">Bookings and Service Arrangements</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                A booking may involve information such as:
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Requested service</li>
                <li>- Date and time</li>
                <li>- Location</li>
                <li>- Estimated or agreed price</li>
                <li>- Other relevant requirements</li>
              </ul>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Users should review booking information carefully before confirming it.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may provide tools to facilitate bookings, but the exact terms of a particular service arrangement may depend on the information presented during the booking process and applicable policies.
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  8
                </span>
                <h3 className="text-lg font-bold text-white">Payments</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may enable payments through supported third-party payment providers.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                By making a payment through PunchX, you agree to provide accurate payment information and comply with applicable payment requirements.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Payment processing may be subject to the terms and policies of the relevant payment provider.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may introduce platform fees, commissions, service charges, or other applicable charges. Where applicable, relevant charges should be disclosed through the platform or during the relevant transaction.
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  9
                </span>
                <h3 className="text-lg font-bold text-white">Cancellations and Refunds</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Cancellations and refunds may depend on factors including:
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- The type of service</li>
                <li>- The stage of the booking</li>
                <li>- Whether the service has already started or been completed</li>
                <li>- Applicable fees or costs</li>
                <li>- The reason for cancellation</li>
                <li>- Applicable platform policies</li>
              </ul>
              <p className="text-sm text-zinc-400">
                PunchX may maintain a separate Cancellation and Refund Policy that forms part of the applicable rules for bookings and payments.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  10
                </span>
                <h3 className="text-lg font-bold text-white">Communication Between Users</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may provide communication features between customers and service providers.
              </p>
              <p className="text-sm text-zinc-300 font-semibold">You agree not to use PunchX communication features to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Harass, threaten, or abuse another person</li>
                <li>- Send fraudulent or misleading messages</li>
                <li>- Share unlawful content</li>
                <li>- Attempt scams or financial fraud</li>
                <li>- Violate another person's privacy</li>
                <li>- Circumvent platform safety measures</li>
              </ul>
              <p className="text-sm text-zinc-400">
                PunchX may investigate and take appropriate action regarding misuse.
              </p>
            </section>

            {/* Section 11 */}
            <section id="section-11" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  11
                </span>
                <h3 className="text-lg font-bold text-white">Ratings and Reviews</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Users may be able to submit ratings and reviews based on their genuine experiences.
              </p>
              <p className="text-sm text-zinc-300 font-semibold">Reviews must not contain:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- False or misleading statements</li>
                <li>- Abusive or threatening content</li>
                <li>- Unnecessary personal information</li>
                <li>- Unlawful or defamatory content</li>
                <li>- Spam or promotional material unrelated to the service</li>
              </ul>
              <p className="text-sm text-zinc-400">
                PunchX may moderate or remove content that violates these Terms, applicable policies, or applicable law.
              </p>
            </section>

            {/* Section 12 */}
            <section id="section-12" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  12
                </span>
                <h3 className="text-lg font-bold text-white">Acceptable Use</h3>
              </div>
              <p className="text-sm text-zinc-300 font-semibold">You must not use PunchX to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Break applicable laws or regulations</li>
                <li>- Commit or facilitate fraud</li>
                <li>- Impersonate another person or organisation</li>
                <li>- Provide false identity or verification information</li>
                <li>- Access another user's account without permission</li>
                <li>- Interfere with the security or operation of PunchX</li>
                <li>- Introduce malicious software or harmful code</li>
                <li>- Collect user information without authorisation</li>
                <li>- Harass, threaten, exploit, or abuse others</li>
                <li>- Use the platform for unlawful activities</li>
              </ul>
            </section>

            {/* Section 13 */}
            <section id="section-13" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  13
                </span>
                <h3 className="text-lg font-bold text-white">Platform Role and Independent Service Providers</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX is a technology platform that may facilitate connections between customers and independent service providers.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Unless PunchX explicitly states otherwise for a particular service, service providers are not employees of PunchX merely because they use the platform.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Independent service providers are generally responsible for their own services, conduct, qualifications, legal compliance, and obligations.
              </p>
              <p className="text-sm text-zinc-400">
                PunchX does not guarantee that every service provider will always be available, suitable, or able to complete every requested service.
              </p>
            </section>

            {/* Section 14 */}
            <section id="section-14" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  14
                </span>
                <h3 className="text-lg font-bold text-white">Safety</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Users should exercise reasonable caution when arranging in-person services.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 leading-relaxed">
                If you believe that a situation presents an immediate danger or emergency, contact the appropriate emergency services or authorities rather than relying on PunchX support.
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Users must not use PunchX to arrange illegal, harmful, or unsafe activities.
              </p>
            </section>

            {/* Section 15 */}
            <section id="section-15" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  15
                </span>
                <h3 className="text-lg font-bold text-white">Intellectual Property</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                The PunchX name, branding, software, website, application design, logos, and other platform materials may be protected by intellectual-property laws.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                You may not copy, reproduce, modify, distribute, or commercially exploit PunchX materials without appropriate permission, except where permitted by applicable law.
              </p>
            </section>

            {/* Section 16 */}
            <section id="section-16" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  16
                </span>
                <h3 className="text-lg font-bold text-white">Suspension or Termination</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may suspend, restrict, or terminate an account where reasonably necessary, including when a user:
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-300 pl-4 border-l-2 border-zinc-800">
                <li>- Violates these Terms</li>
                <li>- Provides fraudulent information</li>
                <li>- Misuses the platform</li>
                <li>- Creates a security or safety risk</li>
                <li>- Engages in unlawful activity</li>
                <li>- Harms or threatens other users</li>
                <li>- Fails to comply with applicable verification or payment requirements</li>
              </ul>
              <p className="text-sm text-zinc-400">
                Where appropriate, we may provide notice of significant account actions.
              </p>
            </section>

            {/* Section 17 */}
            <section id="section-17" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  17
                </span>
                <h3 className="text-lg font-bold text-white">Availability of the Platform</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                We aim to keep PunchX available and functioning reliably, but we cannot guarantee uninterrupted or error-free operation at all times.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                The platform may occasionally be unavailable due to maintenance, technical issues, security requirements, third-party service interruptions, or circumstances beyond our reasonable control.
              </p>
            </section>

            {/* Section 18 */}
            <section id="section-18" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  18
                </span>
                <h3 className="text-lg font-bold text-white">Disclaimer</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX provides a platform to facilitate service-related interactions.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                To the maximum extent permitted by applicable law, PunchX does not guarantee the quality, safety, legality, timing, or suitability of every service provided by independent users.
              </p>
              <p className="text-sm text-zinc-400">
                Nothing in these Terms is intended to exclude rights or protections that cannot legally be excluded.
              </p>
            </section>

            {/* Section 19 */}
            <section id="section-19" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  19
                </span>
                <h3 className="text-lg font-bold text-white">Limitation of Liability</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                To the maximum extent permitted by applicable law, PunchX will not be liable for indirect, incidental, special, consequential, or similar losses arising from use of the platform.
              </p>
              <p className="text-sm text-zinc-400">
                Nothing in these Terms limits liability where such limitation is not permitted under applicable law.
              </p>
            </section>

            {/* Section 20 */}
            <section id="section-20" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  20
                </span>
                <h3 className="text-lg font-bold text-white">Changes to These Terms</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                PunchX may update these Terms as our platform, services, business practices, or legal requirements change.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                When we update these Terms, we will revise the "Last Updated" date. Continued use of PunchX after revised Terms become effective may constitute acceptance of the updated Terms where permitted by applicable law.
              </p>
            </section>

            {/* Section 21 */}
            <section id="section-21" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-zinc-800 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e9c176] font-mono text-sm font-bold">
                  21
                </span>
                <h3 className="text-lg font-bold text-white">Governing Law</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                These Terms shall be governed by applicable laws of India.
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Any dispute shall be subject to applicable legal requirements and the jurisdiction determined under relevant law.
              </p>
            </section>

            {/* Section 22 */}
            <section id="section-22" className="scroll-mt-24 rounded-2xl bg-[#0a152e]/80 border border-[#c5a059]/40 p-6 sm:p-8 space-y-5 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#c5a059]/20 border border-[#c5a059] text-[#e9c176] font-mono text-sm font-bold">
                  22
                </span>
                <h3 className="text-lg font-bold text-white">Contact Us</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                For questions, concerns, or support regarding these Terms, please contact:
              </p>
              
              <div className="p-5 rounded-xl bg-[#071024] border border-[#c5a059]/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 border border-[#c5a059]">
                    <img src={PUNCHX_LOGO} alt="PunchX" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">PunchX</h4>
                    <p className="text-[11px] font-mono text-[#c5a059]">Official Service Utility Platform</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                  <p className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Website: <a href="https://www.punchxapp.co.in" className="text-[#e9c176] hover:underline">www.punchxapp.co.in</a></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>Email: <a href="mailto:businressguy@gmail.com" className="text-[#e9c176] hover:underline">businressguy@gmail.com</a></span>
                  </p>
                </div>
              </div>

              <div className="pt-2 text-xs text-zinc-400 italic">
                By using PunchX, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
              </div>
            </section>

            {/* Bottom Footer Navigation Card */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0d1c3d] to-[#0a152e] border border-zinc-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-white">Review Data Governance</h4>
                <p className="text-xs text-zinc-400">Review our privacy policy and the current service and verification terms.</p>
              </div>
              <button
                onClick={() => {
                  onTransition('privacy-policy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 rounded-xl bg-[#c5a059] hover:bg-[#e9c176] text-black font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Read Privacy Policy</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </main>
        </div>

      </div>
    </div>
  );
}
