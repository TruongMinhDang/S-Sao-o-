'use client';
import React from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Nếu sau này cần ThemeProvider/AuthProvider… thì bọc vào đây.
  return <>{children}</>;
}
