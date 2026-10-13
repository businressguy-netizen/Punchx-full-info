import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  OAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCredential,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';
import { NamoIDUserInfo } from '@namoidhq/js';

interface AuthContextType {
  currentUser: NamoIDUserInfo | null;
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginWithNamoID: (identity: NamoIDUserInfo, role?: 'citizen' | 'worker' | 'admin', idToken?: string, accessToken?: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; activeRole?: 'citizen' | 'worker' | 'admin' }> = ({ children, activeRole = 'citizen' }: { children: React.ReactNode; activeRole?: 'citizen' | 'worker' | 'admin' }) => {
  const [currentUser, setCurrentUser] = useState<NamoIDUserInfo | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  useEffect(() => {
    let disposed = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) return;

      // Firebase restores persisted sessions on page entry. Audit that event too,
      // so returning customers/professionals are recorded even without a new OAuth popup.
      void (async () => {
        try {
          const backendBase = String(import.meta.env.VITE_BACKEND_URL || '').replace(/[/]+$/, '');
          const idToken = await user.getIdToken();
          const cachedProfile = (() => {
            try { return JSON.parse(localStorage.getItem('punchx_namoid_profile') || '{}'); } catch { return {}; }
          })();
          const cachedIdentity = (() => {
            try { return JSON.parse(localStorage.getItem('punchx_namoid_identity') || '{}'); } catch { return {}; }
          })();
          const providerIds = (user.providerData || []).map((provider) => provider.providerId);
          const loginMethod = providerIds.includes('password') ? 'firebase-email-password'
            : providerIds.includes('phone') ? 'firebase-phone'
            : providerIds.includes('google.com') ? 'google'
            : providerIds.includes('oidc.namoid') ? 'namoid'
            : user.isAnonymous ? 'anonymous'
            : (user.email || cachedIdentity.email) ? 'namoid-email'
            : (user.phoneNumber || cachedIdentity.phone_number) ? 'namoid-phone' : 'namoid';
          const response = await fetch(`${backendBase}/api/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              loginMethod,
              role: cachedProfile.role === 'worker' ? 'worker' : 'citizen',
              name: cachedProfile.name || user.displayName || cachedIdentity.name || '',
              email: user.email || cachedProfile.email || cachedIdentity.email || '',
              phone: user.phoneNumber || cachedProfile.phone || cachedIdentity.phone_number || '',
              profile: {
                name: cachedProfile.name || user.displayName || cachedIdentity.name || '',
                email: cachedProfile.email || user.email || cachedIdentity.email || '',
                phone: cachedProfile.phone || user.phoneNumber || cachedIdentity.phone_number || '',
                photoURL: cachedProfile.photoURL || user.photoURL || '',
                dob: cachedProfile.dob || cachedProfile.birthdate || '',
                birthdate: cachedProfile.birthdate || cachedProfile.dob || '',
                address: cachedProfile.address || '',
                landmark: cachedProfile.landmark || '',
                area: cachedProfile.area || '',
                sector: cachedProfile.sector || '',
                city: cachedProfile.city || '',
                isProfileCompleted: Boolean(cachedProfile.isProfileCompleted),
                workerSkill: cachedProfile.workerSkill || '',
                workerCategories: cachedProfile.workerCategories || [],
                workerExperience: cachedProfile.workerExperience || '',
                visitingFee: cachedProfile.visitingFee,
                applicationId: cachedProfile.applicationId || '',
                location: cachedProfile.location,
                geofenceArea: cachedProfile.geofenceArea || '',
                geofenceAreas: cachedProfile.geofenceAreas || [],
                serviceAreas: cachedProfile.serviceAreas || [],
              },
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.success !== true) {
            throw new Error(result.error || 'Firebase could not save sign-in history.');
          }
        } catch (error) {
          if (!disposed) console.error('PunchX sign-in audit failed:', error);
        }
      })();
    });
    return () => { disposed = true; unsubscribe(); };
  }, []);

  // Restore cached profile when a Firebase-authenticated user exists or stored profile exists.
  useEffect(() => {
    const storedIdentity = localStorage.getItem('punchx_namoid_identity');
    const storedProfile = localStorage.getItem('punchx_namoid_profile');
    if (storedIdentity && storedProfile) {
      try {
        setCurrentUser(JSON.parse(storedIdentity));
        setUserProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error("Error reading stored auth profile:", e);
      }
    } else if (!firebaseUser) {
      setCurrentUser(null);
      setUserProfile(null);
    }
    setIsLoadingProfile(false);
  }, [firebaseUser]);

  const fetchOrCreateProfile = async (
    identity: NamoIDUserInfo,
    role: 'citizen' | 'worker' | 'admin' = activeRole,
    overrideUid?: string
  ): Promise<UserProfile> => {
    const extractedName = identity.name || 
      (identity.given_name ? `${identity.given_name} ${identity.family_name || ''}`.trim() : '') || 
      (identity.email ? identity.email.split('@')[0] : 'PunchX Member');

    const extractedDob = (identity.birthdate as string) || 
      (identity.dob as string) || 
      (identity.date_of_birth as string) || 
      (identity.birth_date as string) || 
      '';

    const rawSub = (identity as any)?.sub || (identity as any)?.id || (identity as any)?.user_id;
    const firebaseUid: string = String(overrideUid || auth.currentUser?.uid || rawSub || `user_${Date.now()}`);

    const isCompleted = !!extractedName && !!extractedDob;
    // New registrations always default to citizen. Worker role requires explicit admin approval.
    const fallbackProfile: UserProfile = {
      uid: firebaseUid,
      name: extractedName,
      email: identity.email || '',
      // Never assign a stock/fake portrait. A worker photo is optional until the worker uploads a genuine one.
      photoURL: (identity.picture as string) || '',
      role: 'citizen',
      dob: extractedDob,
      birthdate: extractedDob,
      isProfileCompleted: isCompleted,
      address: '',
      phone: identity.phone_number || '',
    };

    try {
      setIsLoadingProfile(true);

      if (db && firebaseUid) {
        const userDocRef = doc(db, 'users', firebaseUid);

        try {
          const userSnap = await Promise.race([
            getDoc(userDocRef),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firestore connection timeout')), 2500)
            )
          ]);

          if (userSnap.exists()) {
            const existingData = userSnap.data() as UserProfile;
            // Only accept 'worker' if status is explicitly APPROVED by admin
            const isApprovedWorker = existingData.role === 'worker' && existingData.status === 'APPROVED';
            const resolvedRole: 'citizen' | 'worker' | 'admin' = existingData.role === 'admin' 
              ? 'admin' 
              : isApprovedWorker 
                ? 'worker' 
                : 'citizen';

            const updatedProfile: UserProfile = {
              ...existingData,
              uid: firebaseUid,
              email: existingData.email || identity.email || '',
              photoURL: (existingData.photoURL && !String(existingData.photoURL).includes('images.unsplash.com/photo-1534528741775-53994a69daeb')) ? existingData.photoURL : ((identity.picture as string) || ''),
              name: existingData.name || extractedName,
              dob: existingData.dob || existingData.birthdate || extractedDob,
              birthdate: existingData.birthdate || existingData.dob || extractedDob,
              isProfileCompleted: existingData.isProfileCompleted ?? (!!existingData.name && !!(existingData.dob || existingData.birthdate) && !!existingData.address),
              role: resolvedRole,
              status: existingData.status,
              address: existingData.address !== undefined ? existingData.address : '',
              phone: existingData.phone || identity.phone_number || ''
            };
            
            setUserProfile(updatedProfile);
            localStorage.setItem('punchx_namoid_profile', JSON.stringify(updatedProfile));
            return updatedProfile;
          } else {
            try {
              await Promise.race([
                setDoc(userDocRef, fallbackProfile),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Firestore setDoc timeout')), 2500)
                ),
              ]);
            } catch (setErr) {
              console.warn('Firestore setDoc notice (using local profile state):', setErr);
            }

            setUserProfile(fallbackProfile);
            localStorage.setItem('punchx_namoid_profile', JSON.stringify(fallbackProfile));
            return fallbackProfile;
          }
        } catch (fsErr) {
          console.warn('Firestore fetch notice (using local profile state):', fsErr);
        }
      }

      setUserProfile(fallbackProfile);
      localStorage.setItem('punchx_namoid_profile', JSON.stringify(fallbackProfile));
      return fallbackProfile;
    } catch (error) {
      console.warn('Profile fetch notice:', error);
      setUserProfile(fallbackProfile);
      localStorage.setItem('punchx_namoid_profile', JSON.stringify(fallbackProfile));
      return fallbackProfile;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loginWithNamoID = async (identity: NamoIDUserInfo, role?: 'citizen' | 'worker' | 'admin', idToken?: string, accessToken?: string) => {
    let firebaseUid: string | null = null;
    let tokenExchangeError = '';

    if (auth) {
      // 1. Exchange the verified NamoID sign-in for a Firebase custom token.
      // Preserve the backend's diagnostic response so a deployment/configuration
      // problem does not get hidden behind a generic sign-in notice.
      try {
        const configuredBackend = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
        // Prefer the same-origin Vercel function. VITE_BACKEND_URL may point to
        // an older API host which returns 404 even while the app is deployed.
        const endpoints = Array.from(new Set([
          `${window.location.origin}/api/namoid-token`,
          `${window.location.origin}/api/auth/namoid-token`,
          ...(configuredBackend ? [
            `${configuredBackend}/api/namoid-token`,
            `${configuredBackend}/api/auth/namoid-token`,
          ] : []),
        ]));
        let lastStatus = 0;
        let lastMessage = '';
        for (const endpoint of endpoints) {
          try {
            const tokenRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, accessToken, identity, role }),
            });
            const data = await tokenRes.json().catch(() => ({}));
            if (tokenRes.ok && data.customToken) {
              const userCred = await signInWithCustomToken(auth, data.customToken);
              firebaseUid = userCred.user.uid;
              tokenExchangeError = '';
              break;
            }
            lastStatus = tokenRes.status;
            lastMessage = String(data.error || `Firebase token exchange failed (HTTP ${tokenRes.status}).`);
            // Try the next endpoint only when this path is not deployed.
            if (tokenRes.status !== 404) {
              tokenExchangeError = lastMessage;
              break;
            }
          } catch (endpointError) {
            lastMessage = endpointError instanceof Error ? endpointError.message : 'Could not reach the authentication endpoint.';
          }
        }
        if (!firebaseUid) {
          tokenExchangeError = lastMessage || (lastStatus
            ? `Firebase token exchange failed (HTTP ${lastStatus}).`
            : 'Could not reach the Firebase authentication endpoint.');
        }
      } catch (customTokErr) {
        tokenExchangeError = customTokErr instanceof Error
          ? customTokErr.message
          : 'Could not reach the Firebase authentication server.';
        console.warn('Custom token auth notice:', customTokErr);
      }

      // 2. If the provider supplies a Firebase-compatible OIDC ID token, try
      // that route as a fallback.
      if (!auth.currentUser && idToken) {
        try {
          const provider = new OAuthProvider('oidc.namoid');
          const credential = provider.credential({ idToken });
          const userCred = await signInWithCredential(auth, credential);
          firebaseUid = userCred.user.uid;
        } catch (oidcErr) {
          console.warn('Firebase OIDC credential auth notice:', oidcErr);
          if (!tokenExchangeError) {
            tokenExchangeError = oidcErr instanceof Error ? oidcErr.message : 'Firebase OIDC sign-in failed.';
          }
        }
      }

      // Never silently replace a returning customer/professional with a fresh anonymous UID.
      // That splits their profile, bookings, and login history across unrelated Firebase accounts.
      if (auth.currentUser) {
        firebaseUid = auth.currentUser.uid;
      } else {
        throw new Error(tokenExchangeError
          ? `PunchX could not finish Firebase sign-in: ${tokenExchangeError}`
          : 'PunchX could not link this sign-in to a persistent Firebase account. Check the Firebase custom-token endpoint and NamoID provider configuration, then retry.');
      }
    }

    const rawSub = (identity as any)?.sub || (identity as any)?.id || (identity as any)?.user_id;
    const resolvedUid: string = String(firebaseUid || rawSub || `namoid_${Date.now()}`);

    try {
      setCurrentUser(identity);
      localStorage.setItem('punchx_namoid_identity', JSON.stringify(identity));

      const profile = await fetchOrCreateProfile(identity, role || activeRole, resolvedUid);

      // The auth-state listener records this successful sign-in and restored sessions.
      // Never store a password, OTP, or bearer token in the profile or login history.
      if (!auth.currentUser) {
        throw new Error('Firebase authentication is not ready. Please retry signing in.');
      }
      return profile;
    } catch (profileErr) {
      console.error('Profile setup failed:', profileErr);
      setCurrentUser(null);
      localStorage.removeItem('punchx_namoid_identity');
      throw new Error(profileErr instanceof Error ? profileErr.message : 'Unable to complete profile setup');
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error('Your Firebase sign-in session is missing. Please sign in again before saving profile changes.');
    }

    const firebaseUid = firebaseUser.uid;
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    const backendBase = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    const idToken = await firebaseUser.getIdToken();
    const response = await fetch(`${backendBase}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true || !result.user) {
      throw new Error(result.error || 'Firebase could not confirm your profile update. Please retry.');
    }

    const savedProfile = { ...(userProfile || {}), ...result.user, uid: firebaseUid } as UserProfile;
    setUserProfile(savedProfile);
    try { localStorage.setItem('punchx_namoid_profile', JSON.stringify(savedProfile)); } catch {}
  };

  const logout = async () => {
    let signOutError: unknown = null;
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      signOutError = error;
      console.error('Error signing out from Firebase:', error);
    } finally {
      // Always clear the local PunchX session and notify the app so the user
      // cannot remain visually logged in when the provider sign-out fails.
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('punchx_namoid_identity');
      localStorage.removeItem('punchx_namoid_profile');
      localStorage.removeItem('punchx_auth_role');
      window.dispatchEvent(new CustomEvent('punchx_logout'));
    }
    if (signOutError) {
      throw signOutError;
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchOrCreateProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoadingProfile,
        updateUserProfile,
        logout,
        refreshProfile,
        loginWithNamoID
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

