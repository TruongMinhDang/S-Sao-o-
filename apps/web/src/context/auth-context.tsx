'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase.client';

interface AuthContextType {
  user: User | null;
  /**
   * Thông tin user mở rộng, chứa vai trò và các lớp được phân công từ Custom Claims.
   */
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isTeacher: boolean;
  loading: boolean;
}

interface UserProfile {
  displayName?: string;
  email?: string;
  role?: 'admin' | 'giao_vien_chu_nhiem' | 'homeroom_teacher' | 'hieu_truong' | 'pho_hieu_truong' | 'giam_thi';
  assignedClasses?: string[]; // Thêm trường này
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
        // Lấy custom claims từ ID token.
        // forceRefresh: true đảm bảo token luôn mới nhất.
        const tokenResult = await currentUser.getIdTokenResult(true);
        const claims = tokenResult.claims;

        // Xây dựng userProfile từ thông tin cơ bản và custom claims
        const profile: UserProfile = {
          displayName: currentUser.displayName ?? undefined,
          email: currentUser.email ?? undefined,
          role: claims.role as UserProfile['role'] | undefined,
          assignedClasses: (claims.assignedClasses as string[] | undefined) || [], // Lấy danh sách lớp
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

  // Admin có thể là vai trò "admin", "hieu_truong", hoặc "pho_hieu_truong"
  const isAdmin = ['admin', 'hieu_truong', 'pho_hieu_truong'].includes(userProfile?.role || '');
  const isTeacher = ['giao_vien_chu_nhiem', 'homeroom_teacher'].includes(userProfile?.role || '');

  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, isTeacher, loading }}>
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
