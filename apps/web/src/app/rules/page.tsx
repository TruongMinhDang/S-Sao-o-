'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  getFirestore,
  type FirestoreDataConverter,
  Timestamp,
  addDoc,
  WithFieldValue,
  PartialWithFieldValue,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db as defaultDb, auth } from '@/lib/firebase.client';

// Giả sử bạn dùng shadcn/ui cho giao diện
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ====== Kiểu dữ liệu ======
type Rule = {
  id: string;
  code: string;
  category: string;
  content: string;
  score: number;
  order?: number | null;
  updatedAt?: Timestamp | null;
};

// Firestore converter
const ruleConverter: FirestoreDataConverter<Rule> = {
  toFirestore(rule: PartialWithFieldValue<Rule>) {
    const data = { ...rule };
    data.updatedAt = Timestamp.now();
    return data;
  },
  fromFirestore(snap) {
    const d = snap.data();
    return {
      id: snap.id,
      code: String(d.code ?? ''),
      category: String(d.category ?? ''),
      content: String(d.description ?? d.content ?? ''),
      score: Number(d.points ?? d.score ?? 0),
      order: typeof d.order === 'number' ? d.order : null,
      updatedAt: d.updatedAt ?? null,
    };
  },
};

// ====== UI helpers ======
function ScoreBadge({ score }: { score: number }) {
  const cls =
    score < 0
      ? 'text-red-600 font-semibold'
      : 'text-green-600 font-semibold';
  const text = score > 0 ? `+${score}` : String(score);
  return <span className={cls}>{text}</span>;
}

// ====== Component chính ======
export default function RulesPage() {
  const db = defaultDb ?? getFirestore();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State cho chức năng THÊM MỚI ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    category: '',
    content: '',
    score: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          setIsAdmin(idTokenResult.claims.role === 'admin');
        } catch (error) {
          console.error('Error getting user claims:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return unsubAuth;
  }, []);

  // Tải dữ liệu từ Firestore
  useEffect(() => {
    if (authUser === null) {
      setLoading(false);
      setRules([]);
      return;
    }

    setLoading(true);
    const qRef = query(
      collection(db, 'rules').withConverter(ruleConverter),
      orderBy('code', 'asc')
    );

    const unsubSnap = onSnapshot(
      qRef,
      (snap) => {
        setRules(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        console.error('Load rules error:', err);
        setLoading(false);
      }
    );

    return unsubSnap;
  }, [db, authUser]);

  // --- Hàm xử lý LƯU NỘI QUY MỚI ---
  const handleSaveRule = async () => {
    if (!newRule.category || !newRule.content) {
      alert('Vui lòng điền đầy đủ Danh mục và Nội dung!');
      return;
    }

    setIsSaving(true);
    
    try {
      let newCode = 'VP001';
      if (rules.length > 0) {
        const lastRule = rules[rules.length - 1];
        const lastCode = lastRule.code;
        
        const match = lastCode.match(/^([A-Z]+)(\d+)$/);
        
        if (match) {
          const prefix = match[1];
          const numberStr = match[2];
          const newNumber = parseInt(numberStr, 10) + 1;
          newCode = prefix + String(newNumber).padStart(numberStr.length, '0');
        } else {
          console.warn("Last rule code format is unexpected. Using default.", lastCode);
        }
      }

      const ruleToSave = {
        code: newCode,
        category: newRule.category,
        content: newRule.content,
        score: Number(newRule.score) || 0,
      };

      const rulesCollection = collection(db, 'rules').withConverter(ruleConverter);
      await addDoc(rulesCollection, ruleToSave);

      setIsDialogOpen(false);
      setNewRule({ category: '', content: '', score: 0 });

    } catch (error) {
      console.error('Error adding document: ', error);
      alert('Đã có lỗi xảy ra khi lưu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const title = useMemo(
    () => (
      <h1 className="text-3xl font-black leading-tight">
        <span className="bg-gradient-to-r from-[#ff7a18] to-[#af002d] bg-clip-text text-transparent">
          Quản Lý Quy Định
        </span>
      </h1>
    ),
    []
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          {title}
          <p className="mt-2 text-muted-foreground">
            Thêm, sửa, xoá và quản lý các quy định về điểm số của nhà trường.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsDialogOpen(true)}>Thêm Nội Quy</Button>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-background shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Danh Sách Nội Quy</h2>
          <p className="text-sm text-muted-foreground">
            Chi tiết các nội quy đang được áp dụng trong toàn hệ thống.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-sm font-medium">
                <th className="w-16 px-4 py-3">STT</th>
                <th className="w-32 px-4 py-3">Mã số</th>
                <th className="w-40 px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Nội dung / Ghi chú</th>
                <th className="w-28 px-4 py-3">Điểm số</th>
                <th className="w-36 px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={6}>
                    Đang tải dữ liệu…
                  </td>
                </tr>
              )}
              {!loading && rules.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={6}>
                    Chưa có nội quy nào.
                  </td>
                </tr>
              )}
              {!loading &&
                rules.map((r, idx) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.code}</td>
                    <td className="px-4 py-3">{r.category}</td>
                    <td className="px-4 py-3">{r.content}</td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={r.score} />
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-blue-600 hover:underline">
                            Sửa
                          </button>
                          <button type="button" className="text-red-600 hover:underline">
                            Xoá
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Chỉ QTV</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* === SỬA LỖI GIAO DIỆN TẠI ĐÂY === */}
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Thêm Nội Quy Mới</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Danh mục</Label>
              <Input id="category" name="category" value={newRule.category} onChange={handleInputChange} className="col-span-3" placeholder="VD: An toàn"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">Nội dung</Label>
              <Input id="content" name="content" value={newRule.content} onChange={handleInputChange} className="col-span-3" placeholder="Mô tả chi tiết nội quy"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="score" className="text-right">Điểm số</Label>
              <Input id="score" name="score" type="number" value={newRule.score} onChange={handleInputChange} className="col-span-3" placeholder="VD: -15"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Huỷ</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveRule} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}