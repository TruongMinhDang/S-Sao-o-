'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context'; // Import useAuth

// ================== SAO CHÉP Y HỆT TỪ TRANG GHI-NHAN =====================
const TERM_START = new Date(2025, 8, 8);
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;
const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
const getWeekFromDate = (d: any) => {
  const date = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return 1; // Fallback
  const diff = Math.floor((mid(date).getTime() - mid(TERM_START).getTime())/MS_DAY);
  return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff/7)+1));
};
const getWeeksOptions = () => {
  const out = [];
  for (let w=1; w<=TOTAL_WEEKS; w++) {
    const start = new Date(mid(TERM_START).getTime() + (w-1)*7*MS_DAY);
    const end = new Date(start.getTime() + 6*MS_DAY);
    const p = (n:number)=>n<10?`0${n}`:`${n}`;
    out.push({value:String(w), label:`Tuần ${w} (${p(start.getDate())}/${p(start.getMonth()+1)} - ${p(end.getDate())}/${p(end.getMonth()+1)})`});
  }
  return out;
};
// Định dạng tên lớp để hiển thị (ví dụ: "class_6_1" → "6/1")
const formatClassName = (className: string): string => {
  if (!className || !className.startsWith('class_')) return className;
  return className.substring('class_'.length).replace(/_/g, '/');
};
const getGradeFromClass = (className: string): string => {
  if (!className) return '';
  const match = className.match(/_(\d+)/);
  return match ? match[1] : '';
};
// ================== KẾT THÚC SAO CHÉP =====================

interface Violation {
  id: string;
  studentName: string;
  ruleRef?: string;
  pointsApplied?: number;
  recordDate: { seconds: number; nanoseconds: number; };
  supervisorRef?: string;
  className?: string;
  classRef?: string;
  week?: number;
}

const getRuleDescription = (ruleCode: string | undefined, rules: any[]) => {
    if (!ruleCode) return 'N/A';
    const rule = rules.find(r => r.code === ruleCode);
    return rule ? rule.description : ruleCode;
};

const getUserName = (supervisorRef: string | undefined, users: any[]) => {
    if (!supervisorRef) return 'N/A';
    const user = users.find(u => u.id === supervisorRef);
    return user ? user.displayName : supervisorRef;
};

