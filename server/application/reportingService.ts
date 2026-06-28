import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";
import type { ProgressiveReportData, ProgressiveReportSubject, ReportGradeBand } from "../../shared/reporting";

type ReportRequest = {
  studentId: string;
  termName: string;
  yearName: string;
};

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumeric(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return numeric(value);
}

function gradeFor(score: number, bands: ReportGradeBand[]) {
  return [...bands].sort((a, b) => b.min - a.min).find((band) => score >= band.min);
}

export class ReportingService {
  async buildProgressiveReport(tenant: TenantContext, request: ReportRequest): Promise<ProgressiveReportData> {
    const [settingsResult, studentResult, marksResult, statusResult, reportResult] = await Promise.all([
      query(
        `select s.id as "schoolId", s.name as "schoolName", ss.*
         from schools s
         join school_settings ss on ss."schoolId" = s.id
         where s.id = $1`,
        [tenant.schoolId],
      ),
      query(
        `select st.*,
           (select count(*) from students peer
            where peer."schoolId" = st."schoolId" and peer.class = st.class and peer.name <= st.name) as roll
         from students st
         where st.id = $1 and st."schoolId" = $2`,
        [request.studentId, tenant.schoolId],
      ),
      query(
        `select * from marks
         where "schoolId" = $1 and "studentId" = $2 and term = $3 and year = $4
         order by subject`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
      query(
        `select
           (select count(distinct ar.date)
            from attendance_records ar
            where ar."schoolId" = $1
              and coalesce(ar."studentRefId"::text, ar."studentId") = $2
              and ar.status in ('present', 'late')) as "daysAttended",
           coalesce((select at."expectedSchoolDays"
                     from academic_terms at
                     join academic_years ay on ay.id = at."academicYearId"
                     where at."schoolId" = $1 and at.name = $3 and ay.name = $4
                     limit 1), 0) as "expectedSchoolDays",
           (select count(*) from borrowings b
            where b."schoolId" = $1 and b."studentId" = $2::uuid and b.status = 'active') as "booksBorrowed",
           coalesce((select jsonb_agg(b."bookTitle" order by b."dueDate")
                     from borrowings b
                     where b."schoolId" = $1 and b."studentId" = $2::uuid and b.status = 'active'), '[]'::jsonb) as "borrowedBookTitles",
           (select coalesce(hr.status, 'Cleared') from health_records hr
            where hr."schoolId" = $1 and hr."studentId" = $2::uuid
            order by coalesce(hr."visitAt", hr.date::timestamptz) desc limit 1) as "sicknessStatus",
           (select coalesce(hr."visitAt", hr.date::timestamptz) from health_records hr
            where hr."schoolId" = $1 and hr."studentId" = $2::uuid
            order by coalesce(hr."visitAt", hr.date::timestamptz) desc limit 1) as "lastSickbayVisit",
           (select at."opensOn" from academic_terms at
            join academic_years ay on ay.id = at."academicYearId"
            where at."schoolId" = $1 and at.name = $3 and ay.name = $4 limit 1) as "termOpensOn",
           (select at."closesOn" from academic_terms at
            join academic_years ay on ay.id = at."academicYearId"
            where at."schoolId" = $1 and at.name = $3 and ay.name = $4 limit 1) as "termClosesOn"`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
      query(
        `select * from student_term_reports
         where "schoolId" = $1 and "studentId" = $2 and "termName" = $3 and "yearName" = $4
         limit 1`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
    ]);

    const settings = assertFound(settingsResult.rows[0], "School settings are not configured");
    const student = assertFound(studentResult.rows[0], "Student not found");
    const status = statusResult.rows[0] ?? {};
    const savedReport = reportResult.rows[0];
    const gradeBands = ((Array.isArray(settings.gradingScale) ? settings.gradingScale : []) as ReportGradeBand[])
      .sort((a, b) => b.min - a.min);

    const subjects: ProgressiveReportSubject[] = marksResult.rows.map((mark) => {
      const finalScore = numeric(mark.finalScore ?? mark.score);
      const policyBand = gradeFor(finalScore, gradeBands);
      const snapshot = typeof mark.policySnapshot === "object" && mark.policySnapshot ? mark.policySnapshot as Record<string, unknown> : {};
      const assessmentValues = [mark.a1, mark.a2, mark.a3, mark.a4]
        .map(optionalNumeric)
        .filter((value): value is number => value !== null);
      return {
        id: String(mark.id),
        subject: String(mark.subject),
        a1: optionalNumeric(mark.a1),
        a2: optionalNumeric(mark.a2),
        a3: optionalNumeric(mark.a3),
        a4: optionalNumeric(mark.a4),
        average: assessmentValues.length
          ? Math.round((assessmentValues.reduce((sum, value) => sum + value, 0) / assessmentValues.length) * 100) / 100
          : null,
        identifier: optionalNumeric(mark.identifier ?? mark.idf),
        courseworkScore: numeric(mark.courseworkScore),
        examScore: numeric(mark.examScore),
        examWeightedScore: numeric(mark.examWeightedScore),
        finalScore,
        grade: String(snapshot.grade ?? policyBand?.grade ?? "-"),
        descriptor: String(snapshot.descriptor ?? policyBand?.comment ?? "-"),
        teacherInitials: String(mark.teacherInitials ?? ""),
      };
    });

    const average = subjects.length
      ? Math.round((subjects.reduce((sum, subject) => sum + subject.finalScore, 0) / subjects.length) * 100) / 100
      : 0;
    const overallBand = gradeFor(average, gradeBands);
    const identifiers = subjects.map((subject) => subject.identifier).filter((value): value is number => value !== null);
    const overallIdentifier = identifiers.length
      ? String(Math.round(identifiers.reduce((sum, value) => sum + value, 0) / identifiers.length))
      : "";

    return {
      reportId: savedReport?.id ? String(savedReport.id) : null,
      status: savedReport?.status === "finalized" ? "finalized" : "draft",
      school: {
        id: String(settings.schoolId),
        name: String(settings.schoolName),
        logoUrl: settings.logo ? String(settings.logo) : null,
        motto: String(settings.motto ?? ""),
        address: String(settings.address ?? ""),
        box: String(settings.address ?? ""),
        phones: String(settings.phone ?? ""),
        email: String(settings.email ?? ""),
        deoCode: String(settings.deoCode ?? ""),
        primaryColor: String(settings.primaryColor ?? "#0066CC"),
        secondaryColor: String(settings.secondaryColor ?? "#009900"),
        stampWarning: String(settings.stampWarning ?? "Not Valid without school Official Stamp"),
        reportFooter: String(settings.reportFooter ?? ""),
      },
      student: {
        id: String(student.id),
        name: String(student.name),
        photoUrl: student.photo ? String(student.photo) : null,
        lin: String(student.lin ?? student.reg),
        payCode: String(student.payCode ?? settings.payCode ?? ""),
        section: String(student.section ?? ""),
        gender: String(student.gender ?? ""),
        roll: String(student.roll ?? ""),
        year: request.yearName,
        term: request.termName,
        class: String(student.class),
      },
      statusSummary: {
        daysAttended: numeric(status.daysAttended),
        expectedSchoolDays: numeric(status.expectedSchoolDays),
        feesBalance: numeric(student.feesBalance),
        sicknessStatus: String(status.sicknessStatus ?? "Cleared"),
        lastSickbayVisit: status.lastSickbayVisit ? String(status.lastSickbayVisit) : null,
        booksBorrowed: numeric(status.booksBorrowed),
        borrowedBookTitles: Array.isArray(status.borrowedBookTitles) ? status.borrowedBookTitles.map(String) : [],
      },
      subjects,
      summary: {
        average,
        projectWork: String(savedReport?.projectWork ?? "DONE"),
        overallIdentifier: String(savedReport?.snapshot?.overallIdentifier ?? overallIdentifier),
        overallGrade: String(overallBand?.grade ?? "-"),
        overallPerformance: String(overallBand?.comment ?? "-"),
        result: String(savedReport?.result ?? "PROMOTED"),
        termOpensOn: status.termOpensOn ? String(status.termOpensOn) : null,
        termClosesOn: status.termClosesOn ? String(status.termClosesOn) : null,
      },
      comments: {
        classTeacherComment: String(savedReport?.classTeacherComment ?? ""),
        headTeacherComment: String(savedReport?.headTeacherComment ?? ""),
      },
      gradeBands,
    };
  }

  async saveComments(
    user: AuthUser,
    tenant: TenantContext,
    request: ReportRequest,
    comments: { classTeacherComment?: string; headTeacherComment?: string; projectWork?: string; result?: string },
  ) {
    if (!["admin", "teacher"].includes(tenant.role)) throw new AppError(403, "You cannot edit report comments");
    const result = await query(
      `insert into student_term_reports (
         "schoolId", "studentId", "termName", "yearName",
         "classTeacherComment", "headTeacherComment", "projectWork", result
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict ("schoolId", "studentId", "termName", "yearName")
       do update set
         "classTeacherComment" = excluded."classTeacherComment",
         "headTeacherComment" = excluded."headTeacherComment",
         "projectWork" = excluded."projectWork",
         result = excluded.result,
         "updatedAt" = now()
       returning *`,
      [
        tenant.schoolId,
        request.studentId,
        request.termName,
        request.yearName,
        comments.classTeacherComment ?? "",
        comments.headTeacherComment ?? "",
        comments.projectWork ?? "DONE",
        comments.result ?? "PROMOTED",
      ],
    );
    return result.rows[0];
  }

  async finalize(user: AuthUser, tenant: TenantContext, request: ReportRequest) {
    if (!["admin", "teacher"].includes(tenant.role)) throw new AppError(403, "You cannot finalize this report");
    const report = await this.buildProgressiveReport(tenant, request);
    if (report.subjects.length === 0) throw new AppError(400, "A report cannot be finalized without marks");

    const result = await query(
      `with report_upsert as (
         insert into student_term_reports (
           "schoolId", "studentId", "termName", "yearName", status, snapshot, "finalizedAt", "finalizedBy"
         ) values ($1, $2, $3, $4, 'finalized', $5::jsonb, now(), $6)
         on conflict ("schoolId", "studentId", "termName", "yearName")
         do update set status = 'finalized', snapshot = excluded.snapshot,
           "finalizedAt" = now(), "finalizedBy" = excluded."finalizedBy", "updatedAt" = now()
         returning *
       ), mark_lock as (
         update marks set locked = true, "lockedAt" = now(), "lockedBy" = $6,
           "submittedAt" = coalesce("submittedAt", now()), "submittedBy" = coalesce("submittedBy", $6)
         where "schoolId" = $1 and "studentId" = $2 and term = $3 and year = $4
       )
       select * from report_upsert`,
      [tenant.schoolId, request.studentId, request.termName, request.yearName, JSON.stringify(report), user.id],
    );
    return result.rows[0];
  }

  async getStudentStatus(tenant: TenantContext, studentId: string, termName: string, yearName: string) {
    const report = await this.buildProgressiveReport(tenant, { studentId, termName, yearName });
    return report.statusSummary;
  }
}
