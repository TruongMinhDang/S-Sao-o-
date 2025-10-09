'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase.client';
import { collection, onSnapshot, addDoc, doc, setDoc, query, where } from 'firebase/firestore';
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

// --- HỆ THỐNG PHÂN QUYỀN VÀ VAI TRÒ ---
type UserRole = 'giam_thi' | 'giao_vien_chu_nhiem' | 'hieu_truong' | 'pho_hieu_truong' | 'nhan_vien_cntt' | 'admin';

const ROLES = {
  giam_thi: 'Giám thị',
  giao_vien_chu_nhiem: 'Giáo viên chủ nhiệm',
  hieu_truong: 'Hiệu trưởng',
  pho_hieu_truong: 'Phó hiệu trưởng',
  nhan_vien_cntt: 'Nhân viên CNTT',
  admin: 'Quản trị tối cao',
};

// Giả lập hook lấy thông tin người dùng đang đăng nhập.
// Thay đổi giá trị `role` ở đây để kiểm tra các quyền khác nhau.
const useAuth = () => ({
  currentUser: {
    role: 'admin' as UserRole, // Test với 'admin', 'giam_thi', ...
    assignedClass: 'Lớp 10A1',
  },
});
// -----------------------------------------------------

interface User {
  id: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  assignedClass?: string;
}

const formatRole = (role: UserRole) => {
  return ROLES[role] || role;
};

export default function UsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // Phân tách quyền: Chỉ admin được thêm mới trên trang này
  const canAddUsers = currentUser.role === 'admin';
  // Admin và Giám thị được sửa
  const canEditUsers = currentUser.role === 'admin' || currentUser.role === 'giam_thi';

  useEffect(() => {
    let usersQuery = query(collection(db, 'users'));

    if (currentUser.role === 'giao_vien_chu_nhiem' && currentUser.assignedClass) {
      usersQuery = query(usersQuery, where('assignedClass', '==', currentUser.assignedClass));
    }

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() as Omit<User, 'id'> }));
        setUsers(usersData);
        setLoading(false);
      },
      (err) => {
        console.error("Lỗi khi tải danh sách người dùng:", err);
        setError('Không thể tải danh sách người dùng.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedFilter = searchTerm.toLowerCase();
    return users.filter((user) => (
      user.displayName?.toLowerCase().includes(lowercasedFilter) ||
      user.email?.toLowerCase().includes(lowercasedFilter)
    ));
  }, [users, searchTerm]);

  const handleAddNewUser = () => {
    setEditingUser({});
    setModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  }

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      if (editingUser.id) {
        const userRef = doc(db, "users", editingUser.id);
        const { id, ...dataToSave } = editingUser;
        await setDoc(userRef, dataToSave, { merge: true });
      } else {
        await addDoc(collection(db, "users"), editingUser);
      }
      setModalOpen(false);
      setEditingUser(null);
    } catch (err) {
        console.error("Lỗi khi lưu người dùng:", err);
        alert("Đã có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.");
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">Quản Lý Người Dùng</h1>
          <p className="text-gray-500 mt-1">
            Thêm, sửa, và quản lý vai trò của người dùng trong hệ thống.
          </p>
        </div>
        {canAddUsers && (
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
                <TableHead>Lớp Phụ Trách</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Đang tải...</TableCell></TableRow>
              ) : error ? (
                 <TableRow><TableCell colSpan={5} className="text-center py-10 text-red-500">{error}</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-500">Không tìm thấy người dùng nào.</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.displayName || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.role ? formatRole(user.role) : '-'}</TableCell>
                    <TableCell>{user.assignedClass || '-'}</TableCell>
                    <TableCell className="text-right">
                      {canEditUsers && <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>Sửa</Button>}
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
              <Input id="displayName" value={editingUser?.displayName || ''} onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={editingUser?.email || ''} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Vai trò</Label>
              <Select value={editingUser?.role || ''} onValueChange={(value) => setEditingUser({...editingUser, role: value as any})}>
                  <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="giao_vien_chu_nhiem">Giáo viên chủ nhiệm</SelectItem>
                      <SelectItem value="giam_thi">Giám thị</SelectItem>
                      <SelectItem value="hieu_truong">Hiệu trưởng</SelectItem>
                      <SelectItem value="pho_hieu_truong">Phó hiệu trưởng</SelectItem>
                      <SelectItem value="nhan_vien_cntt">Nhân viên CNTT</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedClass" className="text-right">Lớp phụ trách</Label>
              <Input id="assignedClass" value={editingUser?.assignedClass || ''} onChange={(e) => setEditingUser({...editingUser, assignedClass: e.target.value})} className="col-span-3" />
            </div>
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
