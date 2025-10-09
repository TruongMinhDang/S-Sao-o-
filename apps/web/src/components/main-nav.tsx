'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icons, type IconKey } from "@/lib/icons";
import { useAuth } from "@/context/auth-context"; // SỬA: Import useAuth

type Item = {
  href: string;
  label: string;
  icon: IconKey;
  requireAdmin?: boolean;
};

export const NAV_ITEMS: Item[] = [
  { href: "/tong-quan",     label: "Tổng quan",      icon: "dashboard" },
  { href: "/ghi-nhan",      label: "Ghi nhận",       icon: "star" },
  { href: "/lop-cua-toi",   label: "Lớp của tôi",    icon: "users" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng",  icon: "trophy" },
  { href: "/hoc-sinh",      label: "Học sinh",       icon: "users" },
  { href: "/rules",         label: "Quy định",       icon: "rules" },
  { href: "/nguoi-dung",    label: "Người dùng",     icon: "users", requireAdmin: true },
  { href: "/quan-tri",      label: "Quản trị",       icon: "admin", requireAdmin: true },
];

// SỬA: Bỏ prop isAdmin, component sẽ tự lấy từ context
export function MainNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth(); // SỬA: Lấy quyền admin từ context
  
  // Lọc các mục menu dựa trên quyền admin
  const items = NAV_ITEMS.filter(i => !i.requireAdmin || isAdmin);

  return (
    <aside className="hidden w-64 flex-col border-r bg-gray-100/40 p-4 dark:bg-gray-800/40 md:flex">
      <nav className="flex flex-col gap-1">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Điều hướng</h2>
        {items.map(({ href, label, icon }) => {
          const Icon = Icons[icon];
          const active = pathname?.startsWith(href);

          const iconNode = Icon ? (
            <Icon className={clsx("h-4 w-4 transition-transform", active && "scale-110")} />
          ) : (
            <span className="h-4 w-4 rounded-sm bg-gray-400" />
          );

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                active
                  ? "text-white"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              <span
                className={clsx(
                  "absolute inset-0 -z-10 rounded-lg opacity-0 blur-[1px] transition-opacity",
                  "bg-gradient-to-r from-[#ff7a18] via-[#ff9a44] to-[#ffd17a]",
                  active && "opacity-100"
                )}
              />
              {iconNode}
              <span className={clsx("transition-all", active && "animate-pulse")}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
