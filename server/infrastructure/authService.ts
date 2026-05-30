import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { AppError, assertFound } from "../domain/errors";
import { isUserRole, type AuthUser, type UserRole } from "../domain/roles";
import { query } from "./database";

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

type TokenPayload = {
  sub: string;
  exp: number;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requireSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith("your-") || secret.startsWith("MY_")) {
    throw new AppError(503, "JWT_SECRET is not configured");
  }
  return secret;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signToken(userId: string) {
  const payload: TokenPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  };
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", requireSecret()).update(`${header}.${body}`).digest("base64url");
  return { token: `${header}.${body}.${signature}`, expiresAt: payload.exp };
}

function verifySignedToken(token: string) {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new AppError(401, "Invalid session");

  const expected = createHmac("sha256", requireSecret()).update(`${header}.${body}`).digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AppError(401, "Invalid session");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError(401, "Session expired");
  }

  return payload;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export class AuthService {
  async signIn(email: string, password: string, requestedRole: string) {
    if (!isUserRole(requestedRole)) {
      throw new AppError(400, "Invalid role");
    }

    const result = await query<{ id: string; passwordHash: string }>(
      `select id, "passwordHash" from users where email = $1 limit 1`,
      [normalizeEmail(email)],
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AppError(401, "Invalid credentials");
    }

    const profile = await this.loadProfile(user.id);
    if (profile.role !== requestedRole) {
      throw new AppError(403, "This account does not have the selected role");
    }

    const session = signToken(user.id);
    return {
      accessToken: session.token,
      refreshToken: session.token,
      expiresAt: session.expiresAt,
      user: profile,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const payload = verifySignedToken(token);
    return this.loadProfile(payload.sub);
  }

  async loadProfile(userId: string): Promise<AuthUser> {
    const result = await query(
      `select u.id, u.name, u.email, coalesce(ur.role, u.role) as role
       from users u
       left join user_roles ur on ur."userId" = u.id and ur.active = true
       where u.id = $1
       limit 1`,
      [userId],
    );

    const profile = assertFound(result.rows[0], "User profile not found") as Omit<AuthUser, "role"> & { role: string };
    if (!isUserRole(profile.role)) {
      throw new AppError(403, "User role is invalid");
    }

    return { ...profile, role: profile.role };
  }

  async createUser(input: CreateUserInput) {
    const email = normalizeEmail(input.email);
    const result = await query(
      `insert into users (name, email, role, "passwordHash", photo, dept)
       values ($1, $2, $3, $4, $5, $6)
       returning id, name, email, role, photo, dept, "createdAt", "updatedAt"`,
      [input.name, email, input.role, hashPassword(input.password), input.photo ?? null, input.dept ?? null],
    );
    const user = result.rows[0];
    await this.assignActiveRole(String(user.id), input.role);
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const updates: Record<string, unknown> = {
      ...input,
      email: input.email ? normalizeEmail(input.email) : undefined,
      password: undefined,
      passwordHash: input.password ? hashPassword(input.password) : undefined,
      updatedAt: new Date().toISOString(),
    };

    const clean = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
    const keys = Object.keys(clean);
    const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `update users set ${assignments} where id = $${keys.length + 1} returning id, name, email, role, photo, dept, "createdAt", "updatedAt"`,
      [...values, id],
    );

    if (input.role) {
      await this.assignActiveRole(id, input.role);
    }

    return result.rows[0];
  }

  async deleteUser(id: string) {
    await query(`delete from users where id = $1`, [id]);
    return { success: true };
  }

  private async assignActiveRole(userId: string, role: UserRole) {
    const now = new Date().toISOString();
    await query(`update user_roles set active = false, "updatedAt" = $2 where "userId" = $1 and active = true`, [userId, now]);
    await query(`insert into user_roles ("userId", role, active, "assignedAt") values ($1, $2, true, $3)`, [userId, role, now]);
  }
}

export const passwordTools = {
  hashPassword,
};
