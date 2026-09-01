import { AppError } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import { withTransaction } from "../infrastructure/database";

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export class TenancyService {
  async createSchool(user: AuthUser, input: { name: string; slug?: string; level?: "Primary" | "Secondary" }) {
    if (user.role !== "admin" && user.platformRole !== "super_admin") {
      throw new AppError(403, "Only administrators can create schools");
    }
    const slug = slugify(input.slug || input.name);
    if (!slug) throw new AppError(400, "A valid school slug is required");

    return withTransaction(async (client) => {
      const schoolResult = await client.query(
        `insert into schools (name, slug) values ($1, $2) returning *`,
        [input.name.trim(), slug],
      );
      const school = schoolResult.rows[0];
      const membership = await client.query<{ id: string }>(
        `insert into school_memberships ("schoolId", "userId", role) values ($1, $2, 'admin') returning id`,
        [school.id, user.id],
      );
      await client.query(
        `insert into school_membership_roles ("membershipId", role, "assignedBy") values ($1, 'admin', $2)`,
        [membership.rows[0].id, user.id],
      );
      await client.query(
        `insert into school_settings (
           id, "schoolId", name, level, classes, currency, "academicYear",
           "gradingScale", "primaryColor", "secondaryColor", "assessmentModel"
         ) values (
           true, $1, $2, $3,
           case when $3 = 'Secondary'
             then '["S.1","S.2","S.3","S.4","S.5","S.6"]'::jsonb
             else '["P.1","P.2","P.3","P.4","P.5","P.6","P.7"]'::jsonb end,
           'UGX', extract(year from current_date)::text,
           '[{"min":80,"grade":"A","comment":"Exceptional"},{"min":70,"grade":"B","comment":"Outstanding"},{"min":60,"grade":"C","comment":"Satisfactory"},{"min":50,"grade":"D","comment":"Basic"},{"min":0,"grade":"E","comment":"Elementary"}]'::jsonb,
           '#0066CC', '#009900', 'competency_3'
         )`,
        [school.id, school.name, input.level || "Secondary"],
      );
      await client.query(
        `insert into grading_policies ("schoolId", name, model, "maxAssessmentScore", "gradeBands")
         select "schoolId", 'Default Competency Policy', 'competency_3', 3, "gradingScale"
         from school_settings where "schoolId" = $1`,
        [school.id],
      );
      return school;
    });
  }
}
