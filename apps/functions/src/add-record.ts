// apps/functions/src/add-record.ts
import { https } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import cors from "cors";

if (!admin.apps.length) admin.initializeApp();

const corsHandler = cors({ origin: true });

export const addRecord = https.onRequest(
  { region: "asia-southeast1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).send("Method Not Allowed");
        }

        // ✅ Xác thực Firebase Auth (không yêu cầu App Check)
        const authHeader = req.headers.authorization || "";
        const match = authHeader.match(/^Bearer (.+)$/);
        if (!match) return res.status(401).send("Missing ID token");

        let decoded;
        try {
          decoded = await admin.auth().verifyIdToken(match[1]);
        } catch {
          return res.status(401).send("Invalid ID token");
        }

        const data = req.body; // TODO: validate input
        // Ví dụ ghi Firestore:
        // await admin.firestore().collection("records").add({
        //   ...data,
        //   uid: decoded.uid,
        //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // });

        return res.json({ ok: true, received: data });
      } catch (e: any) {
        console.error("addRecord error:", e);
        return res.status(500).send(e?.message ?? "Internal Server Error");
      }
    });
  }
);
