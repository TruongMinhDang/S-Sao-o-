t
// apps/web/src/lib/firebase.ts
// (dùng cho client — các file import auth nên là "use client")

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo App Check một lần duy nhất
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV !== 'production') {
    // Bật chế độ debug token cho môi trường phát triển (localhost)
    // Mở console trình duyệt để lấy token này
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Hàm này không còn cần thiết nhưng giữ lại để không gây lỗi import
export function ensureAppCheck() {}

export { app, auth, db, storage };
