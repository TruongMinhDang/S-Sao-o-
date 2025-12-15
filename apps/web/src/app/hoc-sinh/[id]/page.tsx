'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '@/context/auth-context';

// --- HELPERS (giữ nguyên) ---
const formatClassName = (className: string): string => {
  if (!className || !className.startsWith('class_')) return className;
  return className.substring('class_'.length).replace(/_/g, '/');
};

const getRuleDescription = (ruleCode: string | undefined, rules: any[]) => {
    if (!ruleCode) return 'N/A';
    const rule = rules.find(r => r.code === ruleCode);
    return rule ? rule.description : ruleCode;
};

// --- INTERFACES ---
interface Student {
  id: string;
  studentId: string; // Mã số học sinh, ví dụ: '2526077836'
  name: string;
  class: string;
}
interface Violation {
  id: string;
  ruleRef?: string;
  pointsApplied?: number;
  recordDate?: { seconds: number; };
  type?: 'merit' | 'demerit';
}
interface Comment {
  id: string;
  authorName: string;
  authorId: string;
  content: string;
  timestamp: { seconds: number; };
}
interface HocSinhDetailsPageProps { params: { id: string } }

const COLORS = ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#A569BD', '#F1948A'];

// ================== PAGE COMPONENT (ĐÃ SỬA LỖI) =====================
export default function HocSinhDetailsPage({ params }: HocSinhDetailsPageProps) {
  const { user, isSuperAdmin, isViewerAdmin, isHomeroomTeacher, userProfile } = useAuth();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const documentId = params.id; // Đây là ID của document, ví dụ: T2Qyv3X...

  // --- DATA FETCHING (ĐÃ SỬA LỖI) ---
  useEffect(() => {
    if (!documentId) return;

    // 1. Tải trước danh sách luật (chỉ 1 lần)
    getDocs(collection(db, 'rules')).then(snapshot => {
        setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Lắng nghe thông tin cơ bản của học sinh
    const studentDocRef = doc(db, 'students', documentId);
    const unsubStudent = onSnapshot(studentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const studentData = {
          id: docSnap.id,
          studentId: d.schoolId ?? 'N/A', // Đây là mã số học sinh, ví dụ: 2526077836
          name: d.fullName ?? 'Không có tên',
          class: d.classRef ?? 'Chưa có lớp',
        };
        setStudent(studentData);
        setError(null);
      } else {
        setError('Không tìm thấy thông tin học sinh.');
        setStudent(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Lỗi Firestore (student):', err);
      setError(`Không thể tải dữ liệu học sinh: ${err.message}`);
      setLoading(false);
    });

    // 3. Lắng nghe danh sách nhận xét
    const commentsQuery = query(
        collection(db, 'students', documentId, 'comments'),
        orderBy('timestamp', 'desc')
    );
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (err) => console.error('Lỗi Firestore (comments):', err));

    return () => {
      unsubStudent();
      unsubComments();
    };
  }, [documentId]);

  // <<< SỬA LỖI: Tách riêng useEffect để tải vi phạm SAU KHI có thông tin học sinh >>>
  useEffect(() => {
    if (!student || student.studentId === 'N/A') {
      // Nếu chưa có thông tin student hoặc chưa có mã số HS thì chưa tải vi phạm
      setViolations([]); // Xóa danh sách vi phạm cũ (nếu có)
      return;
    }

    // 4. Lắng nghe danh sách vi phạm của học sinh (real-time) bằng schoolId
    const violationsQuery = query(
      collection(db, 'records'), 
      where('studentId', '==', student.studentId), // <<< SỬA LỖI: Dùng student.studentId để truy vấn
      orderBy('recordDate', 'desc')
    );
    const unsubViolations = onSnapshot(violationsQuery, (snapshot) => {
      setViolations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation)));
    }, (err) => {
        console.error('Lỗi Firestore (violations):', err)
        setError('Không thể tải lịch sử vi phạm.');
    });

    return () => {
        unsubViolations();
    }

  }, [student]); // Chạy lại khi đối tượng `student` thay đổi


  // --- DERIVED STATE & HANDLERS (Giữ nguyên) ---
    const hasAccess = useMemo(() => {
        if (!student || !userProfile) return false;
        if (isSuperAdmin || isViewerAdmin) return true;
        if (isHomeroomTeacher && student.class) {
            return userProfile.assignedClasses?.includes(student.class);
        }
        return false;
    }, [student, userProfile, isSuperAdmin, isViewerAdmin, isHomeroomTeacher]);

    const pointsSummary = useMemo(() => {
        const totalPlusPoints = violations.filter(v => v.type === 'merit').reduce((sum, v) => sum + (v.pointsApplied || 0), 0);
        const totalMinusPoints = violations.filter(v => v.type === 'demerit').reduce((sum, v) => sum + Math.abs(v.pointsApplied || 0), 0);
        return { totalPlusPoints, totalMinusPoints, finalScore: 1000 + totalPlusPoints - totalMinusPoints };
    }, [violations]);

    const barChartData = [{
        name: 'Điểm', 
        'Điểm cộng': pointsSummary.totalPlusPoints,
        'Điểm trừ': pointsSummary.totalMinusPoints,
    }];

    const pieChartData = useMemo(() => {
        if (violations.length === 0 || rules.length === 0) return [];
        const demerits = violations.filter(v => v.type === 'demerit' && v.ruleRef);

        const counts = demerits.reduce((acc, v) => {
            const ruleName = getRuleDescription(v.ruleRef, rules);
            acc[ruleName] = (acc[ruleName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [violations, rules]);

    const handleCommentSubmit = async () => {
        if (!newComment.trim() || !user || !student) return;
        setIsSubmitting(true);
        try {
        await addDoc(collection(db, 'students', student.id, 'comments'), {
            content: newComment,
            authorId: user.uid,
            authorName: userProfile?.displayName || 'Không rõ',
            timestamp: serverTimestamp(),
        });
        setNewComment('');
        } catch (error) {
        console.error("Lỗi khi gửi nhận xét: ", error);
        alert("Đã có lỗi xảy ra khi gửi nhận xét của bạn.");
        } finally {
        setIsSubmitting(false);
        }
    };


  // --- RENDER LOGIC (Giữ nguyên) ---
  if (loading) {
      return <div className="h-24 text-center flex items-center justify-center">Đang tải dữ liệu...</div>;
  }
  if (error) {
      return <div className="h-24 text-center flex items-center justify-center text-red-500">{error}</div>;
  }
  if (!student) {
      return <div className="h-24 text-center flex items-center justify-center text-red-500">Không tìm thấy học sinh.</div>;
  }
  if (!hasAccess) {
      return (
          <div className="text-center p-8">
              <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
              <p>Bạn không có quyền xem thông tin của học sinh này.</p>
               <Button asChild variant="outline" className="mt-4"><Link href="/hoc-sinh"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Link></Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link href="/hoc-sinh"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chi Tiết Học Sinh</h1>
          <p className="text-muted-foreground">Thông tin và lịch sử vi phạm của học sinh.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{student.name}</CardTitle>
                <CardDescription>Mã số: {student.studentId}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="bg-card">
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Họ và Tên</TableCell><TableCell>{student.name}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Lớp</TableCell><TableCell>{formatClassName(student.class)}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Tổng điểm cộng</TableCell><TableCell className="text-green-600 font-semibold">+{pointsSummary.totalPlusPoints}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Tổng điểm trừ</TableCell><TableCell className="text-red-600 font-semibold">-{pointsSummary.totalMinusPoints}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Điểm tổng kết</TableCell><TableCell className="font-bold">{pointsSummary.finalScore}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Nhận xét của giáo viên</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {comments.length > 0 ? comments.map((comment) => (
                            <div key={comment.id} className="border-l-2 pl-3">
                                <p className="text-sm">{comment.content}</p>
                                <p className="text-xs text-muted-foreground">- {comment.authorName} ({new Date(comment.timestamp?.seconds * 1000).toLocaleDateString('vi-VN')})</p>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Chưa có nhận xét nào.</p>}
                    </div>
                    {(isSuperAdmin || isHomeroomTeacher) && (
                        <div className="space-y-2 pt-4 border-t">
                            <Textarea placeholder="Thêm nhận xét mới..." value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={isSubmitting} />
                            <Button className="w-full" onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()}>{isSubmitting ? 'Đang gửi...' : 'Gửi nhận xét'}</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Biểu đồ điểm</CardTitle><CardDescription>Tổng điểm cộng và điểm trừ</CardDescription></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="Điểm cộng" fill="#16a34a" /><Bar dataKey="Điểm trừ" fill="#dc2626" /></BarChart>
                </ResponsiveContainer></CardContent>
              </Card>
              <Card>
                 <CardHeader><CardTitle>Thống kê vi phạm</CardTitle><CardDescription>Tỉ lệ các lỗi thường gặp</CardDescription></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={200}>
                    {pieChartData.length > 0 ? <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                         <Tooltip formatter={(value, name) => [`${value} lần`, name]} />
                    </PieChart> : <div className='flex items-center justify-center h-full text-muted-foreground'>Không có dữ liệu vi phạm.</div>}
                </ResponsiveContainer></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Lịch sử Vi phạm & Khen thưởng</CardTitle><CardDescription>Toàn bộ các mục được ghi nhận cho học sinh này.</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-md border" style={{maxHeight: '600px'}}>
                    <Table>
                        <TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Nội dung</TableHead><TableHead className="text-right">Điểm</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {violations.length > 0 ? violations.map(v => (
                                <TableRow key={v.id}>
                                    <TableCell className="text-sm">{v.recordDate ? new Date(v.recordDate.seconds * 1000).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute: '2-digit'}) : 'N/A'}</TableCell>
                                    <TableCell>{getRuleDescription(v.ruleRef, rules)}</TableCell>
                                    <TableCell className={`text-right font-semibold ${v.type === 'merit' ? 'text-green-600' : 'text-red-600'}`}>{v.type === 'merit' ? '+' : '-'}{Math.abs(v.pointsApplied || 0)}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Không có dữ liệu.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  )
}
