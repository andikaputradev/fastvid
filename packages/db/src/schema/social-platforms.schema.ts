import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const socialPlatforms = pgTable(
  "social_platforms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    baseDomains: jsonb("base_domains").$type<string[]>().notNull(),
    allowedUrlPatterns: jsonb("allowed_url_patterns").$type<string[] | null>(),
    blockedUrlPatterns: jsonb("blocked_url_patterns").$type<string[] | null>(),
    isActive: boolean("is_active").notNull().default(false),
    iconUrl: text("icon_url"),
    description: text("description"),
    maxRequestsPerMinute: integer("max_requests_per_minute").notNull().default(10),
    status: varchar("status", { length: 20 }).notNull().default("inactive"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    isActiveIndex: index("social_platforms_is_active_idx").on(table.isActive),
    statusIndex: index("social_platforms_status_idx").on(table.status),
    statusCheck: check("social_platforms_status_check", sql`${table.status} in ('active', 'inactive', 'maintenance')`)
  })
);

export type SocialPlatform = typeof socialPlatforms.$inferSelect;
export type NewSocialPlatform = typeof socialPlatforms.$inferInsert;
