'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function RootPage() {
  const { user, loading, isAdmin, isHomeroomTeacher } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chỉ điều hướng khi đã tải xong trạng thái Auth
    if (!loading) {
      if (!user) {
        // 1. Nếu chưa login -> Đưa ra trang đăng nhập ngay
        router.replace('/login');
      } else {
        // 2. Nếu đã login -> Đưa vào trang phù hợp với chức vụ
        if (isAdmin) {
          router.replace('/tong-quan');
        } else if (isHomeroomTeacher) {
          router.replace('/lop-cua-toi');
        } else {
          router.replace('/tong-quan');
        }
      }
    }
  }, [user, loading, router, isAdmin, isHomeroomTeacher]);

  // Giao diện chờ tối giản, chuyên nghiệp
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f8fafc',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>SỔ SAO ĐỎ</h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Đang kết nối hệ thống...</p>
      </div>
    </div>
  );
}