'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
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
import { useAuth } from '@/context/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { getAllClasses, Class } from '@/services/class.service';

// ================== HELPERS (Giữ nguyên) =====================
const TOTAL_WEEKS = 35;
const getTermStart = () => {
    const now = new Date();
    const termYear = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(termYear, 8, 8);
}

const getWeeksOptions = () => {
  const termStart = getTermStart();
  const out = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const start = new Date(termStart.getTime() + (w - 1) * 7 * 86400000);
    const end = new Date(start.getTime() + 6 * 86400000);
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    out.push({ value: String(w), label: `Tuần ${w} (${p(start.getDate())}/${p(start.getMonth() + 1)} - ${p(end.getDate())}/${p(end.getMonth() + 1)})` });
  }
  return out;
};

const getWeekFromDate = (d: any) => {
  const date = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return 1;
  const termStart = getTermStart();
  const diff = Math.floor((date.setHours(0,0,0,0) - termStart.setHours(0,0,0,0)) / 86400000);
  return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff / 7) + 1));
};

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


// ================== TYPES (Giữ nguyên) =====================
interface Violation { id: string; studentId?: string; studentName: string; ruleRef?: string; pointsApplied?: number; recordDate: { seconds: number; }; supervisorRef?: string; className?: string; classRef?: string; week?: number; type?: 'merit' | 'demerit'; }
interface WeeklyReport { id: string; weekNumber: number; scores: { [className: string]: number; } }

