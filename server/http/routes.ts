import type { Express } from "express";
import type { GoogleGenAI } from "@google/genai";
import { AppError } from "../domain/errors";
import { getResourceConfig, type ResourceKey } from "../application/resourceRegistry";
import { AppService } from "../application/appService";
import { AuthService } from "../infrastructure/authService";
import { StorageService } from "../infrastructure/storageService";
import { ReportingService } from "../application/reportingService";
import { TenancyService } from "../application/tenancyService";
import { asyncHandler, errorHandler, requireAuth, requireRole, requireTenant } from "./middleware";
import {
  aiAccountingSchema,
  dataUrlUploadSchema,
  loginSchema,
  reportCommentsSchema,
  reportQuerySchema,
  schoolCreateSchema,
  resourcePayloadSchema,
  userCreateSchema,
  userUpdateSchema,
} from "./schemas";

export function registerBackendRoutes(app: Express, genAI: GoogleGenAI | null) {
  const authService = new AuthService();
  const appService = new AppService(undefined, authService);
  const storageService = new StorageService();
  const reportingService = new ReportingService();
  const tenancyService = new TenancyService();

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
      res.json(await reportingService.getStudentStatus(req.tenant!, req.params.studentId, input.term, input.year));
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
