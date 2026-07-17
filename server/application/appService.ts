import { getResourceConfig, SNAPSHOT_RESOURCES, type ResourceKey } from "./resourceRegistry";
import { AppError, assertFound } from "../domain/errors";
import { canAccessRole, canManageRole, type AuthUser, type UserRole } from "../domain/roles";
import { PostgresRepository, type RecordData } from "../infrastructure/postgresRepository";
import { AuthService } from "../infrastructure/authService";
import { query, withTransaction } from "../infrastructure/database";
import type { TenantContext } from "../domain/tenancy";
import { AssessmentService } from "./assessmentService";
import { LibraryService } from "./libraryService";
import { NotificationService } from "./notificationService";
import { AuditService } from "./auditService";
import { StaffService } from "./staffService";

const DEFAULT_SETTINGS = {
  name: "EduSphere Academy",
  logo: null,
  level: "Primary",
  classes: ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"],
  currency: "UGX",
  academicYear: "2026/2027",
  classFees: {},
  gradingScale: [
    { min: 80, grade: "D1", comment: "Distinction 1" },
    { min: 75, grade: "D2", comment: "Distinction 2" },
    { min: 70, grade: "C3", comment: "Credit 3" },
    { min: 65, grade: "C4", comment: "Credit 4" },
    { min: 60, grade: "C5", comment: "Credit 5" },
    { min: 55, grade: "C6", comment: "Pass" },
    { min: 0, grade: "F9", comment: "Fail" },
  ],
};

const optionalRelationFields: Partial<Record<ResourceKey, string[]>> = {
  transactions: ["studentId"],
  attendanceRecords: ["studentId"],
  leaveRequests: ["staffId"],
  vehicles: ["driverId"],
  routes: ["vehicleId"],
  timetableEntries: ["teacherId"],
};

type CreateUserPayload = Parameters<AuthService["createUser"]>[0];
type UpdateUserPayload = Parameters<AuthService["updateUser"]>[1];
type MarkAction = "create" | "update" | "lock" | "unlock" | "delete";

function requireRoles(user: AuthUser, roles: UserRole[]) {
  if (!canAccessRole(user, roles)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }
}

function tenantUser(user: AuthUser, tenant: TenantContext): AuthUser {
  return { ...user, role: tenant.role };
}

function normalizePayload(resource: ResourceKey, payload: RecordData) {
  const next = { ...payload };
  for (const field of optionalRelationFields[resource] ?? []) {
    if (next[field] === "") next[field] = null;
  }
  return next;
}

function applyMarkMetadata(payload: RecordData, existing?: RecordData | null, user?: AuthUser) {
  const next: RecordData = { ...payload };
  delete next.date;

  if (next.locked === true && existing?.locked !== true) {
    next.lockedAt = new Date().toISOString();
    next.lockedBy = user?.id ?? null;
    next.submittedAt = next.submittedAt ?? new Date().toISOString();
    next.submittedBy = next.submittedBy ?? user?.id ?? null;
  }

  if (next.locked === false) {
    next.lockedAt = null;
    next.lockedBy = null;
  }

  return next;
}

export class AppService {
  constructor(
    private readonly repository = new PostgresRepository(),
    private readonly authService = new AuthService(),
    private readonly assessmentService = new AssessmentService(),
    private readonly libraryService = new LibraryService(),
    private readonly notificationService = new NotificationService(),
    private readonly auditService = new AuditService(),
    private readonly staffService = new StaffService(auditService, notificationService),
  ) {}

  async getSnapshot(user: AuthUser, tenant: TenantContext) {
    const actor = tenantUser(user, tenant);
    const entries = await Promise.all(
      SNAPSHOT_RESOURCES.map(async (resource) => {
        const config = getResourceConfig(resource);
        if (!canAccessRole(actor, config.read)) {
          return [resource, []] as const;
        }
        if (resource === "users") {
          return [resource, await this.repository.listUsers(tenant.schoolId)] as const;
        }
        return [resource, await this.repository.list(config.table, tenant.schoolId)] as const;
      }),
    );

    const settings = await this.repository.getSettings(tenant.schoolId);
    const snapshot = Object.fromEntries(entries);

    return {
      schoolSettings: settings ?? DEFAULT_SETTINGS,
      ...snapshot,
      notifications: (snapshot.notifications as RecordData[]).filter(
        (notification) => notification.userId === user.id || notification.userId === "all" || notification.targetRole === actor.role,
      ),
    };
  }

