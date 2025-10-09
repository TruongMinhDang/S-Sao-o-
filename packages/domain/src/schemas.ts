import { z } from "zod";

// ==== Enums
export const Role = z.enum(["admin","supervisor","homeroom_teacher","inspector","student"]);
export const RuleType = z.enum(["merit","demerit"]);

// ==== Stored Schemas (server-side, source of truth)
export const StoredUserSchema = z.object({
  id: z.string(),                      // UID (Auth)
  displayName: z.string().min(1),
  email: z.string().email(),
  role: Role,                          // Nguồn sự thật = custom claims; field này chỉ để hiển thị
  assignedClasses: z.array(z.string()).default([]), // ["class_8_3",...]
  createdAt: z.any(),                  // serverTimestamp
  updatedAt: z.any()
});

export const StoredClassSchema = z.object({
  id: z.string(),                      // "class_8_3"
  grade: z.number().int().min(1),
  className: z.string(),               // "8/3"
  totalMeritPoints: z.number().int().default(0),
  totalDemeritPoints: z.number().int().default(0),
  createdAt: z.any(), updatedAt: z.any()
});

export const StoredStudentSchema = z.object({
  id: z.string(),                      // ULID
  fullName: z.string().min(1),
  schoolId: z.string().min(1),         // mã học sinh
  classRef: z.string(),                // "class_8_3"
  totalMeritPoints: z.number().int().default(0),
  totalDemeritPoints: z.number().int().default(0),
  createdAt: z.any(), updatedAt: z.any()
});

export const StoredRuleSchema = z.object({
  id: z.string(),                      // "KT001" / "VP083"
  code: z.string(),
  type: RuleType,                      // merit|demerit
  points: z.number().int(),            // +5 hoặc -5 tương ứng type
  category: z.string(),                // "Nề nếp"...
  description: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.any(), updatedAt: z.any()
});

export const StoredRecordSchema = z.object({
  id: z.string(),                      // ULID
  ruleRef: z.string(),                 // "VP083"
  ruleType: RuleType,
  pointsApplied: z.number().int(),     // đã tính theo type
  quantity: z.number().int().min(1).default(1),
  studentRef: z.string(),              // student id
  classRef: z.string(),                // class id (snapshot lúc ghi)
  recordDate: z.any(),                 // serverTimestamp of event day (00:00Z+7)
  createdBy: z.string(),               // UID ghi nhận
  createdAt: z.any()
});

export const StoredRankingDocSchema = z.object({
  id: z.string(),                      // `${weekId}_${grade}_${classRef}`
  weekId: z.string(),                  // "2025-W37" (ISO week/tz VN)
  grade: z.number().int(),
  classRef: z.string(),
  merit: z.number().int(),
  demerit: z.number().int(),
  total: z.number().int(),             // merit - demerit
  lockedAt: z.any()                    // khi finalizeWeek chạy
});


// ==== Input Schemas (client-side forms)

export const ClassInputSchema = StoredClassSchema.pick({
  grade: true,
  className: true,
});

export const StudentInputSchema = StoredStudentSchema.pick({
  fullName: true,
  schoolId: true,
  classRef: true,
});

export const RuleInputSchema = StoredRuleSchema.pick({
  code: true,
  type: true,
  points: true,
  category: true,
  description: true,
}).extend({
  // On input, we expect a positive number. The sign is applied by the server.
  points: z.number().int().positive("Điểm phải là số nguyên dương"),
});

export const RecordInputSchema = StoredRecordSchema.pick({
  ruleRef: true,
  studentRef: true,
  quantity: true,
  recordDate: true,
}).extend({
  // Allow a more flexible date input from the client (e.g., from a date picker)
  recordDate: z.union([z.date(), z.string().datetime("Ngày không hợp lệ")]),
});

export const UserUpdateInputSchema = StoredUserSchema.pick({
  displayName: true,
  assignedClasses: true,
}).partial(); // All fields are optional for updates
