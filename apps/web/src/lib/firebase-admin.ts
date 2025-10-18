import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.APP_SOSAODO_ID,
      clientEmail: process.env.APP_SOSAODO_EMAIL,
      privateKey: process.env.APP_SOSAODO_KEY
                    ?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.APP_SOSAODO_ID}.firebaseio.com`
  });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };