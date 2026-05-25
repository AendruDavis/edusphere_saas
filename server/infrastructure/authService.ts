import { AppError, assertFound } from "../domain/errors";
import { isUserRole, type AuthUser, type UserRole } from "../domain/roles";
import { getSupabaseAdminClient, getSupabasePublicClient } from "./supabaseClient";

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  photo?: string | null;
  dept?: string;
};

type UpdateUserInput = Partial<Omit<CreateUserInput, "password">> & {
  password?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export class AuthService {
  async signIn(email: string, password: string, requestedRole: string) {
    if (!isUserRole(requestedRole)) {
      throw new AppError(400, "Invalid role");
    }

    const authClient = getSupabasePublicClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error || !data.session || !data.user) {
      throw new AppError(401, error?.message || "Invalid credentials");
    }

    const profile = await this.loadProfile(data.user.id);
    if (profile.role !== requestedRole) {
      throw new AppError(403, "This account does not have the selected role");
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: profile,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, error?.message || "Invalid session");
    }

    return this.loadProfile(data.user.id);
  }

  async loadProfile(userId: string): Promise<AuthUser> {
    const client = getSupabaseAdminClient();
    const { data, error } = await client.from("users").select("id,name,email,role").eq("id", userId).maybeSingle();
    if (error) throw new AppError(500, error.message, error);

    const profile = assertFound(data, "User profile not found") as Omit<AuthUser, "role"> & { role: string };
    const { data: activeRole, error: roleError } = await client
      .from("user_roles")
      .select("role")
      .eq("userId", userId)
      .eq("active", true)
      .maybeSingle();
    if (roleError) throw new AppError(500, roleError.message, roleError);

    const role = String(activeRole?.role || profile.role);
    if (!isUserRole(role)) {
      throw new AppError(403, "User role is invalid");
    }

    return { ...profile, role };
  }

  async createUser(input: CreateUserInput) {
    const client = getSupabaseAdminClient();
    const email = normalizeEmail(input.email);
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
        role: input.role,
      },
    });

    if (error || !data.user) {
      throw new AppError(400, error?.message || "Failed to create auth user", error);
    }

    const profile = {
      id: data.user.id,
      name: input.name,
      email,
      role: input.role,
      photo: input.photo ?? null,
      dept: input.dept,
    };

    const { data: user, error: profileError } = await client.from("users").insert(profile).select("*").single();
    if (profileError) {
      await client.auth.admin.deleteUser(data.user.id);
      throw new AppError(500, profileError.message, profileError);
    }

    try {
      await this.assignActiveRole(data.user.id, input.role);
    } catch (error) {
      await client.auth.admin.deleteUser(data.user.id);
      throw error;
    }

    return user;
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const client = getSupabaseAdminClient();
    const authUpdate: Record<string, unknown> = {};
    if (input.email) authUpdate.email = normalizeEmail(input.email);
    if (input.password) authUpdate.password = input.password;
    if (input.name || input.role) {
      authUpdate.user_metadata = {
        ...(input.name ? { name: input.name } : {}),
        ...(input.role ? { role: input.role } : {}),
      };
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error } = await client.auth.admin.updateUserById(id, authUpdate);
      if (error) throw new AppError(400, error.message, error);
    }

    const update = {
      ...input,
      email: input.email ? normalizeEmail(input.email) : undefined,
      password: undefined,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await client.from("users").update(update).eq("id", id).select("*").single();
    if (error) throw new AppError(500, error.message, error);

    if (input.role) {
      await this.assignActiveRole(id, input.role);
    }

    return data;
  }

  async deleteUser(id: string) {
    const client = getSupabaseAdminClient();
    const { error: profileError } = await client.from("users").delete().eq("id", id);
    if (profileError) throw new AppError(500, profileError.message, profileError);

    const { error } = await client.auth.admin.deleteUser(id);
    if (error && !error.message.toLowerCase().includes("user not found")) {
      throw new AppError(400, error.message, error);
    }

    return { success: true };
  }

  private async assignActiveRole(userId: string, role: UserRole) {
    const client = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error: deactivateError } = await client
      .from("user_roles")
      .update({ active: false, updatedAt: now })
      .eq("userId", userId)
      .eq("active", true);
    if (deactivateError) throw new AppError(500, deactivateError.message, deactivateError);

    const { error } = await client.from("user_roles").insert({
      userId,
      role,
      active: true,
      assignedAt: now,
    });
    if (error) throw new AppError(500, error.message, error);
  }
}
