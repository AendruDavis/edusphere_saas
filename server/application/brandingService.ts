import { normalizeReportSettings, type LogoVariants, type PublicSchoolBranding, type ReportSettings } from "../../shared/reportSettings";
import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";
import { AuditService } from "./auditService";

export class BrandingService {
  constructor(private readonly auditService = new AuditService()) {}

  async getPublicBranding(slug: string): Promise<PublicSchoolBranding> {
    const result = await query(
      `select s.id as "schoolId", s.slug, s.name,
         coalesce(ss.motto, '') as motto,
         coalesce(ss."primaryColor", '#0066CC') as "primaryColor",
         coalesce(ss."secondaryColor", '#009900') as "secondaryColor",
         ss.logo,
         coalesce(ss."logoVariants", '{}'::jsonb) as "logoVariants",
         coalesce(ss."brandingVersion", 1) as "brandingVersion"
       from schools s
       join school_settings ss on ss."schoolId" = s.id
       where s.slug = $1 and s.active = true limit 1`,
      [slug.trim().toLowerCase()],
    );
    return assertFound(result.rows[0], "School branding not found") as PublicSchoolBranding;
  }

  async saveLogo(user: AuthUser, tenant: TenantContext, logo: string, variants: LogoVariants) {
    if (!tenant.roles.includes("admin")) throw new AppError(403, "Only school administrators can change branding");
    const result = await query(
      `update school_settings set logo = $2, "logoVariants" = $3::jsonb,
         "brandingVersion" = "brandingVersion" + 1, "updatedAt" = now()
       where "schoolId" = $1
       returning logo, "logoVariants", "brandingVersion"`,
      [tenant.schoolId, logo, JSON.stringify(variants)],
    );
    const saved = assertFound(result.rows[0], "School settings are not configured");
    await this.auditService.record(user, tenant, {
      action: "branding.logo_updated",
      entity: "school_settings",
      entityId: tenant.schoolId,
      riskLevel: "sensitive",
      summary: "Updated school logo",
      metadata: { brandingVersion: saved.brandingVersion },
    });
    return saved;
  }

  async saveReportSettings(user: AuthUser, tenant: TenantContext, settings: ReportSettings) {
    if (!tenant.roles.includes("admin")) throw new AppError(403, "Only school administrators can configure reports");
    const normalized = normalizeReportSettings(settings);
    const result = await query(
      `update school_settings set "reportSettings" = $2::jsonb, "updatedAt" = now()
       where "schoolId" = $1 returning "reportSettings"`,
      [tenant.schoolId, JSON.stringify(normalized)],
    );
    const saved = assertFound(result.rows[0], "School settings are not configured");
    await this.auditService.record(user, tenant, {
      action: "reports.template_updated",
      entity: "school_settings",
      entityId: tenant.schoolId,
      riskLevel: "sensitive",
      summary: "Updated report template settings",
      metadata: { preset: normalized.preset },
    });
    return saved.reportSettings;
  }
}
