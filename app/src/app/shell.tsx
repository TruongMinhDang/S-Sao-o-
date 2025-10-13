'use client';

import { usePathname } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { Footer } from "@/components/footer";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

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
        <Footer />
      </div>
    </div>
  );
}
