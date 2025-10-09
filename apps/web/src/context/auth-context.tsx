'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase.client';

// Lấy instance của Firebase Auth
const auth = getAuth(app);

interface AuthContextType {
  user: User | null; // User object từ Firebase Auth
  userProfile: UserProfile | null; // Profile từ Firestore (chứa role)
  isAdmin: boolean;
  loading: boolean;
}

interface UserProfile {
  displayName?: string;
  email?: string;
  role?: 'admin' | 'teacher';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User đã đăng nhập, lấy thông tin role từ Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // Không tìm thấy profile, có thể là user mới
          setUserProfile(null);
        }
      } else {
        // User đã đăng xuất
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const isAdmin = userProfile?.role === 'admin';

  const value = {
    user,
    userProfile,
    isAdmin,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
