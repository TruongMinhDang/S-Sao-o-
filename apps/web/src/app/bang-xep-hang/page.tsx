'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ================== CÁC HÀM TIỆN ÍCH VỀ NGÀY THÁNG =====================
const TERM_START = new Date(2025, 8, 8); // Thứ Hai, 8 tháng 9, 2025
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;

const getWeeksOptions = () => {
  const out = [];
  const p = (n:number)=>n<10?`0${n}`:`${n}`;
  for (let w=1; w<=TOTAL_WEEKS; w++) {
    const start = new Date(TERM_START.getTime() + (w-1)*7*MS_DAY);
    const end = new Date(start.getTime() + 6*MS_DAY);
    out.push({
        value: String(w),
        label:`Tuần ${w} (${p(start.getDate())}/${p(start.getMonth()+1)} - ${p(end.getDate())}/${p(end.getMonth()+1)})`
    });
  }
  return out;
};

const getCurrentWeekValue = () => {
  const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
  const diff = Math.floor((mid(new Date()).getTime() - mid(TERM_START).getTime())/MS_DAY);
  return String(Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff/7)+1)));
};

// ================== CÁC INTERFACE DỮ LIỆU =====================
interface Rule { id: string; code: string; description: string; type: 'merit' | 'demerit'; points: number; isDefault?: boolean; }
interface Class { id: string; name: string; grade: string; }
interface Record { id: string; classRef: string; pointsApplied: number; type: 'merit' | 'demerit'; }
interface ClassRanking { name: string; plusScore: number; minusScore: number; totalScore: number; rank: number; }

// ================== COMPONENT BẢNG XẾP HẠNG =====================
const RankingTable = ({ rankings, defaultScore }: { rankings: ClassRanking[]; defaultScore: number; }) => {
  if (rankings.length === 0) return <p className="text-center py-4">Chưa có dữ liệu xếp hạng cho khối này.</p>;

  return (
    <Table className="w-full border-collapse border border-gray-300">
        <TableHeader>
            <TableRow className="bg-gray-100">
            <TableHead className="border border-gray-300 text-left font-bold p-2">NỘI DUNG</TableHead>
            {rankings.map(c => <TableHead key={c.name} className="border border-gray-300 text-center font-bold p-2">{c.name}</TableHead>)}
            </TableRow>
        </TableHeader>
        <TableBody>
            <TableRow><TableCell className="border border-gray-300 p-2 font-semibold">Điểm nề nếp tuần</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 text-center p-2">{defaultScore}</TableCell>)}</TableRow>
            <TableRow><TableCell className="border border-gray-300 p-2 font-semibold">Điểm cộng</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 text-center text-green-600 font-bold p-2">+{c.plusScore}</TableCell>)}</TableRow>
            <TableRow><TableCell className="border border-gray-300 p-2 font-semibold">Điểm trừ</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 text-center text-red-600 font-bold p-2">{c.minusScore}</TableCell>)}</TableRow>
            <TableRow className="bg-gray-50"><TableCell className="border border-gray-300 p-2 font-bold">TỔNG ĐIỂM</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 text-center font-bold p-2">{c.totalScore}</TableCell>)}</TableRow>
            <TableRow className="bg-yellow-100"><TableCell className="border border-gray-300 p-2 font-bold">HẠNG</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 text-center font-bold text-lg p-2">{c.rank}</TableCell>)}</TableRow>
            <TableRow><TableCell className="border border-gray-300 p-2 font-bold">NHẬN XÉT</TableCell>{rankings.map(c => <TableCell key={c.name} className="border border-gray-300 p-2"></TableCell>)}</TableRow>
        </TableBody>
    </Table>
  );
};

