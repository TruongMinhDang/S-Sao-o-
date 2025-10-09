"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserClaims = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
/**
 * Callable function (Gen2) – dùng App Check + Auth của Firebase.
 * Bật Enforce App Check cho Callable trong Firebase Console để tự chặn client không hợp lệ.
 */
exports.setUserClaims = (0, https_1.onCall)({ region: "asia-southeast1" }, async (req) => {
    // Chỉ admin mới được đặt quyền
    const roleInToken = req.auth?.token?.role;
    if (roleInToken !== "admin") {
        throw new Error("Permission denied");
    }
    const { uid, role, assignedClasses = [] } = req.data;
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role, assignedClasses });
    return { ok: true };
});
