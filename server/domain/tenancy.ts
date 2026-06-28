import type { UserRole } from "./roles";

export type SchoolMembership = {
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  role: UserRole;
};

export type TenantContext = {
  schoolId: string;
  userId: string;
  role: UserRole;
};
