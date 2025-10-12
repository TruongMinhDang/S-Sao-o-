'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

// ================== HELPERS =====================
const TERM_START = new Date(2025, 8, 8);
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};
const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
const getWeekFromDate = (d: any) => {
  const date = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return 1;
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
const formatClassName = (className: string): string => {
  if (!className || !className.startsWith('class_')) return className;
  return className.substring('class_'.length).replace(/_/g, '/');
};
const getGradeFromClass = (className: string): string => {
  if (!className) return '';
  const match = className.match(/_(\d+)/);
  return match ? match[1] : '';
};

// ================== TYPES =====================
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
  type?: 'merit' | 'demerit';
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

// ================== PAGE COMPONENT =====================
export default function MyClassPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [allWeeklyScores, setAllWeeklyScores] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(String(getWeekFromDate(new Date())));

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const managedClasses = useMemo(() => {
    if(isAdmin) return allClasses;
    return userProfile?.assignedClasses || [];
  }, [isAdmin, userProfile, allClasses]);

  useEffect(() => {
    if(!authLoading && !isAdmin && managedClasses.length > 0 && selectedClass === 'all') {
      setSelectedClass(managedClasses[0]);
    }
  }, [authLoading, isAdmin, managedClasses, selectedClass]);
  
  // Fetch background data (rules, users, classes)
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

  // Fetch all violations and scores for the managed classes
  useEffect(() => {
    if (authLoading || !user || managedClasses.length === 0) {
      if (!authLoading && !isAdmin) setDataLoading(false); // Stop loading if not admin and no classes
      return;
    }

    setDataLoading(true);
    
    const classQueryChunk = managedClasses.length > 0 ? managedClasses.slice(0, 30) : [' '];
    
    const violationsQuery = query(collection(db, 'records'), where('classRef', 'in', classQueryChunk));
    const scoresQuery = query(collection(db, 'weeklyScores'), where('classId', 'in', classQueryChunk));

    const unsubViolations = onSnapshot(violationsQuery, (snapshot) => {
      setAllViolations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation)));
      setDataLoading(false);
    }, (err) => {
      console.error(err);
      setError(`Không thể tải dữ liệu vi phạm.`);
      setDataLoading(false);
    });

    const unsubScores = onSnapshot(scoresQuery, (snapshot) => {
      setAllWeeklyScores(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubViolations();
      unsubScores();
    };
  }, [authLoading, user, isAdmin, managedClasses]);
  
  // Filter data for display based on selections (for stats and table)
  const { filteredViolations, weeklyStats } = useMemo(() => {
    const targetClass = selectedClass;

    const weeklyViolations = allViolations.filter(v => 
      v.classRef === targetClass && 
      String(v.week ?? getWeekFromDate(v.recordDate)) === selectedWeek
    );

    const sortedViolations = [...weeklyViolations].sort((a,b) => b.recordDate.seconds - a.recordDate.seconds);
    
    const totalPoints = weeklyViolations.reduce((sum, v) => sum + safeNumber(v.pointsApplied), 0);
    const totalMerit = weeklyViolations.filter(v => v.type === 'merit').reduce((sum, v) => sum + safeNumber(v.pointsApplied), 0);
    const totalDemerit = weeklyViolations.filter(v => v.type === 'demerit').reduce((sum, v) => sum + safeNumber(v.pointsApplied), 0);

    const errorCounts = weeklyViolations.reduce((acc, v) => {
      if(v.ruleRef && v.type === 'demerit') { acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>);

    let commonErrorCode = 'Không có';
    let maxCount = 0;
    for (const errorCode in errorCounts) {
      if (errorCounts[errorCode] > maxCount) {
        commonErrorCode = errorCode;
        maxCount = errorCounts[errorCode];
      }
    }
    const weeklyStats = { totalPoints, totalMerit, totalDemerit, commonError: getRuleDescription(commonErrorCode, rules) };

    return { filteredViolations: sortedViolations, weeklyStats };
  }, [selectedClass, selectedWeek, allViolations, rules]);

  // ================== CHART (ĐÃ VÁ) =====================
  // Prepare chart data (independent of selectedWeek)
  const chartData = useMemo(() => {
    const targetClass = selectedClass;
    if (targetClass === 'all') return [];

    // Gom điểm theo tuần bằng Map cho an toàn kiểu
    const scoresByWeek = new Map<number, number>();

    // 1) Điểm nền từ weeklyScores (chấp nhận cả classId lẫn classRef để chống lệch khóa)
    allWeeklyScores
      .filter(s => s.classId === targetClass || s.classRef === targetClass)
      .forEach(s => {
        if (s.week == null) return;
        const week = Number(s.week);
        // Mặc định mỗi mảng 330 cho Khối 9, 340 cho khối khác (đúng quy chế hiện dùng)
        const isG9 = s.gradeName === 'Khối 9' || getGradeFromClass(targetClass) === '9';
        const defaultUnit = isG9 ? 330 : 340;
        const ht = s.scores?.hoc_tap;
        const kl = s.scores?.ky_luat;
        const vs = s.scores?.ve_sinh;
        const base =
          safeNumber(ht ?? defaultUnit) +
          safeNumber(kl ?? defaultUnit) +
          safeNumber(vs ?? defaultUnit);
        scoresByWeek.set(week, safeNumber(scoresByWeek.get(week)) + base);
      });

    // 2) Cộng/trừ từ bảng records
    allViolations
      .filter(v => v.classRef === targetClass)
      .forEach(v => {
        const week = Number(v.week ?? getWeekFromDate(v.recordDate));
        scoresByWeek.set(week, safeNumber(scoresByWeek.get(week)) + safeNumber(v.pointsApplied));
      });

    // 3) Trải tuyến: tuần rỗng sẽ “carry forward” từ tuần trước hoặc từ initialScore
    const initialScore = getGradeFromClass(targetClass) === '9' ? 990 : 1020;
    let lastKnown: number | undefined = undefined;
    const data = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
      const week = i + 1;
      const val = scoresByWeek.get(week);
      const points = val !== undefined ? val : (lastKnown ?? initialScore);
      lastKnown = points;
      return { week, points };
    });

    // Phòng hờ: nếu mọi điểm đều NaN/không hợp lệ, trả ít nhất 1 điểm để biểu đồ hiện
    const anyFinite = data.some(d => Number.isFinite(d.points));
    return anyFinite ? data : [{ week: 1, points: initialScore }];
  }, [selectedClass, allViolations, allWeeklyScores]);

  // Miền Y tự thích ứng, có đệm
  const yDomain = useMemo(() => {
    if (!chartData.length) return { min: 0, max: 1000 };
    const vals = chartData.map(d => Number(d.points)).filter(Number.isFinite);
    if (!vals.length) return { min: 0, max: 1000 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(20, Math.round((max - min) * 0.1));
    return { min: min - pad, max: max + pad };
  }, [chartData]);

  // Admin filters
  const availableGrades = useMemo(() =>
    Array.from(new Set(allClasses.map(getGradeFromClass).filter(Boolean))).sort((a,b) => parseInt(a) - parseInt(b)),
    [allClasses]
  );
  const availableClasses = useMemo(() => {
    if (!isAdmin) return managedClasses;
    if (selectedGrade === 'all') return allClasses;
    return allClasses.filter(c => getGradeFromClass(c) === selectedGrade);
  }, [isAdmin, selectedGrade, allClasses, managedClasses]);
  
  useEffect(() => {
    if (isAdmin) {
      setSelectedClass('all');
    }
  }, [selectedGrade, isAdmin]);

  const isLoading = authLoading || dataLoading;

  if (authLoading) return <div className="p-8 text-center">Đang xác thực người dùng...</div>;
  if (!user) return <div className="p-8 text-center text-red-600">Vui lòng đăng nhập để xem trang này.</div>;
  if (!isAdmin && managedClasses.length === 0) return <div className="p-8 text-center text-orange-600">Tài khoản của bạn chưa được phân công lớp chủ nhiệm.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Tổng Quan Lớp Học</CardTitle>
              <CardDescription>Theo dõi điểm số và vi phạm của lớp qua từng tuần.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAdmin && (
                <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn khối" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả các khối</SelectItem>
                    {availableGrades.map(g => <SelectItem key={g} value={g}>Khối {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select onValueChange={setSelectedClass} value={selectedClass}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
                <SelectContent>
                  {isAdmin && availableClasses.length > 1 && <SelectItem value="all">-- Chọn lớp --</SelectItem>}
                  {availableClasses.map(c => <SelectItem key={c} value={c}>{formatClassName(c)}</SelectItem>)}
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

        {selectedClass !== 'all' && (
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm tuần</CardTitle></CardHeader>
                <CardContent><div className={`text-2xl font-bold ${weeklyStats.totalPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}>{weeklyStats.totalPoints >= 0 ? '+' : ''}{weeklyStats.totalPoints}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm cộng</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">+{weeklyStats.totalMerit}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tổng điểm trừ</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{weeklyStats.totalDemerit}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Lỗi phổ biến</CardTitle></CardHeader>
                <CardContent><div className="text-md font-bold truncate" title={weeklyStats.commonError}>{weeklyStats.commonError}</div></CardContent>
              </Card>
            </div>
            <div>
              <CardTitle className="mb-4 text-xl">Biểu đồ Lịch sử Điểm</CardTitle>
              <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tickFormatter={(value) => `T${value}`} />
                    {/* ĐÃ SỬA: Miền Y tự thích ứng có đệm */}
                    <YAxis domain={[yDomain.min, yDomain.max]} allowDecimals={false} />
                    {/* ĐÃ SỬA: Tooltip dùng ChartTooltipContent với formatter rõ ràng */}
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: any) => `${value} điểm`}
                          labelFormatter={(label: any) => `Tuần ${label}`}
                        />
                      }
                    />
                    <Line type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} dot={false} name="Tổng điểm" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        )}
      </Card>
      
      {selectedClass !== 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Vi Phạm Chi Tiết (Tuần {selectedWeek})</CardTitle>
            <CardDescription>Các vi phạm của lớp <span className="font-bold">{formatClassName(selectedClass)}</span> trong tuần đã chọn.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">{error}</div>
            ) : filteredViolations.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Không có vi phạm nào được ghi nhận trong tuần này.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">STT</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Nội dung vi phạm</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((v, index) => (
                      <TableRow key={v.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{v.recordDate ? new Date(v.recordDate.seconds * 1000).toLocaleString('vi-VN') : 'N/A'}</TableCell>
                        <TableCell className="font-medium">{v.studentName || 'N/A'}</TableCell>
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
