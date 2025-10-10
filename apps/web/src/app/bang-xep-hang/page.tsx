'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    { name: "Khối 6", classes: ["6/1", "6/2", "6/3", "6/4", "6/5", "6/6", "6/7", "6/8", "6/9", "6/10"] },
    { name: "Khối 7", classes: ["7/1", "7/2", "7/3", "7/4", "7/5", "7/6", "7/7", "7/8"] },
    { name: "Khối 8", classes: ["8/1", "8/2", "8/3", "8/4", "8/5", "8/6", "8/7"] },
    { name: "Khối 9", classes: ["9/1", "9/2", "9/3", "9/4", "9/5", "9/6", "9/7", "9/8"] },
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

// ================== MODAL COMPONENT (Giữ nguyên) =====================
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

  // Lấy điểm thủ công
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
    });

    return () => unsubscribe();
  }, [selectedWeek]);

  // Lấy điểm từ ghi nhận
  useEffect(() => {
    const weekNumberString = selectedWeek.match(/\d+/)?.[0];
    if (!weekNumberString) return;
    const weekNumber = parseInt(weekNumberString, 10);
    const recordsQuery = query(collection(db, "records"), where("week", "==", weekNumber));

    const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
        const newRecordScores: RecordScores = {};
        grades.forEach(g => {
            newRecordScores[g.name] = {};
            g.classes.forEach(c => {
                newRecordScores[g.name][c] = { diem_cong: 0, diem_tru: 0 };
            });
        });
        
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
                    newRecordScores[gradeName][className].diem_tru += Math.abs(points);
                }
            }
        });
        setRecordScores(newRecordScores);
    });
    
    return () => unsubscribe();
  }, [selectedWeek]);

  // Tính toán dữ liệu
  const displayData = useMemo(() => {
    const data: DocumentData = {};
    grades.forEach(grade => {
        const defaultScore = grade.name === 'Khối 9' ? 330 : 340;
        const classScores: DocumentData[] = [];
        grade.classes.forEach(className => {
            const manual = manualScores[grade.name]?.[className] || {};
            const records = recordScores[grade.name]?.[className] || { diem_cong: 0, diem_tru: 0 };
            const hoc_tap_score = manual.hoc_tap ?? defaultScore;
            const ky_luat_score = manual.ky_luat ?? defaultScore;
            const ve_sinh_score = manual.ve_sinh ?? defaultScore;
            const tong_diem = hoc_tap_score + ky_luat_score + ve_sinh_score + records.diem_cong - records.diem_tru;
            classScores.push({ 
                className, 
                hoc_tap: hoc_tap_score, 
                ky_luat: ky_luat_score, 
                ve_sinh: ve_sinh_score, 
                nhan_xet: manual.nhan_xet, 
                ...records, 
                tong_diem 
            });
        });
        classScores.sort((a, b) => b.tong_diem - a.tong_diem);
        data[grade.name] = {};
        let rank = 0;
        let lastScore = Infinity;
        classScores.forEach((score, index) => {
            if (score.tong_diem < lastScore) rank = index + 1;
            data[grade.name][score.className] = { ...score, hang: rank };
            lastScore = score.tong_diem;
        });
    });
    return data;
  }, [manualScores, recordScores]);

  // Handlers
  const handleOpenModal = (gradeName: string, className: string) => {
      const scores = displayData[gradeName]?.[className] || {};
      setEditingClass({ gradeName, className, scores });
      setModalOpen(true);
  };

  const handleSaveScore = async (newScores: any) => {
      if (!editingClass) return;
      const { gradeName, className } = editingClass;
      const weekNumber = selectedWeek.match(/\d+/)?.[0];
      if (!weekNumber) { alert("Tuần không hợp lệ."); return; }
      const classId = createClassId(className);
      const docId = `week_${weekNumber}_${classId}`;
      const docRef = doc(db, "weeklyScores", docId);
      const dataToSave = { week: Number(weekNumber), classId, className, gradeName, scores: newScores };
      try {
          await setDoc(docRef, dataToSave, { merge: true });
          setModalOpen(false);
      } catch (error) {
          console.error("Error writing document: ", error);
          alert("Đã có lỗi xảy ra khi lưu điểm.");
      }
  };

  // SỬA: Bổ sung bộ màu sắc cho từng khối
  const gradeColorSchemes: { [key: string]: { text: string; border: string; bg: string } } = {
    "Khối 6": { text: 'text-red-700', border: 'border-red-300', bg: 'bg-red-50' },
    "Khối 7": { text: 'text-yellow-700', border: 'border-yellow-400', bg: 'bg-yellow-50' },
    "Khối 8": { text: 'text-blue-700', border: 'border-blue-300', bg: 'bg-blue-50' },
    "Khối 9": { text: 'text-green-700', border: 'border-green-300', bg: 'bg-green-50' },
  };

