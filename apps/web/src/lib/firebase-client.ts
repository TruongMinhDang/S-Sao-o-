
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Gộp config trực tiếp vào đây để đảm bảo không có lỗi import
const firebaseConfig = {
  apiKey: "AIzaSyAqGxdFqDGXOiiKP5cKFvPkNkmTdY4aByw",
  authDomain: "app-quan-ly-hs.firebaseapp.com",
  projectId: "app-quan-ly-hs",
  storageBucket: "app-quan-ly-hs.appspot.com",
  messagingSenderId: "771200825229",
  appId: "1:771200825229:web:cbc5498073eff6be21afc4",
};


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
