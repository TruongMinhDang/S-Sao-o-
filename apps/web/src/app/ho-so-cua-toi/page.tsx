'use client';

import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HoSoCuaToiPage() {
  const { user, userProfile, loading } = useAuth();

  // Lấy chữ cái đầu của tên để làm avatar dự phòng (VD: Nguyễn Văn An -> NVA)
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Diễn giải vai trò từ userProfile.role ra chức vụ tiếng Việt
  const getRoleDisplayName = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'Quản Trị Viên Hệ Thống';
      case 'hieu_truong':
        return 'Hiệu Trưởng';
      case 'pho_hieu_truong':
        return 'Phó Hiệu Trưởng';
      case 'giao_vien_chu_nhiem':
      case 'homeroom_teacher':
        return 'Giáo Viên Chủ Nhiệm';
      case 'giam_thi':
        return 'Giám Thị';
      default:
        return 'Người dùng';
    }
  };

  const RoleBadge = () => {
    const roleName = getRoleDisplayName(userProfile?.role);
    const isAdminRole = ['admin', 'hieu_truong', 'pho_hieu_truong'].includes(userProfile?.role || '');
    
    return (
        <Badge variant={isAdminRole ? "destructive" : "secondary"}>{roleName}</Badge>
    );
  };

  if (loading) {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Hồ Sơ Cá Nhân</h1>
            <p>Đang tải thông tin của bạn...</p>
        </div>
    );
  }

  if (!user || !userProfile) {
    return (
         <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Hồ Sơ Cá Nhân</h1>
            <p>Không tìm thấy thông tin người dùng.</p>
        </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Hồ Sơ Cá Nhân</h1>
      
      <Card>
        <CardHeader>
            <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={user.photoURL || undefined} alt={userProfile.displayName || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(userProfile.displayName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                     <CardTitle className="text-2xl">{userProfile.displayName || 'Không có tên'}</CardTitle>
                     <p className="text-muted-foreground">{userProfile.email || 'Không có email'}</p>
                     <RoleBadge />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <h3 className="font-semibold mb-4">Thông tin chi tiết</h3>
            <div className="space-y-3">
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">UID:</span>
                    <span className="font-mono text-sm">{user.uid}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Email đã xác thực:</span>
                    <span>{user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày tạo tài khoản:</span>
                    <span>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('vi-VN') : 'Không rõ'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Lần đăng nhập cuối:</span>
                    <span>{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('vi-VN') : 'Không rõ'}</span>
                </div>
                {userProfile.assignedClasses && userProfile.assignedClasses.length > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Lớp chủ nhiệm:</span>
                        <span>{userProfile.assignedClasses.join(', ')}</span>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
