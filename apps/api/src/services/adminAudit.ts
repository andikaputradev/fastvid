import { hashIpAddress } from "@vidsaveid/security";
import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { AdminAuditAction } from "../repositories/audit.repository.js";
import type { ApiRepositories } from "../repositories/index.js";

export interface AdminAuditEventInput {
  action: AdminAuditAction;
  adminUserId: string;
  adminEmailHash: string;
  resourceType?: string;
  resourceId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

function hashRequestIp(request: FastifyRequest): string {
  const result = hashIpAddress(request.ip, env.IP_HASH_SECRET);

  if (!result.ok) {
    throw new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return result.value;
}

export async function logAdminAuditEvent(
  repositories: ApiRepositories,
  request: FastifyRequest,
  input: AdminAuditEventInput
): Promise<void> {
  try {
    await repositories.audit.createAdminAuditLog({
      adminUserId: input.adminUserId,
      adminEmailHash: input.adminEmailHash,
      action: input.action,
      resourceType: input.resourceType ?? "admin_auth",
      resourceId: input.resourceId ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      ipHash: hashRequestIp(request)
    });
  } catch (error) {
    request.log.warn({ error }, "admin_audit_log_write_failed");
  }
}
