
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { firebaseConfig } from "./firebase-config"; // Sử dụng cấu hình từ file riêng

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check - PHẢI được khởi tạo trước các dịch vụ khác
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Lf-0_gpAAAAAB6_ZgV7e_FvX8xw_9x3X_yYjW4C'),
    isTokenAutoRefreshEnabled: true
  });
}

// Khởi tạo các dịch vụ SAU KHI đã có App Check
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };
