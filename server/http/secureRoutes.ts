import type { Express } from "express";
import { z } from "zod";
import {
  MODULE_PERMISSIONS,
  rolesCan,
  type AppModule,
  type PermissionAction,
  type SchoolRole,
} from "../../shared/permissions";
import { AccessControlService } from "../application/accessControlService";
import { AppService } from "../application/appService";
import { AuditService } from "../application/auditService";
import { BrandingService } from "../application/brandingService";
import { ConfigurationService } from "../application/configurationService";
import { FinanceService } from "../application/financeService";
import { getResourceConfig, type ResourceKey } from "../application/resourceRegistry";
import { ReportingService } from "../application/reportingService";
import { SnapshotService } from "../application/snapshotService";
import { SubjectService } from "../application/subjectService";
import { AppError } from "../domain/errors";
import { AuthService } from "../infrastructure/authService";
import { query, withTransaction } from "../infrastructure/database";
import { StorageService } from "../infrastructure/storageService";
import { asyncHandler, requireAuth, requirePlatformRole, requireRole, requireTenant } from "./middleware";
import {
  accountCreateSchema,
  accountProfileSchema,
  accountRolesSchema,
  changePasswordSchema,
  feeBalanceQuerySchema,
  feePaymentSchema,
  feeStructureCreateSchema,
  feeStructureUpdateSchema,
  passwordResetSchema,
  reportSettingsSchema as configurationReportSettingsSchema,
  schoolSettingsSchema as configurationSchoolSettingsSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
} from "./configurationSchemas";

const loginSchema = z.object({
  email: z.string().trim().email(),
  pass: z.string().min(1).max(128),
  schoolSlug: z.string().trim().min(2).max(100).optional(),
});
const reportPeriodSchema = z.object({
  term: z.string().trim().min(1).max(50),
  year: z.string().trim().min(1).max(50),
});
const reportCommentsSchema = reportPeriodSchema.extend({
  classTeacherComment: z.string().max(2000).optional(),
  headTeacherComment: z.string().max(2000).optional(),
  projectWork: z.string().max(100).optional(),
  result: z.string().max(100).optional(),
});
const reportRevisionSchema = reportCommentsSchema.extend({
  reason: z.string().trim().min(10).max(500),
});
const dataUrlSchema = z.object({ dataUrl: z.string().startsWith("data:").max(5_000_000) });
const resourcePayloadSchema = z.record(z.string(), z.unknown());
const linkSchema = z.object({ userId: z.string().uuid(), recordId: z.string().uuid() });
const supportSessionSchema = z.object({
  schoolId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
  durationMinutes: z.number().int().min(5).max(60).optional(),
});
const teacherAssignmentSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid(),
  streamId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  isClassTeacher: z.boolean().default(false),
}).refine((value) => Boolean(value.subjectId || value.isClassTeacher), {
  message: "A teacher scope requires a subject or class-teacher responsibility",
});
const teacherAssignmentsSchema = z.object({
  assignments: z.array(teacherAssignmentSchema).max(100),
});

