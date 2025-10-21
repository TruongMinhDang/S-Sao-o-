'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase.client';
import { Eye, EyeOff } from 'lucide-react';

const auth = getAuth(app);

export default function LoginPage() {
  const router = useRouter();
  // Pre-fill credentials for debugging
  const [email, setEmail] = useState('truongminhdang1@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/tong-quan');
            } else {
                setIsCheckingAuth(false);
            }
        });
        return () => unsubscribe();
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error.code, error.message);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.");
          break;
        case 'auth/user-disabled':
          setError("Tài khoản này đã bị vô hiệu hóa bởi quản trị viên.");
          break;
        case 'auth/too-many-requests':
          setError("Bạn đã thử đăng nhập sai quá nhiều lần. Tài khoản đã bị tạm khóa, vui lòng thử lại sau.");
          break;
        case 'auth/network-request-failed':
          setError("Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.");
          break;
        default:
          setError("Có lỗi không xác định xảy ra. Vui lòng thử lại.");
          break;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isCheckingAuth) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const isLoading = isCheckingAuth || isLoggingIn;

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
           <Card className="border-none shadow-none">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold tracking-tighter">Đăng Nhập</CardTitle>
                <CardDescription>Nhập email và mật khẩu của bạn để truy cập hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <a href="#" className="text-sm text-primary hover:underline">
                            Quên mật khẩu?
                        </a>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button variant="ghost" size="icon" type="button" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

                <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                    {isLoggingIn ? 'Đang xử lý...' : 'Đăng nhập'}
                </Button>
                </form>
            </CardContent>
           </Card>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/app-quan-ly-hs.firebasestorage.app/o/avatars%2FlorWEe0X7WWMfHAkTrwPKT8Uf7m1?alt=media&token=d9ee401c-8f0e-4cb7-8f59-2952af42be4a"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
