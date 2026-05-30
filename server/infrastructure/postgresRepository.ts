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
  async list(table: string) {
    const result = await query(`select * from ${tableName(table)} order by "createdAt" desc`);
    return result.rows;
  }

  async getById(table: string, id: string) {
    const result = await query(`select * from ${tableName(table)} where id = $1 limit 1`, [id]);
    return result.rows[0] ?? null;
  }

  async create<T extends RecordData>(table: string, payload: T) {
    const clean = preparePayload(payload);
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

  async update<T extends RecordData>(table: string, id: string, payload: T) {
    const clean = preparePayload({ ...payload, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const assignments = keys.map((key, index) => `${quoteIdent(key)} = $${index + 1}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `update ${tableName(table)} set ${assignments} where id = $${keys.length + 1} returning *`,
      [...values, id],
    );
    return result.rows[0];
  }

  async delete(table: string, id: string) {
    await query(`delete from ${tableName(table)} where id = $1`, [id]);
    return { success: true };
  }

  async upsertSettings(payload: RecordData) {
    const clean = preparePayload({ id: true, ...payload, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const columns = keys.map(quoteIdent).join(", ");
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const updates = keys
      .filter((key) => key !== "id")
      .map((key) => `${quoteIdent(key)} = excluded.${quoteIdent(key)}`)
      .join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `insert into "school_settings" (${columns}) values (${placeholders}) on conflict (id) do update set ${updates} returning *`,
      values,
    );
    return result.rows[0];
  }

  async getSettings() {
    const result = await query(`select * from "school_settings" where id = true limit 1`);
    return result.rows[0] ?? null;
  }

  async call<T = unknown>(functionName: string, args: RecordData) {
    const values = Object.values(args);
    const result = await query(`select ${tableName(functionName)}($1::jsonb) as data`, [values[0] ?? {}]);
    return result.rows[0]?.data as T;
  }
}
