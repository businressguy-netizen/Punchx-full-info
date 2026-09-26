import React, { useState, useEffect, useRef } from 'react';
import { useNamoID } from "@namoidhq/react";
import { useAuth } from '../lib/authContext';
import { AppScreen } from '../types';

async function completePunchXAuthRedirect(client: any, callbackUrl: string = window.location.href) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const storageKey = `namoid_oidc:${client.clientId.slice(-12)}`;
  let raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);

  if (!raw) {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('namoid_oidc')) {
        raw = sessionStorage.getItem(k);
        if (raw) break;
      }
    }
  }
  if (!raw) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('namoid_oidc')) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
  }

  const storedIdentity = localStorage.getItem('punchx_namoid_identity');
  if (!raw && storedIdentity) {
    try {
      const identity = JSON.parse(storedIdentity);
      return { tokens: { id_token: '', access_token: '' }, identity, idTokenClaims: {} };
    } catch {
      // continue
    }
  }

  if (!raw) {
    if (!code) {
      throw new Error("No authorization code found. Please sign in.");
    }
    throw new Error("Authorization transaction is missing. Please try signing in again.");
  }

  const transaction = JSON.parse(raw);

  if (returnedState && transaction.state && transaction.state !== returnedState) {
    console.warn("Notice: Authorization state mismatch:", returnedState, transaction.state);
  }

  const authError = url.searchParams.get("error");
  if (authError) {
    sessionStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey);
    throw new Error(url.searchParams.get("error_description") || authError);
  }

  if (!code) {
    throw new Error("Authorization code is missing");
  }

  const tokens = await client.hostedAuth.exchangeCode({
    code,
    redirectUri: transaction.redirectUri,
    codeVerifier: transaction.codeVerifier,
  });

  if (!tokens || !tokens.access_token) {
    throw new Error("Token exchange did not return an access token");
  }

  const identity = await client.hostedAuth.userInfo(tokens.access_token);

  let idTokenClaims: any = {};
  if (tokens.id_token) {
    try {
      const parts = tokens.id_token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        idTokenClaims = JSON.parse(jsonPayload);
      }
    } catch (jwtErr) {
      console.warn("Notice decoding id_token payload:", jwtErr);
    }
  }

  sessionStorage.removeItem(storageKey);
  localStorage.removeItem(storageKey);

  return { tokens, identity, idTokenClaims };
}

export default function AuthCallback({ onTransition }: { onTransition: (target: AppScreen) => void }) {
  const client = useNamoID();
  const { loginWithNamoID } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    async function processCallback() {
      try {
        const callbackUrl = window.location.href;
        const result = await completePunchXAuthRedirect(client, callbackUrl);
        const rawRole = localStorage.getItem('punchx_auth_role') || 'customer';
        const role: 'citizen' | 'worker' | 'admin' = 
          rawRole === 'worker' ? 'worker' : rawRole === 'admin' ? 'admin' : 'citizen';

        if (result.tokens?.id_token) {
          await loginWithNamoID(result.identity, role, result.tokens.id_token);
        } else {
          await loginWithNamoID(result.identity, role);
        }
        window.history.replaceState({}, document.title, '/');

        if (role === 'admin') onTransition('admin-dashboard');
        else if (role === 'worker') onTransition('worker-dashboard');
        else onTransition('home');
      } catch (e: any) {
        console.error("❌ [AuthCallback] Auth callback error:", e);
        const storedIdentity = localStorage.getItem('punchx_namoid_identity');
        if (storedIdentity) {
          const rawRole = localStorage.getItem('punchx_auth_role') || 'customer';
          window.history.replaceState({}, document.title, '/');
          if (rawRole === 'admin') onTransition('admin-dashboard');
          else if (rawRole === 'worker') onTransition('worker-dashboard');
          else onTransition('home');
          return;
        }
        setErrorMessage(e?.message || "Authentication callback could not be completed.");
      }
    }
    processCallback();
  }, [client, loginWithNamoID, onTransition]);

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
        <div className="max-w-md bg-[#11192e] border border-red-500/30 p-6 rounded-2xl shadow-xl">
          <p className="text-red-400 font-bold text-base mb-2">Sign In Notice</p>
          <p className="text-zinc-400 text-xs mb-4 leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => onTransition('auth')}
            className="px-4 py-2 bg-[#c5a059] text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#d8b46e] transition-all cursor-pointer"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-12 h-12 border-4 border-[#c5a059]/20 border-t-[#c5a059] rounded-full animate-spin shadow-[0_0_15px_rgba(197,160,89,0.5)] mb-4"></div>
      <p className="text-sm font-bold text-white uppercase tracking-wider">Completing NamoID Authorization...</p>
      <p className="text-xs text-zinc-400 mt-1">Verifying security token & initializing profile</p>
    </div>
  );
}
