import { AppError, assertFound } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import type { TenantContext } from "../domain/tenancy";
import { query, withTransaction } from "../infrastructure/database";
import type { SubjectCreateInput, SubjectUpdateInput } from "../http/configurationSchemas";

async function assertUniqueSubjectName(
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
  schoolId: string,
  name: string,
  excludedId?: string,
) {
  const duplicate = await client.query(
    `select id from subjects
     where "schoolId" = $1 and lower(trim(name)) = lower(trim($2)) and active = true
       and ($3::uuid is null or id <> $3)
     limit 1`,
    [schoolId, name, excludedId ?? null],
  );
  if (duplicate.rows[0]) {
    throw new AppError(409, "An active subject with this name already exists", {
      fieldErrors: { name: ["Use a different subject name or reactivate the existing subject"] },
    });
  }
}

export class SubjectService {
  async list(tenant: TenantContext) {
    const result = await query(
      `select id, name, code, active, "schoolType", "classLevel", "createdAt", "updatedAt"
       from subjects where "schoolId" = $1
       order by active desc, name`,
      [tenant.schoolId],
    );
    return result.rows;
  }

  async create(actor: AuthUser, tenant: TenantContext, input: SubjectCreateInput) {
    return withTransaction(async (client) => {
      await assertUniqueSubjectName(client, tenant.schoolId, input.name);
      const result = await client.query(
        `insert into subjects ("schoolId", name, code, active, "schoolType", "classLevel")
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [
          tenant.schoolId,
          input.name,
          input.code || null,
          input.active ?? true,
          input.schoolType ?? null,
          input.classLevel || null,
        ],
      );
      const subject = result.rows[0];
      await this.audit(client, actor, tenant, subject.id, "subject.created", { name: subject.name, code: subject.code });
      return subject;
    });
  }

  async update(actor: AuthUser, tenant: TenantContext, id: string, input: SubjectUpdateInput) {
    return withTransaction(async (client) => {
      const currentResult = await client.query(
        `select * from subjects where id = $1 and "schoolId" = $2 for update`,
        [id, tenant.schoolId],
      );
      const current = assertFound(currentResult.rows[0], "Subject not found");
      const nextName = input.name ?? current.name;
      const nextActive = input.active ?? current.active;
      if (nextActive) await assertUniqueSubjectName(client, tenant.schoolId, nextName, id);

      const result = await client.query(
        `update subjects set
           name = $3,
           code = $4,
           active = $5,
           "schoolType" = $6,
           "classLevel" = $7,
           "updatedAt" = now()
         where id = $1 and "schoolId" = $2
         returning *`,
        [
          id,
          tenant.schoolId,
          nextName,
          input.code === undefined ? current.code : input.code || null,
          nextActive,
          input.schoolType === undefined ? current.schoolType : input.schoolType,
          input.classLevel === undefined ? current.classLevel : input.classLevel || null,
        ],
      );
      const subject = assertFound(result.rows[0], "Subject not found");
      await this.audit(client, actor, tenant, id, nextActive ? "subject.updated" : "subject.deactivated", {
        before: { name: current.name, code: current.code, active: current.active },
        after: { name: subject.name, code: subject.code, active: subject.active },
      });
      return subject;
    });
  }

  async deactivate(actor: AuthUser, tenant: TenantContext, id: string) {
    return this.update(actor, tenant, id, { active: false });
  }

  private async audit(
    client: Parameters<Parameters<typeof withTransaction>[0]>[0],
    actor: AuthUser,
    tenant: TenantContext,
    subjectId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await client.query(
      `insert into audit_logs (
         "schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata
       ) values ($1, $2, $3, 'subjects', $4, 'sensitive', $5, $6::jsonb)`,
      [tenant.schoolId, actor.id, action, subjectId, "Changed academic subject configuration", JSON.stringify(metadata)],
    );
  }
}
