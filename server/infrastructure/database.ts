import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { AppError } from "../domain/errors";

let pool: Pool | null = null;

type PostgresError = Error & {
  code?: string;
  constraint?: string;
  column?: string;
};

const CONSTRAINT_FIELDS: Record<string, string> = {
  users_email_key: "email",
  fee_structures_active_period_key: "className",
  subjects_active_name_key: "name",
  fee_payments_schoolId_receiptNo_key: "receiptNo",
};

export function toSafeDatabaseError(error: unknown) {
  if (error instanceof AppError) return error;
  const databaseError = error as PostgresError;
  const field = databaseError.constraint ? CONSTRAINT_FIELDS[databaseError.constraint] : databaseError.column;
  const details = field ? { fieldErrors: { [field]: ["This value conflicts with an existing record"] } } : undefined;

  if (databaseError.code === "23505") return new AppError(409, "A record with these details already exists", details);
  if (databaseError.code === "23503") return new AppError(409, "This record is still referenced and cannot be changed");
  if (databaseError.code === "23502") return new AppError(400, "A required field is missing", details);
  if (databaseError.code === "23514") return new AppError(400, "A value does not meet the required rules", details);
  if (databaseError.code === "22P02") return new AppError(400, "A field contains an invalid value", details);

  console.error("Database operation failed", {
    code: databaseError.code ?? "unknown",
    constraint: databaseError.constraint ?? null,
  });
  return new AppError(500, "Database operation failed");
}

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
    throw toSafeDatabaseError(error);
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
    throw toSafeDatabaseError(error);
  } finally {
    client.release();
  }
}
