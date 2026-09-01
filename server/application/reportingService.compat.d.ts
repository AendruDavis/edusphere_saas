import type { ProgressiveReportData } from "../../shared/reporting";
import type { TenantContext } from "../domain/tenancy";

declare module "./reportingService" {
  interface ReportingService {
    /** Compatibility signature for shadowed legacy routes during the staged rollout. */
    buildProgressiveReport(
      tenant: TenantContext,
      request: { studentId: string; termName: string; yearName: string },
    ): Promise<ProgressiveReportData>;

    /** Compatibility signature for shadowed legacy routes during the staged rollout. */
    getStudentStatus(
      tenant: TenantContext,
      studentId: string,
      termName: string,
      yearName: string,
    ): Promise<ProgressiveReportData["statusSummary"]>;
  }
}

export {};
