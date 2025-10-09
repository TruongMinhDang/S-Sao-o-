// apps/web/src/app/thong-bao/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase.client"; // ✅ Đúng: lấy sẵn auth, db từ client
import { onAuthStateChanged } from "firebase/auth";
import { CheckCheck } from "lucide-react";
import Link from "next/link";

type NotiDoc = {
  title: string;
  body?: string;
  recipients: string[];
  readBy: string[];
  createdAt?: Timestamp | null;
};

export default function NotificationsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<(NotiDoc & { id: string })[]>([]);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => off();
  }, []);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("recipients", "array-contains", uid),
      orderBy("createdAt", "desc")
    );
    const off = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NotiDoc) })));
    });
    return () => off();
  }, [uid]);

  const markOneRead = async (id: string) => {
    if (!uid) return;
    await updateDoc(doc(db, "notifications", id), { readBy: arrayUnion(uid) });
  };

  const markAllRead = async () => {
    if (!uid) return;
    await Promise.all(
      items
        .filter((n) => !(n.readBy ?? []).includes(uid))
        .map((n) =>
          updateDoc(doc(db, "notifications", n.id), { readBy: arrayUnion(uid) })
        )
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-[#ff7a18] to-[#af002d] bg-clip-text text-2xl font-extrabold text-transparent">
          Thông báo
        </h1>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <CheckCheck className="h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="divide-y rounded-xl border">
        {items.map((n) => {
          const unread = uid && !(n.readBy ?? []).includes(uid);
          return (
            <div key={n.id} className="flex items-start gap-3 p-4">
              <div
                className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: unread ? "#ff7a18" : "transparent" }}
                title={unread ? "Chưa đọc" : "Đã đọc"}
              />
              <div className="flex-1">
                <div className="font-medium">{n.title}</div>
                {n.body && (
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                )}
              </div>
              {unread && (
                <button
                  onClick={() => markOneRead(n.id)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  <CheckCheck className="h-4 w-4" />
                  Đã đọc
                </button>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chưa có thông báo.{" "}
            <Link href="/" className="text-primary hover:underline">
              Về trang chủ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
