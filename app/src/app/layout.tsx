'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/toaster";
import Shell from "./shell";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <Shell>{children}</Shell>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
