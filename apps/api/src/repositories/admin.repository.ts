import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import {
  adSettings,
  adminAuditLogs,
  apiProviders,
  blockedDomains,
  blockedUrlPatterns,
  rateLimitRules,
  requestLogs,
  siteSettings,
  socialPlatforms,
  type AdSetting,
  type AdminAuditLog,
  type ApiProvider,
  type BlockedDomain,
  type BlockedUrlPattern,
  type DbClient,
  type RateLimitRule,
  type RequestLog,
  type SiteSetting,
  type SocialPlatform
} from "@vidsaveid/db";

export interface PaginationInput {
  limit: number;
  offset: number;
}

export interface RequestLogFilters extends PaginationInput {
  dateFrom?: Date;
  dateTo?: Date;
  platformSlug?: string;
  status?: string;
}

export interface AuditLogFilters extends PaginationInput {
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  resourceType?: string;
}

export interface CreatePlatformInput {
  name: string;
  slug: string;
  baseDomains: string[];
  allowedUrlPatterns: string[] | null;
  blockedUrlPatterns: string[] | null;
  isActive: boolean;
  iconUrl: string | null;
  description: string | null;
  maxRequestsPerMinute: number;
  status: string;
}

export type UpdatePlatformInput = Partial<CreatePlatformInput>;

export interface CreateProviderInput {
  name: string;
  slug: string;
  platformSlug: string;
  baseUrl: string;
  apiKeyEncrypted: string | null;
  priority: number;
  dailyLimit: number;
  isActive: boolean;
}

export type UpdateProviderInput = Partial<CreateProviderInput>;

export interface UpdateAdSlotInput {
  providerName: string | null;
  adCode: string | null;
  isActive: boolean;
}

export interface CreateBlockedDomainInput {
  domain: string;
  reason: string | null;
  createdBy: string;
}

