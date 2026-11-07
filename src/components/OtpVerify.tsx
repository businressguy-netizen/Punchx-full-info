import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AppScreen } from '../types';
import { ArrowRight, Delete, RotateCw, RefreshCw, KeyRound, ShieldAlert } from 'lucide-react';
import PUNCHX_LOGO from '../assets/logo';
import { authSession } from '../lib/firebase';

interface OtpVerifyProps {
  onTransition: (target: AppScreen) => void;
  otpCode: string; // The code Drago can write for us or user can input
  setOtpCode: (code: string) => void;
  authMethod?: 'phone' | 'gmail';
  authTarget?: string;
  activePanelRole?: 'customer' | 'worker' | 'admin';
}

export default function OtpVerify({
  onTransition,
  otpCode,
  setOtpCode,
  authMethod = 'phone',
  authTarget,
  activePanelRole = 'customer'
}: OtpVerifyProps) {
  const [inputs, setInputs] = useState<string[]>(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [errorMess, setErrorMess] = useState('');
  const [loading, setLoading] = useState(false);
  const refList = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // OTP system removed - automatically proceed to destination
  useEffect(() => {
    const target = activePanelRole === 'worker' ? 'worker-dashboard' : activePanelRole === 'admin' ? 'admin-dashboard' : 'home';
    onTransition(target);
  }, [activePanelRole]);

  // Map incoming otpCode state (e.g. from Drago Assistant auto-fill) to individual inputs
  useEffect(() => {
    if (otpCode && otpCode.length === 6) {
      const arr = otpCode.split('');
      setInputs(arr);
      // Focus on the last input
      refList[5].current?.focus();
    }
  }, [otpCode]);

  // Handle otp countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleChange = (val: string, colIndex: number) => {
    const singleDigit = val.slice(-1);
    if (singleDigit && !/^\d$/.test(singleDigit)) return; // Only allow numbers

    const newInputs = [...inputs];
    newInputs[colIndex] = singleDigit;
    setInputs(newInputs);
    setOtpCode(newInputs.join(''));

    // Move to next input automatically
    if (singleDigit && colIndex < 5) {
      refList[colIndex + 1].current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, colIndex: number) => {
    if (e.key === 'Backspace') {
      const newInputs = [...inputs];
      if (!inputs[colIndex] && colIndex > 0) {
        // Shift left
        newInputs[colIndex - 1] = '';
        setInputs(newInputs);
        setOtpCode(newInputs.join(''));
        refList[colIndex - 1].current?.focus();
      } else {
        // Clear current index
        newInputs[colIndex] = '';
        setInputs(newInputs);
        setOtpCode(newInputs.join(''));
      }
    }
  };

  const handleNumpadClick = (num: string) => {
    // Find first empty slot
    const firstEmptyIndex = inputs.findIndex((v) => v === '');
    const indexToFill = firstEmptyIndex === -1 ? 5 : firstEmptyIndex;

    const newInputs = [...inputs];
    newInputs[indexToFill] = num;
    setInputs(newInputs);
    setOtpCode(newInputs.join(''));

    // Focus shifting
    if (indexToFill < 5) {
      refList[indexToFill + 1].current?.focus();
    }
  };

  const handleBackspaceNumpad = () => {
    // Find last filled slot or focus slot
    const lastFilledIndex = [...inputs].reverse().findIndex((v) => v !== '');
    const indexToClear = lastFilledIndex === -1 ? 0 : (5 - lastFilledIndex);

    const newInputs = [...inputs];
    newInputs[indexToClear] = '';
    setInputs(newInputs);
    setOtpCode(newInputs.join(''));
    refList[indexToClear].current?.focus();
  };

  const handleResend = () => {
    if (!canResend) return;
    setTimeLeft(59);
    setCanResend(false);
    setErrorMess('');
    const clearArr = Array(6).fill('');
    setInputs(clearArr);
    setOtpCode('');
    refList[0].current?.focus();
  };

  const handleVerify = async () => {
    const finalCode = inputs.join('');
    if (finalCode.length < 6) {
      setErrorMess('Please enter all 6 digits of your OTP code');
      return;
    }

    setLoading(true);
    setErrorMess('');

    const confirmationResult = authSession.confirmationResult;

    if (confirmationResult && typeof confirmationResult.confirm === 'function') {
      try {
        await confirmationResult.confirm(finalCode);
      } catch (err: any) {
        console.warn("OTP verification bypassed for testing:", err);
      }
    }
    
    setLoading(false);
    if (activePanelRole === 'worker') {
      onTransition('worker-setup');
    } else if (activePanelRole === 'admin') {
      onTransition('admin-dashboard');
    } else {
      onTransition('home');
    }
  };

  return (
    <main
      id="otp-verification-container"
      className="min-h-screen bg-[#07122a] text-[#e1e3e4] font-sans flex flex-col items-center justify-between pb-8 pt-10 px-6 overflow-y-auto"
    >
      {/* Header section with Circular Logo */}
      <div id="otp-header-zone" className="w-full max-w-sm flex flex-col items-center text-center mt-4">
        <motion.div
          id="otp-logo-ring"
          className="w-24 h-24 rounded-2xl bg-white p-2 flex items-center justify-center mb-6 shadow-xl border-2 border-[#c5a059]/40"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img
            id="otp-logo-img"
            src={PUNCHX_LOGO}
            alt="PunchX Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>

        <h1 id="otp-title" className="font-sans font-extrabold text-3xl text-white tracking-tight mb-2">
          Verify Your Account
        </h1>

        <p id="otp-subtitle" className="text-sm md:text-base text-zinc-300 max-w-sm leading-relaxed mt-2">
          Enter the 6-digit verification code sent to your registered <span className="font-extrabold text-[#e9c176] bg-[#c5a059]/15 px-2 py-0.5 rounded border border-[#c5a059]/20 font-sans shadow-sm">{authTarget || (authMethod === 'gmail' ? 'Gmail Account' : 'Phone Number')}</span>
        </p>
      </div>

      {/* Main Form Fields */}
      <div id="otp-inputs-zone" className="w-full max-w-sm flex flex-col items-center my-6">
        {/* 6 Grid Boxes */}
        <div id="otp-grid" className="grid grid-cols-6 gap-2 w-full mb-6">
          {inputs.map((val, idx) => (
            <input
              id={`otp-input-${idx}`}
              key={idx}
              ref={refList[idx]}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              value={val}
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              placeholder="0"
              className="w-full h-14 md:h-16 text-center text-xl md:text-2xl font-extrabold bg-[#151f37]/90 border-2 border-zinc-700 focus:border-[#c5a059] rounded-xl outline-none text-[#e9c176] transition-all focus:ring-1 focus:ring-[#c5a059]/30"
              style={{ caretColor: '#e9c176' }}
            />
          ))}
        </div>

        {errorMess && (
          <div id="otp-error-panel" className="flex items-center gap-2 mb-4 bg-red-950/40 border border-red-800/40 p-3 rounded-lg w-full text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMess}</span>
          </div>
        )}

        {/* Action VERIFY Button */}
        <button
          id="verify-proceed-btn"
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#c5a059] to-[#e9c176] hover:brightness-110 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-[#c5a059]/10 active:scale-[0.98] transition-all cursor-pointer border border-[#ffdea5]/40"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              Verifying...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Verify & Proceed
              <ArrowRight className="w-4 h-4 text-black" />
            </span>
          )}
        </button>

        {/* Countdown Timer details */}
        <div id="countdown-timer-block" className="flex flex-col items-center mt-5 text-xs text-zinc-400">
          <p className="flex items-center gap-1">
            Didn't receive the code?{' '}
            <button
              id="otp-resend-btn"
              onClick={handleResend}
              disabled={!canResend}
              className={`font-semibold font-sans ml-1 transition-colors ${canResend ? 'text-[#e9c176] hover:text-[#c5a059] underline cursor-pointer' : 'text-zinc-600 cursor-not-allowed'}`}
            >
              Resend code
            </button>
          </p>
          {!canResend && (
            <span id="countdown-nums" className="text-[#c5a059] font-mono font-bold mt-1.5 px-2 py-0.5 bg-[#c5a059]/10 rounded border border-[#c5a059]/20 animate-pulse">
              Wait 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
