'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // State to track if the component has mounted
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // On the server and during initial client render, return null
  if (!hasMounted) {
    return null;
  }
  
  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AppContent>{children}</AppContent>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}