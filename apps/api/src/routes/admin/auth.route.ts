import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  clearCookie,
  createAdminSession,
  csrfCookie,
  hashAdminEmail,
  sessionCookie
} from "../../auth/adminSession.js";
import { AdminAuthError, type AdminAuthProvider } from "../../auth/adminAuthProvider.js";
import { createSupabaseAdminAuthProvider } from "../../auth/supabaseAdminAuthProvider.js";
import { AppError } from "../../errors/AppError.js";
import { createRequireAdminAuth } from "../../middleware/adminAuth.js";
import { createRequireCsrfToken } from "../../middleware/csrfProtection.js";
import { createDefaultRepositories, type ApiRepositories } from "../../repositories/index.js";
import { logAdminAuditEvent } from "../../services/adminAudit.js";

const loginRequestSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(1024)
  })
  .strict();

const unknownAdminUserId = "00000000-0000-0000-0000-000000000000";

export interface AdminAuthRouteOptions {
  repositories?: ApiRepositories;
  adminAuthProvider?: AdminAuthProvider;
}

function publicAdmin(admin: { adminUserId: string; adminEmailHash: string; role: "admin" }) {
  return {
    id: admin.adminUserId,
    emailHash: admin.adminEmailHash,
    role: admin.role
  };
}

function requireAdminContext(request: FastifyRequest) {
  if (request.admin === undefined) {
    throw new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return request.admin;
}

export async function adminAuthRoute(app: FastifyInstance, options: AdminAuthRouteOptions = {}) {
  const repositories = options.repositories ?? createDefaultRepositories();
  const authProvider = options.adminAuthProvider ?? createSupabaseAdminAuthProvider();
  const requireAdminAuth = createRequireAdminAuth({ repositories });
  const requireCsrfToken = createRequireCsrfToken();

  app.post("/auth/login", async (request, reply) => {
    const parsedBody = loginRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid request payload.", 400);
    }

    const credentials = parsedBody.data;
    let admin;

    try {
      admin = await authProvider.authenticate(credentials);
    } catch (error) {
      if (error instanceof AdminAuthError) {
        await logAdminAuditEvent(repositories, request, {
          action: "LOGIN_FAILED",
          adminUserId: unknownAdminUserId,
          adminEmailHash: hashAdminEmail(credentials.email)
        });

        if (error.code === "ADMIN_FORBIDDEN") {
          throw new AppError("ADMIN_FORBIDDEN", "Admin access is forbidden.", 403);
        }

        throw new AppError("INVALID_CREDENTIALS", "Invalid admin credentials.", 401);
      }

      throw error;
    }

    if (admin === null) {
      await logAdminAuditEvent(repositories, request, {
        action: "LOGIN_FAILED",
        adminUserId: unknownAdminUserId,
        adminEmailHash: hashAdminEmail(credentials.email)
      });
      throw new AppError("INVALID_CREDENTIALS", "Invalid admin credentials.", 401);
    }

    const createdSession = createAdminSession(admin);

    await logAdminAuditEvent(repositories, request, {
      action: "LOGIN_SUCCESS",
      adminUserId: createdSession.session.adminUserId,
      adminEmailHash: createdSession.session.adminEmailHash
    });

    reply.header("set-cookie", [
      sessionCookie(createdSession.token),
      csrfCookie(createdSession.session.csrfToken)
    ]);

    return reply.send({
      success: true,
      data: {
        admin: publicAdmin(createdSession.session)
      }
    });
  });

  app.get("/auth/me", {
    preHandler: requireAdminAuth,
    handler: async (request) => {
      const admin = requireAdminContext(request);

      return {
        success: true,
        data: {
          admin: publicAdmin(admin)
        }
      };
    }
  });

  app.post("/auth/logout", {
    preHandler: [requireAdminAuth, requireCsrfToken],
    handler: async (request, reply) => {
      const admin = requireAdminContext(request);

      await logAdminAuditEvent(repositories, request, {
        action: "LOGOUT",
        adminUserId: admin.adminUserId,
        adminEmailHash: admin.adminEmailHash
      });

      reply.header("set-cookie", [
        clearCookie(ADMIN_SESSION_COOKIE_NAME),
        clearCookie(ADMIN_CSRF_COOKIE_NAME)
      ]);

      return reply.send({
        success: true,
        data: {
          loggedOut: true
        }
      });
    }
  });
}
