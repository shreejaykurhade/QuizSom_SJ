'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';

type AuthState = { user: User | null; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<AuthState>({ user: null, loading: false, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    // Suppress external browser extension script runtime errors (e.g. chrome-extension://... reading 'M_ID')
    const handleGlobalError = (event: ErrorEvent) => {
      const filename = event.filename || '';
      const message = event.message || '';
      if (
        filename.includes('chrome-extension://') ||
        filename.includes('moz-extension://') ||
        filename.includes('safari-web-extension://') ||
        filename.includes('executors/200.js') ||
        message.includes('M_ID') ||
        message.includes('chrome-extension')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(
        event.reason?.stack || event.reason?.message || event.reason || ''
      );
      if (
        reasonStr.includes('chrome-extension://') ||
        reasonStr.includes('moz-extension://') ||
        reasonStr.includes('safari-web-extension://') ||
        reasonStr.includes('M_ID')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return () => {
        window.removeEventListener('error', handleGlobalError, true);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      };
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  const logout = async () => {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
