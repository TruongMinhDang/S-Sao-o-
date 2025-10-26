
import { getApps, initializeApp, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// SỬA LỖI: Import đúng provider cho reCAPTCHA Enterprise
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Chỉ khởi tạo AppCheck phía client và CHỈ MỘT LẦN DUY NHẤT
if (typeof window !== 'undefined') {
  // Sử dụng một biến global để đảm bảo code này chỉ chạy 1 lần
  if (!(global as any)._appCheckInitialized) {
    (global as any)._appCheckInitialized = true;

    if (process.env.NODE_ENV !== 'production') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    // SỬA LỖI: Sử dụng new ReCaptchaEnterpriseProvider thay vì V3
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
      isTokenAutoRefreshEnabled: true
    });
  }
}

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
