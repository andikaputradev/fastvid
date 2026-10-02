import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const siteSettings = pgTable(
  "site_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull().default(""),
    valueType: varchar("value_type", { length: 20 }).notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedByAdmin: uuid("updated_by_admin")
  },
  (table) => ({
    keyUniqueIndex: uniqueIndex("site_settings_key_unique_idx").on(table.key),
    isPublicIndex: index("site_settings_is_public_idx").on(table.isPublic),
    valueTypeCheck: check("site_settings_value_type_check", sql`${table.valueType} in ('string', 'boolean', 'number', 'json')`)
  })
);

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
