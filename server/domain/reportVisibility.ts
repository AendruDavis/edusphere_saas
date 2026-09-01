import type { SchoolRole } from "../../shared/permissions";

export type ReportFieldVisibility = {
  attendance: boolean;
  fees: boolean;
  health: boolean;
  library: boolean;
};

export function reportFieldVisibility(
  roles: readonly SchoolRole[],
  accessSource: string,
  supportAccess = false,
): ReportFieldVisibility {
  const familyAccess = accessSource === "linked_parent" || accessSource === "self";
  const elevated = roles.includes("admin") || supportAccess;
  return {
    attendance: elevated || familyAccess || roles.includes("teacher") || roles.includes("nurse"),
    fees: elevated || familyAccess || roles.includes("accountant"),
    health: elevated || familyAccess || roles.includes("nurse"),
    library: elevated || familyAccess || roles.includes("librarian"),
  };
}
