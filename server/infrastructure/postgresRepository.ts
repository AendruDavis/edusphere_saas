import { query } from "./database";

export type RecordData = Record<string, unknown>;

function cleanUndefined<T extends RecordData>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function quoteIdent(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function tableName(table: string) {
  return table
    .split(".")
    .map((part) => quoteIdent(part))
    .join(".");
}

function preparePayload<T extends RecordData>(payload: T) {
  return cleanUndefined(payload);
}

export class PostgresRepository {
  async list(table: string, schoolId: string) {
    const result = await query(`select * from ${tableName(table)} where "schoolId" = $1 order by "createdAt" desc`, [schoolId]);
    return result.rows;
  }

  async getById(table: string, id: string, schoolId: string) {
    const result = await query(`select * from ${tableName(table)} where id = $1 and "schoolId" = $2 limit 1`, [id, schoolId]);
    return result.rows[0] ?? null;
  }

  async create<T extends RecordData>(table: string, payload: T, schoolId: string) {
    const clean = preparePayload({ ...payload, schoolId });
    const keys = Object.keys(clean);
    const columns = keys.map(quoteIdent).join(", ");
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `insert into ${tableName(table)} (${columns}) values (${placeholders}) returning *`,
      values,
    );
    return result.rows[0];
  }

  async update<T extends RecordData>(table: string, id: string, payload: T, schoolId: string) {
    const clean = preparePayload({ ...payload, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const assignments = keys.map((key, index) => `${quoteIdent(key)} = $${index + 1}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `update ${tableName(table)} set ${assignments} where id = $${keys.length + 1} and "schoolId" = $${keys.length + 2} returning *`,
      [...values, id, schoolId],
    );
    return result.rows[0];
  }

  async delete(table: string, id: string, schoolId: string) {
    await query(`delete from ${tableName(table)} where id = $1 and "schoolId" = $2`, [id, schoolId]);
    return { success: true };
  }

  async upsertSettings(payload: RecordData, schoolId: string) {
    const clean = preparePayload({ id: true, ...payload, schoolId, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const columns = keys.map(quoteIdent).join(", ");
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const updates = keys
      .filter((key) => key !== "schoolId")
      .map((key) => `${quoteIdent(key)} = excluded.${quoteIdent(key)}`)
      .join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `insert into "school_settings" (${columns}) values (${placeholders}) on conflict ("schoolId") do update set ${updates} returning *`,
      values,
    );
    return result.rows[0];
  }

  async getSettings(schoolId: string) {
    const result = await query(`select * from "school_settings" where "schoolId" = $1 limit 1`, [schoolId]);
    return result.rows[0] ?? null;
  }

  async listUsers(schoolId: string) {
    const result = await query(
      `select u.id, u.name, u.email, sm.role, u.photo, u.dept, u."createdAt", u."updatedAt"
       from school_memberships sm
       join users u on u.id = sm."userId"
       where sm."schoolId" = $1 and sm.active = true
       order by u."createdAt" desc`,
      [schoolId],
    );
    return result.rows;
  }

  async call<T = unknown>(functionName: string, args: RecordData) {
    const values = Object.values(args);
    const result = await query(`select ${tableName(functionName)}($1::jsonb) as data`, [values[0] ?? {}]);
    return result.rows[0]?.data as T;
  }
}
