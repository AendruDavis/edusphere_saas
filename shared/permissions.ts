export const USER_ROLES = [
  "super_admin",
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

const everyone: UserRole[] = [...USER_ROLES];
export const SCHOOL_ADMINS: UserRole[] = ["super_admin", "admin"];
export const FINANCE_ROLES: UserRole[] = ["super_admin", "admin", "accountant"];
export const ACADEMIC_ROLES: UserRole[] = ["super_admin", "admin", "teacher"];
export const HEALTH_ROLES: UserRole[] = ["super_admin", "admin", "nurse"];
export const LIBRARY_ROLES: UserRole[] = ["super_admin", "admin", "librarian"];

export const MODULE_PERMISSIONS: Record<AppModule, Record<PermissionAction, UserRole[]>> = {
  dashboard: { read: everyone, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: ["super_admin"] },
  students: { read: ["super_admin", "admin", "teacher", "accountant", "student", "parent"], create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
  staff: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: ["super_admin"] },
  academics: { read: ["super_admin", "admin", "teacher", "student", "parent", "accountant"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  grades: { read: ["super_admin", "admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  timetable: { read: ["super_admin", "admin", "teacher", "student", "parent"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  attendance: { read: ["super_admin", "admin", "teacher", "nurse", "student", "parent"], create: ["super_admin", "admin", "teacher", "nurse"], update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  fees: { read: ["super_admin", "admin", "accountant", "student", "parent"], create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  finance: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  transport: { read: ["super_admin", "admin", "driver", "student", "parent"], create: ["super_admin", "admin", "driver"], update: ["super_admin", "admin", "driver"], delete: SCHOOL_ADMINS },
  hostels: { read: ["super_admin", "admin", "teacher", "staff"], create: ["super_admin", "admin", "staff"], update: ["super_admin", "admin", "staff"], delete: SCHOOL_ADMINS },
  library: { read: ["super_admin", "admin", "teacher", "student", "librarian"], create: LIBRARY_ROLES, update: LIBRARY_ROLES, delete: SCHOOL_ADMINS },
  sickBay: { read: HEALTH_ROLES, create: HEALTH_ROLES, update: HEALTH_ROLES, delete: SCHOOL_ADMINS },
  communication: { read: ["super_admin", "admin", "teacher", "parent", "student", "librarian", "nurse"], create: ["super_admin", "admin", "teacher"], update: ["super_admin", "admin"], delete: SCHOOL_ADMINS },
  reports: { read: ["super_admin", "admin", "accountant", "teacher", "student", "parent", "librarian", "nurse"], create: ACADEMIC_ROLES, update: ACADEMIC_ROLES, delete: SCHOOL_ADMINS },
  inventory: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  aiAccounting: { read: FINANCE_ROLES, create: FINANCE_ROLES, update: FINANCE_ROLES, delete: SCHOOL_ADMINS },
  settings: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: ["super_admin"] },
  admissions: { read: SCHOOL_ADMINS, create: SCHOOL_ADMINS, update: SCHOOL_ADMINS, delete: SCHOOL_ADMINS },
};

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function roleCan(role: UserRole | null | undefined, module: AppModule, action: PermissionAction = "read") {
  return Boolean(role && MODULE_PERMISSIONS[module][action].includes(role));
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole, action: "create" | "update" | "delete" = "update") {
  if (actorRole === "super_admin") return true;
  if (actorRole !== "admin") return false;
  if (targetRole === "super_admin") return false;
  return action !== "delete" || targetRole !== "admin";
}
