import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { AppError } from "../domain/errors";

let pool: Pool | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new AppError(503, `${name} is not configured`);
  }
  if (value.startsWith("your-") || value.startsWith("MY_")) {
    throw new AppError(503, `${name} is still set to the placeholder value`);
  }
  return value;
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: requireEnv("DATABASE_URL"),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  try {
    return await getPool().query<T>(text, values);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database operation failed";
    throw new AppError(500, message, error);
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
