'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase.client';
import { useRouter, usePathname } from 'next/navigation';

interface UserProfile {
  displayName?: string;
  email?: string;
  role?: 'admin' | 'giao_vien_chu_nhiem' | 'homeroom_teacher' | 'hieu_truong' | 'pho_hieu_truong' | 'giam_thi' | 'nv_tin_hoc';
  assignedClasses?: string[];
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean; // THÊM THUỘC TÍNH NÀY
  isSuperAdmin: boolean;
  isViewerAdmin: boolean;
  isHomeroomTeacher: boolean;
  isProctor: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/auth/action'];

const authRedirectRoutes: { [key: string]: string } = {
    admin: '/tong-quan',
    viewerAdmin: '/tong-quan',
    teacher: '/lop-cua-toi',
    default: '/tong-quan'
};

const isSuperAdminRole = (role?: string) => role === 'admin';
const isViewerAdminRole = (role?: string) => ['hieu_truong', 'pho_hieu_truong', 'nv_tin_hoc'].includes(role || '');
const isHomeroomTeacherRole = (role?: string) => ['giao_vien_chu_nhiem', 'homeroom_teacher'].includes(role || '');
const isProctorRole = (role?: string) => role === 'giam_thi';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Làm mới thông tin người dùng để lấy trạng thái emailVerified mới nhất
          await currentUser.reload();

          // Sau khi reload, tạo một bản sao của đối tượng user để React nhận diện sự thay đổi
          setUser(Object.assign(Object.create(Object.getPrototypeOf(currentUser)), currentUser));

          const tokenResult = await currentUser.getIdTokenResult();
          const claims = tokenResult.claims;

          const rawClasses = claims.assignedClasses;
          let finalClasses: string[] = [];
          if (Array.isArray(rawClasses)) {
            finalClasses = rawClasses;
          } else if (typeof rawClasses === 'string' && rawClasses.length > 0) {
            finalClasses = rawClasses.split(',').map(c => c.trim());
          }

          const profile: UserProfile = {
            displayName: currentUser.displayName ?? undefined,
            email: currentUser.email ?? undefined,
            role: claims.role as UserProfile['role'] | undefined,
            assignedClasses: finalClasses,
          };
          setUserProfile(profile);

          // DEBUG: Log role để kiểm tra nếu role không được set đúng
          if (!profile.role) {
             console.warn(`User logged in but has no 'role' claim. User ID: ${currentUser.uid}, Email: ${currentUser.email}`);
          }
        } catch (error) {
          console.error("Error fetching user claims:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const userRole = userProfile?.role;
  const isSuperAdmin = isSuperAdminRole(userRole);
  const isViewerAdmin = isViewerAdminRole(userRole);
  const isHomeroomTeacher = isHomeroomTeacherRole(userRole);
  const isProctor = isProctorRole(userRole);
  const isAdmin = isSuperAdmin || isViewerAdmin; // TÍNH TOÁN GIÁ TRỊ isAdmin

  useEffect(() => {
    if (loading) return;

    const isPublicPath = publicPaths.includes(pathname);

    if (user) { // User is logged in
      // Chỉ redirect nếu user đang ở trang public (login) hoặc trang root
      // Nếu user truy cập trực tiếp link (ví dụ /lop-cua-toi), KHÔNG redirect về dashboard mặc định
      if (isPublicPath || pathname === '/') {
        if (isSuperAdmin) {
            router.push(authRedirectRoutes.admin);
        } else if (isViewerAdmin) {
            router.push(authRedirectRoutes.viewerAdmin);
        } else if (isHomeroomTeacher) {
            router.push(authRedirectRoutes.teacher);
        } else {
            router.push(authRedirectRoutes.default);
        }
      }
    } else { // User is not logged in
      if (!isPublicPath) {
        router.push('/login');
      }
    }
  }, [user, userProfile, loading, pathname, router, isSuperAdmin, isViewerAdmin, isHomeroomTeacher]);

  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, isSuperAdmin, isViewerAdmin, isHomeroomTeacher, isProctor, loading }}>
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
