
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Trang này chỉ có nhiệm vụ điều hướng, không hiển thị nội dung
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Nếu đã đăng nhập, chuyển đến trang tổng quan
        router.replace('/tong-quan');
      } else {
        // Nếu chưa đăng nhập, chuyển đến trang đăng nhập
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Hiển thị một thông báo tải trang trong khi chờ
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <p>Đang tải ứng dụng...</p>
    </div>
  );
}
