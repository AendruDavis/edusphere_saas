export const USER_ROLES = [
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

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function canAccessRole(user: AuthUser | null, roles: UserRole[]) {
  if (!user) return false;
  return roles.includes(user.role);
}
