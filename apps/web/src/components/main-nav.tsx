'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icons, type IconKey } from "@/lib/icons";
import { useAuth } from "@/context/auth-context";

type Item = {
  href: string;
  label: string;
  icon: IconKey;
  requireAdmin?: boolean;
};

// ================= NAV ITEMS =================
// Dành cho màn hình lớn (desktop)
export const DESKTOP_NAV_ITEMS: Item[] = [
  { href: "/tong-quan",     label: "Tổng quan",      icon: "dashboard" },
  { href: "/ghi-nhan",      label: "Ghi nhận",       icon: "star" },
  { href: "/lop-cua-toi",   label: "Lớp của tôi",    icon: "users" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng",  icon: "trophy" },
  { href: "/hoc-sinh",      label: "Học sinh",       icon: "users" },
  { href: "/rules",         label: "Quy định",       icon: "rules" },
  { href: "/nguoi-dung",    label: "Người dùng",     icon: "users", requireAdmin: true },
  { href: "/quan-tri",      label: "Quản trị",       icon: "admin", requireAdmin: true },
];

// Dành cho màn hình nhỏ (mobile)
const MOBILE_NAV_ITEMS: Omit<Item, 'requireAdmin'>[] = [
    { href: '/tong-quan', label: 'Tổng quan', icon: 'dashboard' },
    { href: '/bang-xep-hang', label: 'Xếp hạng', icon: 'trophy' },
    { href: '/lop-cua-toi', label: 'Lớp tôi', icon: 'class' },
    { href: '/hoc-sinh', label: 'Học sinh', icon: 'users' },
];

const GRADIENT_CLASSES = "bg-gradient-to-r from-[#ff7a18] via-[#ff9a44] to-[#ffd17a]";

// ================= COMPONENT =================
export function MainNav() {
  const pathname = usePathname();
  const { user, isSuperAdmin } = useAuth(); // SỬA: Dùng isSuperAdmin thay vì isAdmin
  
  // Lọc các mục cho desktop nav
  const desktopItems = DESKTOP_NAV_ITEMS.filter(i => !i.requireAdmin || isSuperAdmin);
  
  // Tạo các mục cho mobile nav, với mục cuối cùng là động
  const mobileItems: Item[] = [
      ...MOBILE_NAV_ITEMS,
      user
        ? { href: '/ho-so', label: 'Hồ sơ', icon: 'profile' }
        : { href: '/login', label: 'Đăng nhập', icon: 'login' }
  ];

  return (
    <>
      {/* ======================= Sidebar cho Desktop ======================= */}
      {/* Hiển thị từ màn hình md trở lên */}
      <aside className="hidden w-64 flex-col border-r bg-gray-100/40 p-4 dark:bg-gray-800/40 md:flex">
        <nav className="flex flex-col gap-1">
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Điều hướng</h2>
          {desktopItems.map(({ href, label, icon }) => {
            const Icon = Icons[icon];
            const active = pathname?.startsWith(href);
            const iconNode = Icon ? <Icon className={clsx("h-4 w-4 transition-transform", active && "scale-110")} /> : <span className="h-4 w-4" />;

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
                <span className={clsx("absolute inset-0 -z-10 rounded-lg opacity-0 blur-[1px] transition-opacity", GRADIENT_CLASSES, active && "opacity-100")} />
                {iconNode}
                <span className={clsx("transition-all", active && "animate-pulse")}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ======================= Thanh điều hướng dưới cùng cho Mobile ======================= */}
      {/* Ẩn từ màn hình md trở lên */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-1 backdrop-blur-sm md:hidden">
        <div className="grid h-16 grid-cols-5 items-stretch justify-center">
          {mobileItems.map(({ href, label, icon }) => {
            const Icon = Icons[icon];
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-1 rounded-md p-1 text-xs transition-colors hover:bg-accent"
                aria-current={active ? 'page' : undefined}
              >
                <div className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  active && "bg-orange-100 dark:bg-orange-900/50" // Thêm nền nhẹ cho icon active
                )}>
                  <Icon className={clsx(
                    "h-5 w-5",
                     active ? "text-orange-500" : "text-muted-foreground" // Icon màu cam khi active
                  )} />
                </div>
                <span className={clsx(
                  "truncate text-center font-medium",
                   active ? "text-transparent bg-clip-text" : "text-muted-foreground",
                   active && GRADIENT_CLASSES // Gradient cho chữ khi active
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