export default function MyClassPage() {
  // Lấy thông tin người dùng hiện tại
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(String(getWeekFromDate(new Date())));

  // State cho bộ lọc của Admin/BGH
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  // Lấy dữ liệu nền (rules, users, classes)
  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [rulesSnap, usersSnap, studentsSnap] = await Promise.all([
              getDocs(collection(db, 'rules')),
              getDocs(collection(db, 'users')),
              getDocs(collection(db, 'students')),
            ]);

            setRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            const classSet = new Set(studentsSnap.docs.map(doc => doc.data().classRef).filter(Boolean));
            const sortedClasses = Array.from(classSet).sort(new Intl.Collator('vi', { numeric: true }).compare);
            setAllClasses(sortedClasses);

        } catch (err) {
            console.error("Failed to fetch initial data", err);
            setError("Không thể tải dữ liệu nền (quy định, người dùng).");
        }
    };
    fetchInitialData();
  }, []);

  // Truy vấn dữ liệu vi phạm dựa trên vai trò và bộ lọc
  useEffect(() => {
    // Chờ auth và dữ liệu nền tải xong
    if (authLoading || !user) return;

    setDataLoading(true);
    let q: Query | null = null;
    
    // Xác định lớp cần truy vấn
    let targetClasses: string[] = [];
    if (isAdmin) {
      if (selectedClass !== 'all') {
        targetClasses = [selectedClass];
      } else if (selectedGrade !== 'all') {
        targetClasses = allClasses.filter(c => getGradeFromClass(c) === selectedGrade);
      }
      // Nếu admin chọn all/all, không cần lọc theo classRef
    } else if (userProfile?.assignedClasses && userProfile.assignedClasses.length > 0) {
      targetClasses = userProfile.assignedClasses;
    }

    if (selectedWeek) {
      const constraints = [where('week', '==', parseInt(selectedWeek, 10))];
      if (targetClasses.length > 0) {
        // Firestore chỉ cho phép 'in' với tối đa 30 phần tử, nếu cần hơn phải chia nhỏ query
        constraints.push(where('classRef', 'in', targetClasses.slice(0, 30)));
      }
      q = query(collection(db, 'records'), ...constraints);
    }
    
    if (!q) {
      setViolations([]);
      setDataLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const violationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Violation[];
        setViolations(violationsData.sort((a, b) => b.recordDate.seconds - a.recordDate.seconds));
        setError(null);
        setDataLoading(false);
    }, (err) => {
        console.error(err);
        setError(`Không thể tải dữ liệu cho tuần ${selectedWeek}.`);
        setDataLoading(false);
    });

    return () => unsubscribe();
  }, [selectedWeek, selectedGrade, selectedClass, isAdmin, user, authLoading, userProfile, allClasses]);

  // Logic tính toán thống kê (giữ nguyên)
  const stats = useMemo(() => {
    const totalPoints = violations.reduce((sum, v) => sum + Number(v.pointsApplied || 0), 0);
    const errorCounts = violations.reduce((acc, v) => {
      if(v.ruleRef && v.type === 'demerit') { acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>);

    let commonErrorCode = 'Không có'; let maxCount = 0;
    for (const errorCode in errorCounts) {
      if (errorCounts[errorCode] > maxCount) {
        commonErrorCode = errorCode; maxCount = errorCounts[errorCode];
      }
    }
    return { totalPoints, commonError: getRuleDescription(commonErrorCode, rules) };
  }, [violations, rules]);
  
  // Bộ lọc cho Admin/BGH
  const availableGrades = useMemo(() => Array.from(new Set(allClasses.map(getGradeFromClass).filter(Boolean))).sort((a,b) => parseInt(a) - parseInt(b)), [allClasses]);
  const availableClasses = useMemo(() => {
      if (selectedGrade === 'all') return allClasses;
      return allClasses.filter(c => getGradeFromClass(c) === selectedGrade);
  }, [selectedGrade, allClasses]);

  // Reset bộ lọc lớp khi đổi khối
  useEffect(() => {
    setSelectedClass('all');
  }, [selectedGrade]);

  const isLoading = authLoading || dataLoading;

  if (authLoading) {
    return <div className="p-8 text-center">Đang xác thực người dùng...</div>
  }
  if (!user) {
    return <div className="p-8 text-center text-red-600">Vui lòng đăng nhập để xem trang này.</div>
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Tổng Quan Lớp Học</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm bg-white">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-500">CHỌN TUẦN</h3>
            <Select onValueChange={setSelectedWeek} value={selectedWeek}>
              <SelectTrigger className="bg-white text-base py-2 h-auto">
                <SelectValue placeholder="Chọn một tuần" />
              </SelectTrigger>
              <SelectContent>
                {weeksOptions.map(week => (
                  <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <h3 className="text-sm font-medium text-red-800 uppercase">Tổng điểm trừ</h3>
            <p className="text-4xl font-bold text-red-600">{stats.totalPoints}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <h3 className="text-sm font-medium text-yellow-800 uppercase">Lỗi phổ biến</h3>
            <p className="text-lg font-bold text-yellow-600 truncate" title={stats.commonError}>{stats.commonError}</p>
          </div>
        </div>
        
        {/* Bộ lọc dành riêng cho Admin/BGH */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-500">LỌC THEO KHỐI</h3>
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các khối</SelectItem>
                  {availableGrades.map(g => <SelectItem key={g} value={g}>Khối {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-500">LỌC THEO LỚP</h3>
              <Select onValueChange={setSelectedClass} value={selectedClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các lớp</SelectItem>
                  {availableClasses.map(c => <SelectItem key={c} value={c}>{formatClassName(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Danh Sách Vi Phạm Chi Tiết</h3>
        {isLoading ? (
          <div className="text-center py-10">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : violations.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Không có vi phạm nào được ghi nhận.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">STT</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Họ và tên</TableHead>
                {isAdmin && <TableHead>Lớp</TableHead>}
                <TableHead>Nội dung vi phạm</TableHead>
                <TableHead className="text-center">Điểm</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((v, index) => (
                <TableRow key={v.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{v.recordDate ? new Date(v.recordDate.seconds * 1000).toLocaleString('vi-VN') : 'N/A'}</TableCell>
                  <TableCell className="font-medium">{v.studentName || 'N/A'}</TableCell>
                  {isAdmin && <TableCell>{formatClassName(v.classRef || '')}</TableCell>}
                  <TableCell>
                    <div>{getRuleDescription(v.ruleRef, rules)}</div>
                    <div className="text-xs text-gray-500">Người ghi nhận: {getUserName(v.supervisorRef, users)}</div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                     <span className={ (v.pointsApplied || 0) > 0 ? 'text-green-600' : (v.pointsApplied || 0) < 0 ? 'text-red-600' : 'text-gray-500' }>
                        {(v.pointsApplied || 0) > 0 ? '+' : ''}{v.pointsApplied || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Chi tiết</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