  async saveSettings(user: AuthUser, tenant: TenantContext, settings: RecordData) {
    requireRoles(tenantUser(user, tenant), ["admin"]);
    const saved = await this.repository.upsertSettings(settings, tenant.schoolId);
    const model = settings.assessmentModel;
    if (model === "competency_3" || model === "percentage_100") {
      const maxAssessmentScore = model === "competency_3" ? 3 : 100;
      await withTransaction(async (client) => {
        const active = await client.query<{ model: string }>(
          `select model from grading_policies
           where "schoolId" = $1 and active = true
           order by version desc limit 1`,
          [tenant.schoolId],
        );
        if (active.rows[0]?.model === model) {
          await client.query(
            `update grading_policies set "gradeBands" = $2::jsonb, "updatedAt" = now()
             where "schoolId" = $1 and active = true`,
            [tenant.schoolId, JSON.stringify(settings.gradingScale ?? [])],
          );
          return;
        }
        await client.query(`update grading_policies set active = false, "updatedAt" = now() where "schoolId" = $1 and active = true`, [tenant.schoolId]);
        await client.query(
          `insert into grading_policies (
             "schoolId", name, version, model, "maxAssessmentScore",
             "courseworkWeight", "examWeight", "gradeBands", active
           )
           select $1, $2, coalesce(max(version), 0) + 1, $3, $4, 20, 80, $5::jsonb, true
           from grading_policies where "schoolId" = $1`,
          [
            tenant.schoolId,
            model === "competency_3" ? "Competency Policy" : "Percentage Policy",
            model,
            maxAssessmentScore,
            JSON.stringify(settings.gradingScale ?? []),
          ],
        );
      });
    }
    return saved;
  }

  async createResource(user: AuthUser, tenant: TenantContext, resource: ResourceKey, payload: RecordData) {
    const actor = tenantUser(user, tenant);
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(actor, config.create);
    const normalizedPayload = normalizePayload(resource, payload);

    if (resource === "users") {
      const role = normalizedPayload.role as UserRole | undefined;
      if (role && !canManageRole(actor.role, role, "create")) {
        throw new AppError(403, "You cannot create a user with that role");
      }
      return this.authService.createUser(normalizedPayload as CreateUserPayload, tenant.schoolId);
    }

    if (resource === "transactions") {
      return this.recordTransaction(actor, tenant, normalizedPayload);
    }

    if (resource === "marks") {
      return this.createMark(actor, tenant, normalizedPayload);
    }

    if (resource === "borrowings") {
      return this.libraryService.issueBook(tenant, normalizedPayload);
    }

    if (resource === "healthRecords") {
      const visitAt = String(normalizedPayload.visitAt ?? new Date().toISOString());
      const record = await this.repository.create(config.table, {
        ...normalizedPayload,
        diagnosis: normalizedPayload.diagnosis ?? normalizedPayload.sickness,
        actionTaken: normalizedPayload.actionTaken ?? normalizedPayload.notes,
        visitAt,
        nurseId: actor.id,
      }, tenant.schoolId);
      if (normalizedPayload.notifyParent !== false) {
        await this.notificationService.queueSickbayAlert(
          tenant,
          String(normalizedPayload.studentId),
          String(normalizedPayload.diagnosis ?? normalizedPayload.sickness ?? "medical attention"),
          visitAt,
        );
      }
      await this.auditService.record(actor, tenant, {
        action: "sickbay.record_created",
        entity: "health_records",
        entityId: String(record.id),
        riskLevel: "restricted",
        summary: "Created student health record",
        metadata: { studentId: normalizedPayload.studentId, notifyParent: normalizedPayload.notifyParent !== false },
      });
      return record;
    }

    if (resource === "expenses") {
      return this.recordExpense(actor, tenant, normalizedPayload);
    }

    if (resource === "dormRooms") {
      const room = await this.repository.create(config.table, { ...normalizedPayload, occupants: normalizedPayload.occupants ?? [] }, tenant.schoolId);
      await this.appendToJsonArray("dormitories", String(normalizedPayload.dormId), "rooms", String(room.id), tenant.schoolId);
      return room;
    }

    if (resource === "dormAllocations") {
      const allocation = await this.repository.create(config.table, normalizedPayload, tenant.schoolId);
      await this.appendToJsonArray("dorm_rooms", String(normalizedPayload.roomId), "occupants", String(normalizedPayload.studentId), tenant.schoolId);
      return allocation;
    }

    return this.repository.create(config.table, normalizedPayload, tenant.schoolId);
  }

