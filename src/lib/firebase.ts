import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Silence non-fatal transient connection warnings and log only errors
try {
  setLogLevel('error');
} catch (e) {
  // Ignored in strict environments
}

const fallbackConfig = {
  projectId: "gen-lang-client-0120647960",
  appId: "1:657136107440:web:1456f92b13b6e13f44e075",
  apiKey: "AIzaSyDNH2eC_XcMCrWWSL4cTHemb4hH0-9kCcc",
  authDomain: "gen-lang-client-0120647960.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-punchxservicecus-c71be4cc-9ee1-4ae7-b718-125aa03bcd38",
  storageBucket: "gen-lang-client-0120647960.firebasestorage.app",
  messagingSenderId: "657136107440",
  measurementId: "G-HXBW3TPMF9",
  oAuthClientId: "657136107440-3k02uag8mn3cbsqus25jcme9rpa022bo.apps.googleusercontent.com"
};

// Environment variable overrides (for Vercel/Netlify deployment configuration)
const envConfig: Record<string, string> = {};
if (import.meta.env.VITE_FIREBASE_API_KEY) envConfig.apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) envConfig.authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
if (import.meta.env.VITE_FIREBASE_PROJECT_ID) envConfig.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) envConfig.storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
if (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) envConfig.messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
if (import.meta.env.VITE_FIREBASE_APP_ID) envConfig.appId = import.meta.env.VITE_FIREBASE_APP_ID;

const firebaseConfig = {
  ...fallbackConfig,
  ...(rawConfig || {}),
  ...envConfig,
  // BUG-02 fix: Use custom domain as authDomain so OAuth redirects/popups work
  // on the production site instead of failing with CORS/origin mismatch
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'www.punchxapp.co.in',
};

let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (initErr) {
  console.warn("Firebase App initialization notice, re-trying fallback:", initErr);
  try {
    app = initializeApp(fallbackConfig);
  } catch (err2) {
    app = getApps()[0] || ({} as FirebaseApp);
  }
}

let firestoreInstance: Firestore;
try {
  const dbSettings = {
    localCache: memoryLocalCache(),
    // Force HTTP long-polling to prevent WebSocket connection failures in sandboxed iframes & proxies
    experimentalForceLongPolling: true,
  };
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? initializeFirestore(app, dbSettings, firebaseConfig.firestoreDatabaseId)
    : initializeFirestore(app, dbSettings);
} catch (e) {
  console.warn("Firestore initializeFirestore fallback to getFirestore:", e);
  try {
    firestoreInstance = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (err3) {
    console.warn("Firestore fallback initialization notice:", err3);
    firestoreInstance = getFirestore(app);
  }
}

// Global window safety handler for transient network/offline Firestore events
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (
      reason.includes('closing') ||
      reason.includes('hidden') ||
      reason.includes('IndexedDb') ||
      reason.includes('database is closing') ||
      reason.includes('Database is closing/hidden') ||
      reason.includes('unavailable') ||
      reason.includes('Could not reach Cloud Firestore backend') ||
      reason.includes('offline mode')
    ) {
      event.preventDefault();
      console.warn('Handled transient database/network lifecycle event:', reason);
    }
  });
}

let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch (authErr) {
  console.warn("Auth initialization notice:", authErr);
  authInstance = {} as Auth;
}

export const db = firestoreInstance;
export const auth = authInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Firestore Notice [${operationType} on ${path || 'unknown'}]:`, message);
  if (
    message.includes('closing') ||
    message.includes('IndexedDb') ||
    message.includes('hidden') ||
    message.includes('database is closing') ||
    message.includes('unavailable') ||
    message.includes('offline')
  ) {
    console.warn("Firestore connection transient notice: continuing with local cache");
    return;
  }
  throw new Error(`Database operation failed (${operationType}). Please try again.`);
}




interface AuthSession {
  recaptchaVerifier: unknown;
  confirmationResult: any;
}

export const authSession: AuthSession = {
  recaptchaVerifier: null,
  confirmationResult: null
};
