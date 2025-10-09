'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getFirestore, doc, setDoc, collection, query, where, onSnapshot, DocumentData } from 'firebase/firestore';
import { app } from '@/lib/firebase-client';

const db = getFirestore(app);

// ================== TYPES =====================
interface ManualScores {
    [gradeName: string]: {
        [className: string]: {
            hoc_tap?: number;
            ky_luat?: number;
            ve_sinh?: number;
            nhan_xet?: string;
        }
    }
}

interface RecordScores {
    [gradeName: string]: {
        [className: string]: {
            diem_cong: number;
            diem_tru: number;
        }
    }
}

interface EditingClass {
    gradeName: string;
    className: string;
    scores: DocumentData;
}


// ================== HELPERS =====================
const TERM_START = new Date(new Date().getFullYear(), 8, 8); // Use current year, September 8
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;
const mid = (d: Date) => { const t = new Date(d); t.setHours(0,0,0,0); return t; };

const getWeeks = () => {
  const out = [];
  for (let w=1; w<=TOTAL_WEEKS; w++) {
    const start = new Date(mid(TERM_START).getTime() + (w-1)*7*MS_DAY);
    const end = new Date(start.getTime() + 6*MS_DAY);
    const p = (n:number)=>n<10?`0${n}`:`${n}`;
    out.push(`Tuần ${w} (${p(start.getDate())}/${p(start.getMonth()+1)} - ${p(end.getDate())}/${p(end.getMonth()+1)})`);
  }
  return out;
};

const getCurrentWeekName = () => {
  const now = new Date();
  const diff = Math.floor((mid(now).getTime() - mid(TERM_START).getTime())/MS_DAY);
  const weekNumber = Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff/7)+1));
  const week = getWeeks().find(w => w.startsWith(`Tuần ${weekNumber} `));
  return week || getWeeks()[0];
}

const getGradeFromClassRef = (classRef: string): string => {
    if (!classRef) return '';
    const match = classRef.match(/class_(\d+)_/);
    return match ? match[1] : '';
};
const formatClassName = (classRef: string): string => {
    if (!classRef || !classRef.startsWith('class_')) return classRef;
    return classRef.substring('class_'.length).replace(/_/g, '/');
};
const createClassId = (className: string) => `class_${className.replace('/', '_')}`;

const grades = [
    { name: "Khối 6", color: "bg-red-500", classes: ["6/1", "6/2", "6/3", "6/4", "6/5", "6/6", "6/7", "6/8", "6/9", "6/10"] },
    { name: "Khối 7", color: "bg-yellow-500", classes: ["7/1", "7/2", "7/3", "7/4", "7/5", "7/6", "7/7", "7/8"] },
    { name: "Khối 8", color: "bg-blue-500", classes: ["8/1", "8/2", "8/3", "8/4", "8/5", "8/6", "8/7"] },
    { name: "Khối 9", color: "bg-green-500", classes: ["9/1", "9/2", "9/3", "9/4", "9/5", "9/6", "9/7", "9/8"] },
];

const tableDataStructure = [
  { key: "hoc_tap", label: "HỌC TẬP", editable: true },
  { key: "ky_luat", label: "KỶ LUẬT", editable: true },
  { key: "ve_sinh", label: "VỆ SINH", editable: true },
  { key: "diem_cong", label: "ĐIỂM CỘNG", editable: false },
  { key: "diem_tru", label: "ĐIỂM TRỪ", editable: false },
  { key: "tong_diem", label: "TỔNG ĐIỂM", editable: false },
  { key: "hang", label: "HẠNG", editable: false },
  { key: "nhan_xet", label: "NHẬN XÉT", editable: true },
];

const weeks = getWeeks();
const initialWeek = getCurrentWeekName();

