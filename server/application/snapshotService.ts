import { rolesCan } from "../../shared/permissions";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";
import { PostgresRepository, type RecordData } from "../infrastructure/postgresRepository";
import { AccessControlService } from "./accessControlService";
import { getResourceConfig, SNAPSHOT_RESOURCES, type ResourceKey } from "./resourceRegistry";

const DEFAULT_SETTINGS = {
  name: "EduSphere Academy",
  logo: null,
  logoVariants: {},
  brandingVersion: 1,
  reportSettings: {},
  level: "Primary",
  classes: ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"],
  currency: "UGX",
  academicYear: "2026/2027",
  classFees: {},
  gradingScale: [],
};

const studentScopedResources = new Set<ResourceKey>(["marks", "borrowings", "healthRecords", "attendanceRecords"]);

export class SnapshotService {
  constructor(
    private readonly repository = new PostgresRepository(),
    private readonly accessControl = new AccessControlService(),
  ) {}

  async getSnapshot(user: AuthUser, tenant: TenantContext) {
    const entries = await Promise.all(SNAPSHOT_RESOURCES.map(async (resource) => {
      const config = getResourceConfig(resource);
      if (!rolesCan(tenant.roles, config.module, "read")) return [resource, []] as const;
      if (resource === "users") return [resource, await this.repository.listUsers(tenant.schoolId)] as const;
      if (resource === "students") return [resource, await this.students(user, tenant)] as const;
      if (resource === "marks" && tenant.roles.includes("teacher") && !tenant.roles.includes("admin")) {
        return [resource, await this.teacherMarks(user, tenant)] as const;
      }
      if (studentScopedResources.has(resource)) {
        return [resource, await this.studentScopedResource(user, tenant, resource, config.table)] as const;
      }
      return [resource, await this.repository.list(config.table, tenant.schoolId)] as const;
    }));

    const settings = await this.repository.getSettings(tenant.schoolId);
    const snapshot = Object.fromEntries(entries) as Record<string, RecordData[]>;
    const notifications = (snapshot.notifications ?? []).filter((notification) =>
      notification.userId === user.id
      || notification.userId === "all"
      || (typeof notification.targetRole === "string" && tenant.roles.includes(notification.targetRole as never)),
    );

    return {
      schoolSettings: settings ?? DEFAULT_SETTINGS,
      ...snapshot,
      notifications,
    };
  }

  private async students(user: AuthUser, tenant: TenantContext) {
    if (tenant.roles.includes("admin") || tenant.supportAccess) {
      return this.repository.list("students", tenant.schoolId);
    }
    const linkedOnly = tenant.roles.every((role) => role === "parent" || role === "student");
    const ids = linkedOnly ? await this.accessControl.scopedStudentIds(user, tenant, "basic") : null;
    if (linkedOnly) {
      if (!ids?.length) return [];
      return this.repository.listByStudentIds("students", tenant.schoolId, ids, "id");
    }
    return this.repository.listStudentsBasic(tenant.schoolId, ids, tenant.roles.includes("accountant"));
  }

  private async studentScopedResource(user: AuthUser, tenant: TenantContext, resource: ResourceKey, table: string) {
    const purpose = resource === "healthRecords"
      ? "health"
      : resource === "borrowings"
        ? "library"
        : resource === "attendanceRecords"
          ? "attendance"
          : "grades";
    const ids = await this.accessControl.scopedStudentIds(user, tenant, purpose);
    if (ids === null) return this.repository.list(table, tenant.schoolId);
    if (resource === "attendanceRecords") return this.repository.listAttendanceByStudentIds(tenant.schoolId, ids);
    return this.repository.listByStudentIds(table, tenant.schoolId, ids);
  }

  private async teacherMarks(user: AuthUser, tenant: TenantContext) {
    if (tenant.authorizationMode === "audit") {
      const assignmentCount = await query<{ count: string }>(
        `select count(*)::text as count from teacher_assignments
         where "schoolId" = $1 and "userId" = $2 and active = true`,
        [tenant.schoolId, user.id],
      );
      if (Number(assignmentCount.rows[0]?.count ?? 0) === 0) {
        await query(
          `insert into audit_logs ("schoolId", "actorId", action, entity, "riskLevel", summary)
           values ($1, $2, 'authorization.would_deny', 'marks', 'sensitive', 'Teacher has no academic assignments')`,
          [tenant.schoolId, user.id],
        );
        return this.repository.list("marks", tenant.schoolId);
      }
    }

    const result = await query(
      `select distinct m.*
       from marks m
       join students st on st.id = m."studentId" and st."schoolId" = m."schoolId"
       join school_classes sc on sc."schoolId" = st."schoolId" and sc.name = st.class
       join academic_years ay on ay."schoolId" = m."schoolId" and ay.name = m.year
       join teacher_assignments ta on ta."schoolId" = m."schoolId" and ta."userId" = $2
         and ta."classId" = sc.id and ta."academicYearId" = ay.id and ta.active = true
       left join class_streams cs on cs.id = ta."streamId"
       left join subjects sub on sub.id = ta."subjectId"
       where m."schoolId" = $1
         and (ta."streamId" is null or coalesce(st.section, '') = cs.name)
         and (ta."isClassTeacher" = true or ta."subjectId" is null or sub.name = m.subject)
       order by m."createdAt" desc`,
      [tenant.schoolId, user.id],
    );
    return result.rows;
  }
}
