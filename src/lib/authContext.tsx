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
  useEffect( () => { const unsubscribe = onAuthStateChanged(auth, (user) => { setFirebaseUser(user); });
                    return () => unsubscribe(); }, []);

  // Initialize from localStorage on mount
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
    }
    setIsLoadingProfile(false);
  }, []);

  const fetchOrCreateProfile = async (identity: NamoIDUserInfo, role: 'citizen' | 'worker' | 'admin' = activeRole): Promise<UserProfile> => {
    const extractedName = identity.name || 
      (identity.given_name ? `${identity.given_name} ${identity.family_name || ''}`.trim() : '') || 
      (identity.email ? identity.email.split('@')[0] : 'PunchX Member');

    const extractedDob = (identity.birthdate as string) || 
      (identity.dob as string) || 
      (identity.date_of_birth as string) || 
      (identity.birth_date as string) || 
      '';

    try {
      setIsLoadingProfile(true);
      const firebaseUid = auth.currentUser?.uid;

if (!firebaseUid) {
  throw new Error('Firebase user is not authenticated');
}

const userDocRef = doc(db, 'users', firebaseUid);

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
          photoURL: existingData.photoURL || (identity.picture as string) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
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
        const isCompleted = !!extractedName && !!extractedDob;

        const newProfile: UserProfile = {
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

        await Promise.race([
          setDoc(userDocRef, newProfile),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Firestore setDoc timeout')),
              2500
            )
          ),
        ]);

        setUserProfile(newProfile);
        localStorage.setItem(
          'punchx_namoid_profile',
          JSON.stringify(newProfile)
        );

        return newProfile;
      }
    } catch (error) {
      console.error('Failed to fetch or create user profile:', error);
      throw error;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loginWithNamoID = async (identity: NamoIDUserInfo, role?: 'citizen' | 'worker' | 'admin', idToken?: string) => {
    let firebaseAuthSucceeded = false;
    try {
      if (idToken && auth) {
        const provider = new OAuthProvider('oidc.namoid');
        const credential = provider.credential({ idToken });
        await signInWithCredential(auth, credential);
        firebaseAuthSucceeded = true;
      }
    } catch (fbAuthErr) {
      console.warn('Firebase OIDC authentication notice:', fbAuthErr);
      // Continue with local-only profile if Firebase auth fails
      // This allows the app to function on domains not yet added to Firebase Authorized Domains
    }

    try {
      // Store application identity (NamoID was already verified via token exchange)
      setCurrentUser(identity);
      localStorage.setItem(
        'punchx_namoid_identity',
        JSON.stringify(identity)
      );

      if (firebaseAuthSucceeded) {
        return await fetchOrCreateProfile(identity, role || activeRole);
      } else {
        // Fallback: create a local-only profile when Firebase auth is unavailable
        const fallbackName = identity.name ||
          (identity.given_name ? `${identity.given_name} ${identity.family_name || ''}`.trim() : '') ||
          (identity.email ? identity.email.split('@')[0] : 'PunchX Member');
        const localProfile: UserProfile = {
          uid: identity.sub || identity.email || 'local-user',
          name: fallbackName,
          email: identity.email || '',
          photoURL: (identity.picture as string) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          role: role || activeRole,
          dob: (identity.birthdate as string) || '',
          birthdate: (identity.birthdate as string) || '',
          isProfileCompleted: false,
          address: '',
          phone: identity.phone_number || '',
        };
        setUserProfile(localProfile);
        localStorage.setItem('punchx_namoid_profile', JSON.stringify(localProfile));
        return localProfile;
      }
    } catch (profileErr) {
      console.error('Profile creation failed:', profileErr);
      setCurrentUser(null);
      localStorage.removeItem('punchx_namoid_identity');
      throw new Error('Unable to authenticate with Firebase');
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

