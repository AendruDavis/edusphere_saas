import { z } from "zod";
import { USER_ROLES } from "../domain/roles";

export const roleSchema = z.enum(USER_ROLES);

export const loginSchema = z.object({
  email: z.string().trim().email(),
  pass: z.string().min(1),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100),
  password: z.string().min(6).max(128),
  role: roleSchema,
  photo: z.string().nullable().optional(),
  dept: z.string().trim().max(100).optional(),
});

export const userUpdateSchema = userCreateSchema.partial();

export const resourcePayloadSchema = z.record(z.string(), z.unknown());

export const aiAccountingSchema = z.object({
  transactions: z.array(z.record(z.string(), z.unknown())).default([]),
  query: z.string().trim().min(1).max(1000),
});

export const dataUrlUploadSchema = z.object({
  dataUrl: z.string().startsWith("data:").max(5_000_000),
  folder: z.string().trim().max(80).optional(),
  fileName: z.string().trim().max(120).optional(),
});

export const reportQuerySchema = z.object({
  term: z.string().trim().min(1).max(50),
  year: z.string().trim().min(1).max(50),
});

export const reportCommentsSchema = z.object({
  term: z.string().trim().min(1).max(50),
  year: z.string().trim().min(1).max(50),
  classTeacherComment: z.string().max(2000).optional(),
  headTeacherComment: z.string().max(2000).optional(),
  projectWork: z.string().max(100).optional(),
  result: z.string().max(100).optional(),
});

export const schoolCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(100).optional(),
  level: z.enum(["Primary", "Secondary"]).default("Secondary"),
});

export const feePaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000_000),
  term: z.string().trim().min(1).max(50).default("Term 1"),
  year: z.string().trim().min(1).max(50).default("2026/2027"),
  method: z.string().trim().min(1).max(40).default("Cash"),
  receiptNo: z.string().trim().max(80).optional(),
  paidAt: z.string().datetime().optional(),
  description: z.string().trim().max(500).optional(),
});

export const admissionCreateSchema = z.object({
  studentName: z.string().trim().min(2).max(150),
  gender: z.string().trim().max(30).optional(),
  dateOfBirth: z.string().trim().max(30).optional(),
  classApplied: z.string().trim().min(1).max(60),
  parentName: z.string().trim().min(2).max(150),
  parentEmail: z.string().trim().email().max(150).optional().or(z.literal("")),
  parentPhone: z.string().trim().max(40).optional(),
  parentWhatsApp: z.string().trim().max(40).optional(),
  documents: z.record(z.string(), z.unknown()).optional(),
});

export const admissionStatusSchema = z.object({
  status: z.enum(["applied", "admitted", "enrolled", "rejected"]),
});

export const communicationSendSchema = z.object({
  to: z.enum(["all_parents", "all_staff", "specific_class", "specific_recipient"]),
  channel: z.enum(["email", "sms", "whatsapp", "in_app", "all"]).default("email"),
  className: z.string().trim().max(60).optional(),
  recipient: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(5000),
  attachment: z.record(z.string(), z.unknown()).optional(),
});

export const attendanceEventSchema = z.object({
  schoolId: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  deviceId: z.string().trim().max(120).optional(),
  timestamp: z.string().datetime().optional(),
  type: z.enum(["IN", "OUT"]),
  source: z.enum(["biometric", "machine", "manual"]).default("manual"),
  recordedBy: z.string().uuid().optional(),
  adminOverride: z.boolean().optional(),
});

export const markBulkSaveSchema = z.object({
  marks: z.array(z.object({
    studentId: z.string().uuid(),
    subject: z.string().trim().min(1).max(100),
    term: z.string().trim().min(1).max(50),
    year: z.string().trim().min(1).max(50),
    a1: z.coerce.number().nullable().optional(),
    a2: z.coerce.number().nullable().optional(),
    a3: z.coerce.number().nullable().optional(),
    a4: z.coerce.number().nullable().optional(),
    examScore: z.coerce.number().nullable().optional(),
    teacherInitials: z.string().trim().max(12).nullable().optional(),
    locked: z.boolean().optional(),
  })).min(1).max(250),
});

export const staffAppraisalSchema = z.object({
  staffId: z.string().uuid(),
  term: z.string().trim().min(1).max(80),
  lessonPlansSubmitted: z.coerce.number().min(0).max(100),
  punctualityPercent: z.coerce.number().min(0).max(100),
  studentResultsAverage: z.coerce.number().min(0).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1500).optional(),
});

export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const sickbayCreateSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().trim().min(1).max(150),
  sickness: z.string().trim().min(1).max(200),
  diagnosis: z.string().trim().max(500).optional(),
  medication: z.string().trim().max(500).optional().default(""),
  actionTaken: z.string().trim().max(500).optional(),
  status: z.enum(["sick", "sent-home", "back-in-class", "monitored"]).default("sick"),
  date: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
  notifyParent: z.boolean().default(true),
});
