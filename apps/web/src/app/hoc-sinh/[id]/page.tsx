'use client'

import { useEffect, useState, useMemo } from 'react'
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '@/context/auth-context';

const getGradeFromClass = (className: string): string => {
  if (!className) return ''
  const match = className.match(/_(\d+)/)
  return match ? match[1] : ''
}

// Định dạng tên lớp để hiển thị (ví dụ: "class_6_1" → "6/1")
const formatClassName = (className: string): string => {
  if (!className || !className.startsWith('class_')) return className
  return className.substring('class_'.length).replace(/_/g, '/')
}

interface Student {
  id: string
  studentId: string
  name: string
  class: string
  totalPlusPoints: number
  totalMinusPoints: number
}

interface HocSinhDetailsPageProps {
  params: {
    id: string
  }
}

// Mock data for violation types
const violationData = [
  { name: 'Đi trễ', value: 5 },
  { name: 'Nói chuyện', value: 8 },
  { name: 'Không đồng phục', value: 3 },
  { name: 'Sử dụng điện thoại', value: 2 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Mock comments
const comments = [
  { id: 1, author: 'Cô chủ nhiệm', content: 'Cần chú ý hơn trong giờ học.', date: '2023-10-26' },
  { id: 2, author: 'Thầy giám thị', content: 'Vi phạm đồng phục 3 lần trong tháng.', date: '2023-10-25' },
];

export default function HocSinhDetailsPage({ params }: HocSinhDetailsPageProps) {
  const { isSuperAdmin, isViewerAdmin, isHomeroomTeacher, userProfile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const studentId = params.id

  useEffect(() => {
    if (!studentId) return

    const docRef = doc(db, 'students', studentId)

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: DocumentSnapshot) => {
        if (docSnap.exists()) {
          const d = docSnap.data()
          setStudent({
            id: docSnap.id,
            studentId: d.schoolId ?? 'N/A',
            name: d.fullName ?? 'Không có tên',
            class: d.classRef ?? 'Chưa có lớp',
            totalPlusPoints: d.totalMeritPoints ?? 0,
            totalMinusPoints: d.totalDemeritPoints ?? 0,
          })
          setError(null)
        } else {
          setError('Không tìm thấy thông tin học sinh.')
          setStudent(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Lỗi Firestore:', err)
        setError(`Không thể tải dữ liệu: ${err.message}`)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [studentId])

  const hasAccess = useMemo(() => {
    if (!student || !userProfile) return false;
    if (isSuperAdmin || isViewerAdmin) return true;
    if (isHomeroomTeacher) {
        const studentGrade = getGradeFromClass(student.class);
        const teacherGrades = userProfile.assignedClasses?.map(getGradeFromClass) || [];
        return teacherGrades.includes(studentGrade);
    }
    return false;
  }, [student, userProfile, isSuperAdmin, isViewerAdmin, isHomeroomTeacher]);

  const pointsData = student ? [
    { name: 'Điểm', 'Điểm cộng': student.totalPlusPoints, 'Điểm trừ': student.totalMinusPoints },
  ] : [];

  if (loading) {
      return <div className="h-24 text-center flex items-center justify-center">Đang tải dữ liệu...</div>
  }

  if (error) {
      return <div className="h-24 text-center flex items-center justify-center text-red-500">{error}</div>
  }

  if (!hasAccess) {
      return (
          <div className="text-center p-8">
              <h1 className="text-2xl font-bold">Truy cập bị từ chối</h1>
              <p>Bạn không có quyền xem thông tin của học sinh này.</p>
               <Button asChild variant="outline" className="mt-4">
                    <Link href="/hoc-sinh">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Quay lại danh sách
                    </Link>
                </Button>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/hoc-sinh">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chi Tiết Học Sinh
          </h1>
           <p className="text-muted-foreground">
            Xem thông tin chi tiết của học sinh.
          </p>
        </div>
      </div>

      {student ? (
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
                     <TableRow>
                      <TableCell className="font-medium">Họ và Tên</TableCell>
                      <TableCell>{student.name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Lớp</TableCell>
                      <TableCell>{formatClassName(student.class)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tổng điểm cộng</TableCell>
                      <TableCell>{student.totalPlusPoints}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tổng điểm trừ</TableCell>
                      <TableCell>{student.totalMinusPoints}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Điểm rèn luyện</TableCell>
                      <TableCell>
                        {student.totalPlusPoints - student.totalMinusPoints}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                 {isSuperAdmin && (
                    <div className="flex gap-2 mt-4">
                        <Button className="w-full" variant="outline">Chỉnh sửa</Button>
                        <Button className="w-full" variant="destructive">Xóa</Button>
                    </div>
                 )}
              </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Nhận xét của giáo viên</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {comments.map((comment) => (
                            <div key={comment.id} className="border-l-2 pl-3">
                                <p className="text-sm">{comment.content}</p>
                                <p className="text-xs text-muted-foreground">- {comment.author} ({comment.date})</p>
                            </div>
                        ))}
                    </div>
                    {isSuperAdmin && (
                        <>
                            <Textarea placeholder="Thêm nhận xét mới..." />
                            <Button className="w-full">Gửi nhận xét</Button>
                        </>
                    )}
                </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
              <Card>
                <CardHeader>
                    <CardTitle>Biểu đồ điểm</CardTitle>
                    <CardDescription>So sánh tổng điểm cộng và điểm trừ</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pointsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Điểm cộng" fill="#82ca9d" />
                            <Bar dataKey="Điểm trừ" fill="#ff8042" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Thống kê vi phạm</CardTitle>
                    <CardDescription>Tỉ lệ các loại vi phạm thường gặp</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={violationData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {violationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
