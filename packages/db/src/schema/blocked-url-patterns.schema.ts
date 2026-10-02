import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const blockedUrlPatterns = pgTable(
  "blocked_url_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pattern: text("pattern").notNull(),
    patternType: varchar("pattern_type", { length: 20 }).notNull(),
    reason: text("reason"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    isActiveIndex: index("blocked_url_patterns_is_active_idx").on(table.isActive),
    patternTypeCheck: check("blocked_url_patterns_pattern_type_check", sql`${table.patternType} in ('regex', 'glob', 'exact')`)
  })
);

export type BlockedUrlPattern = typeof blockedUrlPatterns.$inferSelect;
export type NewBlockedUrlPattern = typeof blockedUrlPatterns.$inferInsert;