  async updateResource(user: AuthUser, tenant: TenantContext, resource: ResourceKey, id: string, payload: RecordData) {
    const actor = tenantUser(user, tenant);
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(actor, config.update);
    const normalizedPayload = normalizePayload(resource, payload);

    if (resource === "users") {
      const role = normalizedPayload.role as UserRole | undefined;
      if (role && !canManageRole(actor.role, role, "update")) {
        throw new AppError(403, "You cannot assign that role");
      }
      return this.authService.updateUser(id, normalizedPayload as UpdateUserPayload, tenant.schoolId);
    }

    if (resource === "marks") {
      return this.updateMark(actor, tenant, id, normalizedPayload);
    }

    if (resource === "borrowings") {
      return this.libraryService.updateLoan(tenant, id, normalizedPayload);
    }

    if (resource === "leaveRequests" && (normalizedPayload.status === "approved" || normalizedPayload.status === "rejected")) {
      return this.staffService.reviewLeave(actor, tenant, id, normalizedPayload.status as "approved" | "rejected");
    }

    if (resource === "dormAllocations" && normalizedPayload.status === "checked-out") {
      const existing = await this.repository.getById(config.table, id, tenant.schoolId);
      const updated = await this.repository.update(config.table, id, normalizedPayload, tenant.schoolId);
      if (existing) {
        await this.removeFromJsonArray("dorm_rooms", String(existing.roomId), "occupants", String(existing.studentId), tenant.schoolId);
      }
      return updated;
    }

    return this.repository.update(config.table, id, normalizedPayload, tenant.schoolId);
  }

  async deleteResource(user: AuthUser, tenant: TenantContext, resource: ResourceKey, id: string) {
    const actor = tenantUser(user, tenant);
    const config = assertFound(getResourceConfig(resource), "Unknown resource");
    requireRoles(actor, config.delete);

    if (resource === "users") {
      const target = await query<{ role: UserRole }>(
        `select role from school_memberships where "schoolId" = $1 and "userId" = $2 and active = true limit 1`,
        [tenant.schoolId, id],
      );
      const targetRole = target.rows[0]?.role;
      if (targetRole && !canManageRole(actor.role, targetRole, "delete")) {
        throw new AppError(403, "You cannot remove that user role");
      }
      return this.authService.removeUserFromSchool(id, tenant.schoolId);
    }

    if (resource === "marks") {
      return this.deleteMark(actor, tenant, id);
    }

    if (resource === "dormRooms") {
      const room = await this.repository.getById(config.table, id, tenant.schoolId);
      if (room) {
        await this.removeFromJsonArray("dormitories", String(room.dormId), "rooms", id, tenant.schoolId);
      }
    }

    return this.repository.delete(config.table, id, tenant.schoolId);
  }

  async recordTransaction(user: AuthUser, tenant: TenantContext, payload: RecordData) {
    requireRoles(tenantUser(user, tenant), ["admin", "accountant"]);
    return this.repository.call("record_transaction", { transaction_input: { ...payload, schoolId: tenant.schoolId } });
  }