export function registerSecureRoutes(app: Express) {
  const authService = new AuthService();
  const appService = new AppService(undefined, authService);
  const reportingService = new ReportingService();
  const snapshotService = new SnapshotService();
  const brandingService = new BrandingService();
  const storageService = new StorageService();
  const accessControl = new AccessControlService();
  const auditService = new AuditService();
  const configurationService = new ConfigurationService();
  const financeService = new FinanceService(accessControl);
  const subjectService = new SubjectService();

  app.get("/api/public/schools/:slug/branding", asyncHandler(async (req, res) => {
    const branding = await brandingService.getPublicBranding(req.params.slug);
    const etag = `W/"${branding.schoolId}-${branding.brandingVersion}"`;
    res.set("Cache-Control", "public, max-age=0, must-revalidate");
    res.set("ETag", etag);
    if (req.header("if-none-match") === etag) {
      res.status(304).end();
      return;
    }
    res.json(branding);
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    res.set("Cache-Control", "no-store");
    res.json(await authService.signIn(input.email, input.pass, input.schoolSlug));
  }));

  app.post("/api/auth/change-password", requireAuth(authService), asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    res.set("Cache-Control", "no-store");
    res.json(await authService.changePassword(req.currentUser!.id, input.currentPassword, input.newPassword));
  }));

  app.get("/api/auth/me", requireAuth(authService), asyncHandler(async (req, res) => {
    res.json({ user: req.currentUser, schools: await authService.listSchoolMemberships(req.currentUser!.id) });
  }));

  app.get("/api/me/schools", requireAuth(authService), asyncHandler(async (req, res) => {
    res.json(await authService.listSchoolMemberships(req.currentUser!.id));
  }));

  app.get("/api/me/context", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    res.json(effectiveAccessContext(req.currentUser!, req.tenant!));
  }));

  app.get("/api/permissions", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    res.json(effectiveAccessContext(req.currentUser!, req.tenant!).permissions);
  }));

  app.get("/api/app/snapshot", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    res.json(await snapshotService.getSnapshot(req.currentUser!, req.tenant!));
  }));

  app.get("/api/reports/students/:studentId/progressive", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    const input = reportPeriodSchema.parse(req.query);
    res.json(await reportingService.buildProgressiveReport(req.currentUser!, req.tenant!, {
      studentId: z.string().uuid().parse(req.params.studentId), termName: input.term, yearName: input.year,
    }));
  }));

  app.get("/api/reports/card/:studentId/:term", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    const year = z.string().trim().min(1).max(50).parse(req.query.year);
    res.json(await reportingService.buildProgressiveReport(req.currentUser!, req.tenant!, {
      studentId: z.string().uuid().parse(req.params.studentId), termName: req.params.term, yearName: year,
    }));
  }));

  app.put("/api/reports/students/:studentId/comments", requireAuth(authService), requireTenant(authService), requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
    const input = reportCommentsSchema.parse(req.body);
    res.json(await reportingService.saveComments(req.currentUser!, req.tenant!, {
      studentId: z.string().uuid().parse(req.params.studentId), termName: input.term, yearName: input.year,
    }, input));
  }));

  app.post("/api/reports/students/:studentId/finalize", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = reportPeriodSchema.parse(req.body);
    res.json(await reportingService.finalize(req.currentUser!, req.tenant!, {
      studentId: z.string().uuid().parse(req.params.studentId), termName: input.term, yearName: input.year,
    }));
  }));

  app.post("/api/reports/students/:studentId/revise", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = reportRevisionSchema.parse(req.body);
    res.json(await reportingService.revise(req.currentUser!, req.tenant!, {
      studentId: z.string().uuid().parse(req.params.studentId), termName: input.term, yearName: input.year,
    }, input.reason, input));
  }));

  app.get("/api/students/:studentId/status-summary", requireAuth(authService), requireTenant(authService), asyncHandler(async (req, res) => {
    const input = reportPeriodSchema.parse(req.query);
    res.json(await reportingService.getStudentStatus(
      req.currentUser!, req.tenant!, z.string().uuid().parse(req.params.studentId), input.term, input.year,
    ));
  }));

  app.put("/api/settings/school", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = configurationSchoolSettingsSchema.parse(req.body);
    res.json(await configurationService.saveSchoolSettings(req.currentUser!, req.tenant!, input));
  }));

  app.put("/api/settings/reports", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const saved = await configurationService.saveReportSettings(
      req.currentUser!, req.tenant!, configurationReportSettingsSchema.parse(req.body),
    );
    res.json(saved.reportSettings);
  }));

  app.post("/api/storage/logo", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = dataUrlSchema.parse(req.body);
    const uploaded = await storageService.uploadSchoolLogo(input.dataUrl, req.tenant!.schoolId);
    res.set("Cache-Control", "no-store");
    res.status(201).json(uploaded);
  }));

  app.post("/api/storage/data-url", requireAuth(authService), requireTenant(authService), requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
    const input = z.object({ dataUrl: dataUrlSchema.shape.dataUrl, folder: z.string().trim().max(80).optional(), fileName: z.string().trim().max(120).optional() }).parse(req.body);
    res.status(201).json(await storageService.uploadDataUrl(input));
  }));

  app.post("/api/users", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = accountCreateSchema.parse(req.body);
    res.set("Cache-Control", "no-store");
    res.status(201).json(await authService.createUser(input, req.tenant!.schoolId, req.currentUser!.id));
  }));

  app.patch("/api/users/:id", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await authService.updateUser(id, accountProfileSchema.parse(req.body), req.tenant!.schoolId, req.currentUser!.id));
  }));

  app.put("/api/users/:id/roles", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = accountRolesSchema.parse(req.body);
    res.json(await authService.replaceSchoolRoles(id, input.roles, req.tenant!.schoolId, req.currentUser!.id, input.confirmPassword));
  }));

  app.post("/api/users/:id/reset-password", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = passwordResetSchema.parse(req.body);
    res.set("Cache-Control", "no-store");
    res.json(await authService.resetPassword(id, req.tenant!.schoolId, req.currentUser!.id, input.confirmPassword));
  }));

  app.delete("/api/users/:id", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const input = z.object({ confirmPassword: z.string().min(1).max(128).optional() }).parse(req.body ?? {});
    res.json(await authService.removeUserFromSchool(
      z.string().uuid().parse(req.params.id), req.tenant!.schoolId, req.currentUser!.id, input.confirmPassword,
    ));
  }));

  app.get("/api/subjects", requireAuth(authService), requireTenant(authService), requireRole("admin", "teacher", "student", "parent"), asyncHandler(async (req, res) => {
    res.json(await subjectService.list(req.tenant!));
  }));

  app.post("/api/subjects", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    res.status(201).json(await subjectService.create(req.currentUser!, req.tenant!, subjectCreateSchema.parse(req.body)));
  }));

  app.put("/api/subjects/:id", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    res.json(await subjectService.update(
      req.currentUser!, req.tenant!, z.string().uuid().parse(req.params.id), subjectUpdateSchema.parse(req.body),
    ));
  }));

  app.delete("/api/subjects/:id", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    res.json(await subjectService.deactivate(req.currentUser!, req.tenant!, z.string().uuid().parse(req.params.id)));
  }));

  app.get("/api/fee-structures", requireAuth(authService), requireTenant(authService), requireRole("admin", "accountant", "parent", "student"), asyncHandler(async (req, res) => {
    res.json(await financeService.listFeeStructures(req.tenant!, req.query.includeInactive === "true" && req.tenant!.roles.includes("admin")));
  }));

  app.post("/api/fee-structures", requireAuth(authService), requireTenant(authService), requireRole("admin", "accountant"), asyncHandler(async (req, res) => {
    res.status(201).json(await financeService.createFeeStructure(
      req.currentUser!, req.tenant!, feeStructureCreateSchema.parse(req.body),
    ));
  }));

  app.put("/api/fee-structures/:id", requireAuth(authService), requireTenant(authService), requireRole("admin", "accountant"), asyncHandler(async (req, res) => {
    res.json(await financeService.updateFeeStructure(
      req.currentUser!, req.tenant!, z.string().uuid().parse(req.params.id), feeStructureUpdateSchema.parse(req.body),
    ));
  }));

  app.delete("/api/fee-structures/:id", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    res.json(await financeService.deactivateFeeStructure(
      req.currentUser!, req.tenant!, z.string().uuid().parse(req.params.id),
    ));
  }));

  app.get("/api/fees/balances", requireAuth(authService), requireTenant(authService), requireRole("admin", "accountant", "parent", "student"), asyncHandler(async (req, res) => {
    res.json(await financeService.listBalances(req.currentUser!, req.tenant!, feeBalanceQuerySchema.parse(req.query)));
  }));

  app.post("/api/fees/pay", requireAuth(authService), requireTenant(authService), requireRole("admin", "accountant"), asyncHandler(async (req, res) => {
    res.status(201).json(await financeService.recordFeePayment(req.currentUser!, req.tenant!, feePaymentSchema.parse(req.body)));
  }));

  for (const kind of ["parent", "student", "staff"] as const) {
    app.put(`/api/access/links/${kind}`, requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
      const input = linkSchema.parse(req.body);
      res.json(await authService.linkUserRecord(req.currentUser!, req.tenant!.schoolId, kind, input.recordId, input.userId));
    }));
  }

  app.put("/api/access/teachers/:userId/assignments", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);
    const input = teacherAssignmentsSchema.parse(req.body);
    await replaceTeacherAssignments(req.tenant!.schoolId, req.currentUser!.id, userId, input.assignments);
    res.json({ success: true, assignmentCount: input.assignments.length });
  }));

  app.get("/api/access/readiness", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    res.json(await accessReadiness(req.tenant!.schoolId));
  }));

  app.put("/api/access/enforcement", requireAuth(authService), requireTenant(authService), requireRole("admin"), asyncHandler(async (req, res) => {
    z.object({ mode: z.literal("enforce") }).parse(req.body);
    const readiness = await accessReadiness(req.tenant!.schoolId);
    if (readiness.totalUnresolved > 0) throw new AppError(409, "Resolve account links and teacher assignments before enforcing scopes");
    await query(`update schools set "authorizationMode" = 'enforce', "updatedAt" = now() where id = $1`, [req.tenant!.schoolId]);
    await auditService.record(req.currentUser!, req.tenant!, {
      action: "authorization.enforced", entity: "schools", entityId: req.tenant!.schoolId,
      riskLevel: "restricted", summary: "Enabled record-level authorization enforcement",
    });
    res.json({ mode: "enforce" });
  }));

  app.post("/api/platform/support-sessions", requireAuth(authService), requirePlatformRole("super_admin"), asyncHandler(async (req, res) => {
    res.status(201).json(await authService.createSupportSession(req.currentUser!, supportSessionSchema.parse(req.body)));
  }));

  app.put("/api/platform/schools/:schoolId/authorization-mode", requireAuth(authService), requirePlatformRole("super_admin"), asyncHandler(async (req, res) => {
    const schoolId = z.string().uuid().parse(req.params.schoolId);
    const { mode } = z.object({ mode: z.enum(["audit", "enforce"]) }).parse(req.body);
    const result = await query(`update schools set "authorizationMode" = $2, "updatedAt" = now() where id = $1 returning id, "authorizationMode"`, [schoolId, mode]);
    if (!result.rows[0]) throw new AppError(404, "School not found");
    res.json(result.rows[0]);
  }));

  registerSecureResourceRoutes(app, authService, appService, accessControl);
}

