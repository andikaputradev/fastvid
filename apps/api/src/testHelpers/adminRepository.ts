import type { AdminRepository } from "../repositories/admin.repository.js";

export function createNoopAdminRepository(): AdminRepository {
  const notImplemented = async (): Promise<never> => {
    throw new Error("Admin repository method is not implemented in this test.");
  };

  return {
    async listSettings() {
      return [];
    },
    async getSettingByKey() {
      return null;
    },
    async updateSetting() {
      return null;
    },
    async listPlatforms() {
      return [];
    },
    async getPlatformById() {
      return null;
    },
    createPlatform: notImplemented,
    async updatePlatform() {
      return null;
    },
    async deletePlatform() {
      return null;
    },
    async listProviders() {
      return [];
    },
    async getProviderById() {
      return null;
    },
    createProvider: notImplemented,
    async updateProvider() {
      return null;
    },
    async deleteProvider() {
      return null;
    },
    async listAdSlots() {
      return [];
    },
    async getAdSlot() {
      return null;
    },
    async updateAdSlot() {
      return null;
    },
    async listBlockedDomains() {
      return [];
    },
    async getBlockedDomainById() {
      return null;
    },
    createBlockedDomain: notImplemented,
    async deleteBlockedDomain() {
      return null;
    },
    async listBlockedPatterns() {
      return [];
    },
    async getBlockedPatternById() {
      return null;
    },
    createBlockedPattern: notImplemented,
    async deleteBlockedPattern() {
      return null;
    },
    async listRateLimitRules() {
      return [];
    },
    async getRateLimitRuleById() {
      return null;
    },
    async updateRateLimitRule() {
      return null;
    },
    async listRequestLogs() {
      return [];
    },
    async listAuditLogs() {
      return [];
    }
  };
}
