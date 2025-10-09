"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const titleMap: Record<string, string> = {
  "/": "Trang chủ",
  "/tong-quan": "Tổng quan",
  "/ghi-nhan": "Ghi nhận",
  "/lop-cua-toi": "Lớp của tôi",
  "/bang-xep-hang": "Bảng xếp hạng",
  "/hoc-sinh": "Học sinh",
  "/rules": "Quy định",
  "/login": "Đăng nhập",
};

export function Header() {
  const pathname = usePathname();
  const pageTitle = titleMap[pathname] ?? "";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur dark:bg-neutral-900/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-2xl font-extrabold gradient-text shimmer select-none">
            Sổ Sao Đỏ
          </span>
          {pageTitle && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              / {pageTitle}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