function effectiveAccessContext(user: NonNullable<Express.Request["currentUser"]>, tenant: NonNullable<Express.Request["tenant"]>) {
  const permissions = Object.fromEntries((Object.keys(MODULE_PERMISSIONS) as AppModule[]).map((module) => [
    module,
    Object.fromEntries((["read", "create", "update", "delete"] as PermissionAction[]).map((action) => [action, rolesCan(tenant.roles, module, action)])),
  ]));
  return {
    user: { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole },
    activeSchool: { schoolId: tenant.schoolId, roles: tenant.roles, role: tenant.role, authorizationMode: tenant.authorizationMode },
    supportAccess: tenant.supportAccess,
    permissions,
  };
}

function registerSecureResourceRoutes(app: Express, authService: AuthService, appService: AppService, accessControl: AccessControlService) {
  const handle = (action: "create" | "update" | "delete") => asyncHandler(async (req, res) => {
    const config = getResourceConfig(req.params.resource);
    if (!config || config.key === "users" || config.key === "feeStructures" || config.key === "subjects") throw new AppError(404, "Unknown resource");
    if (!rolesCan(req.tenant!.roles, config.module, action)) throw new AppError(403, "You do not have permission to perform this action");
    const payload = action === "delete" ? {} : resourcePayloadSchema.parse(req.body);
    const role = req.tenant!.roles.find((candidate) => config[action].includes(candidate));
    if (!role) throw new AppError(403, "You do not have permission to perform this action");
    const tenant = { ...req.tenant!, role };
    await assertResourceScope(accessControl, req.currentUser!, tenant, config.key, action, req.params.id, payload);
    if (action === "create") {
      res.status(201).json(await appService.createResource(req.currentUser!, tenant, config.key, payload));
    } else if (action === "update") {
      res.json(await appService.updateResource(req.currentUser!, tenant, config.key, z.string().uuid().parse(req.params.id), payload));
    } else {
      res.json(await appService.deleteResource(req.currentUser!, tenant, config.key, z.string().uuid().parse(req.params.id)));
    }
  });

  app.post("/api/resources/:resource", requireAuth(authService), requireTenant(authService), handle("create"));
  app.patch("/api/resources/:resource/:id", requireAuth(authService), requireTenant(authService), handle("update"));
  app.delete("/api/resources/:resource/:id", requireAuth(authService), requireTenant(authService), handle("delete"));
}

