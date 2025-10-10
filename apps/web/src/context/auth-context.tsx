'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase.client'; // Bỏ import 'db' vì không cần nữa

interface AuthContextType {
  user: User | null;
  /**
   * Thông tin user mở rộng, chứa vai trò được lấy từ Custom Claims.
   */
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
}

interface UserProfile {
  displayName?: string;
  email?: string;
  role?: 'admin' | 'teacher';
  // Có thể thêm các thuộc tính khác từ claims sau này, ví dụ: assignedClasses
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // === THAY ĐỔI CỐT LÕI ===
        // Lấy custom claims từ ID token thay vì đọc từ Firestore.
        // forceRefresh: true đảm bảo token luôn mới nhất, phản ánh thay đổi quyền gần như tức thì.
        const tokenResult = await currentUser.getIdTokenResult(true);
        const claims = tokenResult.claims;

        // Xây dựng userProfile từ thông tin cơ bản và custom claims
        const profile: UserProfile = {
          displayName: currentUser.displayName ?? undefined,
          email: currentUser.email ?? undefined,
          role: claims.role as 'admin' | 'teacher' | undefined,
        };
        setUserProfile(profile);
      } else {
        // User đã đăng xuất, xóa profile
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Logic này vẫn giữ nguyên, nhưng nguồn dữ liệu của `userProfile` đã thay đổi
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
