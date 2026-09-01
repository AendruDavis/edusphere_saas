import type { PlatformRole, SchoolRole } from "./roles";

export type AuthorizationMode = "audit" | "enforce";

export type SchoolMembership = {
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  role: SchoolRole;
  roles: SchoolRole[];
};

export type TenantContext = {
  schoolId: string;
  userId: string;
  role: SchoolRole;
  roles: SchoolRole[];
  platformRole: PlatformRole | null;
  supportAccess: boolean;
  authorizationMode: AuthorizationMode;
};
