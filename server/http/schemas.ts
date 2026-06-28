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
