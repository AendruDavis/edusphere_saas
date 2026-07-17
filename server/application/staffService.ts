import { assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import { AuditService } from "./auditService";
import { NotificationService } from "./notificationService";

export type StaffAppraisalInput = {
  staffId: string;
  term: string;
  lessonPlansSubmitted: number;
  punctualityPercent: number;
  studentResultsAverage: number;
  rating: number;
  comment?: string;
};

function overallScore(input: StaffAppraisalInput) {
  const kpiScore = (input.lessonPlansSubmitted + input.punctualityPercent + input.studentResultsAverage) / 3;
  return Math.round(((kpiScore * 0.8) + (input.rating / 5) * 100 * 0.2) * 100) / 100;
}

export class StaffService {
  constructor(
    private readonly auditService = new AuditService(),
    private readonly notificationService = new NotificationService(),
  ) {}

  async monitoringSummary(tenant: TenantContext) {
    const result = await query(
      `select
         (select count(*) from staff where "schoolId" = $1) as "totalStaff",
         (select count(*) from leave_requests where "schoolId" = $1 and status = 'approved' and current_date between "startDate" and "endDate") as "onLeave",
         (select count(distinct "staffRefId") from attendance_records where "schoolId" = $1 and role = 'Staff' and date = current_date and status in ('present', 'late')) as "activeToday",
         coalesce((select avg(("endDate" - "startDate") + 1) from leave_requests where "schoolId" = $1 and status = 'approved'), 0) as "avgLeaveDaysPerTerm"`,
      [tenant.schoolId],
    );
    const leaveBreakdown = await query(
      `select type, count(*)::int as count
       from leave_requests
       where "schoolId" = $1
       group by type
       order by type`,
      [tenant.schoolId],
    );
    const attendanceTrend = await query(
      `select to_char(date_trunc('month', date), 'YYYY-MM') as month,
              round(avg(case when status in ('present', 'late') then 100 else 0 end), 2) as percent
       from attendance_records
       where "schoolId" = $1 and role = 'Staff'
       group by date_trunc('month', date)
       order by month`,
      [tenant.schoolId],
    );
    return {
      kpis: result.rows[0] ?? {},
      leaveBreakdown: leaveBreakdown.rows,
      attendanceTrend: attendanceTrend.rows,
    };
  }

  async saveAppraisal(actor: AuthUser, tenant: TenantContext, input: StaffAppraisalInput) {
    const score = overallScore(input);
    const result = await query(
      `insert into staff_appraisals (
         "schoolId", "staffId", term, "lessonPlansSubmitted", "punctualityPercent",
         "studentResultsAverage", rating, "overallScore", comment, "createdBy"
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning *`,
      [
        tenant.schoolId,
        input.staffId,
        input.term,
        input.lessonPlansSubmitted,
        input.punctualityPercent,
        input.studentResultsAverage,
        input.rating,
        score,
        input.comment ?? null,
        actor.id,
      ],
    );
    const appraisal = result.rows[0];

    const staffResult = await query<{ email: string | null; name: string }>(
      `select email, name from staff where id = $1 and "schoolId" = $2 limit 1`,
      [input.staffId, tenant.schoolId],
    );
    const staff = staffResult.rows[0];
    if (staff?.email) {
      await this.notificationService.queue(tenant, {
        type: "staff_appraisal",
        channel: "email",
        recipient: staff.email,
        template: "staff_appraisal",
        payload: { staff: staff.name, term: input.term, overallScore: score, rating: input.rating, message: input.comment ?? "" },
        idempotencyKey: `staff-appraisal:${appraisal.id}:email`,
      });
    }

    await this.auditService.record(actor, tenant, {
      action: "staff_appraisal.saved",
      entity: "staff_appraisals",
      entityId: String(appraisal.id),
      riskLevel: "sensitive",
      summary: `Saved staff appraisal score ${score}`,
      metadata: { staffId: input.staffId, term: input.term },
    });

    return appraisal;
  }

  async reviewLeave(actor: AuthUser, tenant: TenantContext, leaveId: string, status: "approved" | "rejected") {
    const result = await withTransaction(async (client) => {
      const leaveResult = await client.query(
        `select lr.*, st.salary
         from leave_requests lr
         left join staff st on st.id = lr."staffId" and st."schoolId" = lr."schoolId"
         where lr.id = $1 and lr."schoolId" = $2
         for update`,
        [leaveId, tenant.schoolId],
      );
      const leave = assertFound(leaveResult.rows[0], "Leave request not found") as Record<string, unknown>;
      let expenseId = leave.expenseId as string | null | undefined;

      if (status === "approved" && !expenseId) {
        const salary = Number(leave.salary ?? 0);
        const leaveDaysResult = await client.query<{ days: number }>(
          `select greatest((($2::date - $1::date) + 1), 1)::int as days`,
          [leave.startDate, leave.endDate],
        );
        const leaveDays = Number(leaveDaysResult.rows[0]?.days ?? 1);
        const amount = Math.round((salary / 30) * leaveDays * 100) / 100;
        const expenseResult = await client.query(
          `insert into expenses ("schoolId", description, amount, category, date, "paidBy")
           values ($1, $2, $3, 'Salaries', current_date, 'HR Automation')
           returning id`,
          [tenant.schoolId, `Leave Deduction: ${leave.staffName}`, amount],
        );
        expenseId = expenseResult.rows[0].id;
        await client.query(
          `insert into transactions ("schoolId", type, category, amount, date, status, reference, description)
           values ($1, 'expense', 'Salaries', $2, current_date, 'completed', $3, $4)`,
          [tenant.schoolId, amount, `LEAVE-${String(leaveId).slice(0, 8)}`, `Leave deduction for ${leave.staffName}`],
        );
      }

      const update = await client.query(
        `update leave_requests
         set status = $3, "reviewedBy" = $4, "reviewedAt" = now(), "expenseId" = coalesce($5, "expenseId"), "updatedAt" = now()
         where id = $1 and "schoolId" = $2
         returning *`,
        [leaveId, tenant.schoolId, status, actor.id, expenseId ?? null],
      );
      return update.rows[0];
    });

    await this.auditService.record(actor, tenant, {
      action: `leave.${status}`,
      entity: "leave_requests",
      entityId: leaveId,
      riskLevel: "sensitive",
      summary: `Leave request ${status}`,
      metadata: { expenseId: result.expenseId ?? null },
    });

    return result;
  }
}
