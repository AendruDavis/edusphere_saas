import "dotenv/config";
import { query, closePool } from "../infrastructure/database";
import { passwordTools } from "../infrastructure/authService";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL").trim().toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "EduSphere Admin";
  const passwordHash = passwordTools.hashPassword(password);

  const userResult = await query<{ id: string }>(
    `insert into users (name, email, role, "passwordHash", photo, dept)
     values ($1, $2, 'admin', $3, null, 'Administration')
     on conflict (email) do update
     set name = excluded.name,
         role = 'admin',
         "passwordHash" = excluded."passwordHash",
         dept = excluded.dept,
         "updatedAt" = now()
     returning id`,
    [name, email, passwordHash],
  );

  const userId = userResult.rows[0].id;
  await query(`update user_roles set active = false, "updatedAt" = now() where "userId" = $1 and active = true`, [userId]);
  await query(`insert into user_roles ("userId", role, active, "assignedAt") values ($1, 'admin', true, now())`, [userId]);

  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
