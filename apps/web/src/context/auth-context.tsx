'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase.client';
import { useRouter, usePathname } from 'next/navigation';

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
const publicPaths = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult(true);
        const claims = tokenResult.claims;

        const profile: UserProfile = {
          displayName: currentUser.displayName ?? undefined,
          email: currentUser.email ?? undefined,
          role: claims.role as UserProfile['role'] | undefined,
          assignedClasses: (claims.assignedClasses as string[] | undefined) || [],
        };
        setUserProfile(profile);
        
        // --- LOGIC CHUYỂN HƯỚNG SAU KHI ĐĂNG NHẬP ---
        // Chỉ chuyển hướng nếu người dùng đang ở trang login hoặc trang chủ.
        // Tránh chuyển hướng khi họ làm mới (refresh) một trang được bảo vệ.
        if (publicPaths.includes(pathname) || pathname === '/') {
            const isAdmin = ['admin', 'hieu_truong', 'pho_hieu_truong'].includes(profile.role || '');
            const isTeacher = ['giao_vien_chu_nhiem', 'homeroom_teacher'].includes(profile.role || '');

            if (isTeacher && !isAdmin) {
                router.push('/lop-cua-toi');
            } else if (isAdmin) {
                router.push('/tong-quan');
            }
        }

      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

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
