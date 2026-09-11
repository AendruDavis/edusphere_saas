import "dotenv/config";
import { checkConfigurationIntegrity } from "../application/configurationIntegrity";
import { closePool, getPool } from "../infrastructure/database";

async function main() {
  const client=await getPool().connect();
  try {
    const result=await checkConfigurationIntegrity(client,process.argv.includes("--post"));
    console.log(JSON.stringify(result,null,2));
    if(!result.ok) process.exitCode=1;
  } finally { client.release(); }
}

main().catch(error=>{ console.error(error instanceof Error?error.message:"Configuration check failed"); process.exitCode=1; }).finally(closePool);
