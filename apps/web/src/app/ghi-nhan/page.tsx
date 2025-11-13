'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { collection, onSnapshot, query, writeBatch, doc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase-client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { getWeekFromDate, getWeeksOptions, ymd, dmy, formatClassName } from '@/lib/utils';

// ================== COMPONENT: SEARCHABLE COMBOBOX (thay thế SearchableMenu) =====================
function SearchableCombobox({ items, placeholder, value, onChange }: {
  items: { value: string; label: string; sub?: string }[];
  placeholder: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-base font-normal"
        >
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Tìm kiếm nhanh..." />
          <CommandList>
            <CommandEmpty>Không có kết quả.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onChange(item.value === value ? '' : item.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer flex justify-between items-center w-full"
                >
                  <div>
                    <div className="text-base">{item.label}</div>
                    {item.sub && <div className="text-sm text-gray-500">{item.sub}</div>}
                  </div>
                  <Check
                    className={`ml-4 h-4 w-4 ${value === item.value ? 'opacity-100' : 'opacity-0'}`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc và Công cụ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <Label htmlFor="week-filter">Tuần</Label>
                <Select value={week} onValueChange={setWeek}>
                  <SelectTrigger id="week-filter">
                    <SelectValue placeholder="Tất cả các tuần" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeksOptions.map(o=> <SelectItem key={o.label} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grade-filter">Khối</Label>
                <Select value={grade} onValueChange={v => { setGrade(v); setClassRef(''); }}>
                   <SelectTrigger id="grade-filter">
                    <SelectValue placeholder="Tất cả các khối" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="class-filter">Lớp</Label>
                 <Select value={classRef} onValueChange={v => { setClassRef(v); setStudentId(''); }}>
                   <SelectTrigger id="class-filter">
                    <SelectValue placeholder="Tất cả các lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map(o=> <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="search-filter">Tìm kiếm</Label>
                <Input
                  id="search-filter"
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  placeholder="Tên học sinh, nội dung, mã lớp..."
                  type="search"
                />
              </div>
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
            <CardTitle>Thêm Ghi Nhận Mới</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
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

            <div className="space-y-4">
              <div>
                  <Label>Đối tượng</Label>
                  <SearchableCombobox items={studentItems} placeholder={classRef ? "Chọn đối tượng..." : "Vui lòng chọn lớp trước"} value={studentId} onChange={setStudentId} />
              </div>
              <div>
                  <Label>Quy định</Label>
                  <SearchableCombobox items={ruleItems} placeholder="Chọn quy định..." value={ruleCode} onChange={setRuleCode} />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                  <div className={`transition-opacity duration-300 ${isRuleQuantifiable ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      <Label htmlFor="quantity-input">Số lượng</Label>
                      <Input
                          id="quantity-input"
                          type="number"
                          value={quantity}
                          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                          min="1"
                      />
                  </div>
                  <div>
                      <Label htmlFor="date-input">Ngày ghi nhận</Label>
                      <Input
                          id="date-input"
                          type="date"
                          value={ymd(recordDate)}
                          onChange={e=>setRecordDate(new Date(e.target.value))}
                      />
                  </div>
              </div>

              <Button
                  className="w-full"
                  onClick={onAdd}
                  disabled={!studentId || !ruleCode}
                  >
                  Thêm vào danh sách chờ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Danh sách Ghi nhận</CardTitle>
          <Button
            onClick={saveAll}
            disabled={pending.length===0}
          >
            Lưu Tất Cả ({pending.length})
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Tuần</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-center">Điểm</TableHead>
                  <TableHead className="text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r)=>(
                  <TableRow key={r.id} className="bg-yellow-50 hover:bg-yellow-100">
                    <TableCell>{dmy(r.recordDate)}</TableCell>
                    <TableCell className="text-center">{r.week}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.ruleDesc} {r.quantity > 1 ? `(SL: ${r.quantity})` : ''}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={r.pointsApplied > 0 ? 'text-green-600' : 'text-red-600'}>
                          {r.pointsApplied > 0 ? '+' : ''}{r.pointsApplied}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={()=>removePending(r.id)}>Xoá</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSaved.map((r)=>(
                  <TableRow key={r.id}>
                    <TableCell>{dmy(r.recordDate)}</TableCell>
                    <TableCell className="text-center">{r.week ?? '...'}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{rules.find(rule => rule.code === r.ruleRef)?.description || r.ruleRef} {r.quantity > 1 ? `(SL: ${r.quantity})` : ''}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={r.pointsApplied > 0 ? 'text-green-600' : 'text-red-600'}>
                          {r.pointsApplied > 0 ? '+' : ''}{r.pointsApplied}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={()=>deleteSaved(r.id)}>Xoá</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pending.length + filteredSaved.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-10 h-24">Không có ghi nhận nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
