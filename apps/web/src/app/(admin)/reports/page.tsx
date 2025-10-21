'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ===== HELPERS =====
const TERM_START = new Date(new Date().getFullYear(), 8, 8); // Assume Sept 8
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;
const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };

const getWeeks = () => {
  const out = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const start = new Date(mid(TERM_START).getTime() + (w - 1) * 7 * MS_DAY);
    const end = new Date(start.getTime() + 6 * MS_DAY);
    const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    out.push({
        weekNumber: w,
        label: `Tuần ${w}`,
        dateRange: `(${p(start.getDate())}/${p(start.getMonth() + 1)} - ${p(end.getDate())}/${p(end.getMonth() + 1)})`
    });
  }
  return out;
};

const gradesConfig = [
    { name: "Khối 6", classes: ["6/1", "6/2", "6/3", "6/4", "6/5", "6/6", "6/7", "6/8", "6/9", "6/10"] },
    { name: "Khối 7", classes: ["7/1", "7/2", "7/3", "7/4", "7/5", "7/6", "7/7", "7/8"] },
    { name: "Khối 8", classes: ["8/1", "8/2", "8/3", "8/4", "8/5", "8/6", "8/7"] },
    { name: "Khối 9", classes: ["9/1", "9/2", "9/3", "9/4", "9/5", "9/6", "9/7", "9/8"] },
];
const allClassNames = gradesConfig.flatMap(g => g.classes);

const allWeeks = getWeeks();

// ===== TYPES =====
interface WeeklyReport {
    id: string; // week_1, week_2, etc.
    weekNumber: number;
    scores: {
        [className: string]: number; // "6/1": 1074
    }
}

