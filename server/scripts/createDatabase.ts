import "dotenv/config";
import { Client } from "pg";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const databaseUrl = new URL(requireEnv("DATABASE_URL"));
  const databaseName = databaseUrl.pathname.replace(/^\//, "");
  if (!databaseName) throw new Error("DATABASE_URL must include a database name");

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = "/postgres";

  const client = new Client({
    connectionString: maintenanceUrl.toString(),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [databaseName]);
    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`Database already exists: ${databaseName}`);
      return;
    }

    await client.query(`create database ${quoteIdentifier(databaseName)}`);
    console.log(`Created database: ${databaseName}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