// ================== MODAL COMPONENT =====================
function EditScoreModal({ isOpen, onClose, onSave, classData }: { isOpen: boolean, onClose: () => void, onSave: (scores: any) => void, classData: EditingClass | null }) {
    if (!isOpen || !classData) return null;

    const [scores, setScores] = useState({
        hoc_tap: classData.scores.hoc_tap || 0,
        ky_luat: classData.scores.ky_luat || 0,
        ve_sinh: classData.scores.ve_sinh || 0,
        nhan_xet: classData.scores.nhan_xet || ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['hoc_tap', 'ky_luat', 've_sinh'].includes(name);
        setScores(prev => ({ ...prev, [name]: isNumeric ? (value === '' ? '' : Number(value)) : value }));
    };

    const handleSave = () => {
        const scoresToSave = {
            hoc_tap: scores.hoc_tap === '' ? 0 : scores.hoc_tap,
            ky_luat: scores.ky_luat === '' ? 0 : scores.ky_luat,
            ve_sinh: scores.ve_sinh === '' ? 0 : scores.ve_sinh,
            nhan_xet: scores.nhan_xet
        };
        onSave(scoresToSave);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Cập nhật điểm cho lớp {classData.className}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Học tập</label>
                        <input type="number" name="hoc_tap" value={scores.hoc_tap} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kỷ luật</label>
                        <input type="number" name="ky_luat" value={scores.ky_luat} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vệ sinh</label>
                        <input type="number" name="ve_sinh" value={scores.ve_sinh} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nhận xét</label>
                        <input type="text" name="nhan_xet" value={scores.nhan_xet} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSave}>Lưu thay đổi</Button>
                </div>
            </div>
        </div>
    );
}