// ================== PAGE COMPONENT (REWRITTEN) =====================
export default function MyClassPage() {
  // --- STATE MANAGEMENT --- 
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(String(getWeekFromDate(new Date())));
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // --- UNIFIED DATA FETCHING --- 
  // 1. Fetch background data (rules, users, and ALL classes) for everyone
  useEffect(() => {
    setLoading(true);
    const fetchInitialData = async () => {
      try {
        // Luôn fetch tất cả classes, rules, users. Server sẽ đảm nhiệm phân quyền.
        const [rulesSnap, usersSnap, classesSnap] = await Promise.all([
          getDocs(collection(db, 'rules')),
          getDocs(collection(db, 'users')),
          getAllClasses(), // Dùng service thống nhất
        ]);

        setRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAllClasses(classesSnap); // `getAllClasses` trả về mảng Class[] đã được sắp xếp

      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setError("Không thể tải dữ liệu nền (quy định, người dùng, lớp học).");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Fetch violations and reports when a class/week is selected
  useEffect(() => {
    if (selectedClassId === 'all') {
        setViolations([]);
        return;
    }

    setLoading(true);
    setError(null);

    // Fetch violations for the selected class and week. Firestore Rules will enforce access.
    const violationsQuery = query(
      collection(db, 'records'), 
      where('classId', '==', selectedClassId),
      where('week', '==', Number(selectedWeek))
    );

    const unsubViolations = onSnapshot(violationsQuery, (snapshot) => {
      const fetchedViolations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation));
      setViolations(fetchedViolations.sort((a,b) => b.recordDate.seconds - a.recordDate.seconds));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(`Không thể tải dữ liệu vi phạm. Bạn có thể không có quyền xem lớp này.`);
      setLoading(false);
    });

    // Fetch all weekly reports to build the chart
    const reportsQuery = query(collection(db, 'weekly_reports'));
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
        setWeeklyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyReport)));
    }, (err) => {
        console.error(err, "Could not fetch weekly reports for chart.");
    });

    return () => {
      unsubViolations();
      unsubReports();
    };
  }, [selectedClassId, selectedWeek]);
  
  // --- UNIFIED DERIVED STATE & UI LOGIC --- 
  const availableGrades = useMemo(() =>
    Array.from(new Set(allClasses.map(c => c.gradeId))).sort(),
    [allClasses]
  );

  const availableClasses = useMemo(() => {
    if (selectedGrade === 'all') return allClasses;
    return allClasses.filter(c => c.gradeId === selectedGrade);
  }, [selectedGrade, allClasses]);

  const selectedClass = useMemo(() => allClasses.find(c => c.id === selectedClassId), [selectedClassId, allClasses]);

  // Reset class selection when grade changes
  useEffect(() => {
    setSelectedClassId('all');
  }, [selectedGrade]);

  // Stats and Chart data (Giữ nguyên logic tính toán, chỉ thay đổi dependency)
  const weeklyStats = useMemo(() => {
    const totalMerit = violations.filter(v => v.type === 'merit').reduce((sum, v) => sum + (Number(v.pointsApplied) || 0), 0);
    const totalDemerit = violations.filter(v => v.type === 'demerit').reduce((sum, v) => sum + (Number(v.pointsApplied) || 0), 0);
    const errorCounts = violations.reduce((acc, v) => { if (v.ruleRef && v.type === 'demerit') { acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1; } return acc; }, {} as Record<string, number>);
    const commonErrorCode = Object.keys(errorCounts).reduce((a, b) => errorCounts[a] > errorCounts[b] ? a : b, 'Không có');
    return { totalMerit, totalDemerit, totalPoints: 1000 + totalMerit - totalDemerit, commonError: getRuleDescription(commonErrorCode, rules) };
  }, [violations, rules]);

  const chartData = useMemo(() => {
    if (!selectedClass || weeklyReports.length === 0) return [];
    const allTermWeeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
    const data = allTermWeeks.map(weekNumber => {
        const reportForWeek = weeklyReports.find(r => r.weekNumber === weekNumber);
        const score = reportForWeek?.scores?.[selectedClass.name];
        return { week: weekNumber, points: typeof score === 'number' ? score : null };
    });
    let lastKnownScore: number | null = null;
    return data.map(d => {
        if (d.points !== null) { lastKnownScore = d.points; return d; }
        return { ...d, points: lastKnownScore };
    });
  }, [selectedClass, weeklyReports]);

  const yDomain = useMemo(() => {
    const vals = chartData.map(d => d.points).filter(p => p !== null) as number[];
    if (!vals.length) return { min: 800, max: 1200 };
    const min = Math.min(...vals); const max = Math.max(...vals);
    const pad = Math.max(20, Math.round((max - min) * 0.1));
    return { min: min - pad, max: max + pad };
  }, [chartData]);

  // --- UNIFIED RENDER --- 
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Tổng Quan Lớp Học</CardTitle>
              <CardDescription>Theo dõi điểm số và vi phạm của lớp qua từng tuần.</CardDescription>
            </div>
            {/* Dropdowns luôn hiển thị cho mọi người dùng */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khối" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các khối</SelectItem>
                  {availableGrades.map(g => <SelectItem key={g} value={g}>{`Khối ${g.split('_')[1]}`}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- Chọn lớp --</SelectItem>
                  {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedWeek} value={selectedWeek}>
                <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Chọn tuần" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {weeksOptions.map(week => <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Nội dung chỉ hiển thị khi đã chọn một lớp cụ thể */}
        {selectedClassId !== 'all' && (
          <CardContent className="space-y-6">
            {loading ? (
                <div className="text-center py-10">Đang tải dữ liệu...</div>
            ) : error ? (
                <div className="text-center py-10 text-red-500">{error}</div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm tuần</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${weeklyStats.totalPoints >= 1000 ? 'text-green-600' : 'text-red-600'}`}>{weeklyStats.totalPoints}</div></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm cộng</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">+{weeklyStats.totalMerit}</div></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm trừ</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">-{weeklyStats.totalDemerit}</div></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Lỗi phổ biến</CardTitle></CardHeader><CardContent><div className="text-md font-bold truncate" title={weeklyStats.commonError}>{weeklyStats.commonError}</div></CardContent></Card>
                </div>
                {/* Chart */}
                <div className="h-[250px] w-full">
                  <CardTitle className="mb-4 text-xl">Biểu đồ Lịch sử Điểm</CardTitle>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tickFormatter={(value) => `T${value}`} />
                      <YAxis domain={[yDomain.min, yDomain.max]} allowDecimals={false} />
                      <Tooltip formatter={(value: number, name: string) => value === null ? ['Chưa có dữ liệu', name] : [`${value} điểm`, name]} labelFormatter={(label: any) => `Tuần ${label}`} />
                      <Line connectNulls type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} name="Tổng điểm" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Bảng vi phạm chỉ hiển thị khi đã chọn lớp và không có lỗi */}
      {selectedClassId !== 'all' && !error && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Vi Phạm Chi Tiết (Tuần {selectedWeek})</CardTitle>
            <CardDescription>Các vi phạm của lớp <span className="font-bold">{selectedClass?.name}</span> trong tuần đã chọn.</CardDescription>
          </CardHeader>
          <CardContent>
            {violations.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Không có vi phạm nào được ghi nhận trong tuần này.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Thời gian</TableHead><TableHead>Họ và tên</TableHead><TableHead>Nội dung vi phạm</TableHead><TableHead className="text-center">Điểm</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {violations.map((v, index) => (
                      <TableRow key={v.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{v.recordDate ? new Date(v.recordDate.seconds * 1000).toLocaleString('vi-VN') : 'N/A'}</TableCell>
                        <TableCell className="font-medium">{v.studentName || 'N/A'}</TableCell>
                        <TableCell><div>{getRuleDescription(v.ruleRef, rules)}</div><div className="text-xs text-gray-500">Người ghi nhận: {getUserName(v.supervisorRef, users)}</div></TableCell>
                        <TableCell className="text-center font-semibold"><span className={ (v.pointsApplied || 0) > 0 ? 'text-green-600' : (v.pointsApplied || 0) < 0 ? 'text-red-600' : 'text-gray-500' }>{(v.pointsApplied || 0) > 0 ? '+' : ''}{v.pointsApplied || 0}</span></TableCell>
                        <TableCell className="text-right">{v.studentId ? (<Link href={`/hoc-sinh/${v.studentId}`} passHref><Button variant="outline" size="sm">Chi tiết</Button></Link>) : (<Button variant="outline" size="sm" disabled>Chi tiết</Button>)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
