import type { Express } from "express";
import type { GoogleGenAI } from "@google/genai";
import { AppError } from "../domain/errors";
import { getResourceConfig, type ResourceKey } from "../application/resourceRegistry";
import { AppService } from "../application/appService";
import { AuthService } from "../infrastructure/authService";
import { StorageService } from "../infrastructure/storageService";
import { asyncHandler, errorHandler, requireAuth, requireRole } from "./middleware";
import { aiAccountingSchema, dataUrlUploadSchema, loginSchema, resourcePayloadSchema, userCreateSchema, userUpdateSchema } from "./schemas";

export function registerBackendRoutes(app: Express, genAI: GoogleGenAI | null) {
  const authService = new AuthService();
  const appService = new AppService(undefined, authService);
  const storageService = new StorageService();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "supabase-postgres" });
  });

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const input = loginSchema.parse(req.body);
      res.json(await authService.signIn(input.email, input.pass, input.role));
    }),
  );

  app.get(
    "/api/auth/me",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      res.json({ user: req.currentUser });
    }),
  );

  app.get(
    "/api/app/snapshot",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      res.json(await appService.getSnapshot(req.currentUser!));
    }),
  );

  app.put(
    "/api/settings/school",
    requireAuth(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.saveSettings(req.currentUser!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/users",
    requireAuth(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.createResource(req.currentUser!, "users", userCreateSchema.parse(req.body)));
    }),
  );

  app.patch(
    "/api/users/:id",
    requireAuth(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.updateResource(req.currentUser!, "users", req.params.id, userUpdateSchema.parse(req.body)));
    }),
  );

  app.delete(
    "/api/users/:id",
    requireAuth(authService),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      res.json(await appService.deleteResource(req.currentUser!, "users", req.params.id));
    }),
  );

  app.post(
    "/api/transactions",
    requireAuth(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordTransaction(req.currentUser!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/expenses",
    requireAuth(authService),
    requireRole("admin", "accountant"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordExpense(req.currentUser!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/attendance",
    requireAuth(authService),
    requireRole("admin", "teacher", "nurse"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await appService.recordAttendance(req.currentUser!, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/storage/data-url",
    requireAuth(authService),
    requireRole("admin", "teacher"),
    asyncHandler(async (req, res) => {
      res.status(201).json(await storageService.uploadDataUrl(dataUrlUploadSchema.parse(req.body)));
    }),
  );

  app.post(
    "/api/resources/:resource",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.status(201).json(await appService.createResource(req.currentUser!, resource, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.patch(
    "/api/resources/:resource/:id",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.json(await appService.updateResource(req.currentUser!, resource, req.params.id, resourcePayloadSchema.parse(req.body)));
    }),
  );

  app.delete(
    "/api/resources/:resource/:id",
    requireAuth(authService),
    asyncHandler(async (req, res) => {
      const resource = getKnownResource(req.params.resource);
      res.json(await appService.deleteResource(req.currentUser!, resource, req.params.id));
    }),
  );

  app.post(
    "/api/ai/accounting/analyze",
    requireAuth(authService),
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
    asyncHandler(async (req, res) => {
      res.json(await appService.getBusLocations(req.currentUser!));
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
