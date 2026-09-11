import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { runMigrations } from "../infrastructure/migrations";
import { validateTestTarget } from "./testTarget";

async function removeTestUploads(directory: string) {
  if (!directory) return;
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("edusphere-config-uploads-")) {
    throw new Error("Refusing to remove a directory outside the temporary test-upload root");
  }
  await fs.rm(resolved, { recursive: true, force: true });
}

export async function openTestHarness() {
  dotenv.config({ quiet: true });
  const target = validateTestTarget(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.TEST_POSTGRES_MAJOR);
  const client = new pg.Client({ connectionString: target.connectionString, connectionTimeoutMillis: 5000, statement_timeout: 15000,
    ssl: process.env.TEST_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  let uploads = "";
  try {
    const actual = (await client.query("select current_database() as name, current_setting('server_version_num')::int as version")).rows[0];
    if (actual.name !== target.databaseName || Math.floor(actual.version / 10000) !== target.major) {
      throw new Error("Test database identity or PostgreSQL major version does not match the declared target");
    }
    const lock = await client.query("select pg_try_advisory_lock(hashtext('edusphere:test-harness')) as locked");
    if (!lock.rows[0].locked) throw new Error("Another configuration test suite is using this database");
    const owned = (await client.query("select to_regclass('edusphere_test_control.ownership') as marker")).rows[0].marker;
    if (!owned) {
      const tables = await client.query(`select 1 from information_schema.tables
        where table_schema not in ('pg_catalog','information_schema') limit 1`);
      if (tables.rowCount) throw new Error("Refusing to reset a nonempty database not created by the EduSphere test harness");
      await client.query(`create schema edusphere_test_control;
        create table edusphere_test_control.ownership (database_name text primary key);
        insert into edusphere_test_control.ownership values (current_database())`);
    }
    const marker = await client.query("select 1 from edusphere_test_control.ownership where database_name = current_database()");
    if (!marker.rowCount) throw new Error("Test database ownership marker does not match");
    uploads = await fs.mkdtemp(path.join(os.tmpdir(), "edusphere-config-uploads-"));
    const env = { ...process.env, DATABASE_URL: target.connectionString,
      DATABASE_SSL: process.env.TEST_DATABASE_SSL || "false", JWT_SECRET: randomBytes(48).toString("hex"),
      UPLOAD_ROOT: uploads, NODE_ENV: "test" };
    // Empty values prevent dotenv from re-enabling configured external providers in child processes.
    for (const key of Object.keys(env)) {
      if (/SMTP|TWILIO|SENDGRID|WHATSAPP|SMS_|GEMINI|OPENAI|INTEGRATION_WEBHOOK/.test(key)) env[key] = "";
    }
    return {
      client, env, uploads,
      async resetSchema() {
        const current = await client.query("select current_database() as name");
        if (current.rows[0].name !== target.databaseName) throw new Error("Test target changed");
        await client.query("drop schema public cascade; create schema public");
      },
      async migrate(through?: string) { return runMigrations(client, through); },
      async close() {
        await client.end();
        await removeTestUploads(uploads);
      },
    };
  } catch (error) {
    await client.end();
    await removeTestUploads(uploads);
    throw error;
  }
}

export type TestHarness = Awaited<ReturnType<typeof openTestHarness>>;
