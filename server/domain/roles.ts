import type { UserRole } from "../../shared/permissions";

export { USER_ROLES, canManageRole, isUserRole, roleCan } from "../../shared/permissions";
export type { UserRole } from "../../shared/permissions";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function canAccessRole(user: AuthUser | null, roles: UserRole[]) {
  if (!user) return false;
  return user.role === "super_admin" || roles.includes(user.role);
}
