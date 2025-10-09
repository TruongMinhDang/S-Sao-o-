'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

// SỬA: Import các hàm xác thực và context
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase.client";
import { useAuth } from "@/context/auth-context";

const auth = getAuth(app);

export function UserNav() {
  const router = useRouter();
  // SỬA: Lấy thông tin user thật từ context
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Chuyển hướng về trang đăng nhập
      router.push("/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      // Có thể hiển thị thông báo lỗi cho người dùng
    }
  };

  // Nếu không có user, không render gì cả (hoặc có thể render nút Đăng nhập)
  if (!user) {
    return null;
  }

  // Lấy tên và email từ profile (Firestore) hoặc từ Auth object
  const displayName = userProfile?.displayName || user.displayName || "User";
  const displayEmail = userProfile?.email || user.email || "";
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
             {/* Có thể thêm AvatarImage nếu bạn lưu avatar URL trong profile */}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/ho-so')}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Hồ sơ của tôi</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
