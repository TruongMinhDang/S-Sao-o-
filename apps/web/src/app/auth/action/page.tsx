'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  getAuth
} from 'firebase/auth';
import { app } from '@/lib/firebase.client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function AuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Đang xử lý yêu cầu của bạn...');
  const [newPassword, setNewPassword] = useState('');
  const auth = getAuth(app);

  useEffect(() => {
    if (!mode || !actionCode) {
      setStatus('error');
      setMessage('Link không hợp lệ hoặc đã hết hạn.');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'resetPassword':
            await verifyPasswordResetCode(auth, actionCode);
            setStatus('resetPassword');
            setMessage('Vui lòng nhập mật khẩu mới của bạn.');
            break;
          case 'verifyEmail':
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('Email của bạn đã được xác minh thành công! Bạn có thể đăng nhập ngay bây giờ.');
            setTimeout(() => router.push('/login'), 3000);
            break;
          default:
            setStatus('error');
            setMessage('Hành động không được hỗ trợ.');
            break;
        }
      } catch (error) {
        setStatus('error');
        setMessage('Link không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
      }
    };

    handleAction();
  }, [mode, actionCode, auth, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCode || newPassword.length < 6) {
        setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
    }

    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setStatus('success');
      setMessage('Mật khẩu của bạn đã được thay đổi thành công. Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      setStatus('error');
      setMessage('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };
  
  if (status === 'loading') {
      return <div className="text-center p-8"><div>{message}</div></div>;
  }
  
  if (status === 'error' || status === 'success') {
      return <div className="text-center p-8"><div>{message}</div></div>;
  }

  if (status === 'resetPassword') {
    return (
      <div className="flex justify-center items-center min-h-screen">
          <div className="w-full max-w-md p-8 space-y-4">
            <h1 className="text-2xl font-bold text-center">Tạo mật khẩu mới</h1>
            <p>{message}</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="password">Mật khẩu mới</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Lưu mật khẩu
              </Button>
            </form>
          </div>
      </div>
    );
  }

  return null;
}
