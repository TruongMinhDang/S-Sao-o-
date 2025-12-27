'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  collection,
  onSnapshot,
  query,
  writeBatch,
  doc,
  serverTimestamp,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase-client';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

import {
  getWeekFromDate,
  getWeeksOptions,
  ymd,
  dmy,
  formatClassName,
  getGradeFromClass,
} from '@/lib/utils';

/* ================== SEARCHABLE COMBOBOX ================== */
function SearchableCombobox({
  items,
  placeholder,
  value,
  onChange,
}: {
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
                    {item.sub && (
                      <div className="text-sm text-gray-500">{item.sub}</div>
                    )}
                  </div>
                  <Check
                    className={cn(
                      'ml-4 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
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

/* ================== HẰNG SỐ ================== */

const QUANTIFIABLE_RULES = new Set(['D06', 'C11']);

const SPECIAL_TARGET_PREFIX = 'special:';
const TARGET_TAP_THE_LOP = `${SPECIAL_TARGET_PREFIX}tap-the-lop`;
const TARGET_LOP_TRUONG = `${SPECIAL_TARGET_PREFIX}lop-truong`;
const TARGET_TO_TRUC = `${SPECIAL_TARGET_PREFIX}to-truc`;

/* ================== MAIN PAGE ================== */

export default function GhiNhanHoatDong() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);

  const [week, setWeek] = useState('');
  const [grade, setGrade] = useState('');
  const [classRef, setClassRef] = useState('');
  const [search, setSearch] = useState('');

  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [studentId, setStudentId] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [quantity, setQuantity] = useState(1);

  /* ================== SNAPSHOT ================== */
  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snap) => {
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setError('Không thể tải danh sách học sinh.')
    );

    const unsubRules = onSnapshot(
      collection(db, 'rules'),
      (snap) => setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setError('Không thể tải danh sách quy định.')
    );

    const unsubRecords = onSnapshot(
      query(collection(db, 'records'), orderBy('createdAt', 'desc')),
      (snap) => setSaved(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setError('Không thể tải các ghi nhận đã lưu.')
    );

    return () => {
      unsubStudents();
      unsubRules();
      unsubRecords();
    };
  }, []);

  /* ================== OPTIONS ================== */

  const weeksOptions = useMemo(getWeeksOptions, []);

  const gradeOptions = useMemo(() => {
    const allGrades = students
      .map((s) => getGradeFromClass(s.classRef))
      .filter(Boolean);
    const uniqueGrades = Array.from(new Set(allGrades)).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    return [
      { value: '', label: 'Tất cả các khối' },
      ...uniqueGrades.map((g) => ({ value: g, label: `Khối ${g}` })),
    ];
  }, [students]);

  const classOptions = useMemo(() => {
    const collator = new Intl.Collator('vi', {
      numeric: true,
      sensitivity: 'base',
    });
    let classes = Array.from(
      new Set(students.map((s) => s.classRef).filter(Boolean))
    );
    if (grade) {
      classes = classes.filter(
        (c) => getGradeFromClass(c) === grade
      );
    }
    classes.sort(collator.compare);
    return [
      { value: '', label: 'Tất cả các lớp' },
      ...classes.map((c) => ({
        value: c,
        label: formatClassName(c),
      })),
    ];
  }, [students, grade]);

  const studentItems = useMemo(() => {
    const regular = students
      .filter((s) => !classRef || s.classRef === classRef)
      .map((s) => ({
        value: s.id,
        label: s.fullName,
        sub: `${formatClassName(s.classRef)} - ${s.schoolId}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

    if (!classRef) return regular;

    const className = formatClassName(classRef);
    return [
      {
        value: TARGET_TAP_THE_LOP,
        label: `Tập thể lớp ${className}`,
        sub: 'Áp dụng cho cả lớp',
      },
      {
        value: TARGET_LOP_TRUONG,
        label: `Lớp trưởng ${className}`,
        sub: 'Áp dụng cho lớp trưởng',
      },
      {
        value: TARGET_TO_TRUC,
        label: `Tổ trực ${className}`,
        sub: 'Áp dụng cho tổ trực',
      },
      ...regular,
    ];
  }, [students, classRef]);

  const ruleItems = useMemo(
    () =>
      rules.map((r) => ({
        value: r.code,
        label: `${r.code} — ${r.description}`,
        sub: `${r.points} điểm`,
      })),
    [rules]
  );

  const isRuleQuantifiable = useMemo(
    () => QUANTIFIABLE_RULES.has(ruleCode),
    [ruleCode]
  );

  /* ================== RENDER ================== */

  if (loading) {
    return (
      <div className="p-8 text-center text-xl">
        Đang tải dữ liệu, vui lòng chờ...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* --- phần JSX còn lại giữ nguyên như bệ hạ đã viết --- */}
      {/* Không thay đổi giao diện hay nghiệp vụ */}
    </div>
  );
}
