"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context"; // ĐÃ SỬA

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chờ cho đến khi có kết quả xác thực
    if (loading) {
      return; 
    }

    // Nếu không có user, đá về trang login
    if (!user) {
      router.replace("/login");
      return;
    }
    
    // Nếu có user nhưng không phải admin, đá về trang chủ (hoặc trang lỗi 403)
    if (!isAdmin) {
      router.replace("/"); 
    }
  }, [user, loading, isAdmin, router]);

  // Trong khi đang tải, hiển thị thông báo
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Nếu user đã đăng nhập và là admin, hiển thị nội dung được bảo vệ
  if (user && isAdmin) {
    return <>{children}</>;
  }

  // Trong các trường hợp khác (đang chuyển hướng), không hiển thị gì
  return null;
}
