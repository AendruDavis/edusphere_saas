import { AppError } from "../domain/errors";
import type { AuthUser, SchoolRole } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";

export type StudentAccessPurpose =
  | "basic"
  | "report"
  | "report_comments"
  | "grades"
  | "attendance"
  | "billing"
  | "health"
  | "library"
  | "transport";

export type StudentAccessDecision = {
  allowed: boolean;
  fullReport: boolean;
  subjectNames: string[] | null;
  source: string;
};

const SCHOOL_SCOPED_PURPOSES: Partial<Record<SchoolRole, StudentAccessPurpose[]>> = {
  accountant: ["basic", "billing"],
  nurse: ["basic", "health", "attendance"],
  librarian: ["basic", "library"],
  driver: ["basic", "transport"],
  staff: ["basic"],
};

function allow(source: string, options: Partial<StudentAccessDecision> = {}): StudentAccessDecision {
  return { allowed: true, fullReport: true, subjectNames: null, source, ...options };
}

const DENY: StudentAccessDecision = {
  allowed: false,
  fullReport: false,
  subjectNames: [],
  source: "none",
};

export class AccessControlService {
  async assertStudentAccess(
    user: AuthUser,
    tenant: TenantContext,
    studentId: string,
    purpose: StudentAccessPurpose,
    options: { subject?: string; yearName?: string } = {},
  ): Promise<StudentAccessDecision> {
    const decision = await this.studentAccess(user, tenant, studentId, purpose, options);
    if (!decision.allowed) throw new AppError(404, "Student record not found");
    return decision;
  }

  async studentAccess(
    user: AuthUser,
    tenant: TenantContext,
    studentId: string,
    purpose: StudentAccessPurpose,
    options: { subject?: string; yearName?: string } = {},
  ): Promise<StudentAccessDecision> {
    const student = await query(
      `select id from students where id = $1 and "schoolId" = $2 limit 1`,
      [studentId, tenant.schoolId],
    );
    if (!student.rows[0]) return DENY;
    if (tenant.roles.includes("admin") || tenant.supportAccess) return allow(tenant.supportAccess ? "support" : "admin");

    for (const role of tenant.roles) {
      if (SCHOOL_SCOPED_PURPOSES[role]?.includes(purpose)) return allow(role);
    }

    if (tenant.roles.includes("parent") && await this.isLinkedParent(user.id, tenant.schoolId, studentId)) {
      return allow("linked_parent");
    }

    if (tenant.roles.includes("student") && await this.isLinkedStudent(user.id, tenant.schoolId, studentId)) {
      return allow("self");
    }

    if (tenant.roles.includes("teacher")) {
      if (purpose === "basic") return allow("teacher_directory");
      const teacherDecision = await this.teacherAccess(user.id, tenant, studentId, purpose, options);
      if (teacherDecision.allowed) return teacherDecision;
      if (tenant.authorizationMode === "audit") {
        await this.recordWouldDeny(user.id, tenant.schoolId, studentId, purpose, options);
        return allow("teacher_audit_fallback");
      }
    }

    return DENY;
  }

  async scopedStudentIds(user: AuthUser, tenant: TenantContext, purpose: StudentAccessPurpose): Promise<string[] | null> {
    if (tenant.roles.includes("admin") || tenant.supportAccess) return null;
    for (const role of tenant.roles) {
      if (SCHOOL_SCOPED_PURPOSES[role]?.includes(purpose)) return null;
    }

    const ids = new Set<string>();
    if (tenant.roles.includes("parent")) {
      const result = await query<{ studentId: string }>(
        `select sp."studentId"
         from parent_user_links pul
         join student_parents sp on sp."parentId" = pul."parentId" and sp."schoolId" = pul."schoolId"
         where pul."schoolId" = $1 and pul."userId" = $2 and pul.active = true`,
        [tenant.schoolId, user.id],
      );
      result.rows.forEach((row) => ids.add(row.studentId));
    }
    if (tenant.roles.includes("student")) {
      const result = await query<{ studentId: string }>(
        `select "studentId" from student_user_links
         where "schoolId" = $1 and "userId" = $2 and active = true`,
        [tenant.schoolId, user.id],
      );
      result.rows.forEach((row) => ids.add(row.studentId));
    }
    if (tenant.roles.includes("teacher") && purpose !== "billing" && purpose !== "health" && purpose !== "transport") {
      const result = await query<{ studentId: string }>(
        `select distinct st.id as "studentId"
         from teacher_assignments ta
         join school_classes sc on sc.id = ta."classId" and sc."schoolId" = ta."schoolId"
         join students st on st."schoolId" = ta."schoolId" and st.class = sc.name
         left join class_streams cs on cs.id = ta."streamId"
         where ta."schoolId" = $1 and ta."userId" = $2 and ta.active = true
           and (ta."streamId" is null or coalesce(st.section, '') = cs.name)`,
        [tenant.schoolId, user.id],
      );
      result.rows.forEach((row) => ids.add(row.studentId));
      if (result.rows.length === 0 && tenant.authorizationMode === "audit") return null;
    }
    return [...ids];
  }

