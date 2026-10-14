import React, { useState, useEffect, useRef } from 'react';
import { useNamoID } from "@namoidhq/react";
import { useAuth } from '../lib/authContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

  if (!returnedState || !transaction.state || transaction.state !== returnedState) {
    throw new Error("NamoID security check failed (state mismatch). Please restart sign-in.");
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

        // Access tokens are required for the server to verify the identity with
        // NamoID UserInfo. Pass it whether or not this tenant returns an ID token.
        const profile = await loginWithNamoID(
          result.identity,
          'citizen',
          result.tokens?.id_token,
          result.tokens?.access_token,
        );
        window.history.replaceState({}, document.title, '/');

        if (rawRole === 'admin') {
          if (profile?.role === 'admin') {
            onTransition('admin-dashboard');
          } else {
            onTransition('home');
          }
        } else if (rawRole === 'worker') {
          // Check worker status: verify whether this account is an existing specialist
          let workerStatus: string = profile?.status || 'NOT_REGISTERED';
          let hasWorkerApp = false;

          // 1. Check local storage cache of worker applications
          const cachedApps = localStorage.getItem('punchx_worker_applications');
          const cachedAppId = localStorage.getItem('punchx_worker_app_id');
          if (cachedApps || cachedAppId || localStorage.getItem('punchx_worker_approved') === 'true') {
            hasWorkerApp = true;
          }

          // 2. Check Firestore directly
          const uid = profile?.uid || (result.identity as any)?.sub || (result.identity as any)?.id;
          if (db && uid) {
            try {
              const [userSnap, appSnap] = await Promise.all([
                getDoc(doc(db, 'users', uid)),
                getDoc(doc(db, 'workerApplications', uid))
              ]);
              if (userSnap.exists()) {
                const uData = userSnap.data();
                if (uData?.role === 'worker' || uData?.workerSkill || (uData?.categories && uData.categories.length > 0) || uData?.applicationId) {
                  hasWorkerApp = true;
                  workerStatus = 'APPROVED';
                }
              }
              if (appSnap.exists()) {
                hasWorkerApp = true;
                workerStatus = appSnap.data()?.status || 'APPROVED';
              }
            } catch (fsErr) {
              console.warn('Firestore worker check notice:', fsErr);
            }
          }

          // 3. Check backend API
          try {
            const backendBase = import.meta.env.VITE_BACKEND_URL || '';
            const headers: Record<string, string> = {};
            if (result.tokens?.id_token) headers['Authorization'] = `Bearer ${result.tokens.id_token}`;
            const statusRes = await fetch(`${backendBase}/api/workers/status`, { headers });
            if (statusRes.ok) {
              const data = await statusRes.json();
              if (data.registered) {
                hasWorkerApp = true;
                workerStatus = data.status || 'APPROVED';
              }
            }
          } catch (statusErr) {
            console.warn('Worker status backend check notice:', statusErr);
          }

          // Only route straight to dashboard if this account has ALREADY submitted worker registration details
          const isRegisteredSpecialist = Boolean(
            hasWorkerApp ||
            profile?.applicationId ||
            profile?.workerSkill ||
            (profile?.workerCategories && profile.workerCategories.length > 0)
          );

          if (isRegisteredSpecialist) {
            localStorage.setItem('punchx_auth_role', 'worker');
            localStorage.setItem('punchx_worker_approved', 'true');
            localStorage.setItem('punchx_worker_online_status', 'true');
            if (db && uid) {
              try {
                await setDoc(doc(db, 'users', uid), { role: 'worker', status: 'APPROVED' }, { merge: true });
              } catch {}
            }
            onTransition('worker-dashboard');
          } else if (workerStatus === 'REJECTED') {
            localStorage.setItem('punchx_auth_role', 'customer');
            onTransition('panel-select');
          } else {
            localStorage.setItem('punchx_auth_role', 'worker');
            onTransition('worker-signup');
          }
        } else {
          onTransition('home');
        }
      } catch (e: any) {
        console.error("❌ [AuthCallback] Auth callback error:", e);
        // Never treat a cached identity as an authenticated session. Firebase
        // must confirm the session before routing the user into a protected panel.
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
