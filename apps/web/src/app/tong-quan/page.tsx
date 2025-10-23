'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ClipboardList, Trophy, BookCheck, Shield, User, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const features = [
  {
    title: 'Lớp của tôi',
    description: 'Xem điểm số chi tiết, lịch sử vi phạm và thành tích của lớp bạn chủ nhiệm.',
    href: '/lop-cua-toi',
    icon: <Users className="h-8 w-8 text-sky-600" />,
    access: 'teacher',
    color: 'text-sky-600',
  },
  {
    title: 'Ghi nhận Thi đua',
    description: 'Ghi nhận các điểm cộng và điểm trừ thi đua cho các lớp.',
    href: '/ghi-nhan',
    icon: <ClipboardList className="h-8 w-8 text-amber-600" />,
    access: 'any',
    color: 'text-amber-600',
  },
  {
    title: 'Bảng Xếp Hạng',
    description: 'Xem thứ hạng thi đua của tất cả các lớp trong toàn trường theo tuần.',
    href: '/bang-xep-hang',
    icon: <Trophy className="h-8 w-8 text-emerald-600" />,
    access: 'any',
    color: 'text-emerald-600',
  },
  {
    title: 'Thống kê & Báo cáo',
    description: 'Phân tích và xem các báo cáo chi tiết về tình hình thi đua toàn trường.',
    href: '/reports', 
    icon: <BarChart3 className="h-8 w-8 text-rose-600" />,
    access: 'admin',
    color: 'text-rose-600',
  },
  {
    title: 'Quy Định Chấm Điểm',
    description: 'Tra cứu danh sách các quy định, nội quy và mức điểm tương ứng.',
    href: '/rules',
    icon: <BookCheck className="h-8 w-8 text-indigo-600" />,
    access: 'any',
    color: 'text-indigo-600',
  },
  {
    title: 'Quản Trị Hệ Thống',
    description: 'Quản lý tài khoản, lớp học, khối và các cài đặt hệ thống khác.',
    href: '/quan-tri',
    icon: <Shield className="h-8 w-8 text-red-700" />,
    access: 'admin',
    color: 'text-red-700',
  },
  {
    title: 'Hồ Sơ Cá Nhân',
    description: 'Chỉnh sửa thông tin cá nhân, xem lại các hoạt động của bạn.',
    href: '/ho-so',
    icon: <User className="h-8 w-8 text-slate-600" />,
    access: 'any',
    color: 'text-slate-600',
  },
];

export default function TongQuanPage() {
  const { user, isAdmin, isTeacher, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng Quan</h1>
          <p className="text-muted-foreground">Đang tải dữ liệu người dùng...</p>
        </div>
      </div>
    );
  }

  const availableFeatures = user
    ? features.filter(feature => {
        if (feature.access === 'admin') return isAdmin;
        if (feature.access === 'teacher') return isTeacher;
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng Quan</h1>
        <p className="text-muted-foreground">Chọn một chức năng để bắt đầu làm việc.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableFeatures.map(feature => (
          <Link href={feature.href} key={feature.href}>
            <Card className="hover:shadow-lg transition-all duration-200 h-full group">
              <CardHeader className="flex flex-col items-start gap-4">
                {feature.icon}
                <div>
                  <CardTitle className={`group-hover:underline ${feature.color}`}>{feature.title}</CardTitle>
                  <CardDescription className="mt-1">{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
