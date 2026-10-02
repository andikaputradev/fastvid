import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const blockedDomains = pgTable(
  "blocked_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    domain: varchar("domain", { length: 255 }).notNull(),
    reason: text("reason"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    domainUniqueIndex: uniqueIndex("blocked_domains_domain_unique_idx").on(table.domain)
  })
);

export type BlockedDomain = typeof blockedDomains.$inferSelect;
export type NewBlockedDomain = typeof blockedDomains.$inferInsert;
