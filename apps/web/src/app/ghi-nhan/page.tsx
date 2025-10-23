'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image'; // THÊM IMPORT
import { collection, onSnapshot, query, writeBatch, doc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase-client';

// ================== CÁC HÀM TIỆN ÍCH (KHÔNG THAY ĐỔI) =====================
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
  const out = [{value: '', label: 'Tất cả các tuần'}];
  for (let w=1; w<=TOTAL_WEEKS; w++) {
    const start = new Date(mid(TERM_START).getTime() + (w-1)*7*MS_DAY);
    const end = new Date(start.getTime() + 6*MS_DAY);
    const p = (n:number)=>n<10?`0${n}`:`${n}`;
    out.push({value:String(w), label:`Tuần ${w} (${p(start.getDate())}/${p(start.getMonth()+1)} - ${p(end.getDate())}/${p(end.getMonth()+1)})`});
  }
  return out;
};
const ymd = (d: any) => {
  const x = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  const p = (n:number)=>n<10?`0${n}`:`${n}`;
  return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}`;
};
const dmy = (d: any) => {
  const x = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  const p = (n:number)=>n<10?`0${n}`:`${n}`;
  return `${p(x.getDate())}/${p(x.getMonth()+1)}/${x.getFullYear()}`;
};
const getGradeFromClassRef = (classRef: string): string => {
    if (!classRef) return '';
    const match = classRef.match(/class_(\d+)_/);
    return match ? match[1] : '';
};
const formatClassName = (classRef: string): string => {
    if (!classRef || !classRef.startsWith('class_')) return classRef;
    return classRef.substring('class_'.length).replace(/_/g, '/');
};

// ================== COMPONENT: SEARCHABLE MENU (KHÔNG THAY ĐỔI) =====================
function SearchableMenu({ items, placeholder, value, onChange }:{ 
  items: { value: string; label: string; sub?: string }[];
  placeholder: string;
  value?: string;
  onChange: (v: string)=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const kw = q.toLowerCase();
    return items.filter(i => 
      i.label.toLowerCase().includes(kw) || (i.sub?.toLowerCase().includes(kw) ?? false)
    );
  }, [items, q]);

  const currentLabel = useMemo(
    () => items.find(i => i.value===value)?.label || '',
    [items, value]
  );

  useEffect(()=>{
    if(open && ref.current) ref.current.focus();
  },[open])

  return (
    <div className="relative">
      <button type="button" className="w-full border rounded px-3 py-2 text-left bg-white text-base"
        onClick={()=> setOpen(o=>!o)}
      >
        <span className="truncate block">{currentLabel || placeholder}</span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-auto">
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              ref={ref}
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Tìm kiếm nhanh..."
              className="w-full border rounded px-3 py-2 text-base"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-3 text-gray-500">Không có kết quả</div>
          ) : filtered.map(i=>(
            <div 
              key={i.value}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={()=> { onChange(i.value); setOpen(false); setQ(''); }}
            >
              <div className="font-medium text-base">{i.label}</div>
              {i.sub && <div className="text-sm text-gray-500">{i.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const QUANTIFIABLE_RULES = new Set(['D06', 'C11']);

// ================== CÁC ID ĐẶC BIỆT =====================
const SPECIAL_TARGET_PREFIX = 'special:';
const TARGET_TAP_THE_LOP = `${SPECIAL_TARGET_PREFIX}tap-the-lop`;
const TARGET_LOP_TRUONG = `${SPECIAL_TARGET_PREFIX}lop-truong`;
const TARGET_TO_TRUC = `${SPECIAL_TARGET_PREFIX}to-truc`;

// =============== MAIN PAGE ===================
export default function GhiNhanHoatDong() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [students, setStudents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  
  const [week, setWeek] = useState('');
  const [grade, setGrade] = useState('');
  const [classRef, setClassRef] = useState('');
  const [search, setSearch] = useState('');
  
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [studentId, setStudentId] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, 'students'), 
        snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setError('Không thể tải danh sách học sinh.')
      ),
      onSnapshot(collection(db, 'rules'), 
        snap => setRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setError('Không thể tải danh sách quy định.')
      ),
      onSnapshot(query(collection(db, 'records'), orderBy('createdAt', 'desc')),
        snap => setSaved(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setError('Không thể tải các ghi nhận đã lưu.')
      ),
    ];
    
    Promise.all([
        new Promise(res => onSnapshot(collection(db, 'students'), res)),
        new Promise(res => onSnapshot(collection(db, 'rules'), res)),
        new Promise(res => onSnapshot(query(collection(db, 'records'), orderBy('createdAt', 'desc')), res)),
    ]).then(() => setLoading(false));

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const weeksOptions = useMemo(getWeeksOptions, []);
  const gradeOptions = useMemo(()=>{
    const allGrades = students.map(s => getGradeFromClassRef(s.classRef)).filter(Boolean);
    const uniqueGrades = Array.from(new Set(allGrades)).sort((a,b) => parseInt(a) - parseInt(b));
    return [{value:'', label:'Tất cả các khối'}, ...uniqueGrades.map(g=>({value:g, label:`Khối ${g}`}))];
  }, [students]);
  const classOptions = useMemo(()=>{
    const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
    let relevantClasses = Array.from(new Set(students.map(s => s.classRef).filter(Boolean)));
    if (grade) {
      relevantClasses = relevantClasses.filter(classRef => getGradeFromClassRef(classRef) === grade);
    }
    relevantClasses.sort(collator.compare);
    return [
        {value:'', label:'Tất cả các lớp'}, 
        ...relevantClasses.map(classRef => ({ value: classRef, label: formatClassName(classRef) }))
    ];
  }, [students, grade]);
  
  const studentItems = useMemo(()=> {
    const regularStudents = students
        .filter(s => !classRef || s.classRef === classRef)
        .map(s=>({ 
            value:s.id, label:s.fullName, sub: `${formatClassName(s.classRef)} - ${s.schoolId}`
        }))
        .sort((a,b) => a.label.localeCompare(b.label, 'vi'));

    if (classRef) {
      const className = formatClassName(classRef);
      const specialOptions = [
        { value: TARGET_TAP_THE_LOP, label: `Tập thể lớp ${className}`, sub: "Áp dụng cho cả lớp" },
        { value: TARGET_LOP_TRUONG, label: `Lớp trưởng ${className}`, sub: "Áp dụng cho lớp trưởng" },
        { value: TARGET_TO_TRUC, label: `Tổ trực ${className}`, sub: "Áp dụng cho tổ trực" },
      ];
      return [...specialOptions, ...regularStudents];
    }
    
    return regularStudents;
  }, [students, classRef]);

  const ruleItems = useMemo(()=> rules.map(r=>({ 
    value:r.code, label:`${r.code} — ${r.description}`,
    sub:`${r.type==='merit'?'':' '}${r.points} điểm`
  })), [rules]);

  const isRuleQuantifiable = useMemo(() => QUANTIFIABLE_RULES.has(ruleCode), [ruleCode]);

  function calcLuỹTiến({ studentId, ruleCode, recordDate }: { studentId: string; ruleCode: string; recordDate: Date }) {
    const week = getWeekFromDate(recordDate);
    let count = 0;
    const studentRef = studentId.startsWith(SPECIAL_TARGET_PREFIX) ? `${studentId}|${classRef}` : studentId;

    saved.forEach(r => {
      const savedRecordDate = r.recordDate?.toDate ? r.recordDate.toDate() : new Date();
      if (r.studentRef === studentRef && r.ruleRef === ruleCode && getWeekFromDate(savedRecordDate) === week) count++;
    });
    pending.forEach(r => {
      if (r.studentId === studentRef && r.ruleCode === ruleCode && r.week === week) count++;
    });
    return count + 1;
  }
  
  function onAdd() {
    if(!studentId || !ruleCode || !recordDate) { alert('Vui lòng nhập đủ Học sinh, Quy định và Ngày ghi nhận.'); return; }
    if(studentId.startsWith(SPECIAL_TARGET_PREFIX) && !classRef) { alert('Vui lòng chọn một lớp cụ thể trong bộ lọc để áp dụng cho tập thể.'); return; }

    const rule = rules.find(r=>r.code===ruleCode);
    if(!rule) { alert('Quy định không hợp lệ!'); return; }
    
    let pointsApplied = 0;
    if (rule.type === 'demerit') {
      const lan = calcLuỹTiến({ studentId, ruleCode, recordDate });
      pointsApplied = - (Math.abs(Number(rule.points)) * lan);
    } else { // merit
      pointsApplied = Number(rule.points) * (isRuleQuantifiable ? quantity : 1);
    }

    let studentData: { id: string, name: string, classRef: string, className: string };

    if (studentId.startsWith(SPECIAL_TARGET_PREFIX)) {
        const className = formatClassName(classRef);
        let name = '';
        if (studentId === TARGET_TAP_THE_LOP) name = `Tập thể lớp ${className}`;
        else if (studentId === TARGET_LOP_TRUONG) name = `Lớp trưởng ${className}`;
        else if (studentId === TARGET_TO_TRUC) name = `Tổ trực ${className}`;
        
        studentData = {
            id: `${studentId}|${classRef}`,
            name: name,
            classRef: classRef,
            className: className
        };
    } else {
        const stu = students.find(s=>s.id===studentId);
        if(!stu) { alert('Học sinh không hợp lệ!'); return; }
        studentData = {
            id: stu.id,
            name: stu.fullName,
            classRef: stu.classRef,
            className: formatClassName(stu.classRef)
        };
    }

    setPending(prev=>[
      {
        id: crypto.randomUUID(),
        studentId: studentData.id,
        studentName: studentData.name, 
        classRef: studentData.classRef,
        className: studentData.className,
        ruleCode: rule.code, 
        ruleDesc: rule.description, 
        type: rule.type,
        pointsApplied,
        recordDate: recordDate,
        week: getWeekFromDate(recordDate),
        quantity: isRuleQuantifiable ? quantity : 1,
        _status: 'pending'
      }, ...prev
    ]);

    setStudentId('');
  }

  async function saveAll() {
    if(pending.length === 0) return;
    const batch = writeBatch(db);
    const col = collection(db, 'records');
    const uid = auth?.currentUser?.uid || null;

    pending.forEach(r => {
      batch.set(doc(col), {
        className: r.className,
        classRef: r.classRef,
        createdAt: serverTimestamp(),
        pointsApplied: r.pointsApplied,
        quantity: r.quantity,
        recordDate: r.recordDate,
        ruleRef: r.ruleCode,
        studentName: r.studentName,
        studentRef: r.studentId,
        supervisorRef: uid,
        type: r.type,
        week: r.week,
      });
    });

    try {
      await batch.commit();
      setPending([]);
      alert(`Đã lưu thành công ${pending.length} mục.`);
    } catch (e) {
      console.error("Lỗi khi lưu:", e);
      alert("Đã xảy ra lỗi khi lưu các mục. Vui lòng thử lại.");
    }
  }
  
  function removePending(id:string) { setPending(p=>p.filter(x=>x.id!==id)); }

  async function deleteSaved(id:string) {
    if(!window.confirm('Bạn có chắc chắn muốn xoá mục này không? Hành động này không thể hoàn tác.')) return;
    try {
        await deleteDoc(doc(db, 'records', id));
    } catch (e) {
        console.error("Lỗi khi xoá:", e);
        alert('Đã xảy ra lỗi khi xoá. Vui lòng thử lại.');
    }
  }

  const filteredSaved = useMemo(()=>{
    let d = saved;
    if(week) d = d.filter(r=>String(r.week || getWeekFromDate(r.recordDate))===String(week));
    if(grade) d = d.filter(r=> r.classRef && getGradeFromClassRef(r.classRef) === grade);
    if(classRef) d = d.filter(r=>r.classRef===classRef);
    if(search) {
      const s = search.toLowerCase();
      d = d.filter(r=>
        String(r.studentName || '').toLowerCase().includes(s) ||
        String(r.ruleRef || '').toLowerCase().includes(s) ||
        String(rules.find(rule => rule.code === r.ruleRef)?.description || '').toLowerCase().includes(s) ||
        String(r.className || '').toLowerCase().includes(s)
      );
    }
    return d;
  }, [saved, week, grade, classRef, search, rules]);

  if (loading) {
    return <div className="p-8 text-center text-xl">Đang tải dữ liệu, vui lòng chờ...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  // === PHẦN VIEW ===
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-5 rounded-lg shadow-md">
          <h2 className="font-bold text-xl mb-4">Bộ lọc và Công cụ</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-gray-700 text-sm mb-1 font-medium">Tuần</label>
              <select className="border rounded px-3 py-2 w-full text-base" value={week} onChange={e=>setWeek(e.target.value)}>
                {weeksOptions.map(o=> <option key={o.label} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1 font-medium">Khối</label>
              <select className="border rounded px-3 py-2 w-full text-base" value={grade} onChange={e=> { setGrade(e.target.value); setClassRef(''); }}>
                {gradeOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm mb-1 font-medium">Lớp</label>
              <select className="border rounded px-3 py-2 w-full text-base" value={classRef} onChange={e=>{setClassRef(e.target.value); setStudentId('')}}>
                {classOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm mb-1 font-medium">Tìm kiếm</label>
              <input
                className="border rounded px-3 py-2 w-full text-base"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder="Tên học sinh, nội dung, mã lớp..."
                type="search"
              />
            </div>
          </div>
        </div>

      {/* ==== KHUNG GHI NHẬN MỚI ==== */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <h2 className="font-bold text-xl mb-6">Thêm Ghi Nhận Mới</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* CỘT BÊN TRÁI: HÌNH ẢNH */}
          <div className="hidden lg:flex items-center justify-center">
             <Image 
                src="https://firebasestorage.googleapis.com/v0/b/app-quan-ly-hs.firebasestorage.app/o/Icon%2Ficon%20ghi%20nh%C3%A2%CC%A3n.png?alt=media&token=0c1288c9-3f40-41b0-a6b3-beee737aa9dc"
                alt="Ghi nhận thi đua"
                width={250}
                height={250}
                className="object-contain"
                priority
             />
          </div>

          {/* CỘT BÊN PHẢI: FORM NHẬP LIỆU */}
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng</label>
                <SearchableMenu items={studentItems} placeholder={classRef ? "Chọn đối tượng..." : "Vui lòng chọn lớp trước"} value={studentId} onChange={setStudentId} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quy định</label>
                <SearchableMenu items={ruleItems} placeholder="Chọn quy định..." value={ruleCode} onChange={setRuleCode} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-end">
                <div className={`transition-opacity duration-300 ${isRuleQuantifiable ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                    <input
                        className="border rounded px-3 py-2 w-full text-base"
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10)))} 
                        min="1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày ghi nhận</label>
                    <input
                        className="border rounded px-3 py-2 bg-white text-base w-full"
                        type="date"
                        value={ymd(recordDate)}
                        onChange={e=>setRecordDate(new Date(e.target.value))}
                    />
                </div>
            </div>

            <button
                className="w-full px-5 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={onAdd}
                disabled={!studentId || !ruleCode}
                >
                Thêm vào danh sách chờ
            </button>
          </div>
        </div>
      </div>
      
      {/* ==== DANH SÁCH GHI NHẬN ==== */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-xl">Danh sách Ghi nhận</h2>
          <button
            className={`px-4 py-2 rounded text-white font-semibold ${pending.length===0?'bg-gray-400 cursor-not-allowed':'bg-green-600 hover:bg-green-700'}`}
            disabled={pending.length===0}
            onClick={saveAll}
          >
            Lưu Tất Cả ({pending.length})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-base">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-3 border-b text-left font-semibold">Ngày</th>
                <th className="px-3 py-3 border-b text-left font-semibold">Tuần</th>
                <th className="px-3 py-3 border-b text-left font-semibold">Lớp</th>
                <th className="px-3 py-3 border-b text-left font-semibold">Đối tượng</th>
                <th className="px-3 py-3 border-b text-left font-semibold">Nội dung</th>
                <th className="px-3 py-3 border-b font-semibold text-center">Điểm</th>
                <th className="px-3 py-3 border-b font-semibold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r,i)=>(
                <tr key={r.id} className="bg-yellow-50 hover:bg-yellow-100">
                  <td className="border-b px-3 py-2">{dmy(r.recordDate)}</td>
                  <td className="border-b px-3 py-2 text-center">{r.week}</td>
                  <td className="border-b px-3 py-2">{r.className}</td>
                  <td className="border-b px-3 py-2 font-semibold">{r.studentName}</td>
                  <td className="border-b px-3 py-2">{r.ruleDesc} {r.quantity > 1 ? `(SL: ${r.quantity})` : ''}</td>
                  <td className="border-b px-3 py-2 text-center font-bold">
                    <span className={r.pointsApplied > 0 ? 'text-green-600' : 'text-red-600'}>
                        {r.pointsApplied > 0 ? '+' : ''}{r.pointsApplied}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2 text-center">
                    <button className="text-red-500 hover:underline" onClick={()=>removePending(r.id)}>Xoá</button>
                  </td>
                </tr>
              ))}
              {filteredSaved.map((r,i)=>(
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border-b px-3 py-2">{dmy(r.recordDate)}</td>
                  <td className="border-b px-3 py-2 text-center">{r.week ?? '...'}</td>
                  <td className="border-b px-3 py-2">{r.className}</td>
                  <td className="border-b px-3 py-2 font-semibold">{r.studentName}</td>
                  <td className="border-b px-3 py-2">{rules.find(rule => rule.code === r.ruleRef)?.description || r.ruleRef} {r.quantity > 1 ? `(SL: ${r.quantity})` : ''}</td>
                  <td className="border-b px-3 py-2 text-center font-bold">
                     <span className={r.pointsApplied > 0 ? 'text-green-600' : 'text-red-600'}>
                        {r.pointsApplied > 0 ? '+' : ''}{r.pointsApplied}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2 text-center">
                    <button className="text-red-500 hover:underline" onClick={()=>deleteSaved(r.id)}>Xoá</button>
                  </td>
                </tr>
              ))}
              {pending.length + filteredSaved.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10 text-lg">Không có ghi nhận nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
