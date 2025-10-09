"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRecord = void 0;
// apps/functions/src/add-record.ts
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
if (!admin.apps.length)
    admin.initializeApp();
const corsHandler = (0, cors_1.default)({ origin: true });
exports.addRecord = v2_1.https.onRequest({ region: "asia-southeast1" }, async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "POST") {
                return res.status(405).send("Method Not Allowed");
            }
            // ✅ Xác thực Firebase Auth (không yêu cầu App Check)
            const authHeader = req.headers.authorization || "";
            const match = authHeader.match(/^Bearer (.+)$/);
            if (!match)
                return res.status(401).send("Missing ID token");
            let decoded;
            try {
                decoded = await admin.auth().verifyIdToken(match[1]);
            }
            catch {
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
        }
        catch (e) {
            console.error("addRecord error:", e);
            return res.status(500).send(e?.message ?? "Internal Server Error");
        }
    });
});
