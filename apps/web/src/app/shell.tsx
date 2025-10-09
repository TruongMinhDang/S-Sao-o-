'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth(); // Bỏ isAdmin vì MainNav sẽ tự lấy

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    // Chờ cho đến khi AuthProvider xác định xong trạng thái user
    if (loading) return;

    // Nếu chưa đăng nhập và không ở trang login, đá về trang login
    if (!user && !isLoginPage) {
      router.push('/login');
    }

    // Nếu đã đăng nhập và đang ở trang login, đá vào trang tổng quan
    if (user && isLoginPage) {
      router.push('/tong-quan');
    }
  }, [user, isLoginPage, loading, router]);

  // Trong khi chờ xác thực hoặc đang ở trang login, không hiển thị gì cả
  if (loading || isLoginPage) {
    return <main>{children}</main>; // Vẫn render children để trang login hoạt động
  }
  
  // Nếu đã xác thực nhưng không có user (trường hợp hiếm), có thể render lỗi hoặc về login
  if (!user) {
      return null; // Không render gì cả trong khi chờ chuyển hướng
  }

  // Layout chính của ứng dụng khi đã đăng nhập
  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* SỬA: Xóa prop `isAdmin` bị thừa */}
      <MainNav /> 
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b bg-white px-6">
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <footer className="border-t p-3 text-center text-xs text-muted-foreground">
          Sản phẩm chuyển đổi số của Liên Đội Trần Quang Khải — Bản quyền 2025 của Trương Minh Đăng, phát triển trên nền Firebase Studio
        </footer>
      </div>
    </div>
  );
}
