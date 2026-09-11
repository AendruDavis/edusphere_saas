import "dotenv/config";
import { getPool, closePool } from "../infrastructure/database";
import { runMigrations } from "../infrastructure/migrations";

async function main() {
  const client = await getPool().connect();
  try {
    await runMigrations(client, undefined, console.log);
  } finally {
    client.release();
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