  async recordExpense(user: AuthUser, tenant: TenantContext, payload: RecordData) {
    requireRoles(tenantUser(user, tenant), ["admin", "accountant"]);
    return this.repository.call("record_expense", { expense_input: { ...payload, schoolId: tenant.schoolId } });
  }

  async recordAttendance(user: AuthUser, tenant: TenantContext, payload: RecordData) {
    requireRoles(tenantUser(user, tenant), ["admin", "teacher", "nurse"]);
    return this.repository.create("attendance_records", payload, tenant.schoolId);
  }

  async bulkSaveMarks(user: AuthUser, tenant: TenantContext, entries: RecordData[]) {
    const actor = tenantUser(user, tenant);
    requireRoles(actor, ["admin", "teacher"]);
    const saved = [];
    for (const entry of entries) {
      const existing = await this.findExistingMark(tenant, entry);
      if (existing) {
        saved.push(await this.updateMark(actor, tenant, String(existing.id), entry));
      } else {
        saved.push(await this.createMark(actor, tenant, entry));
      }
    }
    return { savedCount: saved.length, marks: saved };
  }

  private async createMark(user: AuthUser, tenant: TenantContext, payload: RecordData) {
    const calculated = await this.assessmentService.calculateMark(tenant, payload);
    const normalized = applyMarkMetadata(calculated, null, user);
    const mark = await this.repository.create("marks", normalized, tenant.schoolId);
    await this.auditMark("create", mark, null, mark, user, tenant.schoolId);
    return mark;
  }

  private async findExistingMark(tenant: TenantContext, payload: RecordData) {
    const result = await query(
      `select * from marks
       where "schoolId" = $1 and "studentId" = $2 and subject = $3 and term = $4 and year = $5
       limit 1`,
      [tenant.schoolId, payload.studentId, payload.subject, payload.term, payload.year],
    );
    return result.rows[0] ?? null;
  }

  private async updateMark(user: AuthUser, tenant: TenantContext, id: string, payload: RecordData) {
    const existing = assertFound(await this.repository.getById("marks", id, tenant.schoolId), "Mark not found");
    const isUnlock = payload.locked === false && existing.locked === true;
    if (existing.locked && user.role !== "admin" && !isUnlock) {
      throw new AppError(423, "This mark has been locked after submission");
    }
    if (isUnlock && user.role !== "admin") {
      throw new AppError(403, "Only administrators can unlock submitted marks");
    }

    const calculated = await this.assessmentService.calculateMark(tenant, payload, existing);
    const normalized = applyMarkMetadata(calculated, existing, user);
    const updated = await this.repository.update("marks", id, normalized, tenant.schoolId);
    const action = existing.locked !== true && updated.locked === true ? "lock" : existing.locked === true && updated.locked !== true ? "unlock" : "update";
    await this.auditMark(action, updated, existing, updated, user, tenant.schoolId);
    return updated;
  }

  private async deleteMark(user: AuthUser, tenant: TenantContext, id: string) {
    const existing = assertFound(await this.repository.getById("marks", id, tenant.schoolId), "Mark not found");
    if (existing.locked && user.role !== "admin") {
      throw new AppError(423, "This mark has been locked after submission");
    }
    await this.auditMark("delete", existing, existing, null, user, tenant.schoolId);
    return this.repository.delete("marks", id, tenant.schoolId);
  }

