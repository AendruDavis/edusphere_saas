import type { PlatformRole, SchoolRole, UserRole } from "../../shared/permissions";

export {
  PLATFORM_ROLES,
  SCHOOL_ROLES,
  USER_ROLES,
  canManageRole,
  isPlatformRole,
  isSchoolRole,
  isUserRole,
  primarySchoolRole,
  roleCan,
  rolesCan,
} from "../../shared/permissions";
export type { PlatformRole, SchoolRole, UserRole } from "../../shared/permissions";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  platformRole: PlatformRole | null;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
};

export function canAccessRole(user: AuthUser | null, roles: readonly (SchoolRole | UserRole)[]) {
  if (!user) return false;
  return user.platformRole === "super_admin" || roles.includes(user.role);
}
