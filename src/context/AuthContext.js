"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { isPartialAdminEmail } from '@/utils/partialAdminAccess';
import { hasDownloadsAccessEmail } from '@/utils/downloadsAccess';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Allowed email domain
const ALLOWED_DOMAIN = 'cedargrovellp.com';


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSigningIn = useRef(false);

  // Check if email is from allowed domain
  const isAllowedDomain = (email) => {
    if (!email) return false;
    return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
  };

  const checkAdminStatus = async (email) => {
    if (!email) return false;
    
    try {
      const adminDoc = await getDoc(doc(db, 'admins', email.toLowerCase()));
      return adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Check if user is authorized (either from allowed domain or is an admin)
  const checkAuthorization = async (email) => {
    if (!email) return { isAuthorized: false, isAdmin: false };
    
    // Check if from allowed domain
    if (isAllowedDomain(email)) {
      // Also check if they happen to be an admin
      const adminStatus = await checkAdminStatus(email);
      return { isAuthorized: true, isAdmin: adminStatus };
    }
    
    // If not from allowed domain, check if they're an admin
    const adminStatus = await checkAdminStatus(email);
    return { isAuthorized: adminStatus, isAdmin: adminStatus };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip state updates while actively signing in to prevent interruption
      if (isSigningIn.current) {
        return;
      }

      setUser(firebaseUser);
      
      if (firebaseUser && !firebaseUser.isAnonymous) {
        const { isAuthorized: authorized, isAdmin: admin } = await checkAuthorization(firebaseUser.email);
        setIsAuthorized(authorized);
        setIsAdmin(admin);
      } else {
        setIsAuthorized(false);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      isSigningIn.current = true;
      const provider = new GoogleAuthProvider();
      // Force account selection every time
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      const { isAuthorized: authorized, isAdmin: admin } = await checkAuthorization(result.user.email);
      
      // Now update state after sign-in is complete
      setUser(result.user);
      setIsAuthorized(authorized);
      setIsAdmin(admin);
      isSigningIn.current = false;
      
      return { 
        success: true, 
        user: result.user,
        isAuthorized: authorized,
        isAdmin: admin
      };
    } catch (error) {
      isSigningIn.current = false;
      console.error('Google sign-in error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign-in cancelled' };
      }
      if (error.code === 'auth/popup-blocked') {
        return { success: false, error: 'Popup was blocked. Please allow popups for this site.' };
      }
      
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAuthorized(false);
      setIsAdmin(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Current user's email (lowercased for comparison)
  const userEmail = user?.email ? user.email.toLowerCase() : null;

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isPartialAdmin: isPartialAdminEmail(userEmail),
      hasDownloadsAccess: hasDownloadsAccessEmail(userEmail),
      isAuthorized,
      loading,
      signInWithGoogle,
      signOut,
      isAllowedDomain,
      userEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};