  private async auditMark(action: MarkAction, mark: RecordData, oldValue: RecordData | null, newValue: RecordData | null, user: AuthUser, schoolId: string) {
    await query(
      `insert into "mark_audit_logs" ("schoolId", "markId", "studentId", subject, term, year, action, "changedBy", "oldValue", "newValue")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
      [
        schoolId,
        mark.id,
        mark.studentId,
        mark.subject,
        mark.term,
        mark.year,
        action,
        user.id,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
      ],
    );
  }

  async recordBiometricCheckIn(secret: string | undefined, payload: RecordData) {
    if (!process.env.INTEGRATION_WEBHOOK_SECRET || secret !== process.env.INTEGRATION_WEBHOOK_SECRET) {
      throw new AppError(401, "Invalid integration secret");
    }

    const schoolId = String(payload.schoolId ?? "");
    const studentId = String(payload.studentId ?? payload.student_id ?? "");
    const deviceId = String(payload.deviceId ?? payload.device_id ?? "");
    const occurredAt = String(payload.occurredAt ?? payload.time ?? new Date().toISOString());
    const eventKey = String(payload.eventKey ?? payload.event_key ?? `${deviceId}:${studentId}:${occurredAt}`);
    if (!schoolId || !studentId || !deviceId) {
      throw new AppError(400, "schoolId, studentId and deviceId are required");
    }

    const result = await withTransaction(async (client) => {
      const studentResult = await client.query(
        `select id, name from students where id = $1 and "schoolId" = $2 limit 1`,
        [studentId, schoolId],
      );
      const student = assertFound(studentResult.rows[0], "Student not found");
      const eventResult = await client.query(
        `insert into biometric_events ("schoolId", "studentId", "deviceId", "eventKey", "occurredAt", payload)
         values ($1, $2, $3, $4, $5, $6::jsonb)
         on conflict ("schoolId", "eventKey") do nothing
         returning id`,
        [schoolId, studentId, deviceId, eventKey, occurredAt, JSON.stringify(payload)],
      );
      if (eventResult.rows.length === 0) return { duplicate: true, eventKey };

      const attendance = await client.query(
        `insert into attendance_records (
           "schoolId", "studentId", "studentRefId", "studentName", date, status, role,
           "biometricVerified", "deviceId", "checkInAt", source, "idempotencyKey"
         ) values ($1, $2, $2, $3, $4::timestamptz::date, 'present', 'Student', true, $5, $4, 'biometric', $6)
         on conflict ("schoolId", "idempotencyKey") where "idempotencyKey" is not null do nothing
         returning *`,
        [schoolId, studentId, student.name, occurredAt, deviceId, eventKey],
      );
      return attendance.rows[0] ?? { duplicate: true, eventKey };
    });

    if (!("duplicate" in result)) {
      await this.notificationService.queueAttendanceAlert(
        { schoolId, userId: "integration", role: "admin" },
        studentId,
        occurredAt,
      );
    }
    return result;
  }

  async updateGpsLocation(secret: string | undefined, payload: RecordData) {
    if (!process.env.INTEGRATION_WEBHOOK_SECRET || secret !== process.env.INTEGRATION_WEBHOOK_SECRET) {
      throw new AppError(401, "Invalid integration secret");
    }

    return this.repository.call("update_vehicle_location", { location_input: payload });
  }

  async getBusLocations(user: AuthUser, tenant: TenantContext) {
    const vehicles = await this.repository.list("vehicles", tenant.schoolId);
    return vehicles
      .filter((vehicle) => vehicle.lastLocation)
      .map((vehicle) => ({
        id: vehicle.id,
        ...(vehicle.lastLocation as RecordData),
        status: vehicle.status,
        label: `${vehicle.plateNumber || "Bus"} - ${vehicle.driverName || "Unassigned"}`,
      }));
  }

  private async appendToJsonArray(table: string, id: string, field: string, value: string, schoolId: string) {
    const record = await this.repository.getById(table, id, schoolId);
    if (!record) return;

    const current = Array.isArray(record[field]) ? (record[field] as string[]) : [];
    if (current.includes(value)) return;
    await this.repository.update(table, id, { [field]: [...current, value] }, schoolId);
  }

  private async removeFromJsonArray(table: string, id: string, field: string, value: string, schoolId: string) {
    const record = await this.repository.getById(table, id, schoolId);
    if (!record) return;

    const current = Array.isArray(record[field]) ? (record[field] as string[]) : [];
    await this.repository.update(table, id, { [field]: current.filter((item) => item !== value) }, schoolId);
  }
}
