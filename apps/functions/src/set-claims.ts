import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { admin } from "./_admin";

/**
 * Callable function (Gen2) – dùng App Check + Auth của Firebase.
 * Bật Enforce App Check cho Callable trong Firebase Console để tự chặn client không hợp lệ.
 */
export const setUserClaims = onCall({ region: "asia-southeast1" }, async (req) => {
  // Chỉ admin mới được đặt quyền
  const roleInToken = (req.auth?.token as any)?.role;
  if (roleInToken !== "admin") {
    throw new Error("Permission denied");
  }

  const { uid, role, assignedClasses = [] } = req.data as {
    uid: string;
    role: string;
    assignedClasses?: string[];
  };

  await getAuth().setCustomUserClaims(uid, { role, assignedClasses });
  return { ok: true };
});
