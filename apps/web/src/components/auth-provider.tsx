"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getIdTokenResult, User } from "firebase/auth";
import { auth } from "@/lib/firebase.client";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  // có thể thêm: refresh(): Promise<void>
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const token = await getIdTokenResult(u, /* forceRefresh */ true);
        // 👉 Nếu claim của bạn khác, chỉnh dòng dưới.
        setIsAdmin(token.claims?.role === "admin" || token.claims?.admin === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