async function assertResourceScope(
  accessControl: AccessControlService,
  user: NonNullable<Express.Request["currentUser"]>,
  tenant: NonNullable<Express.Request["tenant"]>,
  resource: ResourceKey,
  action: "create" | "update" | "delete",
  id: string | undefined,
  payload: Record<string, unknown>,
) {
  if (tenant.roles.includes("admin") || action === "delete") return;
  if (resource !== "marks" && resource !== "attendanceRecords") return;
  let record = payload;
  if (id) {
    const table = resource === "marks" ? "marks" : "attendance_records";
    const existing = await query(`select * from ${table} where id = $1 and "schoolId" = $2`, [id, tenant.schoolId]);
    if (!existing.rows[0]) throw new AppError(404, "Record not found");
    record = { ...existing.rows[0], ...payload };
  }
  const studentId = String(record.studentId ?? record.studentRefId ?? "");
  if (!studentId) throw new AppError(400, "studentId is required");
  await accessControl.assertStudentAccess(user, tenant, studentId, resource === "marks" ? "grades" : "attendance", {
    subject: typeof record.subject === "string" ? record.subject : undefined,
    yearName: typeof record.year === "string" ? record.year : undefined,
  });
}

async function replaceTeacherAssignments(
  schoolId: string,
  actorId: string,
  userId: string,
  assignments: z.infer<typeof teacherAssignmentsSchema>["assignments"],
) {
  await withTransaction(async (client) => {
    const teacher = await client.query(
      `select 1 from school_memberships sm
       join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'teacher'
       where sm."schoolId" = $1 and sm."userId" = $2 and sm.active = true`,
      [schoolId, userId],
    );
    if (!teacher.rows[0]) throw new AppError(400, "The selected user does not have the teacher role");
    await client.query(`delete from teacher_assignments where "schoolId" = $1 and "userId" = $2`, [schoolId, userId]);
    for (const assignment of assignments) {
      const inserted = await client.query(
        `insert into teacher_assignments (
           "schoolId", "userId", "academicYearId", "classId", "streamId", "subjectId", "isClassTeacher", "assignedBy"
         )
         select $1, $2, ay.id, sc.id, cs.id, sub.id, $7, $8
         from academic_years ay
         join school_classes sc on sc.id = $4 and sc."schoolId" = $1
         left join class_streams cs on cs.id = $5 and cs."schoolId" = $1 and cs."classId" = sc.id
         left join subjects sub on sub.id = $6 and sub."schoolId" = $1
         where ay.id = $3 and ay."schoolId" = $1
           and ($5::uuid is null or cs.id is not null) and ($6::uuid is null or sub.id is not null)
         returning id`,
        [schoolId, userId, assignment.academicYearId, assignment.classId, assignment.streamId ?? null, assignment.subjectId ?? null, assignment.isClassTeacher, actorId],
      );
      if (!inserted.rows[0]) throw new AppError(400, "A teacher assignment references another school or an invalid record");
    }
    await client.query(
      `insert into audit_logs ("schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata)
       values ($1, $2, 'teacher.assignments_updated', 'teacher_assignments', $3, 'restricted', $4, $5::jsonb)`,
      [schoolId, actorId, userId, "Updated teacher academic scope", JSON.stringify({ assignmentCount: assignments.length })],
    );
  });
}

