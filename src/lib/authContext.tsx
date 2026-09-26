import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  OAuthProvider,
  User,
  onAuthStateChanged,
  signInWithCredential,
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
  loginWithNamoID: (identity: NamoIDUserInfo, role?: 'citizen' | 'worker' | 'admin', idToken?: string) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; activeRole?: 'citizen' | 'worker' | 'admin' }> = ({ children, activeRole = 'citizen' }) => {
  const [currentUser, setCurrentUser] = useState<NamoIDUserInfo | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { setFirebaseUser(user); });
    return () => unsubscribe();
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
    const fallbackProfile: UserProfile = {
      uid: firebaseUid,
      name: extractedName,
      email: identity.email || '',
      photoURL:
        (identity.picture as string) ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      role,
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
            const updatedProfile: UserProfile = {
              ...existingData,
              uid: firebaseUid,
              email: existingData.email || identity.email || '',
              photoURL: existingData.photoURL || (identity.picture as string) || fallbackProfile.photoURL,
              name: existingData.name || extractedName,
              dob: existingData.dob || existingData.birthdate || extractedDob,
              birthdate: existingData.birthdate || existingData.dob || extractedDob,
              isProfileCompleted: existingData.isProfileCompleted ?? (!!existingData.name && !!(existingData.dob || existingData.birthdate) && !!existingData.address),
              role: existingData.role || role,
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

  const loginWithNamoID = async (identity: NamoIDUserInfo, role?: 'citizen' | 'worker' | 'admin', idToken?: string) => {
    try {
      if (idToken && auth) {
        const provider = new OAuthProvider('oidc.namoid');
        const credential = provider.credential({ idToken });
        await signInWithCredential(auth, credential);
      }

      // 2. Try OIDC provider credential
      if (!auth.currentUser && idToken) {
        try {
          const provider = new OAuthProvider('oidc.namoid');
          const credential = provider.credential({ idToken });
          const userCred = await signInWithCredential(auth, credential);
          firebaseUid = userCred.user.uid;
        } catch (oidcErr) {
          console.warn('Firebase OIDC credential auth notice:', oidcErr);
        }
      }

      // 3. Try Anonymous Auth fallback
      if (!auth.currentUser) {
        try {
          const userCred = await signInAnonymously(auth);
          firebaseUid = userCred.user.uid;
        } catch (anonErr) {
          console.warn('Firebase anonymous auth notice:', anonErr);
        }
      }

      if (auth.currentUser) {
        firebaseUid = auth.currentUser.uid;
      }
    }

    const rawSub = (identity as any)?.sub || (identity as any)?.id || (identity as any)?.user_id;
    const resolvedUid: string = String(firebaseUid || rawSub || `namoid_${Date.now()}`);

    try {
      setCurrentUser(identity);
      localStorage.setItem('punchx_namoid_identity', JSON.stringify(identity));

      return await fetchOrCreateProfile(identity, role || activeRole, resolvedUid);
    } catch (profileErr) {
      console.error('Profile setup failed:', profileErr);
      setCurrentUser(null);
      localStorage.removeItem('punchx_namoid_identity');
      throw new Error('Unable to complete profile setup');
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const firebaseUid = auth.currentUser?.uid;

    if (!firebaseUid) return;

    try {
      const userDocRef = doc(db, 'users', firebaseUid);

      const payload = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userDocRef, payload);
      setUserProfile((prev) => {
        const next = prev ? { ...prev, ...payload } : null;
        if (next) localStorage.setItem('punchx_namoid_profile', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      setUserProfile((prev) => {
        const next = prev ? { ...prev, ...updates } : null;
        if (next) localStorage.setItem('punchx_namoid_profile', JSON.stringify(next));
        return next;
      });
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('punchx_namoid_identity');
      localStorage.removeItem('punchx_namoid_profile');
      localStorage.removeItem('punchx_auth_role');
      window.dispatchEvent(new CustomEvent('punchx_logout'));
    } catch (error) {
      console.error('Error signing out:', error);
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

