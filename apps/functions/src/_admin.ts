import * as admin from "firebase-admin";

// Bảo đảm chỉ initialize 1 lần cho mọi module
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
