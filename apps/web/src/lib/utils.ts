
// Định nghĩa kiểu cho Firestore Timestamp để tránh sử dụng 'any'
interface FirestoreTimestamp {
  toDate: () => Date;
}

// Kiểu dữ liệu đầu vào cho các hàm xử lý ngày tháng
type DateInput = Date | FirestoreTimestamp | string | number;


// ================== CÁC HÀM TIỆN ÍCH LIÊN QUAN ĐẾN NGÀY THÁNG VÀ HỌC KỲ =====================

const TERM_START = new Date(2025, 8, 8); // Monday, September 8, 2025
const TOTAL_WEEKS = 35;
const MS_DAY = 86400000;

/**
 * Returns the start of the day for a given date.
 * @param d The date.
 * @returns A new Date object set to 00:00:00.
 */
const getStartOfDay = (d: Date): Date => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
};

/**
 * Converts a flexible date input (Date, Firestore Timestamp, or string) into a Date object.
 * @param d The date input.
 * @returns A Date object.
 */
export const toDate = (d: DateInput): Date => {
  if (d instanceof Date) return d;
  if (typeof d === 'object' && d !== null && 'toDate' in d && typeof (d as FirestoreTimestamp).toDate === 'function') {
    return (d as FirestoreTimestamp).toDate();
  }
  return new Date(d);
};

/**
 * Calculates the school week number from a given date.
 * @param d The date input.
 * @returns The week number (1-35).
 */
export const getWeekFromDate = (d: DateInput): number => {
  const date = toDate(d);
  const diff = Math.floor((getStartOfDay(date).getTime() - getStartOfDay(TERM_START).getTime()) / MS_DAY);
  return Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diff / 7) + 1));
};

/**
 * Generates a list of week options for a dropdown menu.
 * @returns An array of week options with value and label.
 */
export const getWeeksOptions = (): { value: string; label: string }[] => {
  const out = [{ value: '', label: 'Tất cả các tuần' }];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const start = new Date(getStartOfDay(TERM_START).getTime() + (w - 1) * 7 * MS_DAY);
    const end = new Date(start.getTime() + 6 * MS_DAY);
    const p = (n: number) => n < 10 ? `0${n}` : `${n}`;
    out.push({
      value: String(w),
      label: `Tuần ${w} (${p(start.getDate())}/${p(start.getMonth() + 1)} - ${p(end.getDate())}/${p(end.getMonth() + 1)})`
    });
  }
  return out;
};

/**
 * Formats a date into YYYY-MM-DD format.
 * @param d The date input.
 * @returns The formatted date string.
 */
export const ymd = (d: DateInput): string => {
  const x = toDate(d);
  const p = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

/**
 * Formats a date into DD/MM/YYYY format.
 * @param d The date input.
 * @returns The formatted date string.
 */
export const dmy = (d: DateInput): string => {
  const x = toDate(d);
  const p = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
};


// ================== CÁC HÀM TIỆN ÍCH LIÊN QUAN ĐẾN LỚP HỌC =====================

/**
 * Extracts the grade number from a class reference string (e.g., "class_9_1" -> "9").
 * @param classRef The class reference string (e.g., "class_9_1").
 * @returns The grade number as a string (e.g., "9").
 */
export const getGradeFromClass = (classRef: string): string => {
  if (!classRef) return '';
  // This regex is more robust, capturing the first number after "class_" or just the first number if the prefix is missing.
  const match = classRef.match(/(?:class_)?(\d+)/);
  return match ? match[1] : '';
};

/**
 * Formats a class reference string for display (e.g., "class_6_1" -> "6/1").
 * @param classRef The class reference string.
 * @returns The formatted class name.
 */
export const formatClassName = (classRef: string): string => {
  if (!classRef || !classRef.startsWith('class_')) return classRef;
  return classRef.substring('class_'.length).replace(/_/g, '/');
};