// ================== MAIN PAGE =====================
export default function BangXepHangPage() {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [manualScores, setManualScores] = useState<ManualScores>({});
  const [recordScores, setRecordScores] = useState<RecordScores>({});
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<EditingClass | null>(null);

  // Lấy điểm thủ công từ collection 'weeklyScores'
  useEffect(() => {
    const weekNumber = selectedWeek.match(/\d+/)?.[0];
    if (!weekNumber) return;

    const q = query(collection(db, "weeklyScores"), where("week", "==", Number(weekNumber)));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newManualScores: ManualScores = {};
        grades.forEach(g => { newManualScores[g.name] = {}; });

        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.gradeName && data.className && data.scores) {
                if (!newManualScores[data.gradeName]) newManualScores[data.gradeName] = {};
                newManualScores[data.gradeName][data.className] = data.scores;
            }
        });
        setManualScores(newManualScores);
    }, (error) => {
        console.error("Lỗi khi tải điểm thủ công:", error);
    });

    return () => unsubscribe();
  }, [selectedWeek]);

  // Lấy điểm cộng/trừ từ collection 'records'
  useEffect(() => {
    const weekNumberString = selectedWeek.match(/\d+/)?.[0];
    if (!weekNumberString) return;

    const weekNumber = parseInt(weekNumberString, 10);

    // *** ĐÃ SỬA: Tạo query dựa trên trường 'week' đã được đánh index ***
    const recordsQuery = query(
      collection(db, "records"),
      where("week", "==", weekNumber)
    );

    const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
        const newRecordScores: RecordScores = {};
        // Khởi tạo cấu trúc điểm
        grades.forEach(g => {
            newRecordScores[g.name] = {};
            g.classes.forEach(c => {
                newRecordScores[g.name][c] = { diem_cong: 0, diem_tru: 0 };
            });
        });
        
        // Lặp qua các ghi nhận từ query và tính toán điểm
        snapshot.forEach((doc) => {
            const record = doc.data();
            if (!record.classRef || !record.type) return;

            const gradeName = `Khối ${getGradeFromClassRef(record.classRef)}`;
            const className = formatClassName(record.classRef);

            if (newRecordScores[gradeName] && newRecordScores[gradeName][className]) {
                const points = Number(record.pointsApplied || 0);
                if (record.type === 'merit') {
                    newRecordScores[gradeName][className].diem_cong += points;
                } else if (record.type === 'demerit') {
                    // Điểm trừ được lưu dưới dạng số âm, ta lấy giá trị tuyệt đối
                    newRecordScores[gradeName][className].diem_tru += Math.abs(points);
                }
            }
        });
        setRecordScores(newRecordScores);
    }, (error) => {
        console.error("Lỗi khi tải điểm ghi nhận:", error);
        alert("Lỗi khi tải điểm ghi nhận. Có vẻ đã có lỗi xảy ra với query, vui lòng kiểm tra lại code.");
    });
    
    return () => unsubscribe();
  }, [selectedWeek]);

  // Tính toán dữ liệu hiển thị
  const displayData = useMemo(() => {
    const data: DocumentData = {};
    grades.forEach(grade => {
        const classScores: DocumentData[] = [];
        grade.classes.forEach(className => {
            const manual = manualScores[grade.name]?.[className] || {};
            const records = recordScores[grade.name]?.[className] || { diem_cong: 0, diem_tru: 0 };
            const tong_diem = (manual.hoc_tap || 0) + (manual.ky_luat || 0) + (manual.ve_sinh || 0) + records.diem_cong - records.diem_tru;
            classScores.push({ className, hoc_tap: manual.hoc_tap, ky_luat: manual.ky_luat, ve_sinh: manual.ve_sinh, nhan_xet: manual.nhan_xet, ...records, tong_diem });
        });

        classScores.sort((a, b) => b.tong_diem - a.tong_diem);

        data[grade.name] = {};
        let rank = 0;
        let lastScore = Infinity;
        classScores.forEach((score, index) => {
            if (score.tong_diem < lastScore) {
                rank = index + 1;
            }
            data[grade.name][score.className] = { ...score, hang: rank };
            lastScore = score.tong_diem;
        });
    });
    return data;
  }, [manualScores, recordScores]);

  const handleOpenModal = (gradeName: string, className: string) => {
      const scores = displayData[gradeName]?.[className] || {};
      setEditingClass({ gradeName, className, scores });
      setModalOpen(true);
  };

  // Lưu điểm vào collection 'weeklyScores'
  const handleSaveScore = async (newScores: any) => {
      if (!editingClass) return;
      const { gradeName, className } = editingClass;
      const weekNumber = selectedWeek.match(/\d+/)?.[0];
      if (!weekNumber) { alert("Tuần không hợp lệ."); return; }
      
      const classId = createClassId(className);
      const docId = `week_${weekNumber}_${classId}`;
      const docRef = doc(db, "weeklyScores", docId);

      const dataToSave = {
          week: Number(weekNumber),
          classId: classId,
          className: className,
          gradeName: gradeName,
          scores: newScores
      };

      try {
          await setDoc(docRef, dataToSave, { merge: true });
          setModalOpen(false);
      } catch (error) {
          console.error("Error writing document: ", error);
          alert("Đã có lỗi xảy ra khi lưu điểm. Vui lòng thử lại.");
      }
  };

  return (
    <div className="container mx-auto p-4">
      <EditScoreModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveScore} classData={editingClass} />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bảng Xếp Hạng Thi Đua</h1>
        <Select onValueChange={setSelectedWeek} value={selectedWeek}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Chọn tuần" />
          </SelectTrigger>
          <SelectContent className="max-h-96 bg-white">
            {weeks.map((week) => <SelectItem key={week} value={week}>{week}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-8">
        {grades.map((grade) => (
          <Card key={grade.name} className="hover:shadow-lg transition-shadow duration-300 border">
            <CardHeader className={`text-white rounded-t-lg ${grade.color}`}>
              <CardTitle>{grade.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="border-collapse border border-slate-400">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] border border-slate-300">TUẦN</TableHead>
                    <TableHead className="border border-slate-300">NỘI DUNG</TableHead>
                    {grade.classes.map((className) => (
                      <TableHead key={className} className="border border-slate-300 text-center">
                        {className}
                        <Button variant="ghost" size="sm" className="ml-1 h-6 w-6 p-0" onClick={() => handleOpenModal(grade.name, className)}>
                           ✏️
                        </Button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableDataStructure.map((row, index) => (
                    <TableRow key={row.key}>
                      {index === 0 && (
                        <TableCell rowSpan={tableDataStructure.length} className="align-top font-bold text-lg border border-slate-300 text-center">
                          {selectedWeek.match(/\d+/)?.[0]}
                        </TableCell>
                      )}
                      <TableCell className="border border-slate-300">{row.label}</TableCell>
                      {grade.classes.map((className) => {
                        const data = displayData[grade.name]?.[className];
                        const value = data?.[row.key] ?? (row.key === 'nhan_xet' ? '' : 0);

                        const classes = ['border', 'border-slate-300', 'text-center', 'font-medium'];
                        let displayValue = value;

                        switch (row.key) {
                            case 'diem_cong':
                                if (value > 0) {
                                    classes.push('text-green-600', 'font-bold');
                                    displayValue = `+${value}`;
                                }
                                break;
                            case 'diem_tru':
                                if (value > 0) {
                                    classes.push('text-red-600', 'font-bold');
                                    displayValue = `-${value}`;
                                }
                                break;
                            case 'tong_diem':
                            case 'hang':
                                classes.push('font-bold');
                                break;
                        }

                        return (
                            <TableCell key={className} className={classes.join(' ')}>
                                {displayValue}
                            </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
