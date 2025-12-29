import { getApps, initializeApp, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

import { env } from "@/env";

// ================== CẤU HÌNH FIREBASE =====================

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ================== KHỞI TẠO APP =====================

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ================== APP CHECK (CLIENT-ONLY, 1 LẦN DUY NHẤT) =====================

if (typeof window !== "undefined") {
  const g = globalThis as any;

  if (!g.__firebaseAppCheckInitialized) {
    g.__firebaseAppCheckInitialized = true;

    // Debug token chỉ dùng cho DEV
    if (process.env.NODE_ENV !== "production") {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(
        env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
      ),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

// ================== EXPORT SERVICES =====================

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
