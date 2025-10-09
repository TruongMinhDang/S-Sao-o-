"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/"); // hoặc trang 403 tùy bạn
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-neutral-500">
        Đang kiểm tra quyền truy cập…
      </div>
    );
  }

  if (!user || !isAdmin) return null; // trong khi redirect

  return <>{children}</>;
}
