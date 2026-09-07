import type { Express } from "express";
import type { GoogleGenAI } from "@google/genai";
import { AppError } from "../domain/errors";
import { getResourceConfig, type ResourceKey } from "../application/resourceRegistry";
import { AppService } from "../application/appService";
import { AuthService } from "../infrastructure/authService";
import { StorageService } from "../infrastructure/storageService";
import { ReportingService } from "../application/reportingService";
import { TenancyService } from "../application/tenancyService";
import { AdmissionsService } from "../application/admissionsService";
import { AttendanceService } from "../application/attendanceService";
import { CommunicationService } from "../application/communicationService";
import { FinanceService } from "../application/financeService";
import { StaffService } from "../application/staffService";
import { asyncHandler, errorHandler, requireAuth, requireRole, requireTenant } from "./middleware";
import {
  admissionCreateSchema,
  admissionStatusSchema,
  aiAccountingSchema,
  attendanceEventSchema,
  communicationSendSchema,
  dataUrlUploadSchema,
  feePaymentSchema,
  leaveReviewSchema,
  loginSchema,
  markBulkSaveSchema,
  reportCommentsSchema,
  reportQuerySchema,
  schoolCreateSchema,
  sickbayCreateSchema,
  staffAppraisalSchema,
  resourcePayloadSchema,
  userCreateSchema,
  userUpdateSchema,
} from "./schemas";
import { MODULE_PERMISSIONS } from "../../shared/permissions";