  private async isLinkedParent(userId: string, schoolId: string, studentId: string) {
    const result = await query(
      `select 1
       from parent_user_links pul
       join student_parents sp on sp."parentId" = pul."parentId" and sp."schoolId" = pul."schoolId"
       where pul."schoolId" = $1 and pul."userId" = $2 and sp."studentId" = $3 and pul.active = true
       limit 1`,
      [schoolId, userId, studentId],
    );
    return Boolean(result.rows[0]);
  }

  private async isLinkedStudent(userId: string, schoolId: string, studentId: string) {
    const result = await query(
      `select 1 from student_user_links
       where "schoolId" = $1 and "userId" = $2 and "studentId" = $3 and active = true limit 1`,
      [schoolId, userId, studentId],
    );
    return Boolean(result.rows[0]);
  }

  private async teacherAccess(
    userId: string,
    tenant: TenantContext,
    studentId: string,
    purpose: StudentAccessPurpose,
    options: { subject?: string; yearName?: string },
  ): Promise<StudentAccessDecision> {
    const result = await query<{ subjectName: string | null; isClassTeacher: boolean }>(
      `select sub.name as "subjectName", ta."isClassTeacher"
       from teacher_assignments ta
       join school_classes sc on sc.id = ta."classId" and sc."schoolId" = ta."schoolId"
       join students st on st."schoolId" = ta."schoolId" and st.class = sc.name
       join academic_years ay on ay.id = ta."academicYearId"
       left join class_streams cs on cs.id = ta."streamId"
       left join subjects sub on sub.id = ta."subjectId"
       where ta."schoolId" = $1 and ta."userId" = $2 and st.id = $3 and ta.active = true
         and (ta."streamId" is null or coalesce(st.section, '') = cs.name)
         and ($4::text is null or ay.name = $4)`,
      [tenant.schoolId, userId, studentId, options.yearName ?? null],
    );
    if (result.rows.length === 0) return DENY;

    if (purpose === "report_comments") {
      return result.rows.some((row) => row.isClassTeacher) ? allow("class_teacher") : DENY;
    }
    if (purpose === "attendance") {
      return result.rows.some((row) => row.isClassTeacher) ? allow("class_teacher") : DENY;
    }
    if (purpose === "grades" && options.subject) {
      const allowed = result.rows.some((row) => row.isClassTeacher || row.subjectName === null || row.subjectName === options.subject);
      return allowed ? allow("subject_assignment") : DENY;
    }
    if (purpose === "report") {
      const fullReport = result.rows.some((row) => row.isClassTeacher || row.subjectName === null);
      const subjectNames = fullReport
        ? null
        : [...new Set(result.rows.map((row) => row.subjectName).filter((name): name is string => Boolean(name)))];
      return allow("teacher_assignment", { fullReport, subjectNames });
    }
    return allow("teacher_assignment");
  }

  private async recordWouldDeny(
    actorId: string,
    schoolId: string,
    studentId: string,
    purpose: StudentAccessPurpose,
    options: Record<string, unknown>,
  ) {
    await query(
      `insert into audit_logs ("schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata)
       values ($1, $2, 'authorization.would_deny', 'students', $3, 'sensitive', $4, $5::jsonb)`,
      [schoolId, actorId, studentId, `Missing teacher scope for ${purpose}`, JSON.stringify(options)],
    );
  }
}
