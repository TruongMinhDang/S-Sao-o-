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
import { SearchableMenu } from '@/components/ui/searchable-menu'; // IMPORT COMPONENT MỚI

interface Class { id: string; name: string; gradeId: string; homeroomTeacherRef?: string; }


// ================== HELPERS =====================
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
    out.push({
      value: String(w),
      label: `Tuần ${w} (${p(start.getDate())}/${p(start.getMonth() + 1)} - ${p(end.getDate())}/${p(end.getMonth() + 1)})`
    });
  }
  return out;
};

const getWeekFromDate = (d: any) => {
  const date = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return 1;
  const termStart = getTermStart();
  const diff = Math.floor((date.setHours(0, 0, 0, 0) - termStart.setHours(0, 0, 0, 0)) / 86400000);
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


// ================== TYPES =====================
interface Violation { id: string; studentId?: string; studentName: string; ruleRef?: string; pointsApplied?: number; recordDate?: { seconds: number; }; supervisorRef?: string; className?: string; classRef?: string; week?: number; type?: 'merit' | 'demerit'; }
interface WeeklyReport { id: string; scores: { [className: string]: number; } }


// ================== PAGE COMPONENT =====================
export default function MyClassPage() {
  const { user: currentUser, isAdmin, isHomeroomTeacher } = useAuth();

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

  // INITIAL LOAD
  useEffect(() => {
    setLoading(true);
    const fetchInitialData = async () => {
      try {
        const [rulesSnap, usersSnap, classesSnap] = await Promise.all([
          getDocs(collection(db, 'rules')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'classes')),
        ]);

        setRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
        const fetchedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        fetchedClasses.sort((a, b) => collator.compare(a.name, b.name));
        setAllClasses(fetchedClasses);

        if (isHomeroomTeacher && currentUser?.uid) {
          const teacherClass = fetchedClasses.find(c => c.homeroomTeacherRef === currentUser.uid);
          if (teacherClass) setSelectedClassId(teacherClass.id);
        }

      } catch (err: any) {
        setError(`Lỗi tải dữ liệu: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [currentUser, isHomeroomTeacher]);


  useEffect(() => {
    if (selectedClassId === 'all') {
      setViolations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const violationsQuery = query(
      collection(db, 'records'),
      where('classRef', '==', selectedClassId),
      where('week', '==', Number(selectedWeek))
    );

    const unsubViolations = onSnapshot(violationsQuery, (snapshot) => {
      const fetchedViolations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation));
      setViolations(fetchedViolations.sort((a, b) => (b.recordDate?.seconds || 0) - (a.recordDate?.seconds || 0)));
      setLoading(false);
    }, (err) => {
      setError(`Không thể tải dữ liệu vi phạm. Lỗi: ${err.message}`);
      setLoading(false);
    });

    const reportsQuery = query(collection(db, 'weekly_reports'));
    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      setWeeklyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyReport)));
    });

    return () => {
      unsubViolations();
      unsubReports();
    };
  }, [selectedClassId, selectedWeek]);

  // CHUẨN BỊ DỮ LIỆU CHO SEARCHABLEMENU
  const gradeItems = useMemo(() => {
    const grades = Array.from(new Set(allClasses.map(c => c.gradeId).filter(Boolean))).sort();
    const gradeOptions = grades.map(g => {
      const label = String(g).split('_')[1] || g;
      return { value: g, label: `Khối ${label}` };
    });
    return [{ value: 'all', label: 'Tất cả các khối' }, ...gradeOptions];
  }, [allClasses]);

  const classItems = useMemo(() => {
    let filteredClasses = allClasses;
    if (!isAdmin && selectedGrade !== 'all') {
        filteredClasses = allClasses.filter(c => c.gradeId === selectedGrade);
    }
    const classOptions = filteredClasses.map(c => ({ value: c.id, label: c.name }));
    return [{ value: 'all', label: '-- Chọn lớp --' }, ...classOptions];
  }, [selectedGrade, allClasses, isAdmin]);


  const selectedClass = useMemo(() => allClasses.find(c => c.id === selectedClassId), [selectedClassId, allClasses]);


  const weeklyStats = useMemo(() => {
    const totalMerit = violations.filter(v => v.type === 'merit').reduce((s, v) => s + (Number(v.pointsApplied) || 0), 0);
    const totalDemerit = violations.filter(v => v.type === 'demerit').reduce((s, v) => s + Math.abs(Number(v.pointsApplied) || 0), 0);

    const errorCounts = violations.reduce((acc, v) => {
      if (v.ruleRef && v.type === 'demerit') acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonErrorCode = Object.keys(errorCounts).reduce((a, b) =>
      errorCounts[a] > errorCounts[b] ? a : b,
      'Không có'
    );

    return {
      totalMerit,
      totalDemerit,
      totalPoints: 1000 + totalMerit - totalDemerit,
      commonError: getRuleDescription(commonErrorCode, rules)
    };
  }, [violations, rules]);


  const chartData = useMemo(() => {
    if (!selectedClass || weeklyReports.length === 0) return [];
    const allTermWeeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

    const data = allTermWeeks.map((weekNumber) => {
      const report = weeklyReports.find(r => r.id === `week_${weekNumber}`);
      const score = report?.scores?.[selectedClass.name];
      return { week: weekNumber, points: typeof score === 'number' ? score : null };
    });

    let lastKnown = 1000;
    return data.map(d => {
      if (d.points !== null) lastKnown = d.points;
      return { ...d, points: d.points ?? lastKnown };
    });
  }, [selectedClass, weeklyReports]);


  const yDomain = useMemo(() => {
    const vals = chartData.map(d => d.points).filter(p => p !== null) as number[];
    if (!vals.length) return { min: 800, max: 1200 };

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(20, Math.round((max - min) * 0.1));

    return { min: min - pad, max: max + pad };
  }, [chartData]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Tổng Quan Lớp Học</CardTitle>
              <CardDescription>Theo dõi điểm số và vi phạm qua từng tuần.</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">

              {/* --- SELECT KHỐI --- */}
              {!isAdmin && (
                <div className="w-full sm:w-[180px]">
                   <SearchableMenu items={gradeItems} placeholder="Chọn khối" value={selectedGrade} onChange={setSelectedGrade} />
                </div>
              )}

              {/* --- SELECT LỚP --- */}
               <div className={`w-full ${isAdmin ? 'sm:w-[240px]' : 'sm:w-[180px]'}`}>
                  <SearchableMenu items={classItems} placeholder="-- Chọn lớp --" value={selectedClassId} onChange={setSelectedClassId} />
               </div>

              {/* --- SELECT TUẦN --- */}
              <div className="w-full sm:w-[280px]">
                  <SearchableMenu items={weeksOptions} placeholder="Chọn tuần" value={selectedWeek} onChange={setSelectedWeek} />
              </div>

            </div>
          </div>
        </CardHeader>

        {selectedClassId !== 'all' && (
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-10">Đang tải dữ liệu...</div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">{error}</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tổng điểm tuần</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${weeklyStats.totalPoints >= 1000 ? 'text-green-600' : 'text-red-600'}`}>
                        {weeklyStats.totalPoints}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Điểm cộng</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">+{weeklyStats.totalMerit}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Điểm trừ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">-{weeklyStats.totalDemerit}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Lỗi phổ biến</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-md font-bold truncate" title={weeklyStats.commonError}>
                        {weeklyStats.commonError}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="h-[250px] w-full">
                  <CardTitle className="mb-4 text-xl">Biểu đồ Lịch sử điểm</CardTitle>

                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tickFormatter={(v) => `T${v}`} />
                      <YAxis domain={[yDomain.min, yDomain.max]} allowDecimals={false} />
                      <Tooltip
                        formatter={(v: number, name: string) =>
                          v === null ? ['Chưa có dữ liệu', name] : [`${v} điểm`, name]
                        }
                        labelFormatter={(label) => `Tuần ${label}`}
                      />
                      <Line connectNulls type="monotone" dataKey="points" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {selectedClassId !== 'all' && !error && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Vi Phạm (Tuần {selectedWeek})</CardTitle>
            <CardDescription>
              Lớp <span className="font-bold">{selectedClass?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {violations.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Không có vi phạm nào.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead className="text-center">Điểm</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {violations.map((v, index) => (
                      <TableRow key={v.id}>
                        <TableCell>{index + 1}</TableCell>

                        <TableCell>
                          {v.recordDate?.seconds
                            ? new Date(v.recordDate.seconds * 1000)
                                .toLocaleString('vi-VN', {
                                  timeZone: 'Asia/Ho_Chi_Minh',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                                .replace(',', '')
                            : 'N/A'}
                        </TableCell>

                        <TableCell className="font-medium">{v.studentName}</TableCell>

                        <TableCell>
                          <div>{getRuleDescription(v.ruleRef, rules)}</div>
                          <div className="text-xs text-gray-500">
                            Người ghi nhận: {getUserName(v.supervisorRef, users)}
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-semibold">
                          <span
                            className={
                              (v.pointsApplied || 0) > 0
                                ? 'text-green-600'
                                : (v.pointsApplied || 0) < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }
                          >
                            {(v.pointsApplied || 0) > 0 ? '+' : ''}
                            {v.pointsApplied || 0}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          {v.studentId ? (
                            <Link href={`/hoc-sinh/${v.studentId}`} passHref>
                              <Button variant="outline" size="sm">Chi tiết</Button>
                            </Link>
                          ) : (
                            <Button variant="outline" size="sm" disabled>Chi tiết</Button>
                          )}
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