export function registerBackendRoutes(app: Express, genAI: GoogleGenAI | null) {
  const authService = new AuthService();
  const appService = new AppService(undefined, authService);
  const storageService = new StorageService();
  const reportingService = new ReportingService();
  const tenancyService = new TenancyService();
  const financeService = new FinanceService();
  const admissionsService = new AdmissionsService();
  const communicationService = new CommunicationService();
  const attendanceService = new AttendanceService();
  const staffService = new StaffService();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "postgresql" });
  });

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const input = loginSchema.parse(req.body);
      res.json(await authService.signIn(input.email, input.pass));
    }),
  );

  app.get(
    "/api/reports/students/:studentId/progressive",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const input = reportQuerySchema.parse(req.query);
      res.json(await reportingService.buildProgressiveReport(req.tenant!, {
        studentId: req.params.studentId,
        termName: input.term,
        yearName: input.year,
      }));
    }),
  );

  app.put(
    "/api/reports/students/:studentId/comments",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      const input = reportCommentsSchema.parse(req.body);
      res.json(await reportingService.saveComments(req.currentUser!, req.tenant!, {
        studentId: req.params.studentId,
        termName: input.term,
        yearName: input.year,
      }, input));
    }),
  );

  app.post(
    "/api/reports/students/:studentId/finalize",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      const input = reportQuerySchema.parse(req.body);
      res.json(await reportingService.finalize(req.currentUser!, req.tenant!, {
        studentId: req.params.studentId,
        termName: input.term,
        yearName: input.year,
      }));
    }),
  );

  app.get(
    "/api/students/:studentId/status-summary",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const input = reportQuerySchema.parse(req.query);
      res.json(await reportingService.getStudentStatus(req.currentUser!, req.tenant!, req.params.studentId, input.term, input.year));
    }),
  );

  app.get(
    "/api/auth/me",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      res.json({ user: req.currentUser, schools: await authService.listSchoolMemberships(req.currentUser!.id) });
    }),
  );

  app.get(
    "/api/permissions",
    requireAuth(authService),
    asyncHandler(async (_req, res) => {
      res.json(MODULE_PERMISSIONS);
    }),
  );

  app.get(
    "/api/me/schools",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      res.json(await authService.listSchoolMemberships(req.currentUser!.id));
    }),
  );

  app.post(
    "/api/schools",
    requireAuth(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await tenancyService.createSchool(req.currentUser!, schoolCreateSchema.parse(req.body)));
    }),
  );

  app.get(
    "/api/app/snapshot",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      res.json(await appService.getSnapshot(req.currentUser!, req.tenant!));
    }),
  );

  app.put(
    "/api/settings/school",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.saveSettings(req.currentUser!, req.tenant!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/users",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.createResource(req.currentUser!, req.tenant!, "users", userCreateSchema.parse(req.body)));
    }),
  );

  app.patch(
    "/api/users/:id",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.updateResource(req.currentUser!, req.tenant!, "users", req.params.id, userUpdateSchema.parse(req.body)));
    }),
  );

  app.delete(
    "/api/users/:id",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.deleteResource(req.currentUser!, req.tenant!, "users", req.params.id));
    }),
  );

  app.post(
    "/api/transactions",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordTransaction(req.currentUser!, req.tenant!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.get(
    "/api/fees/balances",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant", "teacher", "parent", "student"),
    asyncHandler(async (req, res) => {
      const className = typeof req.query.className === "string" ? req.query.className : undefined;
      res.json(await financeService.listBalances(req.currentUser!, req.tenant!, { className }));
    }),
  );

  app.post(
    "/api/fees/pay",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      const input = feePaymentSchema.parse(req.body);
      res.status(201).json(await financeService.recordFeePayment(req.currentUser!, req.tenant!, input));
    }),
  );

  app.get(
    "/api/ledger/summary",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      res.json(await financeService.ledgerSummary(req.tenant!));
    }),
  );

  app.post(
    "/api/expenses",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordExpense(req.currentUser!, req.tenant!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/attendance",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher", "nurse"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordAttendance(req.currentUser!, req.tenant!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/marks/bulk-save",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      const input = markBulkSaveSchema.parse(req.body);
      res.status(201).json(await appService.bulkSaveMarks(req.currentUser!, req.tenant!, input.marks));
    }),
  );

  app.get(
    "/api/admissions",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await admissionsService.list(req.tenant!));
    }),
  );

  app.post(
    "/api/admissions",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = admissionCreateSchema.parse(req.body);
      res.status(201).json(await admissionsService.create(req.currentUser!, req.tenant!, input));
    }),
  );

  app.patch(
    "/api/admissions/:id/status",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = admissionStatusSchema.parse(req.body);
      res.json(await admissionsService.setStatus(req.currentUser!, req.tenant!, req.params.id, input.status));
    }),
  );

  app.get(
    "/api/communication/messages",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      res.json(await communicationService.history(req.tenant!));
    }),
  );

  app.post(
    "/api/communication/send",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      const input = communicationSendSchema.parse(req.body);
      res.status(201).json(await communicationService.send(req.currentUser!, req.tenant!, input));
    }),
  );

  app.post(
    "/api/attendance/manual",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher", "nurse"),
    asyncHandler(async (req, res) => {
      const input = attendanceEventSchema.parse({ ...req.body, source: "manual" });
      res.status(201).json(await attendanceService.recordEvent(req.currentUser!, req.tenant!, input));
    }),
  );

  app.post(
    "/api/attendance/machine",
    asyncHandler(async (req, res) => {
      assertIntegrationSecret(req.header("x-integration-secret"));
      const input = attendanceEventSchema.parse(normalizeAttendancePayload({ ...req.body, source: "machine" }));
      if (!input.schoolId) throw new AppError(400, "schoolId is required for machine attendance");
      res.status(201).json(await attendanceService.recordEvent(null, { schoolId: input.schoolId }, input));
    }),
  );

  app.post(
    "/api/biometric/sync",
    asyncHandler(async (req, res) => {
      assertIntegrationSecret(req.header("x-integration-secret"));
      const input = attendanceEventSchema.parse(normalizeAttendancePayload({ ...req.body, source: "biometric" }));
      if (!input.schoolId) throw new AppError(400, "schoolId is required for biometric attendance");
      res.status(201).json(await attendanceService.recordEvent(null, { schoolId: input.schoolId }, input));
    }),
  );

  app.get(
    "/api/sickbay",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "nurse"),
    asyncHandler(async (req, res) => {
      res.json(await appService.getSnapshot(req.currentUser!, req.tenant!).then((snapshot) => snapshot.healthRecords));
    }),
  );

  app.post(
    "/api/sickbay",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "nurse"),
    asyncHandler(async (req, res) => {
      const input = sickbayCreateSchema.parse(req.body);
      res.status(201).json(await appService.createResource(req.currentUser!, req.tenant!, "healthRecords", input));
    }),
  );

  app.get(
    "/api/staff/m-e",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await staffService.monitoringSummary(req.tenant!));
    }),
  );

  app.post(
    "/api/staff/appraisal",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = staffAppraisalSchema.parse(req.body);
      res.status(201).json(await staffService.saveAppraisal(req.currentUser!, req.tenant!, input));
    }),
  );

  app.patch(
    "/api/leave/:id/review",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = leaveReviewSchema.parse(req.body);
      res.json(await staffService.reviewLeave(req.currentUser!, req.tenant!, req.params.id, input.status));
    }),
  );

  app.get(
    "/api/reports/card/:studentId/:term",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const year = typeof req.query.year === "string" ? req.query.year : req.tenant ? undefined : undefined;
      res.json(await reportingService.buildProgressiveReport(req.tenant!, {
        studentId: req.params.studentId,
        termName: req.params.term,
        yearName: year || "2026/2027",
      }));
    }),
  );

  app.post(
    "/api/storage/data-url",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await storageService.uploadDataUrl(dataUrlUploadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/resources/:resource",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.status(201).json(await appService.createResource(req.currentUser!, req.tenant!, resource, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.patch(
    "/api/resources/:resource/:id",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.json(await appService.updateResource(req.currentUser!, req.tenant!, resource, req.params.id, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.delete(
    "/api/resources/:resource/:id",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.json(await appService.deleteResource(req.currentUser!, req.tenant!, resource, req.params.id));
    }),
  );

  app.post(
    "/api/ai/accounting/analyze",
    requireAuth(authService),
    requireTenant(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      if (!genAI) throw new AppError(500, "Gemini API key not configured");
      const body = aiAccountingSchema.parse(req.body);
      const prompt = `
        You are an expert school accountant AI.
        Context: ${JSON.stringify(body.transactions)}
        Query: ${body.query}
        Analyze the transactions for anomalies, provide financial insights, or detect patterns.
        Provide a concise response in markdown format.
      `;
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      res.json({ analysis: result.text });
    }),
  );

  app.post(
    "/api/integrations/biometrics/check-in",
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordBiometricCheckIn(req.header("x-integration-secret"), resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/integrations/gps/update-location",
    asyncHandler(async (req, res) => {
      res.json(await appService.updateGpsLocation(req.header("x-integration-secret"), resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.get(
    "/api/transport/bus-locations",
    requireAuth(authService),
    requireTenant(authService),
    asyncHandler(async (req, res) => {
      res.json(await appService.getBusLocations(req.currentUser!, req.tenant!));
    }),
  );

  app.use("/api", () => {
    throw new AppError(404, "API route not found");
  });

  app.use(errorHandler);
}

function getKnownResource(resource: string): ResourceKey {
  const config = getResourceConfig(resource);
  if (!config) throw new AppError(404, "Unknown resource");
  return config.key;
}

function assertIntegrationSecret(secret: string | undefined) {
  if (!process.env.INTEGRATION_WEBHOOK_SECRET || secret !== process.env.INTEGRATION_WEBHOOK_SECRET) {
    throw new AppError(401, "Invalid integration secret");
  }
}

function normalizeAttendancePayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    schoolId: payload.schoolId ?? payload.school_id,
    studentId: payload.studentId ?? payload.student_id,
    deviceId: payload.deviceId ?? payload.device_id,
    timestamp: payload.timestamp ?? payload.occurredAt ?? payload.time,
    type: payload.type,
  };
}
