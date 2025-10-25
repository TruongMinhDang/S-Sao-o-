'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddStudentDialog } from './add-student-dialog'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'

interface Student {
  id: string
  studentId: string
  name: string
  class: string
  totalPlusPoints: number
  totalMinusPoints: number
}

// Tách số lớp để nhận diện khối (ví dụ: "class_9_1" → "9")
const getGradeFromClass = (className: string): string => {
  if (!className) return ''
  const match = className.match(/_(\d+)/)
  return match ? match[1] : ''
}

// Định dạng tên lớp để hiển thị (ví dụ: "class_6_1" → "6/1")
const formatClassName = (className: string): string => {
  if (!className || !className.startsWith('class_')) return className
  // Bỏ 'class_' và thay các dấu '_' còn lại bằng '/'
  return className.substring('class_'.length).replace(/_/g, '/')
}

export default function HocSinhPage() {
  const { isSuperAdmin, isViewerAdmin, isHomeroomTeacher, userProfile } = useAuth();
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [khoiFilter, setKhoiFilter] = useState('all')
  const [lopFilter, setLopFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Realtime listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const data = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
          const d = doc.data() as any
          return {
            id: doc.id,
            studentId: d.schoolId ?? 'N/A',
            name: d.fullName ?? 'Không có tên',
            class: d.classRef ?? 'Chưa có lớp',
            totalPlusPoints: d.totalMeritPoints ?? 0,
            totalMinusPoints: d.totalDemeritPoints ?? 0,
          }
        })
        setAllStudents(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Lỗi Firestore:', err)
        setError(`Không thể tải dữ liệu: ${err.message}`)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const collator = useMemo(
    () => new Intl.Collator('vi', { numeric: true, sensitivity: 'base' }),
    []
  )

  const teacherGrade = useMemo(() => {
    if (!isHomeroomTeacher || !userProfile?.assignedClasses?.length) return ''
    return getGradeFromClass(userProfile.assignedClasses[0]);
  }, [isHomeroomTeacher, userProfile]);

  const availableGrades = useMemo(() => {
    if (isHomeroomTeacher) return [teacherGrade].filter(Boolean);
    const grades = new Set(allStudents.map((s) => getGradeFromClass(s.class)).filter(Boolean))
    return ['all', ...Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b))]
  }, [allStudents, isHomeroomTeacher, teacherGrade])

  const availableClasses = useMemo(() => {
    let filtered = allStudents
    if (khoiFilter !== 'all') {
      filtered = filtered.filter((s) => getGradeFromClass(s.class) === khoiFilter)
    }
    const classes = new Set(filtered.map((s) => s.class))
    return ['all', ...Array.from(classes).sort(collator.compare)]
  }, [allStudents, khoiFilter, collator])

  const filteredStudents = useMemo(() => {
    let temp = allStudents;

    if (isHomeroomTeacher && teacherGrade) {
        temp = temp.filter(s => getGradeFromClass(s.class) === teacherGrade);
    } else if (khoiFilter !== 'all') {
      temp = temp.filter((s) => getGradeFromClass(s.class) === khoiFilter)
    }

    if (lopFilter !== 'all') {
      temp = temp.filter((s) => s.class === lopFilter)
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase()
      temp = temp.filter(
        (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
      )
    }
    return temp
  }, [allStudents, khoiFilter, lopFilter, searchTerm, isHomeroomTeacher, teacherGrade])

  useEffect(() => {
      if (isHomeroomTeacher && teacherGrade) {
          setKhoiFilter(teacherGrade);
      } else {
          setLopFilter('all')
      }
  }, [khoiFilter, isHomeroomTeacher, teacherGrade])

  if (loading) return <div>Đang tải dữ liệu...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản Lý Học Sinh</h1>
          <p className="text-muted-foreground">
            Thêm, sửa và quản lý tất cả học sinh trong hệ thống.
          </p>
        </div>
        {isSuperAdmin && <AddStudentDialog />}
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Danh Sách Học Sinh</CardTitle>
          <CardDescription>
            Hiển thị danh sách học sinh và hỗ trợ lọc, tìm kiếm theo khối – lớp – tên.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isSuperAdmin || isViewerAdmin) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="khoi-filter" className="text-sm font-medium">
                  Lọc theo Khối
                </label>
                <Select value={khoiFilter} onValueChange={setKhoiFilter} disabled={isHomeroomTeacher}>
                  <SelectTrigger id="khoi-filter">
                    <SelectValue placeholder="Tất cả các khối" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade === 'all' ? 'Tất cả các khối' : `Khối ${grade}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="lop-filter" className="text-sm font-medium">
                  Lọc theo Lớp
                </label>
                <Select value={lopFilter} onValueChange={setLopFilter}>
                  <SelectTrigger id="lop-filter">
                    <SelectValue placeholder="Tất cả các lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls === 'all' ? 'Tất cả các lớp' : formatClassName(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="search" className="text-sm font-medium">
                  Tìm kiếm
                </label>
                <Input
                  id="search"
                  placeholder="Tìm theo tên hoặc mã số..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Mã số HS</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Tổng cộng</TableHead>
                  <TableHead>Tổng trừ</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{s.studentId}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{formatClassName(s.class)}</TableCell>
                      <TableCell>{s.totalPlusPoints}</TableCell>
                      <TableCell>{s.totalMinusPoints}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                           <Link href={`/hoc-sinh/${s.id}`}>Chi tiết</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Không có học sinh nào khớp với tìm kiếm.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground text-right">
            Tổng số: {filteredStudents.length} học sinh
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
