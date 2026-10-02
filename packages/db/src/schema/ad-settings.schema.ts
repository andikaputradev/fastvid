import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const adSettings = pgTable(
  "ad_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slotKey: varchar("slot_key", { length: 50 }).notNull(),
    providerName: varchar("provider_name", { length: 100 }),
    adCode: text("ad_code"),
    isActive: boolean("is_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slotKeyUniqueIndex: uniqueIndex("ad_settings_slot_key_unique_idx").on(table.slotKey),
    slotKeyCheck: check("ad_settings_slot_key_check", sql`${table.slotKey} in ('header', 'in_content', 'sidebar', 'footer')`)
  })
);

export type AdSetting = typeof adSettings.$inferSelect;
export type NewAdSetting = typeof adSettings.$inferInsert;
