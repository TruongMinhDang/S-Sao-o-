'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  getFirestore,
  type FirestoreDataConverter,
  Timestamp,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  WithFieldValue,
  PartialWithFieldValue,
  serverTimestamp,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db as defaultDb, auth } from '@/lib/firebase.client'; // Sửa đường dẫn nếu cần

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Rule = {
  id: string;
  code: string;
  category: string;
  description: string;
  points: number;
  type: 'merit' | 'demerit';
  content?: string | null;
  score?: number | null;
  order?: number | null;
  updatedAt?: Timestamp | null;
};

const ruleConverter: FirestoreDataConverter<Rule> = {
  toFirestore(rule: PartialWithFieldValue<Rule>) {
    const data: any = {
      category: rule.category,
      code: rule.code,
      description: rule.description,
      points: rule.points,
      type: rule.type,
      updatedAt: serverTimestamp(),
    };
    delete data.id;
    delete data.content;
    delete data.score;
    delete data.order;
    return data;
  },
  fromFirestore(snap) {
    const d = snap.data();
    const description = String(d.description ?? d.content ?? '');
    const rawPoints = d.points ?? d.score ?? 0;
    const points = typeof rawPoints === 'number' ? rawPoints : Number(rawPoints) || 0;

    const resolvedType: 'merit' | 'demerit' =
      d.type === 'merit' || d.type === 'demerit'
        ? d.type
        : points >= 0
        ? 'merit'
        : 'demerit';

    return {
      id: snap.id,
      code: String(d.code ?? ''),
      category: String(d.category ?? ''),
      description,
      points,
      type: resolvedType,
      content: description,
      score: points,
      order: typeof d.order === 'number' ? d.order : null,
      updatedAt: d.updatedAt ?? null,
    };
  },
};

function ScoreBadge({ score }: { score: number }) {
  const cls = score < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold';
  const text = score >= 0 ? `+${score}` : String(score);
  return <span className={cls}>{text}</span>;
}

const defaultRuleState: Pick<Rule, 'category' | 'description' | 'points' | 'type'> = {
  category: '',
  description: '',
  points: 0,
  type: 'merit',
};

export default function RulesPage() {
  const db = defaultDb ?? getFirestore();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<Rule>>(defaultRuleState);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!authUser) return;
    setLoading(true);
    const qRef = query(collection(db, 'rules').withConverter(ruleConverter), orderBy('code', 'asc'));
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

  const handleAddClick = () => {
    setCurrentRule(defaultRuleState);
    setIsDialogOpen(true);
  };

  const handleEditClick = (rule: Rule) => {
    setCurrentRule(rule);
    setIsDialogOpen(true);
  };

  const parsePoints = (val: unknown): number => {
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSave = async () => {
    if (!currentRule.category || !currentRule.description) {
      alert('Vui lòng điền đầy đủ Danh mục và Mô tả!');
      return;
    }
    setIsSaving(true);
    try {
      const points = parsePoints(currentRule.points);
      const type: 'merit' | 'demerit' =
        (currentRule.type as 'merit' | 'demerit') ?? (points >= 0 ? 'merit' : 'demerit');

      const dataToSave: WithFieldValue<Omit<Rule, 'id' | 'content' | 'score' | 'order'>> = {
        category: String(currentRule.category),
        description: String(currentRule.description),
        points,
        type,
        code: String(currentRule.code ?? ''),
        updatedAt: serverTimestamp(),
      };

      if (currentRule.id) {
        const ruleRef = doc(db, 'rules', currentRule.id);
        const { code, ...partial } = dataToSave;
        await updateDoc(ruleRef, partial as PartialWithFieldValue<Rule>);
      } else {
        let newCode = 'VP001';
        if (rules.length > 0) {
          const lastCode = rules[rules.length - 1].code || '';
          const match = lastCode.match(/^([A-Z]+)(\d+)$/);
          if (match) {
            const prefix = match[1];
            const numStr = match[2];
            const newNum = parseInt(numStr, 10) + 1;
            newCode = prefix + String(newNum).padStart(numStr.length, '0');
          } else {
            console.warn('Unexpected code format', lastCode);
          }
        }
        const rulesCollection = collection(db, 'rules'); // <--- ĐÃ SỬA CHỖ NÀY
        await addDoc(rulesCollection, { ...dataToSave, code: newCode });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving document: ', error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá nội quy này không?')) return;
    try {
      await deleteDoc(doc(db, 'rules', ruleId));
    } catch (error) {
      console.error('Error deleting document: ', error);
      alert('Đã có lỗi xảy ra khi xoá. Vui lòng thử lại.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentRule((prev) => ({
      ...prev,
      [name]: name === 'points' ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCurrentRule((prev) => ({ ...prev, [name]: value as 'merit' | 'demerit' }));
  };

  const title = useMemo(
    () => (
        <div className="flex items-center gap-3">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/app-quan-ly-hs.firebasestorage.app/o/Icon%2Ficon%20rules.png?alt=media&token=ba9ff1f2-bcd2-417b-be65-cd6e67fce6f9"
                alt="Biểu tượng Quy định"
                width={40}
                height={40}
            />
            <h1 className="text-3xl font-black leading-tight">
                <span className="bg-gradient-to-r from-[#ff7a18] to-[#af002d] bg-clip-text text-transparent">
                Quản Lý Quy Định
                </span>
            </h1>
      </div>
    ),
    []
  );

  const isEditing = !!currentRule.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          {title}
          <p className="mt-2 text-muted-foreground">
            Thêm, sửa, xoá và quản lý các quy định về điểm số của nhà trường.
          </p>
        </div>
        {isAdmin && <Button onClick={handleAddClick}>Thêm Nội Quy</Button>}
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
                <th className="px-4 py-3">Mô tả / Ghi chú</th>
                <th className="w-28 px-4 py-3">Điểm</th>
                <th className="w-36 px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={6}>
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && rules.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={6}>
                    Chưa có nội quy.
                  </td>
                </tr>
              )}
              {!loading &&
                rules.map((r, idx) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.code}</td>
                    <td className="px-4 py-3">{r.category}</td>
                    <td className="px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={r.points} />
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditClick(r)}
                            className="text-blue-600 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(r.id)}
                            className="text-red-600 hover:underline"
                          >
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
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Cập Nhật Nội Quy' : 'Thêm Nội Quy Mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Danh mục
              </Label>
              <Input
                id="category"
                name="category"
                value={currentRule.category ?? ''}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="VD: Nề nếp"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Mô tả
              </Label>
              <Input
                id="description"
                name="description"
                value={currentRule.description ?? ''}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Mô tả chi tiết nội quy"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="points" className="text-right">
                Điểm
              </Label>
              <Input
                id="points"
                name="points"
                type="number"
                value={String(currentRule.points ?? 0)}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="VD: -5 hoặc 10"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Loại
              </Label>
              <Select
                name="type"
                value={(currentRule.type as string) ?? 'merit'}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Chọn loại điểm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merit">Tuyên dương (điểm cộng)</SelectItem>
                  <SelectItem value="demerit">Vi phạm (điểm trừ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (isEditing ? 'Đang cập nhật...' : 'Đang lưu...') : isEditing ? 'Lưu thay đổi' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
