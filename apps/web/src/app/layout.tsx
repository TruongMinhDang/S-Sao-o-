'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import Shell from "./shell"; // Import Shell

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {/* Bọc toàn bộ ứng dụng trong Shell */}
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
