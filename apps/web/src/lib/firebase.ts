// apps/web/src/lib/firebase.ts
// (dùng cho client — các file import auth nên là "use client")

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  // measurementId là optional
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Lưu ý: firebase/auth là web SDK -> chỉ import ở client components
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export function ensureAppCheck() {
  // Tạm thời không làm gì, để sau bật App Check sẽ triển khai thật
}

export { app, auth, db, storage };
