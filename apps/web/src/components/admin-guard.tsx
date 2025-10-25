"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth(); // Sửa thành isSuperAdmin
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/auth/action"); // Chuyển về trang đăng nhập/hành động
      return;
    }

    // Nếu user không phải là Super Admin, chuyển về trang tổng quan
    if (!isSuperAdmin) {
      router.replace("/");
    }
  }, [user, loading, isSuperAdmin, router]);

  // Trong khi chờ, hiển thị trạng thái loading hoặc nếu không phải admin
  if (loading || !isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Nếu là Super Admin, hiển thị nội dung
  if (user && isSuperAdmin) {
    return <>{children}</>;
  }

  // Fallback, không hiển thị gì trong khi chuyển hướng
  return null;
}
