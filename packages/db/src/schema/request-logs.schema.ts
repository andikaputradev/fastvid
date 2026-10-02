import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const requestLogs = pgTable(
  "request_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    platformSlug: varchar("platform_slug", { length: 50 }),
    providerSlug: varchar("provider_slug", { length: 50 }),
    urlHash: varchar("url_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    userAgentHash: varchar("user_agent_hash", { length: 64 }),
    status: varchar("status", { length: 20 }).notNull(),
    errorCode: varchar("error_code", { length: 50 }),
    responseTimeMs: integer("response_time_ms"),
    countryCode: varchar("country_code", { length: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ipCreatedAtIndex: index("request_logs_ip_hash_created_at_idx").on(table.ipHash, table.createdAt),
    platformCreatedAtIndex: index("request_logs_platform_slug_created_at_idx").on(table.platformSlug, table.createdAt),
    statusCreatedAtIndex: index("request_logs_status_created_at_idx").on(table.status, table.createdAt),
    createdAtDescIndex: index("request_logs_created_at_desc_idx").on(table.createdAt.desc()),
    statusCheck: check(
      "request_logs_status_check",
      sql`${table.status} in ('success', 'failed', 'blocked', 'rate_limited', 'maintenance')`
    )
  })
);

export type RequestLog = typeof requestLogs.$inferSelect;
export type NewRequestLog = typeof requestLogs.$inferInsert;
