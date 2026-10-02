import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { createDefaultRepositories, type ApiRepositories } from "../repositories/index.js";
import {
  ADMIN_SESSION_COOKIE_NAME,
  LEGACY_ADMIN_SESSION_COOKIE_NAME,
  parseCookieHeader,
  type AdminSession,
  verifyAdminSessionToken
} from "../auth/adminSession.js";
import { logAdminAuditEvent } from "../services/adminAudit.js";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminSession;
  }
}

export interface AdminAuthMiddlewareOptions {
  repositories?: ApiRepositories;
}

export function createRequireAdminAuth(options: AdminAuthMiddlewareOptions = {}) {
  return async function requireAdminAuth(request: FastifyRequest, _reply: FastifyReply) {
    const repositories = options.repositories ?? createDefaultRepositories();
    const cookies = parseCookieHeader(request.headers.cookie);
    const sessionToken = cookies.get(ADMIN_SESSION_COOKIE_NAME) ?? cookies.get(LEGACY_ADMIN_SESSION_COOKIE_NAME);
    const session = verifyAdminSessionToken(sessionToken);

    if (session === null) {
      await logAdminAuditEvent(repositories, request, {
        action: "SESSION_CHECK_FAILED",
        adminUserId: "00000000-0000-0000-0000-000000000000",
        adminEmailHash: "0".repeat(64)
      });
      throw new AppError("UNAUTHORIZED", "Admin session is required.", 401);
    }

    request.admin = session;
  };
}

export const requireAdminAuth = createRequireAdminAuth();