// ================== COMPONENT CHÍNH CỦA TRANG =====================
export default function RankingPage() {
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const [defaultRules, setDefaultRules] = useState<Rule[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekValue());

  // LẤY DỮ LIỆU TỪ FIRESTORE KHI TUẦN THAY ĐỔI
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const weekNum = Number(selectedWeek);
        if(isNaN(weekNum)) throw new Error("Tuần không hợp lệ.");

        // 1. Lấy tất cả các lớp học
        const classesSnap = await getDocs(collection(db, 'classes'));
        const classesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Class);
        setAllClasses(classesData);

        // 2. Lấy các quy định mặc định
        const rulesQuery = query(collection(db, 'rules'), where("isDefault", "==", true));
        const rulesSnap = await getDocs(rulesQuery);
        setDefaultRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Rule));

        // 3. Lấy tất cả ghi nhận trong tuần đã chọn
        const recordsQuery = query(collection(db, 'records'), where('week', '==', weekNum));
        const recordsSnap = await getDocs(recordsQuery);
        setAllRecords(recordsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Record));

      } catch (err: any) {
        console.error("Lỗi khi tải dữ liệu xếp hạng:", err);
        setError("Không thể tải dữ liệu. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedWeek]);

  // TÍNH TOÁN DỮ LIỆU XẾP HẠNG
  const { rankingsByGrade, defaultScore } = useMemo(() => {
    const score = defaultRules.reduce((sum, rule) => sum + rule.points, 1000); // Bắt đầu với 1000 điểm

    const classScores = new Map<string, { plusScore: number; minusScore: number; }>();

    // Khởi tạo điểm cho tất cả các lớp
    allClasses.forEach(c => {
        classScores.set(c.id, { plusScore: 0, minusScore: 0 });
    });

    // Tính điểm cộng/trừ từ các ghi nhận
    allRecords.forEach(record => {
        const classRef = record.classRef;
        if (!classScores.has(classRef)) return;

        const currentScores = classScores.get(classRef)!;
        if (record.type === 'merit') {
            currentScores.plusScore += record.pointsApplied;
        } else {
            currentScores.minusScore += record.pointsApplied;
        }
    });

    const rankings = new Map<string, ClassRanking[]>();
    const grades = Array.from(new Set(allClasses.map(c => c.grade))).sort();

    grades.forEach(grade => {
        const gradeClasses = allClasses.filter(c => c.grade === grade);
        
        const calculated = gradeClasses.map(c => {
            const scores = classScores.get(c.id)!;
            return {
                name: c.name,
                plusScore: scores.plusScore,
                minusScore: scores.minusScore,
                totalScore: score + scores.plusScore + scores.minusScore,
                rank: 0, // Sẽ được tính sau
            }
        });

        // Sắp xếp và gán hạng
        calculated.sort((a, b) => b.totalScore - a.totalScore);
        calculated.forEach((c, index) => {
            c.rank = index + 1;
        });

        rankings.set(grade, calculated);
    });

    return { rankingsByGrade: rankings, defaultScore: score };

  }, [allClasses, allRecords, defaultRules]);

  const grades = useMemo(() => Array.from(rankingsByGrade.keys()), [rankingsByGrade]);

  // RENDER GIAO DIỆN
  return (
    <div className="container mx-auto p-4 space-y-6">
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Bảng Xếp Hạng Thi Đua Tuần</CardTitle>
                <div className="w-full max-w-xs">
                    <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                        <SelectTrigger><SelectValue placeholder="Chọn tuần" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                            {weeksOptions.map(week => (
                                <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
        </Card>

      {loading ? (
        <div className="text-center py-10">Đang tải dữ liệu...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg p-4">{error}</div>
      ) : grades.length === 0 ? (
        <Card><CardContent><p className="text-center py-10">Không có dữ liệu để hiển thị.</p></CardContent></Card>
      ) : (
        grades.map(grade => (
          <Card key={grade}>
            <CardHeader>
              <CardTitle className="text-center text-xl font-bold text-red-600">
                SƠ KẾT THI ĐUA TUẦN {selectedWeek} - KHỐI {grade.split('_')[1]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingTable rankings={rankingsByGrade.get(grade)!} defaultScore={defaultScore} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}