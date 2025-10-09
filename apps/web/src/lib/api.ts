// apps/web/src/lib/api.ts
import { auth } from "./firebase.client";

const ADD_RECORD_URL = process.env.NEXT_PUBLIC_ADD_RECORD_URL!;

export async function addRecord(payload: unknown) {
  // Lấy ID token của user đăng nhập
  const user = auth.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập.");

  const idToken = await user.getIdToken();

  const res = await fetch(ADD_RECORD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addRecord failed: ${res.status} ${text}`);
  }
  return res.json();
}
