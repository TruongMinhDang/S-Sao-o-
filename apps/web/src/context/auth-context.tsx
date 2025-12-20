'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';
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
  isAdmin: boolean;
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

function EmailVerificationScreen() {
  const auth = getAuth(app);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        setMessage('Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn.');
      } catch (error: any) {
        console.error(error);
        setMessage(`Lỗi: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', padding: '20px', backgroundColor: '#f0f2f5' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Yêu cầu Xác thực Email</h1>
      <p style={{ marginBottom: '20px' }}>Tài khoản của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác thực để tiếp tục.</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleResend} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Gửi lại Email</button>
        <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Đăng xuất</button>
      </div>
      {message && <p style={{ marginTop: '20px', color: 'green' }}>{message}</p>}
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          await currentUser.reload();
          const freshUser = auth.currentUser;

          if (freshUser) {
            setUser(freshUser);
            setEmailVerified(freshUser.emailVerified);

            if (freshUser.emailVerified) {
              const tokenResult = await freshUser.getIdTokenResult();
              const claims = tokenResult.claims;

              const rawClasses = claims.assignedClasses;
              let finalClasses: string[] = [];
              if (Array.isArray(rawClasses)) {
                finalClasses = rawClasses;
              } else if (typeof rawClasses === 'string' && rawClasses.length > 0) {
                finalClasses = rawClasses.split(',').map(c => c.trim());
              }

              const profile: UserProfile = {
                displayName: freshUser.displayName ?? undefined,
                email: freshUser.email ?? undefined,
                role: claims.role as UserProfile['role'] | undefined,
                assignedClasses: finalClasses,
              };
              setUserProfile(profile);

              // Log debug để kiểm tra phân quyền
              if (!profile.role) {
                console.warn(`User logged in but has no 'role' claim. UID: ${freshUser.uid}`);
              }
            }
          }
        } catch (error) {
          console.error("Error processing auth state:", error);
          setUserProfile(null);
          setUser(null);
        }
      } else {
        setUserProfile(null);
        setUser(null);
        setEmailVerified(false);
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
  const isAdmin = isSuperAdmin || isViewerAdmin;

  useEffect(() => {
    if (loading) return;

    const isPublicPath = publicPaths.includes(pathname);

    // Chốt: Chỉ xử lý điều hướng nếu User đã Login VÀ đã xác thực Email
    if (user && emailVerified) { 
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
    } else if (!user) { 
      if (!isPublicPath) {
        router.push('/login');
      }
    }
  }, [user, emailVerified, loading, pathname, router, isSuperAdmin, isViewerAdmin, isHomeroomTeacher]);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  // Chặn người dùng nếu chưa xác thực email
  if (user && !emailVerified) {
    const isPublicPath = publicPaths.includes(pathname);
    if(isPublicPath) return <>{children}</>;
    return <EmailVerificationScreen />;
  }

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
