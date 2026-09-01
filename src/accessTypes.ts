import type { PlatformRole, SchoolRole } from "../shared/permissions";
import type { LogoVariants, ReportSettings } from "../shared/reportSettings";

declare module "./types" {
  interface User {
    roles?: SchoolRole[];
    platformRole?: PlatformRole | null;
    parentId?: string | null;
    studentId?: string | null;
    staffId?: string | null;
  }

  interface SchoolMembership {
    roles: SchoolRole[];
  }

  interface SchoolSettings {
    logoVariants?: LogoVariants;
    brandingVersion?: number;
    reportSettings?: ReportSettings;
  }
}

export {};
