import type { GoogleGenAI } from "@google/genai";
import type { Express } from "express";
import { registerAccessAdminRoutes } from "./http/accessAdminRoutes";
import { registerBackendRoutes as registerLegacyRoutes } from "./http/routes";
import { registerSecureRoutes } from "./http/secureRoutes";

export function registerBackendRoutes(app: Express, genAI: GoogleGenAI | null) {
  registerSecureRoutes(app);
  registerAccessAdminRoutes(app);
  registerLegacyRoutes(app, genAI);
}
