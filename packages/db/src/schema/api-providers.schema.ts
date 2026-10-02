import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { socialPlatforms } from "./social-platforms.schema.js";

export const apiProviders = pgTable(
  "api_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 50 }).notNull(),
    platformSlug: varchar("platform_slug", { length: 50 })
      .notNull()
      .references(() => socialPlatforms.slug),
    baseUrl: text("base_url").notNull(),
    apiKeyEncrypted: text("api_key_encrypted"),
    priority: integer("priority").notNull().default(1),
    dailyLimit: integer("daily_limit").notNull().default(1000),
    dailyUsed: integer("daily_used").notNull().default(0),
    dailyResetAt: timestamp("daily_reset_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").notNull().default(false),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    platformActivePriorityIndex: index("api_providers_platform_active_priority_idx").on(
      table.platformSlug,
      table.isActive,
      table.priority
    ),
    dailyResetAtIndex: index("api_providers_daily_reset_at_idx").on(table.dailyResetAt),
    slugPlatformUniqueIndex: uniqueIndex("api_providers_slug_platform_unique_idx").on(table.slug, table.platformSlug)
  })
);

export type ApiProvider = typeof apiProviders.$inferSelect;
export type NewApiProvider = typeof apiProviders.$inferInsert;
