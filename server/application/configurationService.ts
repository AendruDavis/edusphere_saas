import type { PoolClient } from "pg";
import { normalizeReportSettings } from "../../shared/reportSettings";
import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { withTransaction } from "../infrastructure/database";
import type { SchoolSettingsInput } from "../http/configurationSchemas";

function isOwnedLogoPath(value: string, schoolId: string) {
  return value.startsWith(`/uploads/branding/${schoolId}/`);
}

function assertOwnedLogoMetadata(
  schoolId: string,
  previous: Record<string, unknown>,
  input: SchoolSettingsInput,
) {
  if (input.logo && input.logo !== previous.logo && !isOwnedLogoPath(input.logo, schoolId)) {
    throw new AppError(400, "Upload the logo before saving school settings", {
      fieldErrors: { logo: ["The selected logo has not been staged by this server"] },
    });
  }

  const previousVariants = previous.logoVariants && typeof previous.logoVariants === "object"
    ? previous.logoVariants as Record<string, unknown>
    : {};
  for (const [key, value] of Object.entries(input.logoVariants ?? {})) {
    if (typeof value !== "string" || value === previousVariants[key]) continue;
    if (!isOwnedLogoPath(value, schoolId)) {
      throw new AppError(400, "Upload the logo before saving school settings", {
        fieldErrors: { logo: ["Logo variants must belong to the active school"] },
      });
    }
  }
}

async function saveGradingPolicy(client: PoolClient, schoolId: string, input: SchoolSettingsInput) {
  const maxAssessmentScore = input.assessmentModel === "competency_3" ? 3 : 100;
  const active = await client.query<{ id: string; model: string }>(
    `select id, model from grading_policies
     where "schoolId" = $1 and active = true
     order by version desc limit 1 for update`,
    [schoolId],
  );

  if (active.rows[0]?.model === input.assessmentModel) {
    await client.query(
      `update grading_policies
       set "gradeBands" = $2::jsonb, "maxAssessmentScore" = $3, "updatedAt" = now()
       where id = $1`,
      [active.rows[0].id, JSON.stringify(input.gradingScale), maxAssessmentScore],
    );
    return;
  }

  await client.query(
    `update grading_policies set active = false, "updatedAt" = now()
     where "schoolId" = $1 and active = true`,
    [schoolId],
  );
  await client.query(
    `insert into grading_policies (
       "schoolId", name, version, model, "maxAssessmentScore",
       "courseworkWeight", "examWeight", "gradeBands", active
     )
     select $1, $2, coalesce(max(version), 0) + 1, $3, $4, 20, 80, $5::jsonb, true
     from grading_policies where "schoolId" = $1`,
    [
      schoolId,
      input.assessmentModel === "competency_3" ? "Competency Policy" : "Percentage Policy",
      input.assessmentModel,
      maxAssessmentScore,
      JSON.stringify(input.gradingScale),
    ],
  );
}

export class ConfigurationService {
  async saveSchoolSettings(actor: AuthUser, tenant: TenantContext, input: SchoolSettingsInput) {
    if (!tenant.roles.includes("admin")) {
      throw new AppError(403, "Only school administrators can update school settings");
    }

    return withTransaction(async (client) => {
      const currentResult = await client.query<Record<string, unknown>>(
        `select * from school_settings where "schoolId" = $1 for update`,
        [tenant.schoolId],
      );
      const current = assertFound(currentResult.rows[0], "School settings are not configured");
      assertOwnedLogoMetadata(tenant.schoolId, current, input);
      const reportSettings = normalizeReportSettings(input.reportSettings);

      await client.query(`select id from schools where id = $1 for update`, [tenant.schoolId]);
      await client.query(
        `update schools set name = $2, "updatedAt" = now() where id = $1`,
        [tenant.schoolId, input.name],
      );

      const savedResult = await client.query(
        `update school_settings set
           name = $2,
           logo = $3,
           "logoVariants" = $4::jsonb,
           level = $5,
           classes = $6::jsonb,
           currency = $7,
           "academicYear" = $8,
           "currentTerm" = $9,
           address = $10,
           phone = $11,
           email = $12,
           "classFees" = $13::jsonb,
           "gradingScale" = $14::jsonb,
           motto = $15,
           "deoCode" = $16,
           tin = $17,
           "primaryColor" = $18,
           "secondaryColor" = $19,
           "bankName" = $20,
           "bankAccount" = $21,
           "payCode" = $22,
           "reportFooter" = $23,
           "stampWarning" = $24,
           "assessmentModel" = $25,
           "reportSettings" = $26::jsonb,
           "brandingVersion" = "brandingVersion" + 1,
           "updatedAt" = now()
         where "schoolId" = $1
         returning *`,
        [
          tenant.schoolId,
          input.name,
          input.logo,
          JSON.stringify(input.logoVariants ?? {}),
          input.level,
          JSON.stringify(input.classes),
          input.currency.toUpperCase(),
          input.academicYear,
          input.currentTerm,
          input.address || null,
          input.phone || null,
          input.email || null,
          JSON.stringify(input.classFees),
          JSON.stringify(input.gradingScale),
          input.motto || null,
          input.deoCode || null,
          input.tin || null,
          input.primaryColor,
          input.secondaryColor,
          input.bankName || null,
          input.bankAccount || null,
          input.payCode || null,
          input.reportFooter || null,
          input.stampWarning || null,
          input.assessmentModel,
          JSON.stringify(reportSettings),
        ],
      );

      await saveGradingPolicy(client, tenant.schoolId, input);
      await client.query(
        `insert into audit_logs (
           "schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata
         ) values ($1, $2, 'settings.school_updated', 'school_settings', $1, 'sensitive', $3, $4::jsonb)`,
        [
          tenant.schoolId,
          actor.id,
          "Updated school identity, reports, academic defaults, and configuration",
          JSON.stringify({
            brandingVersion: savedResult.rows[0]?.brandingVersion,
            currentTerm: input.currentTerm,
            academicYear: input.academicYear,
            reportPreset: reportSettings.preset,
          }),
        ],
      );

      return assertFound(savedResult.rows[0], "School settings are not configured");
    });
  }

  async saveReportSettings(actor: AuthUser, tenant: TenantContext, reportSettings: SchoolSettingsInput["reportSettings"]) {
    const currentResult = await withTransaction(async (client) => {
      const settings = await client.query<Record<string, unknown>>(
        `select * from school_settings where "schoolId" = $1`,
        [tenant.schoolId],
      );
      return settings.rows[0] ?? null;
    });
    const current = assertFound(currentResult, "School settings are not configured") as unknown as SchoolSettingsInput;
    return this.saveSchoolSettings(actor, tenant, {
      ...current,
      logoVariants: (current.logoVariants ?? {}) as SchoolSettingsInput["logoVariants"],
      reportSettings,
    });
  }
}
