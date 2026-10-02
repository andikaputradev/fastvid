import { eq } from "drizzle-orm";
import { socialPlatforms, type DbClient } from "@vidsaveid/db";
import { checkDomainAllowlist } from "@vidsaveid/security";

export type PlatformStatus = "active" | "inactive" | "maintenance";

export interface PlatformRecord {
  name: string;
  slug: string;
  baseDomains: readonly string[];
  isActive: boolean;
  status: PlatformStatus;
  iconUrl: string | null;
  description: string | null;
}

export interface PublicPlatform {
  name: string;
  slug: string;
  iconUrl: string | null;
  description: string | null;
  status: PlatformStatus;
}

export interface PlatformRepository {
  getActivePlatforms(): Promise<readonly PublicPlatform[]>;
  getPlatformByDomain(hostname: string): Promise<PlatformRecord | null>;
  getPlatformBySlug(slug: string): Promise<PlatformRecord | null>;
}

function normalizeStatus(status: string): PlatformStatus {
  return status === "active" || status === "maintenance" ? status : "inactive";
}

function toPlatformRecord(row: typeof socialPlatforms.$inferSelect): PlatformRecord {
  return {
    name: row.name,
    slug: row.slug,
    baseDomains: row.baseDomains,
    isActive: row.isActive,
    status: normalizeStatus(row.status),
    iconUrl: row.iconUrl,
    description: row.description
  };
}

function toPublicPlatform(platform: PlatformRecord): PublicPlatform {
  return {
    name: platform.name,
    slug: platform.slug,
    iconUrl: platform.iconUrl,
    description: platform.description,
    status: platform.status
  };
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export function createPlatformRepository(db: DbClient): PlatformRepository {
  return {
    async getActivePlatforms() {
      return safeQuery(async () => {
        const rows = await db
          .select()
          .from(socialPlatforms)
          .where(eq(socialPlatforms.isActive, true));
        const platforms = rows.map(toPlatformRecord).filter((platform) => platform.status === "active");
        return platforms.map(toPublicPlatform);
      }, []);
    },

    async getPlatformByDomain(hostname) {
      return safeQuery(async () => {
        const rows = await db.select().from(socialPlatforms);
        const platform = rows
          .map(toPlatformRecord)
          .find((candidate) => checkDomainAllowlist(new URL(`https://${hostname}/`), candidate.baseDomains).ok);
        return platform ?? null;
      }, null);
    },

    async getPlatformBySlug(slug) {
      return safeQuery(async () => {
        const rows = await db.select().from(socialPlatforms).where(eq(socialPlatforms.slug, slug)).limit(1);
        const row = rows[0];
        return row === undefined ? null : toPlatformRecord(row);
      }, null);
    }
  };
}
