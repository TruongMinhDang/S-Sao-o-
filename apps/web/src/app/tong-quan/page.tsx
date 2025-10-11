'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ================== TYPES =====================
interface WeeklyScore {
  id: string;
  week: number;
  classId: string;
  className: string;
  gradeName: string;
  scores: {
    hoc_tap?: number;
    ky_luat?: number;
    ve_sinh?: number;
  };
  totalPoints?: number;
}

interface RecordScore {
  week: number;
  classRef: string;
  pointsApplied: number;
  type: 'merit' | 'demerit';
}

// ================== HELPERS =====================
const getGradeFromClassRef = (classRef: string): string => {
  const match = classRef.match(/class_(\d+)_/);
  return match ? `Khối ${match[1]}` : '';
};
const formatClassName = (classRef: string): string => {
  return classRef.substring('class_'.length).replace(/_/g, '/');
};

const grades = ['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'];
const WEEKS_IN_SEMESTER = 35; // Tổng số tuần trong năm học
const availableWeeks = Array.from({ length: WEEKS_IN_SEMESTER }, (_, i) => String(i + 1));
const CLASS_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#C9CBCF', '#E7E9ED', '#8A2BE2', '#5F9EA0'
];

// ================== PAGE COMPONENT =====================
export default function TongQuanPage() {
  const [allScores, setAllScores] = useState<WeeklyScore[]>([]);
  const [recordScores, setRecordScores] = useState<RecordScore[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState('Khối 9');
  const [endWeek, setEndWeek] = useState(String(WEEKS_IN_SEMESTER));

  // Fetch all weekly scores and record scores
  useEffect(() => {
    setLoading(true);

    const scoresQuery = query(collection(db, 'weeklyScores'));
    const recordsQuery = query(collection(db, 'records'));

    const unsubScores = onSnapshot(scoresQuery, (snapshot) => {
      const scoresData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WeeklyScore[];
      setAllScores(scoresData);
    });

    const unsubRecords = onSnapshot(recordsQuery, (snapshot) => {
      const recordsData = snapshot.docs.map((doc) => doc.data() as RecordScore);
      setRecordScores(recordsData);
    });
    
    // Set loading to false after a short delay to allow data to populate
    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      unsubScores();
      unsubRecords();
      clearTimeout(timer);
    };
  }, []);

  // Calculate total points for chart
  const chartData = useMemo(() => {
    if (!selectedGrade) return [];

    const dataByWeek: { [week: number]: { week: number; [className: string]: number } } = {};
    const classesInGrade = new Set<string>();

    const filteredScores = allScores.filter(
      (score) => score.gradeName === selectedGrade && score.week <= Number(endWeek)
    );
    const filteredRecords = recordScores.filter(
      (record) => getGradeFromClassRef(record.classRef) === selectedGrade && record.week <= Number(endWeek)
    );

    for (let w = 1; w <= Number(endWeek); w++) {
      dataByWeek[w] = { week: w };
    }

    // Process scores
    filteredScores.forEach((score) => {
      const { week, className, scores } = score;
      if (week > Number(endWeek)) return;

      classesInGrade.add(className);
      const defaultScore = score.gradeName === 'Khối 9' ? 330 : 340;
      const basePoints =
        (scores?.hoc_tap ?? defaultScore) +
        (scores?.ky_luat ?? defaultScore) +
        (scores?.ve_sinh ?? defaultScore);

      if (!dataByWeek[week]) dataByWeek[week] = { week };
      dataByWeek[week][className] = (dataByWeek[week][className] || 0) + basePoints;
    });

    // Process records (merits/demerits)
    filteredRecords.forEach((record) => {
      const { week, classRef, pointsApplied } = record;
      if (week > Number(endWeek)) return;

      const className = formatClassName(classRef);
      classesInGrade.add(className);

      if (!dataByWeek[week]) dataByWeek[week] = { week };
      dataByWeek[week][className] = (dataByWeek[week][className] || 0) + pointsApplied;
    });
    
    // Fill in missing data points with previous week's score or initial score
    const sortedClasses = Array.from(classesInGrade).sort();
    const initialScore = selectedGrade === 'Khối 9' ? 990 : 1020; // 330*3 or 340*3

    for (let w = 1; w <= Number(endWeek); w++) {
        sortedClasses.forEach(className => {
            if(dataByWeek[w][className] === undefined) {
                const prevWeekScore = dataByWeek[w-1]?.[className];
                dataByWeek[w][className] = prevWeekScore !== undefined ? prevWeekScore : initialScore;
            }
        });
    }

    return Object.values(dataByWeek).sort((a, b) => a.week - b.week);
  }, [selectedGrade, endWeek, allScores, recordScores]);

  const classesInChart = useMemo(() => {
    if (!chartData.length) return [];
    return Object.keys(chartData[0]).filter((key) => key !== 'week').sort();
  }, [chartData]);
  
  const chartConfig = useMemo(() => {
    const config: { [key: string]: { label: string; color: string } } = {};
    classesInChart.forEach((className, index) => {
      config[className] = {
        label: className,
        color: CLASS_COLORS[index % CLASS_COLORS.length],
      };
    });
    return config;
  }, [classesInChart]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tổng Quan Thi Đua</h1>
          <p className="text-muted-foreground">
            Theo dõi và so sánh điểm số của các lớp qua từng tuần.
          </p>
        </div>
        <div className="flex gap-4">
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn khối" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={endWeek} onValueChange={setEndWeek}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Xem đến tuần" />
                </SelectTrigger>
                <SelectContent>
                    {availableWeeks.map(w => (
                        <SelectItem key={w} value={w}>Đến hết tuần {w}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Biểu Đồ Biến Động Điểm Thi Đua - {selectedGrade}</CardTitle>
          <CardDescription>
            Hiển thị tổng điểm của các lớp qua các tuần đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">Đang tải dữ liệu biểu đồ...</div>
            ) : chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickFormatter={(value) => `Tuần ${value}`} />
                        <YAxis domain={['dataMin - 50', 'dataMax + 50']} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {classesInChart.map((className) => (
                        <Line
                            key={className}
                            type="monotone"
                            dataKey={className}
                            stroke={chartConfig[className]?.color || '#000'}
                            strokeWidth={2}
                            dot={false}
                        />
                        ))}
                    </LineChart>
                </ChartContainer>
            ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">Không có dữ liệu cho khối hoặc tuần đã chọn.</div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
