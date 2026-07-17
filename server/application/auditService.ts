import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query } from "../infrastructure/database";

export type AuditRiskLevel = "standard" | "sensitive" | "restricted";

export class AuditService {
  async record(
    actor: AuthUser | null,
    tenant: TenantContext | { schoolId: string } | null,
    input: {
      action: string;
      entity: string;
      entityId?: string | null;
      riskLevel?: AuditRiskLevel;
      summary?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await query(
      `insert into audit_logs (
         "schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata
       ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        tenant?.schoolId ?? null,
        actor?.id ?? null,
        input.action,
        input.entity,
        input.entityId ?? null,
        input.riskLevel ?? "standard",
        input.summary ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