// ===== MAIN COMPONENT =====
export default function ReportsPage() {
    const { toast } = useToast();
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>("Khối 6");

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'weekly_reports'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReports: WeeklyReport[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyReport));
            setReports(fetchedReports);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Lỗi khi tải dữ liệu báo cáo. Collection `weekly_reports` có thể chưa tồn tại.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleGenerateReports = async () => {
        if (!confirm("Bạn có chắc muốn chạy quy trình tổng hợp báo cáo không? Việc này sẽ đọc toàn bộ dữ liệu điểm và ghi đè báo cáo cũ.")) return;
        setIsProcessing(true);
        toast({ title: "Bắt đầu tổng hợp...", description: "Quá trình có thể mất một vài phút. Vui lòng không rời khỏi trang." });
        try {
            // 1. Fetch all necessary data
            const recordsPromise = getDocs(collection(db, 'records'));
            const weeklyScoresPromise = getDocs(collection(db, 'weeklyScores'));
            const [recordsSnapshot, weeklyScoresSnapshot] = await Promise.all([recordsPromise, weeklyScoresPromise]);
            const allRecords = recordsSnapshot.docs.map(d => d.data());
            const allWeeklyScores = weeklyScoresSnapshot.docs.map(d => d.data());

            // 2. Process data
            const reportsData: { [week: number]: { [className: string]: number } } = {};

            for (let week = 1; week <= TOTAL_WEEKS; week++) {
                reportsData[week] = {};
                for (const grade of gradesConfig) {
                    const defaultScore = grade.name === 'Khối 9' ? 330 : 340;
                    for (const className of grade.classes) {
                        // a. Find manual scores
                        const classId = `class_${className.replace('/', '_')}`;
                        const weeklyScoreDoc = allWeeklyScores.find(s => s.week === week && s.classId === classId);
                        const manualScores = weeklyScoreDoc?.scores || {};
                        
                        // b. Calculate record scores
                        const recordsForClassInWeek = allRecords.filter(r => r.week === week && r.className === className);
                        let diem_cong = 0;
                        let diem_tru_abs = 0;
                        recordsForClassInWeek.forEach(rec => {
                            const points = Number(rec.pointsApplied || 0);
                            if (rec.type === 'merit') diem_cong += points;
                            else if (rec.type === 'demerit') diem_tru_abs += Math.abs(points);
                        });
                        
                        // c. Calculate total score
                        const hoc_tap = manualScores.hoc_tap ?? defaultScore;
                        const ky_luat = manualScores.ky_luat ?? defaultScore;
                        const ve_sinh = manualScores.ve_sinh ?? defaultScore;
                        const tong_diem = hoc_tap + ky_luat + ve_sinh + diem_cong - diem_tru_abs;

                        reportsData[week][className] = tong_diem;
                    }
                }
            }
            
            // 3. Save to Firestore
            const batch = writeBatch(db);
            for (const weekNum in reportsData) {
                const docRef = doc(db, "weekly_reports", `week_${weekNum}`);
                batch.set(docRef, { weekNumber: Number(weekNum), scores: reportsData[weekNum] });
            }
            await batch.commit();

            toast({ title: "Thành công!", description: `Đã tổng hợp và lưu báo cáo cho ${TOTAL_WEEKS} tuần. Dữ liệu sẽ tự động hiển thị.` });
        } catch (e) {
            console.error("Lỗi khi tổng hợp báo cáo:", e);
            toast({ variant: "destructive", title: "Đã xảy ra lỗi!", description: "Không thể hoàn tất quá trình tổng hợp. Vui lòng kiểm tra console.", });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredClasses = useMemo(() => {
        return gradesConfig.find(g => g.name === selectedGrade)?.classes || [];
    }, [selectedGrade]);
    
    const reportsMap = useMemo(() => {
        const map = new Map<number, { [className: string]: number }>();
        reports.forEach(report => { map.set(report.weekNumber, report.scores); });
        return map;
    }, [reports]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Báo cáo Tổng điểm Thi đua theo Tuần</h1>
                    <p className="text-muted-foreground mt-1">
                        Bảng tổng hợp điểm thi đua hàng tuần của tất cả các lớp trong năm học.
                    </p>
                </div>
                <Button onClick={handleGenerateReports} disabled={isProcessing}>
                    {isProcessing ? "Đang xử lý..." : "Tổng hợp & Cập nhật Báo cáo"}
                </Button>
            </div>
            
            <div className="flex items-center space-x-4 bg-card p-4 rounded-lg border">
                <label htmlFor="grade-select" className="font-medium">Chọn khối để hiển thị:</label>
                <select id="grade-select" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="border rounded px-3 py-2 bg-background shadow-sm">
                    {gradesConfig.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
            </div>

            <div className="rounded-lg border overflow-hidden bg-card">
                <div className="overflow-x-auto relative max-h-[70vh]">
                    <Table className="min-w-full border-collapse">
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="font-bold w-[200px] sticky left-0 bg-muted z-20 shadow-sm">Tuần</TableHead>
                                {filteredClasses.map(className => (
                                    <TableHead key={className} className="font-bold text-center min-w-[80px]">{className}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && !reports.length ? (
                                <TableRow><TableCell colSpan={filteredClasses.length + 1} className="h-48 text-center">Đang tải dữ liệu...</TableCell></TableRow>
                            ) : error && !reports.length ? (
                                <TableRow><TableCell colSpan={filteredClasses.length + 1} className="h-48 text-center text-red-600">{error}</TableCell></TableRow>
                            ): (
                                allWeeks.map(({ weekNumber, label, dateRange }) => (
                                    <TableRow key={weekNumber} className="hover:bg-muted/30 group">
                                        <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted/40 z-10 shadow-sm">
                                            <div className="font-bold">{label}</div>
                                            <div className="text-xs text-muted-foreground">{dateRange}</div>
                                        </TableCell>
                                        {filteredClasses.map(className => {
                                            const score = reportsMap.get(weekNumber)?.[className];
                                            return (
                                                <TableCell key={className} className="text-center font-semibold">
                                                    {typeof score === 'number' ? score : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
             <div className="p-px rounded-lg bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[7px]">
                    <h4 className="font-bold">Hướng dẫn</h4>
                    <p className="text-sm mt-1">
                        Nhấn nút <strong>"Tổng hợp & Cập nhật Báo cáo"</strong> để tính toán và lưu dữ liệu điểm tổng kết hàng tuần. 
                        Bảng sẽ tự động cập nhật sau khi quá trình hoàn tất. Bạn nên chạy lại quy trình này khi có sự thay đổi lớn về dữ liệu điểm.
                    </p>
                </div>
            </div>
        </div>
    );
}
