import { adminAuditLogs, type DbClient } from "@vidsaveid/db";

export type AdminAuditAction =
  | "LOGIN_FAILED"
  | "LOGIN_SUCCESS"
  | "LOGOUT"
  | "SESSION_CHECK_FAILED"
  | (string & {});

export interface CreateAdminAuditLogInput {
  adminUserId: string;
  adminEmailHash: string;
  action: AdminAuditAction;
  resourceType: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipHash: string;
}

export interface AuditRepository {
  createAdminAuditLog(input: CreateAdminAuditLogInput): Promise<void>;
}

export function createAuditRepository(db: DbClient): AuditRepository {
  return {
    async createAdminAuditLog(input) {
      await db.insert(adminAuditLogs).values({
        adminUserId: input.adminUserId,
        adminEmailHash: input.adminEmailHash,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        ipHash: input.ipHash
      });
    }
  };
}
