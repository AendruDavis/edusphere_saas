export const PLATFORM_ROLES = ["super_admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const SCHOOL_ROLES = [
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "staff",
  "driver",
  "librarian",
  "nurse",
] as const;

export type SchoolRole = (typeof SCHOOL_ROLES)[number];

export const USER_ROLES = [...PLATFORM_ROLES, ...SCHOOL_ROLES] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type PermissionAction = "read" | "create" | "update" | "delete";

export type AppModule =
  | "dashboard"
  | "students"
  | "staff"
  | "academics"
  | "grades"
  | "timetable"
  | "attendance"
  | "fees"
  | "finance"
  | "transport"
  | "hostels"
  | "library"
  | "sickBay"
  | "communication"
  | "reports"
  | "inventory"
  | "aiAccounting"
  | "settings"
  | "admissions";

const everyone: SchoolRole[] = [...SCHOOL_ROLES];
export const SCHOOL_ADMINS: SchoolRole[] = ["admin"];
export const FINANCE_ROLES: SchoolRole[] = ["admin", "accountant"];
export const ACADEMIC_ROLES: SchoolRole[] = ["admin", "teacher"];
export const HEALTH_ROLES: SchoolRole[] = ["admin", "nurse"];
export const LIBRARY_ROLES: SchoolRole[] = ["admin", "librarian"];

export const MODULE_PERMISSIONS: Record<AppModule, Record<PermissionAction, SchoolRole[]>> = {
  dashboard: { read: everyone, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  students: { read: ["admin", "teacher", "accountant", "student", "parent", "nurse", "librarian", "driver", "staff"], create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  staff: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  academics: { read: ["admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  grades: { read: ["admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  timetable: { read: ["admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  attendance: { read: ["admin", "teacher", "nurse", "student", "parent"], create: ["admin", "teacher", "nurse"], update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  fees: { read: ["admin", "accountant", "student", "parent"], create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  finance: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  transport: { read: ["admin", "driver", "student", "parent"], create: ["admin", "driver"], update: ["admin", "driver"], delete: SCHOOL_ADMINS },
  hostels: { read: ["admin", "teacher", "staff"], create: ["admin", "staff"], update: ["admin", "staff"], delete: SCHOOL_ADMINS },
  library: { read: ["admin", "teacher", "student", "librarian"], create: LIBRARY_ROLES, update: LIBRARY_ROLES, delete: SCHOOL_ADMINS },
  sickBay: { read: HEALTH_ROLES, create: HEALTH_ROLES, update: HEALTH_ROLES, delete: SCHOOL_ADMINS },
  communication: { read: ["admin", "teacher", "parent", "student", "librarian", "nurse"], create: ["admin", "teacher"], update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  reports: { read: ["admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  inventory: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  aiAccounting: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  settings: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  admissions: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
};

export function isPlatformRole(role: string): role is PlatformRole {
  return PLATFORM_ROLES.includes(role as PlatformRole);
}

export function isSchoolRole(role: string): role is SchoolRole {
  return SCHOOL_ROLES.includes(role as SchoolRole);
}

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function rolesCan(roles: readonly SchoolRole[] | null | undefined, module: AppModule, action: PermissionAction = "read") {
  return Boolean(roles?.some((role) => MODULE_PERMISSIONS[module][action].includes(role)));
}

export function roleCan(role: UserRole | null | undefined, module: AppModule, action: PermissionAction = "read") {
  return Boolean(role && isSchoolRole(role) && rolesCan([role], module, action));
}

export function primarySchoolRole(roles: readonly SchoolRole[]): SchoolRole {
  const priority: SchoolRole[] = ["admin", "teacher", "accountant", "nurse", "librarian", "staff", "driver", "parent", "student"];
  return priority.find((role) => roles.includes(role)) ?? "student";
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole, action: "create" | "update" | "delete" = "update") {
  if (actorRole === "super_admin") return true;
  if (actorRole !== "admin" || targetRole === "super_admin") return false;
  return action !== "delete" || targetRole !== "admin";
}
