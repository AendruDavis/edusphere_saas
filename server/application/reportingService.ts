import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import { reportFieldVisibility } from "../domain/reportVisibility";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import type { ProgressiveReportData, ProgressiveReportSubject, ReportGradeBand } from "../../shared/reporting";
import { DEFAULT_REPORT_SETTINGS, normalizeReportSettings, type LogoVariants } from "../../shared/reportSettings";
import { AccessControlService, type StudentAccessDecision } from "./accessControlService";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export class ReportingService {
  constructor(private readonly accessControl = new AccessControlService()) {}

  async buildProgressiveReport(user: AuthUser, tenant: TenantContext, request: ReportRequest): Promise<ProgressiveReportData> {
    const decision = await this.accessControl.assertStudentAccess(user, tenant, request.studentId, "report", {
      yearName: request.yearName,
    });
    const saved = await this.getSavedReport(tenant, request);
    const isPortalRole = tenant.roles.some((role) => role === "parent" || role === "student")
      && !tenant.roles.some((role) => role === "admin" || role === "teacher");

    if (saved?.status === "finalized") {
      const snapshot = await this.getFinalizedSnapshot(saved);
      if (snapshot) return this.applyRoleVisibility(
        this.applyAccessDecision(this.normalizeSnapshot(snapshot), decision), tenant, decision,
      );
    }
    if (isPortalRole) throw new AppError(404, "A finalized report is not available");

    const report = await this.buildLiveProgressiveReport(tenant, request, saved);
    return this.applyRoleVisibility(this.applyAccessDecision(report, decision), tenant, decision);
  }

  async saveComments(
    user: AuthUser,
    tenant: TenantContext,
    request: ReportRequest,
    comments: { classTeacherComment?: string; headTeacherComment?: string; projectWork?: string; result?: string },
  ) {
    const isAdmin = tenant.roles.includes("admin");
    if (!isAdmin) {
      await this.accessControl.assertStudentAccess(user, tenant, request.studentId, "report_comments", { yearName: request.yearName });
    }
    const current = await this.getSavedReport(tenant, request);
    if (current?.status === "finalized") throw new AppError(409, "Finalized reports cannot be edited; create a correction revision");

    const result = await query(
      `insert into student_term_reports (
         "schoolId", "studentId", "termName", "yearName",
         "classTeacherComment", "headTeacherComment", "projectWork", result
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict ("schoolId", "studentId", "termName", "yearName")
       do update set
         "classTeacherComment" = excluded."classTeacherComment",
         "headTeacherComment" = case when $9 then excluded."headTeacherComment" else student_term_reports."headTeacherComment" end,
         "projectWork" = excluded."projectWork",
         result = excluded.result,
         "updatedAt" = now()
       returning *`,
      [
        tenant.schoolId,
        request.studentId,
        request.termName,
        request.yearName,
        comments.classTeacherComment ?? current?.classTeacherComment ?? "",
        isAdmin ? comments.headTeacherComment ?? current?.headTeacherComment ?? "" : current?.headTeacherComment ?? "",
        comments.projectWork ?? current?.projectWork ?? "DONE",
        comments.result ?? current?.result ?? "PROMOTED",
        isAdmin,
      ],
    );
    return result.rows[0];
  }

  async finalize(user: AuthUser, tenant: TenantContext, request: ReportRequest) {
    if (!tenant.roles.includes("admin")) throw new AppError(403, "Only school administrators can finalize reports");
    const current = await this.getSavedReport(tenant, request);
    if (current?.status === "finalized") throw new AppError(409, "This report is already finalized; create a correction revision");
    const draft = await this.buildLiveProgressiveReport(tenant, request, current);
    if (draft.subjects.length === 0) throw new AppError(400, "A report cannot be finalized without marks");
    return this.persistRevision(user, tenant, request, draft, 1, null);
  }

  async revise(
    user: AuthUser,
    tenant: TenantContext,
    request: ReportRequest,
    reason: string,
    changes: { classTeacherComment?: string; headTeacherComment?: string; projectWork?: string; result?: string } = {},
  ) {
    if (!tenant.roles.includes("admin")) throw new AppError(403, "Only school administrators can revise reports");
    const current = assertFound(await this.getSavedReport(tenant, request), "Finalized report not found");
    if (current.status !== "finalized") throw new AppError(409, "Finalize the report before creating a correction");
    const revision = numeric(current.currentRevision, 0) + 1;
    const live = await this.buildLiveProgressiveReport(tenant, request, current);
    if (live.subjects.length === 0) throw new AppError(400, "A report cannot be revised without marks");
    live.comments = {
      classTeacherComment: changes.classTeacherComment ?? live.comments.classTeacherComment,
      headTeacherComment: changes.headTeacherComment ?? live.comments.headTeacherComment,
    };
    live.summary = {
      ...live.summary,
      projectWork: changes.projectWork ?? live.summary.projectWork,
      result: changes.result ?? live.summary.result,
    };
    return this.persistRevision(user, tenant, request, live, revision, reason.trim());
  }

  async getStudentStatus(user: AuthUser, tenant: TenantContext, studentId: string, termName: string, yearName: string) {
    const report = await this.buildProgressiveReport(user, tenant, { studentId, termName, yearName });
    return report.statusSummary;
  }

  private async getSavedReport(tenant: TenantContext, request: ReportRequest) {
    const result = await query(
      `select * from student_term_reports
       where "schoolId" = $1 and "studentId" = $2 and "termName" = $3 and "yearName" = $4
       limit 1`,
      [tenant.schoolId, request.studentId, request.termName, request.yearName],
    );
    return result.rows[0] ?? null;
  }

  private async getFinalizedSnapshot(saved: Record<string, unknown>) {
    const reportId = String(saved.id);
    const currentRevision = numeric(saved.currentRevision, 0);
    if (currentRevision > 0) {
      const result = await query<{ snapshot: unknown }>(
        `select snapshot from student_term_report_revisions
         where "reportId" = $1 and revision = $2 limit 1`,
        [reportId, currentRevision],
      );
      if (result.rows[0]?.snapshot) return result.rows[0].snapshot;
    }
    return saved.snapshot ?? null;
  }

  private async buildLiveProgressiveReport(
    tenant: TenantContext,
    request: ReportRequest,
    savedReport?: Record<string, unknown> | null,
  ): Promise<ProgressiveReportData> {
    const [settingsResult, studentResult, marksResult, statusResult, rankingResult] = await Promise.all([
      query(
        `select s.id as "schoolId", s.name as "schoolName", ss.*
         from schools s join school_settings ss on ss."schoolId" = s.id where s.id = $1`,
        [tenant.schoolId],
      ),
      query(
        `select st.*,
           (select count(*) from students peer
            where peer."schoolId" = st."schoolId" and peer.class = st.class and peer.name <= st.name) as roll
         from students st where st.id = $1 and st."schoolId" = $2`,
        [request.studentId, tenant.schoolId],
      ),
      query(
        `select * from marks
         where "schoolId" = $1 and "studentId" = $2 and term = $3 and year = $4 order by subject`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
      query(
        `select
           (select count(distinct ar.date) from attendance_records ar
            where ar."schoolId" = $1 and coalesce(ar."studentRefId"::text, ar."studentId") = $2
              and ar.status in ('present', 'late')) as "daysAttended",
           coalesce((select at."expectedSchoolDays" from academic_terms at
                     join academic_years ay on ay.id = at."academicYearId"
                     where at."schoolId" = $1 and at.name = $3 and ay.name = $4 limit 1), 0) as "expectedSchoolDays",
           (select count(*) from borrowings b where b."schoolId" = $1 and b."studentId" = $2::uuid and b.status = 'active') as "booksBorrowed",
           coalesce((select jsonb_agg(b."bookTitle" order by b."dueDate") from borrowings b
                     where b."schoolId" = $1 and b."studentId" = $2::uuid and b.status = 'active'), '[]'::jsonb) as "borrowedBookTitles",
           (select coalesce(hr.status, 'Cleared') from health_records hr
            where hr."schoolId" = $1 and hr."studentId" = $2::uuid
            order by coalesce(hr."visitAt", hr.date::timestamptz) desc limit 1) as "sicknessStatus",
           (select coalesce(hr."visitAt", hr.date::timestamptz) from health_records hr
            where hr."schoolId" = $1 and hr."studentId" = $2::uuid
            order by coalesce(hr."visitAt", hr.date::timestamptz) desc limit 1) as "lastSickbayVisit",
           (select at."opensOn" from academic_terms at join academic_years ay on ay.id = at."academicYearId"
            where at."schoolId" = $1 and at.name = $3 and ay.name = $4 limit 1) as "termOpensOn",
           (select at."closesOn" from academic_terms at join academic_years ay on ay.id = at."academicYearId"
            where at."schoolId" = $1 and at.name = $3 and ay.name = $4 limit 1) as "termClosesOn"`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
      query(
        `with target as (
           select class from students where id = $2 and "schoolId" = $1
         ), averages as (
           select m."studentId", avg(coalesce(m."finalScore", m.score)) as average
           from marks m
           join students peer on peer.id = m."studentId" and peer."schoolId" = m."schoolId"
           join target on target.class = peer.class
           where m."schoolId" = $1 and m.term = $3 and m.year = $4
           group by m."studentId"
         )
         select 1 + (select count(*) from averages ranked where ranked.average > own.average) as position,
                (select count(*) from averages) as "classSize"
         from averages own where own."studentId" = $2`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName],
      ),
    ]);

    const settings = assertFound(settingsResult.rows[0], "School settings are not configured");
    const student = assertFound(studentResult.rows[0], "Student not found");
    const status = statusResult.rows[0] ?? {};
    const ranking = rankingResult.rows[0] ?? {};
    const gradeBands = ((Array.isArray(settings.gradingScale) ? settings.gradingScale : []) as ReportGradeBand[])
      .sort((a, b) => b.min - a.min);
    const reportSettings = normalizeReportSettings(settings.reportSettings);

    const subjects: ProgressiveReportSubject[] = marksResult.rows.map((mark) => {
      const finalScore = numeric(mark.finalScore ?? mark.score);
      const policyBand = gradeFor(finalScore, gradeBands);
      const policySnapshot = asRecord(mark.policySnapshot);
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
        grade: String(policySnapshot.grade ?? policyBand?.grade ?? "-"),
        descriptor: String(policySnapshot.descriptor ?? policyBand?.comment ?? "-"),
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
    const logoVariants = asRecord(settings.logoVariants) as LogoVariants;

    const report: ProgressiveReportData = {
      reportId: savedReport?.id ? String(savedReport.id) : null,
      status: "draft",
      revision: numeric(savedReport?.currentRevision, 0),
      templateVersion: numeric(savedReport?.templateVersion, 1),
      reportSettings,
      school: {
        id: String(settings.schoolId),
        name: String(settings.schoolName),
        logoUrl: String(logoVariants.wide ?? settings.logo ?? "") || null,
        logoVariants,
        brandingVersion: numeric(settings.brandingVersion, 1),
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
        position: numeric(ranking.position),
        classSize: numeric(ranking.classSize),
        projectWork: String(savedReport?.projectWork ?? "DONE"),
        overallIdentifier,
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
    return this.redactDisabledSections(report);
  }

  private async persistRevision(
    user: AuthUser,
    tenant: TenantContext,
    request: ReportRequest,
    report: ProgressiveReportData,
    revision: number,
    reason: string | null,
  ) {
    return withTransaction(async (client) => {
      const reportRow = await client.query(
        `insert into student_term_reports (
           "schoolId", "studentId", "termName", "yearName", status, "currentRevision", "templateVersion", "finalizedAt", "finalizedBy"
         ) values ($1, $2, $3, $4, 'finalized', $5, $6, now(), $7)
         on conflict ("schoolId", "studentId", "termName", "yearName") do update set
           status = 'finalized', "currentRevision" = $5, "templateVersion" = $6,
           "finalizedAt" = now(), "finalizedBy" = $7, "updatedAt" = now()
         returning *`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName, revision, report.templateVersion, user.id],
      );
      const row = reportRow.rows[0];
      const snapshot: ProgressiveReportData = {
        ...report,
        reportId: String(row.id),
        status: "finalized",
        revision,
      };
      await client.query(
        `insert into student_term_report_revisions (
           "reportId", "schoolId", "studentId", revision, snapshot, "templateVersion", reason, "finalizedBy"
         ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [row.id, tenant.schoolId, request.studentId, revision, JSON.stringify(snapshot), report.templateVersion, reason, user.id],
      );
      await client.query(
        `update student_term_reports set snapshot = $2::jsonb where id = $1`,
        [row.id, JSON.stringify(snapshot)],
      );
      await client.query(
        `update marks set locked = true, "lockedAt" = now(), "lockedBy" = $5,
           "submittedAt" = coalesce("submittedAt", now()), "submittedBy" = coalesce("submittedBy", $5)
         where "schoolId" = $1 and "studentId" = $2 and term = $3 and year = $4`,
        [tenant.schoolId, request.studentId, request.termName, request.yearName, user.id],
      );
      await client.query(
        `insert into audit_logs ("schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata)
         values ($1, $2, $3, 'student_term_reports', $4, 'restricted', $5, $6::jsonb)`,
        [
          tenant.schoolId,
          user.id,
          revision === 1 ? "report.finalized" : "report.revised",
          row.id,
          revision === 1 ? "Finalized student report" : "Issued corrected student report",
          JSON.stringify({ studentId: request.studentId, term: request.termName, year: request.yearName, revision, reason }),
        ],
      );
      return snapshot;
    });
  }

  private normalizeSnapshot(value: unknown): ProgressiveReportData {
    const snapshot = asRecord(value) as Partial<ProgressiveReportData>;
    return {
      ...snapshot,
      reportId: snapshot.reportId ?? null,
      status: "finalized",
      revision: numeric(snapshot.revision, 1),
      templateVersion: numeric(snapshot.templateVersion, 1),
      reportSettings: normalizeReportSettings(snapshot.reportSettings ?? DEFAULT_REPORT_SETTINGS),
      school: {
        ...snapshot.school!,
        logoVariants: snapshot.school?.logoVariants ?? {},
        brandingVersion: numeric(snapshot.school?.brandingVersion, 1),
      },
      summary: {
        ...snapshot.summary!,
        position: numeric(snapshot.summary?.position),
        classSize: numeric(snapshot.summary?.classSize),
      },
    } as ProgressiveReportData;
  }

  private applyAccessDecision(report: ProgressiveReportData, decision: StudentAccessDecision) {
    if (decision.fullReport || !decision.subjectNames) return report;
    const subjects = report.subjects.filter((subject) => decision.subjectNames?.includes(subject.subject));
    const average = subjects.length
      ? Math.round((subjects.reduce((sum, subject) => sum + subject.finalScore, 0) / subjects.length) * 100) / 100
      : 0;
    const band = gradeFor(average, report.gradeBands);
    return {
      ...report,
      reportSettings: { ...report.reportSettings, showPosition: false },
      subjects,
      summary: {
        ...report.summary,
        average,
        position: 0,
        classSize: 0,
        overallGrade: band?.grade ?? "-",
        overallPerformance: band?.comment ?? "-",
      },
      comments: { classTeacherComment: "", headTeacherComment: "" },
    };
  }

  private applyRoleVisibility(
    report: ProgressiveReportData,
    tenant: TenantContext,
    decision: StudentAccessDecision,
  ): ProgressiveReportData {
    const visibility = reportFieldVisibility(tenant.roles, decision.source, tenant.supportAccess);
    const settings = {
      ...report.reportSettings,
      showAttendance: report.reportSettings.showAttendance && visibility.attendance,
      showFees: report.reportSettings.showFees && visibility.fees,
      showHealth: report.reportSettings.showHealth && visibility.health,
      showLibrary: report.reportSettings.showLibrary && visibility.library,
    };
    return {
      ...report,
      reportSettings: settings,
      statusSummary: {
        daysAttended: settings.showAttendance ? report.statusSummary.daysAttended : 0,
        expectedSchoolDays: settings.showAttendance ? report.statusSummary.expectedSchoolDays : 0,
        feesBalance: settings.showFees ? report.statusSummary.feesBalance : 0,
        sicknessStatus: settings.showHealth ? report.statusSummary.sicknessStatus : "Not included",
        lastSickbayVisit: settings.showHealth ? report.statusSummary.lastSickbayVisit : null,
        booksBorrowed: settings.showLibrary ? report.statusSummary.booksBorrowed : 0,
        borrowedBookTitles: settings.showLibrary ? report.statusSummary.borrowedBookTitles : [],
      },
    };
  }

  private redactDisabledSections(report: ProgressiveReportData): ProgressiveReportData {
    const settings = report.reportSettings;
    return {
      ...report,
      student: settings.showStudentPhoto ? report.student : { ...report.student, photoUrl: null },
      summary: settings.showPosition
        ? report.summary
        : { ...report.summary, position: 0, classSize: 0 },
      statusSummary: {
        daysAttended: settings.showAttendance ? report.statusSummary.daysAttended : 0,
        expectedSchoolDays: settings.showAttendance ? report.statusSummary.expectedSchoolDays : 0,
        feesBalance: settings.showFees ? report.statusSummary.feesBalance : 0,
        sicknessStatus: settings.showHealth ? report.statusSummary.sicknessStatus : "Not included",
        lastSickbayVisit: settings.showHealth ? report.statusSummary.lastSickbayVisit : null,
        booksBorrowed: settings.showLibrary ? report.statusSummary.booksBorrowed : 0,
        borrowedBookTitles: settings.showLibrary ? report.statusSummary.borrowedBookTitles : [],
      },
    };
  }
}
