'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ClipboardList, Trophy, BookCheck, Shield, User, BarChart3, Edit, Building } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// 1. Cập nhật cấu trúc features để sử dụng vai trò mới
const features = [
  {
    title: 'Ghi nhận Vi phạm & Thành tích',
    description: 'Nhập điểm thi đua, điểm cộng, điểm trừ cho học sinh và tập thể lớp.',
    href: '/ghi-nhan',
    icon: <Edit className="h-8 w-8 text-amber-600" />,
    access: ['isSuperAdmin', 'isProctor'], // Chỉ admin và giám thị
    color: 'text-amber-600',
  },
  {
    title: 'Quản lý Học sinh',
    description: 'Tra cứu, chỉnh sửa thông tin và xem lịch sử thi đua của học sinh.',
    href: '/hoc-sinh',
    icon: <Users className="h-8 w-8 text-sky-600" />,
    access: ['isSuperAdmin', 'isViewerAdmin', 'isHomeroomTeacher'], // Admin, BGH, GVCN
    color: 'text-sky-600',
  },
  {
    title: 'Bảng Xếp Hạng Tuần',
    description: 'Theo dõi thứ hạng và điểm số thi đua của tất cả các lớp trong tuần.',
    href: '/bang-xep-hang',
    icon: <Trophy className="h-8 w-8 text-emerald-600" />,
    access: 'any', // Mọi người
    color: 'text-emerald-600',
  },
  {
    title: 'Thống kê & Báo cáo',
    description: 'Phân tích, xuất báo cáo tổng hợp về tình hình thi đua toàn trường.',
    href: '/reports', 
    icon: <BarChart3 className="h-8 w-8 text-rose-600" />,
    access: ['isSuperAdmin', 'isViewerAdmin'], // Admin và BGH
    color: 'text-rose-600',
  },
  {
    title: 'Quy Định Chấm Điểm',
    description: 'Tra cứu danh mục các hành vi, nội quy và mức điểm quy định.',
    href: '/rules',
    icon: <BookCheck className="h-8 w-8 text-indigo-600" />,
    access: 'any', // Mọi người
    color: 'text-indigo-600',
  },
  {
    title: 'Quản lý Lớp & Khối',
    description: 'Cấu hình danh sách lớp học, khối và các thông tin liên quan.',
    href: '/class-management',
    icon: <Building className="h-8 w-8 text-cyan-600" />,
    access: ['isSuperAdmin'], // Chỉ Super Admin
    color: 'text-cyan-600',
  },
   {
    title: 'Quản lý Người dùng',
    description: 'Thêm, sửa và phân quyền cho các tài khoản người dùng trong hệ thống.',
    href: '/nguoi-dung',
    icon: <Shield className="h-8 w-8 text-red-700" />,
    access: ['isSuperAdmin'], // Chỉ Super Admin
    color: 'text-red-700',
  },
  {
    title: 'Hồ Sơ Cá Nhân',
    description: 'Xem lại thông tin cá nhân và các hoạt động đã thực hiện.',
    href: '/ho-so',
    icon: <User className="h-8 w-8 text-slate-600" />,
    access: 'any', // Mọi người
    color: 'text-slate-600',
  },
];

export default function TongQuanPage() {
  // 2. Lấy tất cả các vai trò cần thiết từ useAuth
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng Quan</h1>
          <p className="text-muted-foreground">Đang tải dữ liệu người dùng...</p>
        </div>
      </div>
    );
  }
  
  // 3. Lọc danh sách features dựa trên các vai trò mới
  const availableFeatures = auth.user
    ? features.filter(feature => {
        if (feature.access === 'any') return true; // Ai cũng thấy
        if (Array.isArray(feature.access)) {
          // Kiểm tra xem người dùng có bất kỳ vai trò nào trong danh sách `access` không
          return feature.access.some(role => auth[role as keyof typeof auth]);
        }
        return false;
      })
    : [];


  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng Quan</h1>
        <p className="text-muted-foreground">Chọn một chức năng để bắt đầu làm việc.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableFeatures.map(feature => (
          <Link href={feature.href} key={feature.href}>
            <Card className="hover:shadow-lg transition-all duration-200 h-full group border-l-4" style={{ borderColor: feature.color }}>
              <CardHeader className="flex flex-row items-center gap-4">
                {feature.icon}
                <div className='flex-1'>
                  <CardTitle className={`group-hover:underline text-lg ${feature.color}`}>{feature.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm">{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