async function accessReadiness(schoolId: string) {
  const result = await query<{ unlinkedParents: string; unlinkedStudents: string; unassignedTeachers: string }>(
    `select
       (select count(distinct sm."userId") from school_memberships sm
        join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'parent'
        left join parent_user_links pul on pul."schoolId" = sm."schoolId" and pul."userId" = sm."userId" and pul.active = true
        where sm."schoolId" = $1 and sm.active = true and pul.id is null)::text as "unlinkedParents",
       (select count(distinct sm."userId") from school_memberships sm
        join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'student'
        left join student_user_links sul on sul."schoolId" = sm."schoolId" and sul."userId" = sm."userId" and sul.active = true
        where sm."schoolId" = $1 and sm.active = true and sul.id is null)::text as "unlinkedStudents",
       (select count(distinct sm."userId") from school_memberships sm
        join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'teacher'
        left join teacher_assignments ta on ta."schoolId" = sm."schoolId" and ta."userId" = sm."userId" and ta.active = true
        where sm."schoolId" = $1 and sm.active = true and ta.id is null)::text as "unassignedTeachers"`,
    [schoolId],
  );
  const counts = result.rows[0] ?? { unlinkedParents: "0", unlinkedStudents: "0", unassignedTeachers: "0" };
  const readiness = {
    unlinkedParents: Number(counts.unlinkedParents),
    unlinkedStudents: Number(counts.unlinkedStudents),
    unassignedTeachers: Number(counts.unassignedTeachers),
  };
  return { ...readiness, totalUnresolved: readiness.unlinkedParents + readiness.unlinkedStudents + readiness.unassignedTeachers };
}
