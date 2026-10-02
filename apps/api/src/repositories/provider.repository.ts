import { and, asc, eq, sql } from "drizzle-orm";
import { apiProviders, type DbClient } from "@vidsaveid/db";

export interface PublicProviderRecord {
  id: string;
  name: string;
  slug: string;
  platformSlug: string;
  baseUrl: string;
  apiKeyEncrypted: string | null;
  priority: number;
  dailyLimit: number;
  dailyUsed: number;
  isActive: boolean;
}

export interface ProviderRepository {
  getActiveProvidersForPlatform(platformSlug: string): Promise<readonly PublicProviderRecord[]>;
  incrementProviderUsage(providerId: string): Promise<void>;
  recordProviderError(providerId: string, errorMsg: string): Promise<void>;
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export function createProviderRepository(db: DbClient): ProviderRepository {
  return {
    async getActiveProvidersForPlatform(platformSlug: string) {
      return safeQuery(async () => {
        const rows = await db
          .select({
            id: apiProviders.id,
            name: apiProviders.name,
            slug: apiProviders.slug,
            platformSlug: apiProviders.platformSlug,
            baseUrl: apiProviders.baseUrl,
            apiKeyEncrypted: apiProviders.apiKeyEncrypted,
            priority: apiProviders.priority,
            dailyLimit: apiProviders.dailyLimit,
            dailyUsed: apiProviders.dailyUsed,
            isActive: apiProviders.isActive
          })
          .from(apiProviders)
          .where(
            and(
              eq(apiProviders.platformSlug, platformSlug),
              eq(apiProviders.isActive, true)
            )
          )
          .orderBy(asc(apiProviders.priority));

        return rows;
      }, []);
    },

    async incrementProviderUsage(providerId: string) {
      await safeQuery(async () => {
        await db
          .update(apiProviders)
          .set({
            dailyUsed: sql`${apiProviders.dailyUsed} + 1`,
            updatedAt: new Date()
          })
          .where(eq(apiProviders.id, providerId));
      }, undefined);
    },

    async recordProviderError(providerId: string, errorMsg: string) {
      await safeQuery(async () => {
        await db
          .update(apiProviders)
          .set({
            lastError: errorMsg.slice(0, 1000),
            updatedAt: new Date()
          })
          .where(eq(apiProviders.id, providerId));
      }, undefined);
    }
  };
}