export interface CreateBlockedPatternInput {
  pattern: string;
  patternType: string;
  reason: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface UpdateRateLimitRuleInput {
  scope: string;
  platformSlug: string | null;
  maxRequests: number;
  windowSeconds: number;
  isActive: boolean;
}

export interface AdminRepository {
  listSettings(): Promise<SiteSetting[]>;
  getSettingByKey(key: string): Promise<SiteSetting | null>;
  updateSetting(key: string, value: string, adminUserId: string): Promise<SiteSetting | null>;
  listPlatforms(): Promise<SocialPlatform[]>;
  getPlatformById(id: string): Promise<SocialPlatform | null>;
  createPlatform(input: CreatePlatformInput): Promise<SocialPlatform>;
  updatePlatform(id: string, input: UpdatePlatformInput): Promise<SocialPlatform | null>;
  deletePlatform(id: string): Promise<SocialPlatform | null>;
  listProviders(): Promise<ApiProvider[]>;
  getProviderById(id: string): Promise<ApiProvider | null>;
  createProvider(input: CreateProviderInput): Promise<ApiProvider>;
  updateProvider(id: string, input: UpdateProviderInput): Promise<ApiProvider | null>;
  deleteProvider(id: string): Promise<ApiProvider | null>;
  listAdSlots(): Promise<AdSetting[]>;
  getAdSlot(slotKey: string): Promise<AdSetting | null>;
  updateAdSlot(slotKey: string, input: UpdateAdSlotInput): Promise<AdSetting | null>;
  listBlockedDomains(): Promise<BlockedDomain[]>;
  getBlockedDomainById(id: string): Promise<BlockedDomain | null>;
  createBlockedDomain(input: CreateBlockedDomainInput): Promise<BlockedDomain>;
  deleteBlockedDomain(id: string): Promise<BlockedDomain | null>;
  listBlockedPatterns(): Promise<BlockedUrlPattern[]>;
  getBlockedPatternById(id: string): Promise<BlockedUrlPattern | null>;
  createBlockedPattern(input: CreateBlockedPatternInput): Promise<BlockedUrlPattern>;
  deleteBlockedPattern(id: string): Promise<BlockedUrlPattern | null>;
  listRateLimitRules(): Promise<RateLimitRule[]>;
  getRateLimitRuleById(id: string): Promise<RateLimitRule | null>;
  updateRateLimitRule(id: string, input: UpdateRateLimitRuleInput): Promise<RateLimitRule | null>;
  listRequestLogs(filters: RequestLogFilters): Promise<RequestLog[]>;
  listAuditLogs(filters: AuditLogFilters): Promise<AdminAuditLog[]>;
}

function firstOrNull<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

function whereOrUndefined(conditions: SQL[]): SQL | undefined {
  return conditions.length === 0 ? undefined : and(...conditions);
}

export function createAdminRepository(db: DbClient): AdminRepository {
  return {
    async listSettings() {
      return db.select().from(siteSettings).orderBy(siteSettings.key);
    },
    async getSettingByKey(key) {
      return firstOrNull(await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1));
    },
    async updateSetting(key, value, adminUserId) {
      return firstOrNull(
        await db
          .update(siteSettings)
          .set({
            value,
            updatedAt: new Date(),
            updatedByAdmin: adminUserId
          })
          .where(eq(siteSettings.key, key))
          .returning()
      );
    },
    async listPlatforms() {
      return db.select().from(socialPlatforms).orderBy(socialPlatforms.slug);
    },
    async getPlatformById(id) {
      return firstOrNull(await db.select().from(socialPlatforms).where(eq(socialPlatforms.id, id)).limit(1));
    },
    async createPlatform(input) {
      return (
        await db
          .insert(socialPlatforms)
          .values({
            name: input.name,
            slug: input.slug,
            baseDomains: input.baseDomains,
            allowedUrlPatterns: input.allowedUrlPatterns,
            blockedUrlPatterns: input.blockedUrlPatterns,
            isActive: input.isActive,
            iconUrl: input.iconUrl,
            description: input.description,
            maxRequestsPerMinute: input.maxRequestsPerMinute,
            status: input.status
          })
          .returning()
      )[0] as SocialPlatform;
    },
    async updatePlatform(id, input) {
      return firstOrNull(
        await db
          .update(socialPlatforms)
          .set({
            ...input,
            updatedAt: new Date()
          })
          .where(eq(socialPlatforms.id, id))
          .returning()
      );
    },
    async deletePlatform(id) {
      return firstOrNull(
        await db
          .update(socialPlatforms)
          .set({
            isActive: false,
            status: "inactive",
            updatedAt: new Date()
          })
          .where(eq(socialPlatforms.id, id))
          .returning()
      );
    },
    async listProviders() {
      return db.select().from(apiProviders).orderBy(apiProviders.platformSlug, apiProviders.priority);
    },
    async getProviderById(id) {
      return firstOrNull(await db.select().from(apiProviders).where(eq(apiProviders.id, id)).limit(1));
    },
    async createProvider(input) {
      return (
        await db
          .insert(apiProviders)
          .values({
            name: input.name,
            slug: input.slug,
            platformSlug: input.platformSlug,
            baseUrl: input.baseUrl,
            apiKeyEncrypted: input.apiKeyEncrypted,
            priority: input.priority,
            dailyLimit: input.dailyLimit,
            dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: input.isActive
          })
          .returning()
      )[0] as ApiProvider;
    },
    async updateProvider(id, input) {
      return firstOrNull(
        await db
          .update(apiProviders)
          .set({
            ...input,
            updatedAt: new Date()
          })
          .where(eq(apiProviders.id, id))
          .returning()
      );
    },
    async deleteProvider(id) {
      return firstOrNull(
        await db
          .update(apiProviders)
          .set({
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(apiProviders.id, id))
          .returning()
      );
    },
    async listAdSlots() {
      return db.select().from(adSettings).orderBy(adSettings.slotKey);
    },
    async getAdSlot(slotKey) {
      return firstOrNull(await db.select().from(adSettings).where(eq(adSettings.slotKey, slotKey)).limit(1));
    },
    async updateAdSlot(slotKey, input) {
      return firstOrNull(
        await db
          .update(adSettings)
          .set({
            providerName: input.providerName,
            adCode: input.adCode,
            isActive: input.isActive,
            updatedAt: new Date()
          })
          .where(eq(adSettings.slotKey, slotKey))
          .returning()
      );
    },
    async listBlockedDomains() {
      return db.select().from(blockedDomains).orderBy(blockedDomains.domain);
    },
    async getBlockedDomainById(id) {
      return firstOrNull(await db.select().from(blockedDomains).where(eq(blockedDomains.id, id)).limit(1));
    },
    async createBlockedDomain(input) {
      return (
        await db
          .insert(blockedDomains)
          .values({
            domain: input.domain,
            reason: input.reason,
            createdBy: input.createdBy
          })
          .returning()
      )[0] as BlockedDomain;
    },
    async deleteBlockedDomain(id) {
      return firstOrNull(await db.delete(blockedDomains).where(eq(blockedDomains.id, id)).returning());
    },
    async listBlockedPatterns() {
      return db.select().from(blockedUrlPatterns).orderBy(desc(blockedUrlPatterns.createdAt));
    },
    async getBlockedPatternById(id) {
      return firstOrNull(await db.select().from(blockedUrlPatterns).where(eq(blockedUrlPatterns.id, id)).limit(1));
    },
    async createBlockedPattern(input) {
      return (
        await db
          .insert(blockedUrlPatterns)
          .values({
            pattern: input.pattern,
            patternType: input.patternType,
            reason: input.reason,
            isActive: input.isActive,
            createdBy: input.createdBy
          })
          .returning()
      )[0] as BlockedUrlPattern;
    },
    async deleteBlockedPattern(id) {
      return firstOrNull(await db.delete(blockedUrlPatterns).where(eq(blockedUrlPatterns.id, id)).returning());
    },
    async listRateLimitRules() {
      return db.select().from(rateLimitRules).orderBy(rateLimitRules.ruleName);
    },
    async getRateLimitRuleById(id) {
      return firstOrNull(await db.select().from(rateLimitRules).where(eq(rateLimitRules.id, id)).limit(1));
    },
    async updateRateLimitRule(id, input) {
      return firstOrNull(
        await db
          .update(rateLimitRules)
          .set({
            scope: input.scope,
            platformSlug: input.platformSlug,
            maxRequests: input.maxRequests,
            windowSeconds: input.windowSeconds,
            isActive: input.isActive,
            updatedAt: new Date()
          })
          .where(eq(rateLimitRules.id, id))
          .returning()
      );
    },
    async listRequestLogs(filters) {
      const conditions: SQL[] = [];

      if (filters.status !== undefined) {
        conditions.push(eq(requestLogs.status, filters.status));
      }

      if (filters.platformSlug !== undefined) {
        conditions.push(eq(requestLogs.platformSlug, filters.platformSlug));
      }

      if (filters.dateFrom !== undefined) {
        conditions.push(gte(requestLogs.createdAt, filters.dateFrom));
      }

      if (filters.dateTo !== undefined) {
        conditions.push(lte(requestLogs.createdAt, filters.dateTo));
      }

      return db
        .select()
        .from(requestLogs)
        .where(whereOrUndefined(conditions))
        .orderBy(desc(requestLogs.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);
    },
    async listAuditLogs(filters) {
      const conditions: SQL[] = [];

      if (filters.action !== undefined) {
        conditions.push(eq(adminAuditLogs.action, filters.action));
      }

      if (filters.resourceType !== undefined) {
        conditions.push(eq(adminAuditLogs.resourceType, filters.resourceType));
      }

      if (filters.dateFrom !== undefined) {
        conditions.push(gte(adminAuditLogs.createdAt, filters.dateFrom));
      }

      if (filters.dateTo !== undefined) {
        conditions.push(lte(adminAuditLogs.createdAt, filters.dateTo));
      }

      return db
        .select()
        .from(adminAuditLogs)
        .where(whereOrUndefined(conditions))
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);
    }
  };
}
