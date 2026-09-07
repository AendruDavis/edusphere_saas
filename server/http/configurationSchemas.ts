import { z } from "zod";
import { SCHOOL_ROLES } from "../../shared/permissions";
import { REPORT_TEMPLATE_PRESETS } from "../../shared/reportSettings";

export const schoolRoleSchema = z.enum(SCHOOL_ROLES);

export const reportSettingsSchema = z.object({
  preset: z.enum(REPORT_TEMPLATE_PRESETS),
  title: z.string().trim().min(3).max(120),
  showLogo: z.boolean(),
  showStudentPhoto: z.boolean(),
  showPosition: z.boolean(),
  showAttendance: z.boolean(),
  showFees: z.boolean(),
  showHealth: z.boolean(),
  showLibrary: z.boolean(),
  classTeacherLabel: z.string().trim().min(2).max(60),
  headTeacherLabel: z.string().trim().min(2).max(60),
});

export const logoVariantsSchema = z.object({
  original: z.string().trim().max(500).optional(),
  wide: z.string().trim().max(500).optional(),
  square: z.string().trim().max(500).optional(),
  favicon: z.string().trim().max(500).optional(),
});

export const gradeBandSchema = z.object({
  min: z.coerce.number().min(0).max(100),
  grade: z.string().trim().min(1).max(20),
  comment: z.string().trim().max(120),
});

export const schoolSettingsSchema = z.object({
  name: z.string().trim().min(2).max(150),
  logo: z.string().trim().max(500).nullable(),
  logoVariants: logoVariantsSchema.optional(),
  level: z.enum(["Primary", "Secondary"]),
  classes: z.array(z.string().trim().min(1).max(60)).max(100),
  currency: z.string().trim().min(1).max(10),
  academicYear: z.string().trim().min(1).max(30),
  currentTerm: z.string().trim().min(1).max(50),
  address: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
  email: z.string().trim().email().max(150).optional().or(z.literal("")).default(""),
  classFees: z.record(z.string(), z.coerce.number().min(0).max(1_000_000_000)).optional().default({}),
  gradingScale: z.array(gradeBandSchema).max(30).optional().default([]),
  motto: z.string().trim().max(200).optional().default(""),
  deoCode: z.string().trim().max(80).optional().default(""),
  tin: z.string().trim().max(80).optional().default(""),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#0066CC"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#009900"),
  bankName: z.string().trim().max(120).optional().default(""),
  bankAccount: z.string().trim().max(120).optional().default(""),
  payCode: z.string().trim().max(80).optional().default(""),
  reportFooter: z.string().trim().max(300).optional().default(""),
  stampWarning: z.string().trim().max(200).optional().default(""),
  assessmentModel: z.enum(["competency_3", "percentage_100"]).optional().default("percentage_100"),
  reportSettings: reportSettingsSchema,
});

export const accountCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  roles: z.array(schoolRoleSchema).min(1).max(SCHOOL_ROLES.length),
  photo: z.string().trim().max(500).nullable().optional(),
  dept: z.string().trim().max(100).optional(),
  confirmPassword: z.string().min(1).max(128).optional(),
});

export const accountProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(150).optional(),
  photo: z.string().trim().max(500).nullable().optional(),
  dept: z.string().trim().max(100).optional(),
}).refine((input) => Object.keys(input).length > 0, { message: "At least one profile field is required" });

export const accountRolesSchema = z.object({
  roles: z.array(schoolRoleSchema).min(1).max(SCHOOL_ROLES.length),
  confirmPassword: z.string().min(1).max(128).optional(),
});

export const passwordResetSchema = z.object({
  confirmPassword: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(1).max(128),
}).refine((input) => input.newPassword === input.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const subjectFieldsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(1).max(20).optional().or(z.literal("")),
  schoolType: z.enum(["Primary", "Secondary"]).nullable().optional(),
  classLevel: z.string().trim().max(80).nullable().optional(),
  active: z.boolean().optional(),
});

export const subjectCreateSchema = subjectFieldsSchema;
export const subjectUpdateSchema = subjectFieldsSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one subject field is required" },
);

export const feeItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.coerce.number().nonnegative().max(1_000_000_000),
});

export const feeStructureCreateSchema = z.object({
  className: z.string().trim().min(1).max(60),
  term: z.string().trim().min(1).max(50),
  academicYear: z.string().trim().min(1).max(50),
  dueDate: z.string().date().nullable().optional(),
  items: z.array(feeItemSchema).min(1).max(100),
});

export const feeStructureUpdateSchema = feeStructureCreateSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one fee structure field is required" },
);

export const feeBalanceQuerySchema = z.object({
  className: z.string().trim().max(60).optional(),
  term: z.string().trim().max(50).optional(),
  year: z.string().trim().max(50).optional(),
});

export const feePaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000_000),
  term: z.string().trim().min(1).max(50),
  year: z.string().trim().min(1).max(50),
  method: z.string().trim().min(1).max(40).default("Cash"),
  receiptNo: z.string().trim().max(80).optional(),
  paidAt: z.union([z.string().date(), z.string().datetime()]).optional(),
  description: z.string().trim().max(500).optional(),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountProfileInput = z.infer<typeof accountProfileSchema>;
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;
export type FeeStructureCreateInput = z.infer<typeof feeStructureCreateSchema>;
export type FeeStructureUpdateInput = z.infer<typeof feeStructureUpdateSchema>;
