'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  query,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { PlusCircle, Search } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type UserRole = 
  | 'giam_thi'
  | 'homeroom_teacher'
  | 'hieu_truong'
  | 'pho_hieu_truong'
  | 'nhan_vien_cntt'
  | 'admin';

const ROLES = {
  giam_thi: 'Giám thị',
  homeroom_teacher: 'Giáo viên chủ nhiệm',
  hieu_truong: 'Hiệu trưởng',
  pho_hieu_truong: 'Phó hiệu trưởng',
  nhan_vien_cntt: 'Nhân viên CNTT',
  admin: 'Quản trị tối cao',
};

interface User {
  id: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  assignedClasses?: string[];
}

const formatRole = (role: UserRole) => ROLES[role] || role;

export default function UsersPage() {
  const { user: authUser, loading: authLoading, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  useEffect(() => {
    if (authLoading) {
      setDataLoading(true);
      return;
    }
    if (!isSuperAdmin) {
      setError("Truy cập bị từ chối.");
      setDataLoading(false);
      setUsers([]);
      return;
    }

    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id, ...doc.data() as Omit<User, 'id'>,
        }));
        setUsers(usersData);
        setError(null);
        setDataLoading(false);
      },
      (err) => {
        console.error("Lỗi snapshot:", err);
        setError('Không thể tải danh sách người dùng.');
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, isSuperAdmin]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter((u) =>
      u.displayName?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const handleAddNewUser = () => {
    setEditingUser({});
    setModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      if (!editingUser.displayName || !editingUser.email || !editingUser.role) {
        alert("Vui lòng nhập đầy đủ họ tên, email, và vai trò.");
        return;
      }
      const dataToSave: Partial<User> = { ...editingUser };
      if (editingUser.id) {
        const userRef = doc(db, 'users', editingUser.id);
        await setDoc(userRef, dataToSave, { merge: true });
      } else {
        await addDoc(collection(db, 'users'), dataToSave);
      }
      setModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Lỗi lưu người dùng:", err);
      alert("Đã có lỗi khi lưu thông tin.");
    }
  };
  
  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return <div className="p-8 text-center">Đang tải...</div>;
  }

  if (!isSuperAdmin) {
    return (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
            <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
            <p>Bạn không có quyền truy cập trang này.</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">Quản Lý Người Dùng</h1>
          <p className="text-gray-500 mt-1">Chỉ Quản trị viên tối cao mới có thể truy cập trang này.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={handleAddNewUser}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm Người Dùng Mới
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
           <div>
            <h2 className="text-2xl font-bold">Danh Sách Người Dùng</h2>
            <p className="text-gray-500 mt-1">Tất cả người dùng đã đăng ký trong hệ thống.</p>
          </div>
          <div className="relative mt-4 md:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-80"
            />
          </div>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lớp Phụ Trách</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-red-500">{error}</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">Không tìm thấy người dùng nào.</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.role ? formatRole(user.role) : '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                        Chưa rõ
                      </span>
                    </TableCell>
                    <TableCell>{user.assignedClasses?.join(', ') || '-'}</TableCell>
                    <TableCell className="text-right">
                      {isSuperAdmin && (
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>Sửa</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
         <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingUser?.id ? 'Sửa Thông Tin Người Dùng' : 'Thêm Người Dùng Mới'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">Tên hiển thị</Label>
              <Input id="displayName" value={editingUser?.displayName || ''} onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={editingUser?.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Vai trò</Label>
              <Select value={editingUser?.role || ''} onValueChange={(value) => setEditingUser({ ...editingUser, role: value as UserRole })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homeroom_teacher">Giáo viên chủ nhiệm</SelectItem>
                  <SelectItem value="giam_thi">Giám thị</SelectItem>
                  <SelectItem value="hieu_truong">Hiệu trưởng</SelectItem>
                  <SelectItem value="pho_hieu_truong">Phó hiệu trưởng</SelectItem>
                  <SelectItem value="nhan_vien_cntt">Nhân viên CNTT</SelectItem>
                  <SelectItem value="admin">Quản trị tối cao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editingUser?.role === 'homeroom_teacher') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignedClasses" className="text-right">Lớp phụ trách</Label>
                <Input
                  id="assignedClasses"
                  value={Array.isArray(editingUser?.assignedClasses) ? editingUser.assignedClasses.join(', ') : (editingUser?.assignedClasses || '')}
                  onChange={(e) => setEditingUser({ ...editingUser, assignedClasses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="col-span-3"
                  placeholder="Ví dụ: class_7_1, class_7_2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Hủy</Button></DialogClose>
            <Button onClick={handleSaveUser}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
