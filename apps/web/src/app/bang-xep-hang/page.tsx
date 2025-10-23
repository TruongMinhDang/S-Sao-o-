'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { getAllClasses, Class } from '@/services/class.service';
import { getWeeklyScores, WeeklyScore } from '@/services/weekly-score.service';
import { getRules, Rule } from '@/services/rule.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStartAndEndOfWeek, getWeekNumber } from '@/utils/date-utils';

// Component để hiển thị bảng xếp hạng
const RankingTable = ({ classes, scores, rules, grade, week }) => {
  if (!grade) return <p>Vui lòng chọn một khối để xem xếp hạng.</p>;

  const filteredClasses = classes.filter(c => c.gradeId === grade.id).sort((a, b) => a.name.localeCompare(b.name));
  const { startDate, endDate } = getStartAndEndOfWeek(new Date(week.value));
  const weekNumber = getWeekNumber(new Date(week.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-red-600 font-bold">
          SƠ KẾT HẠNG TUẦN - {grade.name.toUpperCase()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-full border-collapse border border-gray-300">
          <TableHeader>
            <TableRow className="bg-primary-foreground">
              <TableHead className="border border-gray-300 text-center font-bold">NỘI DUNG</TableHead>
              {filteredClasses.map(c => <TableHead key={c.id} className="border border-gray-300 text-center font-bold">{c.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Điểm mặc định theo nội quy */}
            {rules.map(rule => (
              <TableRow key={rule.id}>
                <TableCell className="border border-gray-300 text-left font-semibold">{rule.name}</TableCell>
                {filteredClasses.map(c => <TableCell key={c.id} className="border border-gray-300 text-center">{rule.score}</TableCell>)}
              </TableRow>
            ))}
            {/* Điểm cộng/trừ từ ghi nhận */}
            <TableRow>
              <TableCell className="border border-gray-300 text-left font-semibold">ĐIỂM CỘNG</TableCell>
              {filteredClasses.map(c => {
                const classScore = scores.find(s => s.classId === c.id);
                return <TableCell key={c.id} className="border border-gray-300 text-center text-green-600 font-bold">+{classScore?.plusScore || 0}</TableCell>;
              })}
            </TableRow>
            <TableRow>
              <TableCell className="border border-gray-300 text-left font-semibold">ĐIỂM TRỪ</TableCell>
              {filteredClasses.map(c => {
                const classScore = scores.find(s => s.classId === c.id);
                return <TableCell key={c.id} className="border border-gray-300 text-center text-red-600 font-bold">-{classScore?.minusScore || 0}</TableCell>;
              })}
            </TableRow>
            {/* Tổng điểm và xếp hạng */}
            <TableRow className="bg-primary-foreground">
              <TableCell className="border border-gray-300 text-left font-bold">TỔNG ĐIỂM</TableCell>
              {filteredClasses.map(c => {
                const classScore = scores.find(s => s.classId === c.id);
                return <TableCell key={c.id} className="border border-gray-300 text-center font-bold">{classScore?.totalScore || 0}</TableCell>;
              })}
            </TableRow>
            <TableRow className="bg-yellow-200">
              <TableCell className="border border-gray-300 text-left font-bold">HẠNG</TableCell>
              {filteredClasses.map(c => {
                const classScore = scores.find(s => s.classId === c.id);
                return <TableCell key={c.id} className="border border-gray-300 text-center font-bold">{classScore?.rank || 'N/A'}</TableCell>;
              })}
            </TableRow>
             <TableRow>
              <TableCell className="border border-gray-300 text-left font-bold">NHẬN XÉT</TableCell>
              {filteredClasses.map(c => (
                <TableCell key={c.id} className="border border-gray-300"></TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default function RankingPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<{ value: string; label: string }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  // Generate list of weeks from start of school year to today
  useEffect(() => {
    const schoolYearStart = new Date('2023-09-05');
    const today = new Date();
    const weekList = [];
    let current = schoolYearStart;

    while (current <= today) {
      const { startDate, endDate } = getStartAndEndOfWeek(current);
      const weekNumber = getWeekNumber(startDate);
      weekList.push({
        value: startDate.toISOString(),
        label: `Tuần ${weekNumber} (${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')})`
      });
      // Move to next week
      current.setDate(current.getDate() + 7);
    }
    setWeeks(weekList.reverse()); // Show most recent week first
    if (weekList.length > 0) {
      setSelectedWeek(weekList[0].value);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !selectedWeek) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedClasses, fetchedScores, fetchedRules] = await Promise.all([
          getAllClasses(),
          getWeeklyScores({ week: selectedWeek }),
          getRules()
        ]);

        setClasses(fetchedClasses);
        setScores(fetchedScores);
        setRules(fetchedRules.filter(r => r.type === 'default'));

      } catch (err) {
        console.error("Error fetching ranking data:", err);
        setError("Không thể tải dữ liệu bảng xếp hạng.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile, authLoading, selectedWeek]);

  const grades = useMemo(() => {
    const gradeMap = new Map();
    classes.forEach(c => {
      if (!gradeMap.has(c.gradeId)) {
        gradeMap.set(c.gradeId, { id: c.gradeId, name: `Khối ${c.gradeId.split('_')[1]}` });
      }
    });
    return Array.from(gradeMap.values());
  }, [classes]);

  const selectedGrade = useMemo(() => {
     if (!userProfile?.assignedClasses || userProfile.assignedClasses.length === 0) return grades[0];
     const assignedGradeId = userProfile.assignedClasses[0].split('_')[0] + '_' + userProfile.assignedClasses[0].split('_')[1];
     return grades.find(g => g.id === assignedGradeId) || grades[0];
  }, [userProfile, grades]);


  if (loading || authLoading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
        <div className="flex justify-end mb-4">
             <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Chọn tuần" />
                </SelectTrigger>
                <SelectContent>
                    {weeks.map(week => (
                        <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      {grades.map(grade => (
          <div key={grade.id} className="mb-8">
            <RankingTable 
                classes={classes}
                scores={scores}
                rules={rules}
                grade={grade}
                week={{ value: selectedWeek, label: weeks.find(w => w.value === selectedWeek)?.label || '' }}
             />
          </div>
      ))}
    </div>
  );
}