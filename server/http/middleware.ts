import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import type { AuthUser, UserRole } from "../domain/roles";
import { canAccessRole } from "../domain/roles";
import { AuthService } from "../infrastructure/authService";

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser;
    }
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    void handler(req, res, next).catch(next);
  };

export function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export function requireAuth(authService = new AuthService()): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const token = getBearerToken(req);
    if (!token) throw new AppError(401, "Missing access token");
    req.currentUser = await authService.verifyToken(token);
    next();
  });
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!canAccessRole(req.currentUser ?? null, roles)) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Invalid request payload", details: error.flatten() });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }

  console.error("API Error:", error);
  res.status(500).json({ error: "Internal server error" });
}
