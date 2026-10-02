import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rateLimitRules = pgTable(
  "rate_limit_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleName: varchar("rule_name", { length: 100 }).notNull(),
    scope: varchar("scope", { length: 20 }).notNull(),
    platformSlug: varchar("platform_slug", { length: 50 }),
    maxRequests: integer("max_requests").notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    scopeIndex: index("rate_limit_rules_scope_idx").on(table.scope),
    platformSlugIndex: index("rate_limit_rules_platform_slug_idx").on(table.platformSlug),
    isActiveIndex: index("rate_limit_rules_is_active_idx").on(table.isActive),
    scopeCheck: check("rate_limit_rules_scope_check", sql`${table.scope} in ('global', 'per_ip', 'per_platform')`)
  })
);

export type RateLimitRule = typeof rateLimitRules.$inferSelect;
export type NewRateLimitRule = typeof rateLimitRules.$inferInsert;
