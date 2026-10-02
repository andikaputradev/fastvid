import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id").notNull(),
    adminEmailHash: varchar("admin_email_hash", { length: 64 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: varchar("resource_id", { length: 100 }),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    adminCreatedAtIndex: index("admin_audit_logs_admin_user_id_created_at_idx").on(table.adminUserId, table.createdAt),
    resourceCreatedAtIndex: index("admin_audit_logs_resource_type_created_at_idx").on(table.resourceType, table.createdAt),
    actionCreatedAtIndex: index("admin_audit_logs_action_created_at_idx").on(table.action, table.createdAt)
  })
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
