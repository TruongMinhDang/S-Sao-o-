'use client';

import { usePathname } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top";
import { ModeToggle } from "@/components/mode-toggle";


export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/auth/action";

  if (isAuthPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50 dark:bg-neutral-900">
      <MainNav />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b bg-background/95 px-6 backdrop-blur-sm sticky top-0 z-40">
          <ModeToggle />
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <footer className="border-t p-3 text-center text-xs text-muted-foreground">
          Sản phẩm chuyển đổi số của Liên Đội Trần Quang Khải — 
          Bản quyền 2025 của Trương Minh Đăng, phát triển trên nền Firebase Studio
        </footer>
      </div>
       <ScrollToTopButton />
    </div>
  );
}
