'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase.client';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
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

// ================== SAO CHÉP Y HỆT TỪ TRANG GHI-NHAN =====================
const TERM_START = new Date(2025, 8, 8);
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;
const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };
const getWeekFromDate = (d: any) => {
  const date = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
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
// ================== KẾT THÚC SAO CHÉP =====================

interface Violation {
  id: string;
  studentName: string;
  ruleRef?: string;
  pointsApplied?: number;
  recordDate: { seconds: number; nanoseconds: number; };
  supervisorRef?: string;
  className?: string;
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
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const [selectedWeek, setSelectedWeek] = useState<string>(String(getWeekFromDate(new Date())));

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const rulesSnapshot = await getDocs(collection(db, 'rules'));
            setRules(rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const usersSnapshot = await getDocs(collection(db, 'users'));
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Failed to fetch initial data", err);
            setError("Không thể tải dữ liệu nền (quy định, người dùng).");
        }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;

    async function fetchViolations() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'records'), 
          where('week', '==', parseInt(selectedWeek, 10))
        );

        const querySnapshot = await getDocs(q);
        const violationsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Violation[];

        setViolations(violationsData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(`Không thể tải dữ liệu cho tuần ${selectedWeek}.`);
      } finally {
        setLoading(false);
      }
    }

    fetchViolations();
  }, [selectedWeek]);

  const stats = useMemo(() => {
    if (violations.length === 0) {
      return { totalPoints: 0, commonError: 'N/A' };
    }

    const totalPoints = violations.reduce((sum, v) => sum + Number(v.pointsApplied || 0), 0);

    const errorCounts = violations.reduce((acc, v) => {
      if(v.ruleRef) {
        acc[v.ruleRef] = (acc[v.ruleRef] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    let commonErrorCode = 'N/A';
    let maxCount = 0;
    for (const errorCode in errorCounts) {
      if (errorCounts[errorCode] > maxCount) {
        commonErrorCode = errorCode;
        maxCount = errorCounts[errorCode];
      }
    }

    return { totalPoints, commonError: getRuleDescription(commonErrorCode, rules) };
  }, [violations, rules]);


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Tổng Quan Lớp Học</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm bg-white">
        <h2 className="text-2xl font-semibold mb-4">Báo Cáo Vi Phạm Theo Tuần</h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6 items-center">
          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-500">CHỌN TUẦN</h3>
            <Select onValueChange={setSelectedWeek} value={selectedWeek}>
              <SelectTrigger className="bg-white text-base py-2 h-auto">
                <SelectValue placeholder="Chọn một tuần" />
              </SelectTrigger>
              <SelectContent>
                {weeksOptions.map(week => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
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
            <p className="text-lg font-bold text-yellow-600 truncate">{stats.commonError}</p>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3 text-gray-800">Danh Sách Vi Phạm Chi Tiết</h3>
        {loading ? (
          <div className="text-center py-4">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : violations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Không có vi phạm nào được ghi nhận trong tuần này.</div>
        ) : (
          <Table>
            {/* SỬA: Đổi bố cục table header */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">STT</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Ghi nhận</TableHead>
                <TableHead className="text-center">Điểm</TableHead>
                <TableHead className="text-right">Xem thêm</TableHead>
              </TableRow>
            </TableHeader>
            {/* SỬA: Đổi bố cục table body */}
            <TableBody>
              {violations.map((v, index) => (
                <TableRow key={v.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{v.recordDate ? new Date(v.recordDate.seconds * 1000).toLocaleString('vi-VN') : 'N/A'}</TableCell>
                  <TableCell className="font-medium">{v.studentName || 'N/A'}</TableCell>
                  <TableCell>
                    <div>{getRuleDescription(v.ruleRef, rules)}</div>
                    <div className="text-xs text-gray-500">Bởi: {getUserName(v.supervisorRef, users)}</div>
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
