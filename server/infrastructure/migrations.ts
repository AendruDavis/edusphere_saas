import fs from "node:fs/promises";
import path from "node:path";
import type { ClientBase } from "pg";

export async function runMigrations(client: ClientBase, through?: string, log: (message: string) => void = () => {}) {
  const directory = path.join(process.cwd(), "database", "migrations");
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  if (through && !files.includes(through)) throw new Error("Unknown migration boundary");
  await client.query("select pg_advisory_lock(hashtext('edusphere:migrations'))");
  const applied: string[] = [];
  try {
    await client.query(`create table if not exists schema_migrations (
      name text primary key, applied_at timestamptz not null default now()
    )`);
    for (const file of files) {
      if (through && file > through) break;
      const exists = await client.query("select name from schema_migrations where name = $1", [file]);
      if (exists.rowCount) { log(`Skipping ${file}`); continue; }
      const sql = await fs.readFile(path.join(directory, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      applied.push(file);
      log(`Applied ${file}`);
    }
    return applied;
  } finally {
    await client.query("select pg_advisory_unlock(hashtext('edusphere:migrations'))");
  }
}
