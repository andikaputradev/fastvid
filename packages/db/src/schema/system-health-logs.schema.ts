import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const systemHealthLogs = pgTable(
  "system_health_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    service: varchar("service", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    latencyMs: integer("latency_ms"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    serviceCreatedAtIndex: index("system_health_logs_service_created_at_idx").on(table.service, table.createdAt),
    statusCreatedAtIndex: index("system_health_logs_status_created_at_idx").on(table.status, table.createdAt),
    statusCheck: check("system_health_logs_status_check", sql`${table.status} in ('healthy', 'degraded', 'down')`)
  })
);

export type SystemHealthLog = typeof systemHealthLogs.$inferSelect;
export type NewSystemHealthLog = typeof systemHealthLogs.$inferInsert;
