import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { query, closePool } from "../infrastructure/database";

async function main() {
  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  await query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  for (const file of files) {
    const exists = await query<{ name: string }>(`select name from schema_migrations where name = $1`, [file]);
    if (exists.rows.length > 0) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await query("begin");
    try {
      await query(sql);
      await query(`insert into schema_migrations (name) values ($1)`, [file]);
      await query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await query("rollback");
      throw error;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
