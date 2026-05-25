import "dotenv/config";
import { getSupabaseAdminClient } from "../infrastructure/supabaseClient";

type ListedAuthUser = {
  id: string;
  email?: string | null;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function findUserByEmail(email: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = (data.users ?? []) as ListedAuthUser[];
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  const client = getSupabaseAdminClient();
  const email = requireEnv("ADMIN_EMAIL").trim().toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "EduSphere Admin";

  let authUser = await findUserByEmail(email);

  if (!authUser) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "admin" },
    });
    if (error || !data.user) throw error ?? new Error("Failed to create admin auth user");
    authUser = data.user;
  } else {
    const { error } = await client.auth.admin.updateUserById(authUser.id, {
      password,
      user_metadata: { name, role: "admin" },
    });
    if (error) throw error;
  }

  const { error: profileError } = await client.from("users").upsert(
    {
      id: authUser.id,
      name,
      email,
      role: "admin",
      photo: null,
      dept: "Administration",
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  await client.from("user_roles").update({ active: false, updatedAt: new Date().toISOString() }).eq("userId", authUser.id).eq("active", true);
  const { error: roleError } = await client.from("user_roles").insert({
    userId: authUser.id,
    role: "admin",
    active: true,
    assignedAt: new Date().toISOString(),
  });
  if (roleError) throw roleError;

  console.log(`Admin user ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
