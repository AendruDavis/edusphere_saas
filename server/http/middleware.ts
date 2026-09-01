import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import type { AppModule, PermissionAction, PlatformRole, SchoolRole } from "../../shared/permissions";
import { rolesCan } from "../../shared/permissions";
import { AppError } from "../domain/errors";
import type { AuthUser } from "../domain/roles";
import { canAccessRole } from "../domain/roles";
import { AuthService } from "../infrastructure/authService";
import { query } from "../infrastructure/database";
import type { TenantContext } from "../domain/tenancy";

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthUser;
      tenant?: TenantContext;
    }
  }
}

export function requireTenant(authService = new AuthService()): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    if (!req.currentUser) throw new AppError(401, "Authentication is required");
    const schoolId = req.header("x-school-id");
    if (!schoolId) throw new AppError(400, "Missing X-School-Id header");
    req.tenant = await authService.resolveTenant(req.currentUser.id, schoolId);

    if (req.tenant.supportAccess) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        throw new AppError(403, "Support sessions are read-only");
      }
      await query(
        `insert into audit_logs ("schoolId", "actorId", action, entity, "riskLevel", summary, metadata)
         values ($1, $2, 'support.request_read', 'http_request', 'restricted', $3, $4::jsonb)`,
        [schoolId, req.currentUser.id, `${req.method} ${req.path}`, JSON.stringify({ method: req.method, path: req.path })],
      );
    }
    next();
  });
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

export function requireRole(...roles: SchoolRole[]): RequestHandler {
  return (req, _res, next) => {
    const allowed = req.tenant
      ? req.tenant.roles.some((role) => roles.includes(role))
      : canAccessRole(req.currentUser ?? null, roles);
    if (!allowed) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

export function requirePermission(module: AppModule, action: PermissionAction = "read"): RequestHandler {
  return (req, _res, next) => {
    if (!req.tenant || !rolesCan(req.tenant.roles, module, action)) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

export function requirePlatformRole(role: PlatformRole): RequestHandler {
  return (req, _res, next) => {
    if (req.currentUser?.platformRole !== role) {
      next(new AppError(403, "Platform administrator access is required"));
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
