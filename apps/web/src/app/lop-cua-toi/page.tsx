'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, where, onSnapshot, doc } from 'firebase/firestore';
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

// ================== HELPERS =====================
const TOTAL_WEEKS = 35;
const getTermStart = () => {
    const now = new Date();
    // Term starts in September. If we are before September of the current year, the term started last year.
    const termYear = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(termYear, 8, 8); // Month is 0-indexed, so 8 is September
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

const formatClassName = (className: string): string => {
  if (!className) return ''
  return className.startsWith('class_') ? className.substring('class_'.length).replace(/_/g, '/') : className;
};

const getGradeFromClass = (className: string): string => {
  if (!className) return '';
  const formattedName = formatClassName(className);
  return formattedName.split('/')[0] || '';
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

// ================== TYPES =====================
interface Violation {
  id: string;
  studentName: string;
  ruleRef?: string;
  pointsApplied?: number;
  recordDate: { seconds: number; };
  supervisorRef?: string;
  className?: string;
  classRef?: string;
  week?: number;
  type?: 'merit' | 'demerit';
}

interface WeeklyReport {
  id: string; // week_1, week_2, etc.
  weekNumber: number;
  scores: { [className: string]: number; }
}


// ================== PAGE COMPONENT =====================
export default function MyClassPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  
  const [allManagedClasses, setAllManagedClasses] = useState<string[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(String(getWeekFromDate(new Date())));
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Determine which classes the current user can view
  const managedClasses = useMemo(() => {
    if (isAdmin) return allManagedClasses;
    return userProfile?.assignedClasses || [];
  }, [isAdmin, userProfile, allManagedClasses]);

  // Set a default selected class for teachers
  useEffect(() => {
    if (!authLoading && !isAdmin && managedClasses.length > 0 && selectedClass === 'all') {
      setSelectedClass(managedClasses[0]);
    }
  }, [authLoading, isAdmin, managedClasses, selectedClass]);
  
  // Fetch background data (rules, users, and all class names for admins)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [rulesSnap, usersSnap, studentsSnap] = await Promise.all([
          getDocs(collection(db, 'rules')),
          getDocs(collection(db, 'users')),
          isAdmin ? getDocs(collection(db, 'students')) : Promise.resolve(null),
        ]);

        setRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        if (isAdmin && studentsSnap) {
          const classSet = new Set(studentsSnap.docs.map(doc => doc.data().classRef).filter(Boolean));
          const sortedClasses = Array.from(classSet).sort(new Intl.Collator('vi', { numeric: true }).compare);
          setAllManagedClasses(sortedClasses);
        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
        setError("Không thể tải dữ liệu nền (quy định, người dùng).");
      }
    };
    fetchInitialData();
  }, [isAdmin]);

  // *** REFACTORED DATA FETCHING LOGIC ***
  useEffect(() => {
    if (!selectedClass || selectedClass === 'all') {
        setDataLoading(false);
        setViolations([]);
        return;
    }

    setDataLoading(true);
    setError(null);

    // Fetch violations for the selected class and week
    const violationsQuery = query(
      collection(db, 'records'), 
      where('classRef', '==', selectedClass),
      where('week', '==', Number(selectedWeek))
    );

    const unsubViolations = onSnapshot(violationsQuery, (snapshot) => {
      const fetchedViolations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation));
      setViolations(fetchedViolations.sort((a,b) => b.recordDate.seconds - a.recordDate.seconds));
      setDataLoading(false);
    }, (err) => {
      console.error(err);
      setError(`Không thể tải dữ liệu vi phạm cho lớp ${formatClassName(selectedClass)}.`);
      setDataLoading(false);
    });

    // Fetch all weekly reports to build the chart
    const reportsQuery = query(collection(db, 'weekly_reports'));
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
        setWeeklyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyReport)));
    }, (err) => {
        console.error(err, "Could not fetch weekly reports for chart.");
        // Non-critical error, don't block UI
    });

    return () => {
      unsubViolations();
      unsubReports();
    };
  }, [selectedClass, selectedWeek]);
  
  // Calculate stats for the selected week from the focused violation query
  const weeklyStats = useMemo(() => {
    const totalMerit = violations.filter(v => v.type === 'merit').reduce((sum, v) => sum + (Number(v.pointsApplied) || 0), 0);
    const totalDemerit = violations.filter(v => v.type === 'demerit').reduce((sum, v) => sum + (Number(v.pointsApplied) || 0), 0);

    const errorCounts = violations.reduce((acc, v) => {
      if (v.ruleRef && v.type === 'demerit') { acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>);

    const commonErrorCode = Object.keys(errorCounts).reduce((a, b) => errorCounts[a] > errorCounts[b] ? a : b, 'Không có');

    return { 
        totalMerit, 
        totalDemerit, 
        totalPoints: totalMerit + totalDemerit, 
        commonError: getRuleDescription(commonErrorCode, rules) 
    };
  }, [violations, rules]);

  // *** REFACTORED CHART DATA LOGIC ***
  const chartData = useMemo(() => {
    if (selectedClass === 'all' || weeklyReports.length === 0) return [];

    const className = formatClassName(selectedClass);
    const allTermWeeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

    const data = allTermWeeks.map(weekNumber => {
        const reportForWeek = weeklyReports.find(r => r.weekNumber === weekNumber);
        const score = reportForWeek?.scores?.[className];

        return {
            week: weekNumber,
            // Use null for weeks with no data to create gaps in the chart
            points: typeof score === 'number' ? score : null 
        };
    });
    
    // Fill in missing data with the last known score to make the line continuous
    let lastKnownScore: number | null = null;
    const continuousData = data.map(d => {
        if (d.points !== null) {
            lastKnownScore = d.points;
            return d;
        } 
        return { ...d, points: lastKnownScore };
    });

    return continuousData;
}, [selectedClass, weeklyReports]);


  const yDomain = useMemo(() => {
    if (!chartData.length) return { min: 800, max: 1200 };
    const vals = chartData.map(d => d.points).filter(p => p !== null) as number[];
    if (!vals.length) return { min: 800, max: 1200 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(20, Math.round((max - min) * 0.1));
    return { min: min - pad, max: max + pad };
  }, [chartData]);

  const availableGrades = useMemo(() =>
    Array.from(new Set(allManagedClasses.map(getGradeFromClass).filter(Boolean))).sort((a,b) => parseInt(a) - parseInt(b)),
    [allManagedClasses]
  );
  const availableClasses = useMemo(() => {
    if (!isAdmin) return managedClasses;
    if (selectedGrade === 'all') return allManagedClasses;
    return allManagedClasses.filter(c => getGradeFromClass(c) === selectedGrade);
  }, [isAdmin, selectedGrade, allManagedClasses, managedClasses]);
  
  useEffect(() => {
    if (isAdmin) {
      setSelectedClass('all');
    }
  }, [selectedGrade, isAdmin]);

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
            <div className="h-[250px] w-full">
              <CardTitle className="mb-4 text-xl">Biểu đồ Lịch sử Điểm</CardTitle>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickFormatter={(value) => `T${value}`} />
                  <YAxis domain={[yDomain.min, yDomain.max]} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => value === null ? ['Chưa có dữ liệu', name] : [`${value} điểm`, name]}
                    labelFormatter={(label: any) => `Tuần ${label}`}
                  />
                  <Line connectNulls type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} name="Tổng điểm" />
                </LineChart>
              </ResponsiveContainer>
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
            {dataLoading ? (
              <div className="text-center py-10">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">{error}</div>
            ) : violations.length === 0 ? (
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
                    {violations.map((v, index) => (
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