// ================== PHẦN GIAO DIỆN MỚI =====================
  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <EditScoreModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveScore} classData={editingClass} />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Bảng Xếp Hạng Thi Đua</h1>
        <Select onValueChange={setSelectedWeek} value={selectedWeek}>
          <SelectTrigger className="w-full sm:w-[320px] bg-white shadow-sm border-gray-300">
            <SelectValue placeholder="Chọn tuần" />
          </SelectTrigger>
          <SelectContent className="max-h-96 bg-white">
            {weeks.map((week) => <SelectItem key={week} value={week}>{week}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-12">
        {grades.map((grade) => {
          // SỬA: Lấy màu sắc tương ứng với khối
          const colors = gradeColorSchemes[grade.name] || gradeColorSchemes["Khối 9"];
          
          return (
            // SỬA: Thêm hiệu ứng hover
            <div key={grade.name} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              {/* SỬA: Áp dụng màu cho tiêu đề */}
              <h2 className={`text-xl sm:text-2xl font-bold text-center ${colors.text} mb-6`}>
                SƠ KẾT HÀNG TUẦN - {grade.name.toUpperCase()}
              </h2>
              <div className="overflow-x-auto">
                {/* SỬA: Áp dụng màu cho viền bảng */}
                <div className={`grid border-l border-t ${colors.border}`} style={{ gridTemplateColumns: `minmax(120px, 1.5fr) repeat(${grade.classes.length}, minmax(90px, 1fr))` }}>
                  
                  {/* SỬA: Áp dụng màu cho header */}
                  <div className={`font-bold text-gray-700 p-3 border-r border-b ${colors.border} ${colors.bg} flex items-center justify-start`}>NỘI DUNG</div>
                  {grade.classes.map((className) => (
                    <div key={className} className={`font-bold text-gray-800 p-3 border-r border-b ${colors.border} ${colors.bg} flex items-center justify-center relative group`}>
                      {className}
                      <Button variant="ghost" size="sm" className="ml-1 h-6 w-6 p-0 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenModal(grade.name, className)}>
                         ✏️
                      </Button>
                    </div>
                  ))}
                  
                  {tableDataStructure.map((row) => (
                    <>
                      {/* SỬA: Áp dụng màu cho viền cột đầu tiên */}
                      <div key={row.key} className={`font-semibold p-3 border-r border-b ${colors.border} flex items-center ${row.key === 'hang' ? 'bg-yellow-100 text-yellow-900' : 'bg-white'}`}>
                        {row.label}
                      </div>
                      {grade.classes.map((className) => {
                        const data = displayData[grade.name]?.[className];
                        const value = data?.[row.key] ?? (row.key === 'nhan_xet' ? '' : 0);
                        
                        let displayValue: any = value;
                        // SỬA: Áp dụng màu cho viền các ô dữ liệu
                        let cellClasses = `p-3 text-center border-r border-b ${colors.border} flex items-center justify-center font-medium`;

                        if (row.key === 'hang') {
                          cellClasses += ' bg-yellow-200 font-bold text-yellow-900';
                        }
                        if (row.key === 'diem_cong' && value > 0) {
                          displayValue = `+${value}`;
                          cellClasses += ' text-green-600 font-bold';
                        }
                        if (row.key === 'diem_tru' && value > 0) {
                          displayValue = `-${value}`;
                          cellClasses += ' text-red-600 font-bold';
                        }
                        if(row.key === 'tong_diem'){
                           cellClasses += ' font-bold text-blue-800';
                        }
                        if (row.editable) {
                           cellClasses += ' cursor-pointer hover:bg-gray-100 transition-colors';
                        }
                        
                        return (
                          <div key={className} className={cellClasses} onClick={() => row.editable && handleOpenModal(grade.name, className)}>
                            {displayValue}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
