import type { Express } from "express";
import { AuthService } from "../infrastructure/authService";
import { query } from "../infrastructure/database";
import { asyncHandler, requireAuth, requireRole, requireTenant } from "./middleware";

type ReferenceRow = { id: string; name: string; detail?: string | null };
type AssignmentRow = {
  id: string;
  userId: string;
  academicYearId: string;
  classId: string;
  streamId: string | null;
  subjectId: string | null;
  isClassTeacher: boolean;
};

export function registerAccessAdminRoutes(app: Express) {
  const authService = new AuthService();

  app.get(
    "/api/access/reference-data",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const schoolId = req.tenant!.schoolId;
      const [parents, students, staff, academicYears, classes, streams, subjects, assignments] = await Promise.all([
        query<ReferenceRow>(
          `select p.id, p."fullName" as name,
             concat_ws(' / ', nullif(p.email, ''), nullif(p.phone, ''),
               nullif(string_agg(distinct s.name, ', '), '')) as detail
           from parents p
           left join student_parents sp on sp."schoolId" = p."schoolId" and sp."parentId" = p.id
           left join students s on s.id = sp."studentId" and s."schoolId" = p."schoolId"
           where p."schoolId" = $1
           group by p.id, p."fullName", p.email, p.phone
           order by p."fullName"`,
          [schoolId],
        ),
        query<ReferenceRow>(
          `select id, name, concat_ws(' / ', reg, class) as detail
           from students where "schoolId" = $1 order by name`,
          [schoolId],
        ),
        query<ReferenceRow>(
          `select id, name, concat_ws(' / ', "employeeId", nullif(email, '')) as detail
           from staff where "schoolId" = $1 order by name`,
          [schoolId],
        ),
        query<ReferenceRow>(
          `select id, name, case when active then 'Active' else null end as detail
           from academic_years where "schoolId" = $1 order by "startDate" desc nulls last, name desc`,
          [schoolId],
        ),
        query<ReferenceRow>(
          `select id, name, level::text as detail from school_classes where "schoolId" = $1 order by level nulls last, name`,
          [schoolId],
        ),
        query<ReferenceRow & { classId: string }>(
          `select id, name, "classId" from class_streams where "schoolId" = $1 order by name`,
          [schoolId],
        ),
        query<ReferenceRow>(
          `select id, name, code as detail from subjects where "schoolId" = $1 and active = true order by name`,
          [schoolId],
        ),
        query<AssignmentRow>(
          `select id, "userId", "academicYearId", "classId", "streamId", "subjectId", "isClassTeacher"
           from teacher_assignments where "schoolId" = $1 and active = true order by "createdAt"`,
          [schoolId],
        ),
      ]);

      res.json({
        authorizationMode: req.tenant!.authorizationMode,
        parents: parents.rows,
        students: students.rows,
        staff: staff.rows,
        academicYears: academicYears.rows,
        classes: classes.rows,
        streams: streams.rows,
        subjects: subjects.rows,
        assignments: assignments.rows,
      });
    }),
  );
}
