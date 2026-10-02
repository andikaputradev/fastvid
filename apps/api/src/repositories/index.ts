import { getDbClient } from "../db/client.js";
import { createAdminRepository, type AdminRepository } from "./admin.repository.js";
import { createAuditRepository, type AuditRepository } from "./audit.repository.js";
import { createBlocklistRepository, type BlocklistRepository } from "./blocklist.repository.js";
import { createRequestLogRepository, type RequestLogRepository } from "./log.repository.js";
import { createPlatformRepository, type PlatformRepository } from "./platform.repository.js";
import { createSettingsRepository, type SettingsRepository } from "./settings.repository.js";
import { createProviderRepository, type ProviderRepository } from "./provider.repository.js";
import type { PlatformRecord, PlatformStatus } from "./platform.repository.js";
import type { PublicSettings } from "./settings.repository.js";
import type { MatchedBlockedPattern } from "./blocklist.repository.js";

export interface ApiRepositories {
  admin: AdminRepository;
  audit: AuditRepository;
  settings: SettingsRepository;
  platforms: PlatformRepository;
  providers: ProviderRepository;
  blocklist: BlocklistRepository;
  requestLogs: RequestLogRepository;
}

let cachedRepositories: ApiRepositories | undefined;
let dbUnavailable = false;

function createFallbackRepositories(): ApiRepositories {
  return {
    admin: {
      async listSettings() { return []; },
      async getSettingByKey() { return null; },
      async updateSetting() { return null; },
      async listPlatforms() { return []; },
      async getPlatformById() { return null; },
      createPlatform: async () => { throw Object.assign(new Error("Database not available"), { statusCode: 503 }); },
      async updatePlatform() { return null; },
      async deletePlatform() { return null; },
      async listProviders() { return []; },
      async getProviderById() { return null; },
      createProvider: async () => { throw Object.assign(new Error("Database not available"), { statusCode: 503 }); },
      async updateProvider() { return null; },
      async deleteProvider() { return null; },
      async listAdSlots() { return []; },
      async getAdSlot() { return null; },
      async updateAdSlot() { return null; },
      async listBlockedDomains() { return []; },
      async getBlockedDomainById() { return null; },
      createBlockedDomain: async () => { throw Object.assign(new Error("Database not available"), { statusCode: 503 }); },
      async deleteBlockedDomain() { return null; },
      async listBlockedPatterns() { return []; },
      async getBlockedPatternById() { return null; },
      createBlockedPattern: async () => { throw Object.assign(new Error("Database not available"), { statusCode: 503 }); },
      async deleteBlockedPattern() { return null; },
      async listRateLimitRules() { return []; },
      async getRateLimitRuleById() { return null; },
      async updateRateLimitRule() { return null; },
      async listRequestLogs() { return []; },
      async listAuditLogs() { return []; }
    },
    audit: {
      async createAdminAuditLog() { /* no-op */ }
    },
    settings: {
      async getPublicSettings(): Promise<PublicSettings> {
        return {
          siteName: "FastVid",
          siteTitle: "FastVid",
          tagline: "Download public social videos safely.",
          maintenanceMode: false,
          maintenanceMessage: null,
          status: "ok"
        };
      },
      async getSettingByKey() { return null; },
      async getMaintenanceStatus() {
        return { maintenanceMode: false, maintenanceMessage: null, status: "ok" };
      },
      async getActiveAds() {
        return [];
      }
    },
    platforms: {
      async getActivePlatforms(): Promise<readonly { name: string; slug: string; iconUrl: string | null; description: string | null; status: PlatformStatus }[]> {
        return [];
      },
      async getPlatformByDomain(): Promise<PlatformRecord | null> {
        return null;
      },
      async getPlatformBySlug(): Promise<PlatformRecord | null> {
        return null;
      }
    },
    providers: {
      async getActiveProvidersForPlatform() {
        return [];
      },
      async incrementProviderUsage() {
        // no-op
      },
      async recordProviderError() {
        // no-op
      }
    },
    blocklist: {
      async isDomainBlocked(): Promise<boolean> {
        return false;
      },
      async findMatchingBlockedPattern(): Promise<MatchedBlockedPattern | null> {
        return null;
      }
    },
    requestLogs: {
      async createRequestLog() { /* no-op */ }
    }
  };
}

export function createDefaultRepositories(): ApiRepositories {
  if (cachedRepositories !== undefined) {
    return cachedRepositories;
  }

  if (dbUnavailable) {
    cachedRepositories = createFallbackRepositories();
    return cachedRepositories;
  }

  let db;
  try {
    db = getDbClient();
  } catch {
    dbUnavailable = true;
    cachedRepositories = createFallbackRepositories();
    return cachedRepositories;
  }

  cachedRepositories = {
    admin: createAdminRepository(db),
    audit: createAuditRepository(db),
    settings: createSettingsRepository(db),
    platforms: createPlatformRepository(db),
    providers: createProviderRepository(db),
    blocklist: createBlocklistRepository(db),
    requestLogs: createRequestLogRepository(db)
  };

  return cachedRepositories;
}
