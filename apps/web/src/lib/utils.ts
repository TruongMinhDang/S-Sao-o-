import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ================== KIỂU DỮ LIỆU NGÀY =====================

// Kiểu Firestore Timestamp tối thiểu (tránh any)
interface FirestoreTimestamp {
  toDate: () => Date;
}

// Kiểu đầu vào cho xử lý ngày
type DateInput = Date | FirestoreTimestamp | string | number;

// ================== HẰNG SỐ HỌC KỲ =====================

const TERM_START = new Date(2025, 8, 8); // Monday, September 8, 2025
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;

// ================== TIỆN ÍCH NGÀY THÁNG =====================

/**
 * Trả về đầu ngày (00:00:00)
 */
const getStartOfDay = (d: Date): Date => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
};

/**
 * Chuyển Date | FirestoreTimestamp | string | number → Date
 * (BẢN CHUẨN – QUA TS STRICT & FIREBASE BUILD)
 */
export const toDate = (d: DateInput): Date => {
  if (d instanceof Date) return d;

  if (typeof d === "string" || typeof d === "number") {
    return new Date(d);
  }

  // Sau hai nhánh trên, TypeScript suy luận chắc chắn là FirestoreTimestamp
  return d.toDate();
};

/**
 * Tính tuần học từ một ngày bất kỳ
 */
export const getWeekFromDate = (d: DateInput): number => {
  const date = toDate(d);
  const diff =
    Math.floor(
      (getStartOfDay(date).getTime() -
        getStartOfDay(TERM_START).getTime()) /
        MS_DAY
    );

  return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff / 7) + 1));
};

/**
 * Danh sách tuần cho dropdown
 */
export const getWeeksOptions = (): { value: string; label: string }[] => {
  const out = [{ value: "", label: "Tất cả các tuần" }];
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const start = new Date(
      getStartOfDay(TERM_START).getTime() + (w - 1) * 7 * MS_DAY
    );
    const end = new Date(start.getTime() + 6 * MS_DAY);

    out.push({
      value: String(w),
      label: `Tuần ${w} (${pad(start.getDate())}/${pad(
        start.getMonth() + 1
      )} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)})`,
    });
  }

  return out;
};

/**
 * Định dạng YYYY-MM-DD
 */
export const ymd = (d: DateInput): string => {
  const x = toDate(d);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

/**
 * Định dạng DD/MM/YYYY
 */
export const dmy = (d: DateInput): string => {
  const x = toDate(d);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
};

// ================== TIỆN ÍCH LỚP HỌC =====================

/**
 * Lấy khối từ mã lớp (vd: "class_9_1" → "9")
 */
export const getGradeFromClass = (classRef: string): string => {
  if (!classRef) return "";
  const match = classRef.match(/(?:class_)?(\d+)/);
  return match ? match[1] : "";
};

/**
 * Hiển thị tên lớp (vd: "class_6_1" → "6/1")
 */
export const formatClassName = (classRef: string): string => {
  if (!classRef || !classRef.startsWith("class_")) return classRef;
  return classRef.substring("class_".length).replace(/_/g, "/");
};
