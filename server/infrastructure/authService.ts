import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError, assertFound } from "../domain/errors";
import {
  isPlatformRole,
  isSchoolRole,
  isUserRole,
  primarySchoolRole,
  type AuthUser,
  type PlatformRole,
  type SchoolRole,
  type UserRole,
} from "../domain/roles";
import { query, withTransaction } from "./database";
import type { AuthorizationMode, SchoolMembership, TenantContext } from "../domain/tenancy";

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role?: SchoolRole;
  roles?: SchoolRole[];
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
  if (!secret || secret.startsWith("your-") || secret.startsWith("MY_") || Buffer.byteLength(secret, "utf8") < 32) {
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
  const [header, body, signature, extra] = token.split(".");
  if (!header || !body || !signature || extra) throw new AppError(401, "Invalid session");

  const expected = Buffer.from(createHmac("sha256", requireSecret()).update(`${header}.${body}`).digest("base64url"));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(supplied, expected)) {
    throw new AppError(401, "Invalid session");
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    throw new AppError(401, "Invalid session");
  }
  if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) {
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

function normalizeSchoolRoles(input: unknown, fallback?: unknown): SchoolRole[] {
  const values = Array.isArray(input) ? input : fallback ? [fallback] : [];
  const roles = [...new Set(values.filter((value): value is SchoolRole => typeof value === "string" && isSchoolRole(value)))];
  if (roles.length === 0) throw new AppError(400, "At least one valid school role is required");
  return roles;
}

function parseMembershipRoles(value: unknown, fallback: unknown): SchoolRole[] {
  const candidates = Array.isArray(value) ? value : [];
  const roles = [...new Set(candidates.filter((role): role is SchoolRole => typeof role === "string" && isSchoolRole(role)))];
  if (roles.length > 0) return roles;
  if (typeof fallback === "string" && isSchoolRole(fallback)) return [fallback];
  return fallback === "super_admin" ? ["admin"] : [];
}

export class AuthService {
  async signIn(email: string, password: string, schoolSlug?: string) {
    const result = await query<{ id: string; passwordHash: string }>(
      `select id, "passwordHash" from users where email = $1 limit 1`,
      [normalizeEmail(email)],
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AppError(401, "Invalid credentials");
    }

    let preferredSchoolId: string | null = null;
    if (schoolSlug) {
      const membership = await query<{ schoolId: string }>(
        `select sm."schoolId"
         from school_memberships sm
         join schools s on s.id = sm."schoolId" and s.active = true
         where sm."userId" = $1 and sm.active = true and s.slug = $2
         limit 1`,
        [user.id, schoolSlug.trim().toLowerCase()],
      );
      if (!membership.rows[0]) throw new AppError(403, "This account does not belong to the requested school");
      preferredSchoolId = membership.rows[0].schoolId;
    }

    const profile = await this.loadProfile(user.id);
    const session = signToken(user.id);
    return {
      accessToken: session.token,
      refreshToken: session.token,
      expiresAt: session.expiresAt,
      preferredSchoolId,
      user: profile,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const payload = verifySignedToken(token);
    return this.loadProfile(payload.sub);
  }

  async listSchoolMemberships(userId: string): Promise<SchoolMembership[]> {
    const result = await query<{
      schoolId: string;
      schoolName: string;
      schoolSlug: string;
      role: string;
      roles: string[];
    }>(
      `select sm."schoolId", s.name as "schoolName", s.slug as "schoolSlug", sm.role,
         coalesce(array_agg(smr.role order by smr.role) filter (where smr.role is not null), array[]::text[]) as roles
       from school_memberships sm
       join schools s on s.id = sm."schoolId" and s.active = true
       left join school_membership_roles smr on smr."membershipId" = sm.id
       where sm."userId" = $1 and sm.active = true
       group by sm.id, s.id
       order by s.name`,
      [userId],
    );

    return result.rows.flatMap((membership) => {
      const roles = parseMembershipRoles(membership.roles, membership.role);
      return roles.length ? [{ ...membership, roles, role: primarySchoolRole(roles) }] : [];
    });
  }

  async resolveTenant(userId: string, schoolId: string): Promise<TenantContext> {
    const result = await query<{
      role: string;
      roles: string[];
      authorizationMode: AuthorizationMode;
      platformRole: string | null;
    }>(
      `select sm.role,
         coalesce(array_agg(smr.role order by smr.role) filter (where smr.role is not null), array[]::text[]) as roles,
         s."authorizationMode", u."platformRole"
       from school_memberships sm
       join schools s on s.id = sm."schoolId" and s.active = true
       join users u on u.id = sm."userId"
       left join school_membership_roles smr on smr."membershipId" = sm.id
       where sm."userId" = $1 and sm."schoolId" = $2 and sm.active = true
       group by sm.id, s.id, u.id
       limit 1`,
      [userId, schoolId],
    );
    const membership = result.rows[0];
    if (membership) {
      const roles = parseMembershipRoles(membership.roles, membership.role);
      if (roles.length === 0) throw new AppError(403, "School membership has no active role");
      return {
        schoolId,
        userId,
        roles,
        role: primarySchoolRole(roles),
        platformRole: membership.platformRole && isPlatformRole(membership.platformRole) ? membership.platformRole : null,
        supportAccess: false,
        authorizationMode: membership.authorizationMode,
      };
    }

    const support = await query<{ platformRole: string; authorizationMode: AuthorizationMode }>(
      `select u."platformRole", s."authorizationMode"
       from users u
       join support_access_sessions sas on sas."actorId" = u.id
         and sas."schoolId" = $2 and sas."revokedAt" is null and sas."expiresAt" > now()
       join schools s on s.id = sas."schoolId" and s.active = true
       where u.id = $1 and u."platformRole" = 'super_admin'
       order by sas."createdAt" desc limit 1`,
      [userId, schoolId],
    );
    if (!support.rows[0]) throw new AppError(404, "School membership was not found");
    return {
      schoolId,
      userId,
      roles: ["admin"],
      role: "admin",
      platformRole: "super_admin",
      supportAccess: true,
      authorizationMode: support.rows[0].authorizationMode,
    };
  }

  async loadProfile(userId: string): Promise<AuthUser> {
    const result = await query<{
      id: string;
      name: string;
      email: string;
      role: string;
      platformRole: string | null;
    }>(
      `select u.id, u.name, u.email, coalesce(ur.role, u.role) as role, u."platformRole"
       from users u
       left join user_roles ur on ur."userId" = u.id and ur.active = true
       where u.id = $1
       order by ur."assignedAt" desc nulls last
       limit 1`,
      [userId],
    );

    const profile = assertFound(result.rows[0], "User profile not found");
    const platformRole: PlatformRole | null = profile.platformRole && isPlatformRole(profile.platformRole)
      ? profile.platformRole
      : null;
    const role: UserRole = platformRole ?? (isUserRole(profile.role) ? profile.role : "student");
    return { id: profile.id, name: profile.name, email: profile.email, role, platformRole };
  }

  async createUser(input: CreateUserInput, schoolId: string, actorId?: string) {
    const email = normalizeEmail(input.email);
    const roles = normalizeSchoolRoles(input.roles, input.role);
    return withTransaction(async (client) => {
      const existing = await client.query(`select id from users where email = $1 limit 1`, [email]);
      if (existing.rows[0]) throw new AppError(409, "A user with this email already exists");

      const role = primarySchoolRole(roles);
      const result = await client.query(
        `insert into users (name, email, role, "passwordHash", photo, dept)
         values ($1, $2, $3, $4, $5, $6)
         returning id, name, email, role, photo, dept, "createdAt", "updatedAt"`,
        [input.name, email, role, hashPassword(input.password), input.photo ?? null, input.dept ?? null],
      );
      const user = result.rows[0];
      await client.query(
        `insert into user_roles ("userId", role, active, "assignedBy", "assignedAt") values ($1, $2, true, $3, now())`,
        [user.id, role, actorId ?? null],
      );
      const membership = await client.query<{ id: string }>(
        `insert into school_memberships ("schoolId", "userId", role)
         values ($1, $2, $3) returning id`,
        [schoolId, user.id, role],
      );
      for (const assignedRole of roles) {
        await client.query(
          `insert into school_membership_roles ("membershipId", role, "assignedBy") values ($1, $2, $3)`,
          [membership.rows[0].id, assignedRole, actorId ?? null],
        );
      }
      await this.writeAccessAudit(client, schoolId, actorId, String(user.id), [], roles, "user.access_created");
      return { ...user, roles };
    });
  }

  async updateUser(id: string, input: UpdateUserInput, schoolId?: string, actorId?: string) {
    return withTransaction(async (client) => {
      const updates: Record<string, unknown> = {
        name: input.name,
        email: input.email ? normalizeEmail(input.email) : undefined,
        photo: input.photo,
        dept: input.dept,
        passwordHash: input.password ? hashPassword(input.password) : undefined,
        updatedAt: new Date().toISOString(),
      };
      const clean = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
      const keys = Object.keys(clean);
      let user: Record<string, unknown>;
      if (keys.length > 1) {
        const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
        const values = keys.map((key) => clean[key]);
        const result = await client.query(
          `update users set ${assignments} where id = $${keys.length + 1}
           returning id, name, email, role, photo, dept, "createdAt", "updatedAt"`,
          [...values, id],
        );
        user = assertFound(result.rows[0], "User not found");
      } else {
        const result = await client.query(
          `select id, name, email, role, photo, dept, "createdAt", "updatedAt" from users where id = $1`,
          [id],
        );
        user = assertFound(result.rows[0], "User not found");
      }

      let roles: SchoolRole[] | undefined;
      if (schoolId && (input.roles || input.role)) {
        roles = normalizeSchoolRoles(input.roles, input.role);
        await this.replaceMembershipRoles(client, schoolId, id, roles, actorId);
      }
      return { ...user, ...(roles ? { role: primarySchoolRole(roles), roles } : {}) };
    });
  }

  async removeUserFromSchool(id: string, schoolId: string, actorId?: string) {
    return withTransaction(async (client) => {
      await client.query(`select id from schools where id = $1 for update`, [schoolId]);
      const membership = await this.lockMembership(client, schoolId, id);
      const oldRoles = await this.membershipRoles(client, membership.id, membership.role);
      if (actorId === id) throw new AppError(400, "You cannot remove your own school access");
      await this.assertAdminRemains(client, schoolId, id, oldRoles, []);
      await client.query(
        `update school_memberships set active = false, "updatedAt" = now() where id = $1`,
        [membership.id],
      );
      await this.writeAccessAudit(client, schoolId, actorId, id, oldRoles, [], "user.access_removed");
      return { success: true };
    });
  }

  async createSupportSession(actor: AuthUser, input: { schoolId: string; reason: string; durationMinutes?: number }) {
    if (actor.platformRole !== "super_admin") throw new AppError(403, "Platform administrator access is required");
    const durationMinutes = Math.max(5, Math.min(input.durationMinutes ?? 30, 60));
    const result = await query(
      `insert into support_access_sessions ("schoolId", "actorId", reason, "expiresAt")
       select s.id, $1, $3, now() + ($4::text || ' minutes')::interval
       from schools s where s.id = $2 and s.active = true
       returning id, "schoolId", reason, "expiresAt", "createdAt"`,
      [actor.id, input.schoolId, input.reason.trim(), durationMinutes],
    );
    const session = assertFound(result.rows[0], "School not found");
    await query(
      `insert into audit_logs ("schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata)
       values ($1, $2, 'support.session_started', 'support_access_sessions', $3, 'restricted', $4, $5::jsonb)`,
      [input.schoolId, actor.id, session.id, input.reason.trim(), JSON.stringify({ durationMinutes })],
    );
    return session;
  }

  async linkUserRecord(
    actor: AuthUser,
    schoolId: string,
    kind: "parent" | "student" | "staff",
    recordId: string,
    userId: string,
  ) {
    const definitions = {
      parent: { table: "parent_user_links", column: "parentId", recordTable: "parents" },
      student: { table: "student_user_links", column: "studentId", recordTable: "students" },
      staff: { table: "staff_user_links", column: "staffId", recordTable: "staff" },
    } as const;
    const definition = definitions[kind];
    return withTransaction(async (client) => {
      const membership = await client.query(
        `select sm.id from school_memberships sm
         join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = $3
         where sm."schoolId" = $1 and sm."userId" = $2 and sm.active = true`,
        [schoolId, userId, kind],
      );
      if (!membership.rows[0]) throw new AppError(400, `The user does not have the ${kind} role in this school`);
      const record = await client.query(`select id from ${definition.recordTable} where id = $1 and "schoolId" = $2`, [recordId, schoolId]);
      if (!record.rows[0]) throw new AppError(404, `${kind} record not found`);
      const linked = await client.query(
        `select "userId" from ${definition.table} where "schoolId" = $1 and "${definition.column}" = $2 and active = true`,
        [schoolId, recordId],
      );
      if (linked.rows[0] && linked.rows[0].userId !== userId) throw new AppError(409, `This ${kind} record is already linked to another user`);
      const result = await client.query(
        `insert into ${definition.table} ("schoolId", "${definition.column}", "userId", "linkedBy")
         values ($1, $2, $3, $4)
         on conflict ("schoolId", "userId") do update set
           "${definition.column}" = excluded."${definition.column}", active = true,
           "linkedBy" = excluded."linkedBy", "updatedAt" = now()
         returning *`,
        [schoolId, recordId, userId, actor.id],
      );
      await this.writeAccessAudit(client, schoolId, actor.id, userId, [], [], `user.${kind}_linked`, { recordId });
      return result.rows[0];
    });
  }

  private async replaceMembershipRoles(
    client: PoolClient,
    schoolId: string,
    userId: string,
    roles: SchoolRole[],
    actorId?: string,
  ) {
    await client.query(`select id from schools where id = $1 for update`, [schoolId]);
    const membership = await this.lockMembership(client, schoolId, userId);
    const oldRoles = await this.membershipRoles(client, membership.id, membership.role);
    if (actorId === userId && oldRoles.join("|") !== roles.slice().sort().join("|")) {
      throw new AppError(400, "You cannot change your own school roles");
    }
    await this.assertAdminRemains(client, schoolId, userId, oldRoles, roles);
    await client.query(`delete from school_membership_roles where "membershipId" = $1`, [membership.id]);
    for (const role of roles) {
      await client.query(
        `insert into school_membership_roles ("membershipId", role, "assignedBy") values ($1, $2, $3)`,
        [membership.id, role, actorId ?? null],
      );
    }
    await client.query(
      `update school_memberships set role = $2, active = true, "updatedAt" = now() where id = $1`,
      [membership.id, primarySchoolRole(roles)],
    );
    await this.writeAccessAudit(client, schoolId, actorId, userId, oldRoles, roles, "user.access_updated");
  }

  private async lockMembership(client: PoolClient, schoolId: string, userId: string) {
    const result = await client.query<{ id: string; role: string }>(
      `select id, role from school_memberships
       where "schoolId" = $1 and "userId" = $2 and active = true for update`,
      [schoolId, userId],
    );
    return assertFound(result.rows[0], "Active school membership not found");
  }

  private async membershipRoles(client: PoolClient, membershipId: string, fallbackRole: string) {
    const result = await client.query<{ role: string }>(
      `select role from school_membership_roles where "membershipId" = $1 order by role`,
      [membershipId],
    );
    return parseMembershipRoles(result.rows.map((row) => row.role), fallbackRole);
  }

  private async assertAdminRemains(
    client: PoolClient,
    schoolId: string,
    userId: string,
    oldRoles: SchoolRole[],
    newRoles: SchoolRole[],
  ) {
    if (!oldRoles.includes("admin") || newRoles.includes("admin")) return;
    const result = await client.query<{ count: string }>(
      `select count(distinct sm.id)::text as count
       from school_memberships sm
       join school_membership_roles smr on smr."membershipId" = sm.id and smr.role = 'admin'
       where sm."schoolId" = $1 and sm."userId" <> $2 and sm.active = true`,
      [schoolId, userId],
    );
    if (Number(result.rows[0]?.count ?? 0) === 0) {
      throw new AppError(409, "The school must keep at least one active administrator");
    }
  }

  private async writeAccessAudit(
    client: PoolClient,
    schoolId: string,
    actorId: string | undefined,
    targetUserId: string,
    oldRoles: SchoolRole[],
    newRoles: SchoolRole[],
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    await client.query(
      `insert into audit_logs ("schoolId", "actorId", action, entity, "entityId", "riskLevel", summary, metadata)
       values ($1, $2, $3, 'school_memberships', $4, 'restricted', $5, $6::jsonb)`,
      [
        schoolId,
        actorId ?? null,
        action,
        targetUserId,
        "Changed school access",
        JSON.stringify({ oldRoles, newRoles, ...extra }),
      ],
    );
  }
}

export const passwordTools = {
  hashPassword,
};
