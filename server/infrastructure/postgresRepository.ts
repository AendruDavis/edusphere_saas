import { query } from "./database";

export type RecordData = Record<string, unknown>;

function cleanUndefined<T extends RecordData>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function quoteIdent(identifier: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function tableName(table: string) {
  return table
    .split(".")
    .map((part) => quoteIdent(part))
    .join(".");
}

const RESOURCE_JSON_FIELDS: Record<string, ReadonlySet<string>> = {
  fee_structures: new Set(["items"]),
  vehicles: new Set(["lastLocation"]),
  routes: new Set(["stops"]),
  dormitories: new Set(["rooms"]),
  dorm_rooms: new Set(["occupants"]),
};

function isResourceJsonField(table: string, key: string) {
  return RESOURCE_JSON_FIELDS[table]?.has(key) ?? false;
}

function preparePayload<T extends RecordData>(table: string, payload: T) {
  const clean = cleanUndefined(payload);
  return Object.fromEntries(Object.entries(clean).map(([key, value]) => [
    key,
    isResourceJsonField(table, key) ? JSON.stringify(value) : value,
  ])) as T;
}

const SCHOOL_SETTINGS_JSON_FIELDS = new Set<string>([
  "classes",
  "classFees",
  "gradingScale",
  "notificationSettings",
  "logoVariants",
  "reportSettings",
]);

function isSchoolSettingsJsonField(key: string) {
  return SCHOOL_SETTINGS_JSON_FIELDS.has(key);
}

export function serializeSchoolSettingsValue(key: string, value: unknown) {
  return isSchoolSettingsJsonField(key) ? JSON.stringify(value) : value;
}

export class PostgresRepository {
  async list(table: string, schoolId: string) {
    const result = await query(`select * from ${tableName(table)} where "schoolId" = $1 order by "createdAt" desc`, [schoolId]);
    return result.rows;
  }

  async listByStudentIds(table: string, schoolId: string, studentIds: string[], studentColumn = "studentId") {
    if (studentIds.length === 0) return [];
    const result = await query(
      `select * from ${tableName(table)}
       where "schoolId" = $1 and ${quoteIdent(studentColumn)} = any($2::uuid[])
       order by "createdAt" desc`,
      [schoolId, studentIds],
    );
    return result.rows;
  }

  async listAttendanceByStudentIds(schoolId: string, studentIds: string[]) {
    if (studentIds.length === 0) return [];
    const result = await query(
      `select * from attendance_records
       where "schoolId" = $1
         and ("studentRefId" = any($2::uuid[]) or "studentId" = any($3::text[]))
       order by "createdAt" desc`,
      [schoolId, studentIds, studentIds],
    );
    return result.rows;
  }

  async listStudentsBasic(schoolId: string, studentIds: string[] | null, includeBilling = false) {
    if (studentIds?.length === 0) return [];
    const billingFields = includeBilling ? ', "feesBalance", "totalFeesPaid", "parentPhone", "parentEmail"' : '';
    const result = await query(
      `select id, name, reg, class, section, photo, status, gender, lin, "payCode"${billingFields}
       from students
       where "schoolId" = $1 and ($2::uuid[] is null or id = any($2::uuid[]))
       order by name`,
      [schoolId, studentIds],
    );
    return result.rows;
  }

  async getById(table: string, id: string, schoolId: string) {
    const result = await query(`select * from ${tableName(table)} where id = $1 and "schoolId" = $2 limit 1`, [id, schoolId]);
    return result.rows[0] ?? null;
  }

  async create<T extends RecordData>(table: string, payload: T, schoolId: string) {
    const clean = preparePayload(table, { ...payload, schoolId });
    const keys = Object.keys(clean);
    const columns = keys.map(quoteIdent).join(", ");
    const placeholders = keys.map((key, index) => `$${index + 1}${isResourceJsonField(table, key) ? "::jsonb" : ""}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `insert into ${tableName(table)} (${columns}) values (${placeholders}) returning *`,
      values,
    );
    return result.rows[0];
  }

  async update<T extends RecordData>(table: string, id: string, payload: T, schoolId: string) {
    const clean = preparePayload(table, { ...payload, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const assignments = keys.map((key, index) => `${quoteIdent(key)} = $${index + 1}${isResourceJsonField(table, key) ? "::jsonb" : ""}`).join(", ");
    const values = keys.map((key) => clean[key]);
    const result = await query(
      `update ${tableName(table)} set ${assignments} where id = $${keys.length + 1} and "schoolId" = $${keys.length + 2} returning *`,
      [...values, id, schoolId],
    );
    return result.rows[0];
  }

  async delete(table: string, id: string, schoolId: string) {
    await query(`delete from ${tableName(table)} where id = $1 and "schoolId" = $2`, [id, schoolId]);
    return { success: true };
  }

  async upsertSettings(payload: RecordData, schoolId: string) {
    const clean = cleanUndefined({ id: true, ...payload, schoolId, updatedAt: new Date().toISOString() });
    const keys = Object.keys(clean);
    const columns = keys.map(quoteIdent).join(", ");
    const placeholders = keys
      .map((key, index) => `$${index + 1}${isSchoolSettingsJsonField(key) ? "::jsonb" : ""}`)
      .join(", ");
    const updates = keys
      .filter((key) => key !== "schoolId")
      .map((key) => `${quoteIdent(key)} = excluded.${quoteIdent(key)}`)
      .join(", ");
    const values = keys.map((key) => serializeSchoolSettingsValue(key, clean[key]));
    const result = await query(
      `insert into "school_settings" (${columns}) values (${placeholders}) on conflict ("schoolId") do update set ${updates} returning *`,
      values,
    );
    return result.rows[0];
  }

  async getSettings(schoolId: string) {
    const result = await query(`select * from "school_settings" where "schoolId" = $1 limit 1`, [schoolId]);
    return result.rows[0] ?? null;
  }

  async listUsers(schoolId: string) {
    const result = await query(
      `select u.id, u.name, u.email, sm.role, u.photo, u.dept, u."mustChangePassword", u."passwordChangedAt", u."createdAt", u."updatedAt",
         coalesce(array_agg(smr.role order by smr.role) filter (where smr.role is not null), array[sm.role]) as roles,
         pul."parentId", sul."studentId", stul."staffId"
       from school_memberships sm
       join users u on u.id = sm."userId"
       left join school_membership_roles smr on smr."membershipId" = sm.id
       left join parent_user_links pul on pul."schoolId" = sm."schoolId" and pul."userId" = u.id and pul.active = true
       left join student_user_links sul on sul."schoolId" = sm."schoolId" and sul."userId" = u.id and sul.active = true
       left join staff_user_links stul on stul."schoolId" = sm."schoolId" and stul."userId" = u.id and stul.active = true
       where sm."schoolId" = $1 and sm.active = true
       group by u.id, sm.id, pul."parentId", sul."studentId", stul."staffId"
       order by u."createdAt" desc`,
      [schoolId],
    );
    return result.rows;
  }

  async call<T = unknown>(functionName: string, args: RecordData) {
    const values = Object.values(args);
    const result = await query(`select ${tableName(functionName)}($1::jsonb) as data`, [values[0] ?? {}]);
    return result.rows[0]?.data as T;
  }
}
