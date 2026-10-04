import { domainToASCII } from "node:url";
import { isIP } from "node:net";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  assertNoObviousSsrfTarget,
  encryptSecret,
  sanitizeUrl
} from "@vidsaveid/security";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { createRequireAdminAuth } from "../../middleware/adminAuth.js";
import { createRequireCsrfToken } from "../../middleware/csrfProtection.js";
import type { CreateAdminAuditLogInput } from "../../repositories/audit.repository.js";
import type {
  AdminRepository,
  CreatePlatformInput,
  CreateProviderInput,
  UpdatePlatformInput,
  UpdateProviderInput
} from "../../repositories/admin.repository.js";
import { createDefaultRepositories, type ApiRepositories } from "../../repositories/index.js";
import { logAdminAuditEvent } from "../../services/adminAudit.js";

const uuidParamSchema = z.object({
  id: z.string().uuid()
});
const settingParamSchema = z.object({
  key: z.string().min(1).max(100)
});
const adSlotParamSchema = z.object({
  slot: z.enum(["header", "in_content", "sidebar", "footer"])
});
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(10_000).default(0)
});
const requestLogQuerySchema = paginationSchema.extend({
  status: z.enum(["success", "failed", "blocked", "rate_limited", "maintenance"]).optional(),
  platform: z.string().min(1).max(50).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});
const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().min(1).max(100).optional(),
  resource_type: z.string().min(1).max(50).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});
const settingUpdateSchema = z
  .object({
    value: z.unknown()
  })
  .strict();
const platformStatusSchema = z.enum(["active", "inactive", "maintenance"]);
const platformInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(50),
    base_domains: z.array(z.string().trim().min(1).max(255)).min(1).max(20),
    allowed_url_patterns: z.array(z.string().trim().min(1).max(500)).max(50).nullable().optional(),
    blocked_url_patterns: z.array(z.string().trim().min(1).max(500)).max(50).nullable().optional(),
    is_active: z.boolean().default(false),
    icon_url: z.string().url().max(2048).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    max_requests_per_minute: z.number().int().min(1).max(600).default(10),
    status: platformStatusSchema.default("inactive")
  })
  .strict();
const platformUpdateSchema = platformInputSchema.partial().strict();
const providerInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(50),
    platform_slug: z.string().trim().min(1).max(50),
    base_url: z.string().trim().url().max(2048),
    api_key: z
      .string()
      .trim()
      .transform((val) => (val.length === 0 ? null : val))
      .nullable()
      .optional(),
    priority: z.number().int().min(1).max(100).default(1),
    daily_limit: z.number().int().min(1).max(1_000_000).default(1000),
    is_active: z.boolean().default(false)
  })
  .strict();
const providerUpdateSchema = providerInputSchema.partial().strict();
const adUpdateSchema = z
  .object({
    provider_name: z.string().trim().min(1).max(100).nullable(),
    ad_code: z.string().max(20_000).nullable().optional(),
    ad_type: z.enum(["code", "custom"]).optional(),
    image_url: z.string().trim().max(2048).nullable().optional(),
    target_url: z.string().trim().max(2048).nullable().optional(),
    alt_text: z.string().trim().max(200).nullable().optional(),
    is_active: z.boolean()
  })
  .strict();
const blockedDomainCreateSchema = z
  .object({
    domain: z.string().trim().min(1).max(255),
    reason: z.string().max(1000).nullable().optional()
  })
  .strict();
const blockedPatternTypeSchema = z.enum(["exact", "glob", "regex"]);
const blockedPatternCreateSchema = z
  .object({
    pattern: z.string().trim().min(1).max(2000),
    pattern_type: blockedPatternTypeSchema,
    reason: z.string().max(1000).nullable().optional(),
    is_active: z.boolean().default(true)
  })
  .strict();
const rateRuleUpdateSchema = z
  .object({
    scope: z.enum(["global", "per_ip", "per_platform"]),
    platform_slug: z.string().trim().min(1).max(50).nullable(),
    max_requests: z.number().int().min(1).max(100_000),
    window_seconds: z.number().int().min(1).max(86_400),
    is_active: z.boolean()
  })
  .strict();

const allowedSettingKeys = new Set([
  "site_name",
  "site_title",
  "meta_description",
  "tagline",
  "logo_url",
  "favicon_url",
  "site_status",
  "maintenance_mode",
  "maintenance_message",
  "turnstile_enabled",
  "rate_limit_public_per_minute"
]);
const sensitiveAuditKeys = new Set([
  "apiKey",
  "api_key",
  "apiKeyEncrypted",
  "api_key_encrypted",
  "adminEmail",
  "admin_email",
  "email",
  "ip",
  "ipAddress",
  "ip_address",
  "password",
  "session",
  "sessionToken",
  "csrf",
  "csrfToken",
  "token",
  "accessToken",
  "refreshToken",
  "access_token",
  "refresh_token",
  "submittedUrl",
  "submitted_url",
  "url",
  "userAgent",
  "user_agent"
]);

export interface AdminCrudRouteOptions {
  repositories?: ApiRepositories;
}

function requireAdminContext(request: FastifyRequest) {
  if (request.admin === undefined) {
    throw new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return request.admin;
}

function parseBody<TSchema extends z.ZodTypeAny>(schema: TSchema, body: unknown): z.output<TSchema> {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError("VALIDATION_FAILED", "Invalid request payload.", 400);
  }

  return result.data;
}

function parseParams<TSchema extends z.ZodTypeAny>(schema: TSchema, params: unknown): z.output<TSchema> {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw new AppError("VALIDATION_FAILED", "Invalid route parameters.", 400);
  }

  return result.data;
}

function parseQuery<TSchema extends z.ZodTypeAny>(schema: TSchema, query: unknown): z.output<TSchema> {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw new AppError("VALIDATION_FAILED", "Invalid query parameters.", 400);
  }

  return result.data;
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replaceAll("_", "-");
}

function normalizeDomain(value: string): string {
  const normalized = domainToASCII(value.trim().toLowerCase().replace(/^\.+|\.+$/gu, ""));

  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    isIP(normalized) !== 0 ||
    !/^[a-z0-9.-]+$/u.test(normalized) ||
    !normalized.includes(".") ||
    normalized.split(".").some((part) => part.length === 0 || part.startsWith("-") || part.endsWith("-"))
  ) {
    throw new AppError("VALIDATION_FAILED", "Invalid domain.", 400);
  }

  return normalized;
}

function normalizeDomains(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeDomain))];
}

function validateProviderBaseUrl(value: string): string {
  const sanitized = sanitizeUrl(value);

  if (!sanitized.ok) {
    throw new AppError("VALIDATION_FAILED", "Invalid provider base URL.", 400);
  }

  try {
    assertNoObviousSsrfTarget(sanitized.value.hostname);
  } catch {
    throw new AppError("VALIDATION_FAILED", "Invalid provider base URL.", 400);
  }

  return sanitized.value.href;
}

function encryptProviderKey(apiKey: string | null | undefined): string | null | undefined {
  if (apiKey === undefined) {
    return undefined;
  }

  if (apiKey === null) {
    return null;
  }

  const result = encryptSecret(apiKey, env.API_KEY_ENCRYPTION_KEY);

  if (!result.ok) {
    throw new AppError("INTERNAL_ERROR", "Terjadi kesalahan pada server.", 500);
  }

  return result.value;
}

function validatePattern(pattern: string, patternType: "exact" | "glob" | "regex"): void {
  if (patternType === "regex") {
    try {
      new RegExp(pattern, "u");
    } catch {
      throw new AppError("VALIDATION_FAILED", "Invalid regex pattern.", 400);
    }
  }
}

function validateSettingValue(valueType: string, value: unknown): string {
  if (valueType === "boolean") {
    if (typeof value !== "boolean") {
      throw new AppError("VALIDATION_FAILED", "Setting value must be boolean.", 400);
    }

    return value ? "true" : "false";
  }

  if (valueType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new AppError("VALIDATION_FAILED", "Setting value must be number.", 400);
    }

    return String(value);
  }

  if (valueType === "json") {
    return JSON.stringify(value);
  }

  if (typeof value !== "string") {
    throw new AppError("VALIDATION_FAILED", "Setting value must be string.", 400);
  }

  return value;
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, childValue] of Object.entries(value)) {
    sanitized[key] = sensitiveAuditKeys.has(key) ? "[redacted]" : sanitizeAuditValue(childValue);
  }

  return sanitized;
}

function auditSnapshot(value: unknown): Record<string, unknown> | null {
  if (value === null) {
    return null;
  }

  return sanitizeAuditValue(value) as Record<string, unknown>;
}

function isoDate(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : new Date(value ?? 0);

  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return value
      .split(/\r?\n|,/u)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function nullableStringArray(value: unknown): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  const values = stringArray(value);
  return values.length > 0 ? values : null;
}

async function auditMutation(
  repositories: ApiRepositories,
  request: FastifyRequest,
  input: {
    action: CreateAdminAuditLogInput["action"];
    resourceId: string | null;
    resourceType: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
): Promise<void> {
  const admin = requireAdminContext(request);

  await logAdminAuditEvent(repositories, request, {
    action: input.action,
    adminUserId: admin.adminUserId,
    adminEmailHash: admin.adminEmailHash,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    oldValue: input.oldValue === undefined ? null : auditSnapshot(input.oldValue),
    newValue: input.newValue === undefined ? null : auditSnapshot(input.newValue)
  });
}

function settingResponse(setting: Awaited<ReturnType<AdminRepository["listSettings"]>>[number]) {
  return {
    key: setting.key,
    value: setting.value,
    value_type: setting.valueType,
    is_public: setting.isPublic,
    description: setting.description,
    updated_at: isoDate(setting.updatedAt)
  };
}

function platformResponse(platform: Awaited<ReturnType<AdminRepository["listPlatforms"]>>[number]) {
  return {
    id: platform.id,
    name: platform.name,
    slug: platform.slug,
    base_domains: stringArray(platform.baseDomains),
    allowed_url_patterns: nullableStringArray(platform.allowedUrlPatterns),
    blocked_url_patterns: nullableStringArray(platform.blockedUrlPatterns),
    is_active: platform.isActive,
    icon_url: platform.iconUrl,
    description: platform.description,
    max_requests_per_minute: platform.maxRequestsPerMinute,
    status: platform.status,
    created_at: isoDate(platform.createdAt),
    updated_at: isoDate(platform.updatedAt)
  };
}

function providerResponse(provider: Awaited<ReturnType<AdminRepository["listProviders"]>>[number]) {
  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    platform_slug: provider.platformSlug,
    base_url: provider.baseUrl,
    has_api_key: typeof provider.apiKeyEncrypted === "string" && provider.apiKeyEncrypted.length > 0,
    priority: provider.priority,
    daily_limit: provider.dailyLimit,
    daily_used: provider.dailyUsed,
    daily_reset_at: isoDate(provider.dailyResetAt),
    is_active: provider.isActive,
    last_error: provider.lastError,
    created_at: isoDate(provider.createdAt),
    updated_at: isoDate(provider.updatedAt)
  };
}

function adResponse(adSlot: Awaited<ReturnType<AdminRepository["listAdSlots"]>>[number]) {
  let customAd: { imageUrl: string; targetUrl: string; altText: string } | null = null;
  let adType: "code" | "custom" = "code";

  if (adSlot.adCode && adSlot.adCode.startsWith('{"type":"custom"')) {
    try {
      const parsed = JSON.parse(adSlot.adCode) as Record<string, unknown>;
      if (
        parsed &&
        parsed.type === "custom" &&
        typeof parsed.imageUrl === "string" &&
        typeof parsed.targetUrl === "string"
      ) {
        customAd = {
          imageUrl: parsed.imageUrl,
          targetUrl: parsed.targetUrl,
          altText: typeof parsed.altText === "string" ? parsed.altText : ""
        };
        adType = "custom";
      }
    } catch {
      adType = "code";
    }
  }

  return {
    id: adSlot.id,
    slot_key: adSlot.slotKey,
    provider_name: adSlot.providerName,
    ad_type: adType,
    custom_ad: customAd,
    ad_code: adSlot.adCode,
    is_active: adSlot.isActive,
    updated_at: isoDate(adSlot.updatedAt)
  };
}

function blockedDomainResponse(domain: Awaited<ReturnType<AdminRepository["listBlockedDomains"]>>[number]) {
  return {
    id: domain.id,
    domain: domain.domain,
    reason: domain.reason,
    created_by: domain.createdBy,
    created_at: isoDate(domain.createdAt)
  };
}

function blockedPatternResponse(pattern: Awaited<ReturnType<AdminRepository["listBlockedPatterns"]>>[number]) {
  return {
    id: pattern.id,
    pattern: pattern.pattern,
    pattern_type: pattern.patternType,
    reason: pattern.reason,
    is_active: pattern.isActive,
    created_by: pattern.createdBy,
    created_at: isoDate(pattern.createdAt)
  };
}

function rateRuleResponse(rule: Awaited<ReturnType<AdminRepository["listRateLimitRules"]>>[number]) {
  return {
    id: rule.id,
    rule_name: rule.ruleName,
    scope: rule.scope,
    platform_slug: rule.platformSlug,
    max_requests: rule.maxRequests,
    window_seconds: rule.windowSeconds,
    is_active: rule.isActive,
    created_at: isoDate(rule.createdAt),
    updated_at: isoDate(rule.updatedAt)
  };
}

function requestLogResponse(log: Awaited<ReturnType<AdminRepository["listRequestLogs"]>>[number]) {
  return {
    id: log.id,
    request_id: log.requestId,
    platform_slug: log.platformSlug,
    provider_slug: log.providerSlug,
    url_hash: log.urlHash,
    ip_hash: log.ipHash,
    user_agent_hash: log.userAgentHash,
    status: log.status,
    error_code: log.errorCode,
    response_time_ms: log.responseTimeMs,
    country_code: log.countryCode,
    created_at: isoDate(log.createdAt)
  };
}

function auditLogResponse(log: Awaited<ReturnType<AdminRepository["listAuditLogs"]>>[number]) {
  return {
    id: log.id,
    admin_user_id: log.adminUserId,
    admin_email_hash: log.adminEmailHash,
    action: log.action,
    resource_type: log.resourceType,
    resource_id: log.resourceId,
    old_value: auditSnapshot(log.oldValue),
    new_value: auditSnapshot(log.newValue),
    ip_hash: log.ipHash,
    created_at: isoDate(log.createdAt)
  };
}

function platformCreateInput(input: z.infer<typeof platformInputSchema>): CreatePlatformInput {
  return {
    name: input.name,
    slug: normalizeSlug(input.slug),
    baseDomains: normalizeDomains(input.base_domains),
    allowedUrlPatterns: input.allowed_url_patterns ?? null,
    blockedUrlPatterns: input.blocked_url_patterns ?? null,
    isActive: input.is_active ?? false,
    iconUrl: input.icon_url ?? null,
    description: input.description ?? null,
    maxRequestsPerMinute: input.max_requests_per_minute ?? 10,
    status: input.status ?? "inactive"
  };
}

function platformUpdateInput(input: z.infer<typeof platformUpdateSchema>): UpdatePlatformInput {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.slug === undefined ? {} : { slug: normalizeSlug(input.slug) }),
    ...(input.base_domains === undefined ? {} : { baseDomains: normalizeDomains(input.base_domains) }),
    ...(input.allowed_url_patterns === undefined ? {} : { allowedUrlPatterns: input.allowed_url_patterns }),
    ...(input.blocked_url_patterns === undefined ? {} : { blockedUrlPatterns: input.blocked_url_patterns }),
    ...(input.is_active === undefined ? {} : { isActive: input.is_active }),
    ...(input.icon_url === undefined ? {} : { iconUrl: input.icon_url }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.max_requests_per_minute === undefined ? {} : { maxRequestsPerMinute: input.max_requests_per_minute }),
    ...(input.status === undefined ? {} : { status: input.status })
  };
}

function providerCreateInput(input: z.infer<typeof providerInputSchema>): CreateProviderInput {
  const encryptedKey = encryptProviderKey(input.api_key);

  return {
    name: input.name,
    slug: normalizeSlug(input.slug),
    platformSlug: normalizeSlug(input.platform_slug),
    baseUrl: validateProviderBaseUrl(input.base_url),
    apiKeyEncrypted: encryptedKey === undefined ? null : encryptedKey,
    priority: input.priority ?? 1,
    dailyLimit: input.daily_limit ?? 1000,
    isActive: input.is_active ?? false
  };
}

function providerUpdateInput(input: z.infer<typeof providerUpdateSchema>): UpdateProviderInput {
  const encryptedKey = encryptProviderKey(input.api_key);

  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.slug === undefined ? {} : { slug: normalizeSlug(input.slug) }),
    ...(input.platform_slug === undefined ? {} : { platformSlug: normalizeSlug(input.platform_slug) }),
    ...(input.base_url === undefined ? {} : { baseUrl: validateProviderBaseUrl(input.base_url) }),
    ...(encryptedKey === undefined ? {} : { apiKeyEncrypted: encryptedKey }),
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    ...(input.daily_limit === undefined ? {} : { dailyLimit: input.daily_limit }),
    ...(input.is_active === undefined ? {} : { isActive: input.is_active })
  };
}

function dateOrUndefined(value: string | undefined): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

function adUpdateInput(input: z.infer<typeof adUpdateSchema>) {
  if (input.ad_type === "custom" || (input.image_url && input.target_url)) {
    const rawImageUrl = input.image_url?.trim() ?? "";
    const rawTargetUrl = input.target_url?.trim() ?? "";

    if (!rawImageUrl) {
      throw new AppError("VALIDATION_FAILED", "Image URL is required for custom ads.", 400);
    }
    if (!rawTargetUrl) {
      throw new AppError("VALIDATION_FAILED", "Target URL is required for custom ads.", 400);
    }

    const sanitizedImage = sanitizeUrl(rawImageUrl);
    if (!sanitizedImage.ok) {
      throw new AppError("VALIDATION_FAILED", "Image URL must be a valid http or https URL.", 400);
    }
    try {
      assertNoObviousSsrfTarget(sanitizedImage.value.hostname);
    } catch {
      throw new AppError("VALIDATION_FAILED", "Image URL cannot point to localhost or private network.", 400);
    }

    const sanitizedTarget = sanitizeUrl(rawTargetUrl);
    if (!sanitizedTarget.ok) {
      throw new AppError("VALIDATION_FAILED", "Target URL must be a valid http or https URL.", 400);
    }
    try {
      assertNoObviousSsrfTarget(sanitizedTarget.value.hostname);
    } catch {
      throw new AppError("VALIDATION_FAILED", "Target URL cannot point to localhost or private network.", 400);
    }

    const safeAltText = (input.alt_text ?? "").replace(/[<>]/g, "").trim().slice(0, 200);

    return {
      providerName: input.provider_name ?? "custom",
      adCode: JSON.stringify({
        type: "custom",
        imageUrl: sanitizedImage.value.href,
        targetUrl: sanitizedTarget.value.href,
        altText: safeAltText
      }),
      isActive: input.is_active
    };
  }

  return {
    providerName: input.provider_name ?? null,
    adCode: input.ad_code ?? null,
    isActive: input.is_active
  };
}

function rateRuleUpdateInput(input: z.infer<typeof rateRuleUpdateSchema>) {
  return {
    scope: input.scope,
    platformSlug: input.platform_slug,
    maxRequests: input.max_requests,
    windowSeconds: input.window_seconds,
    isActive: input.is_active
  };
}

export async function adminCrudRoute(app: FastifyInstance, options: AdminCrudRouteOptions = {}) {
  const repositories = options.repositories ?? createDefaultRepositories();
  const requireAdminAuth = createRequireAdminAuth({ repositories });
  const requireCsrfToken = createRequireCsrfToken();

  app.addHook("preHandler", requireAdminAuth);

  app.get("/settings", async () => ({
    success: true,
    data: {
      settings: (await repositories.admin.listSettings()).map(settingResponse)
    }
  }));

  app.put("/settings/:key", { preHandler: requireCsrfToken }, async (request) => {
    const { key } = parseParams(settingParamSchema, request.params);

    if (!allowedSettingKeys.has(key)) {
      throw new AppError("VALIDATION_FAILED", "Setting key is not allowed.", 400);
    }

    const body = parseBody(settingUpdateSchema, request.body);
    const oldSetting = await repositories.admin.getSettingByKey(key);

    if (oldSetting === null) {
      throw new AppError("NOT_FOUND", "Setting was not found.", 404);
    }

    const value = validateSettingValue(oldSetting.valueType, body.value);
    const updatedSetting = await repositories.admin.updateSetting(key, value, requireAdminContext(request).adminUserId);

    if (updatedSetting === null) {
      throw new AppError("NOT_FOUND", "Setting was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "UPDATE_SETTING",
      resourceType: "site_setting",
      resourceId: key,
      oldValue: oldSetting,
      newValue: updatedSetting
    });

    return {
      success: true,
      data: {
        setting: settingResponse(updatedSetting)
      }
    };
  });

  app.get("/platforms", async () => ({
    success: true,
    data: {
      platforms: (await repositories.admin.listPlatforms()).map(platformResponse)
    }
  }));

  app.post("/platforms", { preHandler: requireCsrfToken }, async (request) => {
    const input = platformCreateInput(parseBody(platformInputSchema, request.body));
    const platforms = await repositories.admin.listPlatforms();
    if (platforms.some((p) => p.slug === input.slug)) {
      throw new AppError("CONFLICT", `Platform dengan slug '${input.slug}' sudah ada.`, 409);
    }

    let platform;
    try {
      platform = await repositories.admin.createPlatform(input);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
        throw new AppError("CONFLICT", `Platform dengan slug '${input.slug}' sudah ada.`, 409);
      }
      throw err;
    }

    await auditMutation(repositories, request, {
      action: "CREATE_PLATFORM",
      resourceType: "platform",
      resourceId: platform.id,
      newValue: platform
    });

    return {
      success: true,
      data: {
        platform: platformResponse(platform)
      }
    };
  });

  app.put("/platforms/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldPlatform = await repositories.admin.getPlatformById(id);

    if (oldPlatform === null) {
      throw new AppError("NOT_FOUND", "Platform was not found.", 404);
    }

    const updatedPlatform = await repositories.admin.updatePlatform(
      id,
      platformUpdateInput(parseBody(platformUpdateSchema, request.body))
    );

    if (updatedPlatform === null) {
      throw new AppError("NOT_FOUND", "Platform was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "UPDATE_PLATFORM",
      resourceType: "platform",
      resourceId: id,
      oldValue: oldPlatform,
      newValue: updatedPlatform
    });

    return {
      success: true,
      data: {
        platform: platformResponse(updatedPlatform)
      }
    };
  });

  app.delete("/platforms/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldPlatform = await repositories.admin.getPlatformById(id);
    const platform = await repositories.admin.deletePlatform(id);

    if (oldPlatform === null || platform === null) {
      throw new AppError("NOT_FOUND", "Platform was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "DELETE_PLATFORM",
      resourceType: "platform",
      resourceId: id,
      oldValue: oldPlatform,
      newValue: platform
    });

    return { success: true, data: { platform: platformResponse(platform) } };
  });

  app.get("/providers", async () => ({
    success: true,
    data: {
      providers: (await repositories.admin.listProviders()).map(providerResponse)
    }
  }));

  app.post("/providers", { preHandler: requireCsrfToken }, async (request) => {
    const input = providerCreateInput(parseBody(providerInputSchema, request.body));

    const platforms = await repositories.admin.listPlatforms();
    const platform = platforms.find((p) => p.slug === input.platformSlug);
    if (!platform) {
      throw new AppError(
        "VALIDATION_FAILED",
        `Platform '${input.platformSlug}' tidak ditemukan. Pilih platform yang tersedia atau tambahkan platform baru terlebih dahulu.`,
        400
      );
    }

    const existingProviders = await repositories.admin.listProviders();
    if (existingProviders.some((p) => p.slug === input.slug && p.platformSlug === input.platformSlug)) {
      throw new AppError(
        "CONFLICT",
        `Provider dengan slug '${input.slug}' untuk platform '${input.platformSlug}' sudah ada. Gunakan slug yang berbeda.`,
        409
      );
    }

    let provider;
    try {
      provider = await repositories.admin.createProvider(input);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        if ((err as { code: string }).code === "23505") {
          throw new AppError(
            "CONFLICT",
            `Provider dengan slug '${input.slug}' untuk platform '${input.platformSlug}' sudah ada.`,
            409
          );
        }
        if ((err as { code: string }).code === "23503") {
          throw new AppError(
            "VALIDATION_FAILED",
            `Platform '${input.platformSlug}' tidak ditemukan.`,
            400
          );
        }
      }
      throw err;
    }

    await auditMutation(repositories, request, {
      action: "CREATE_PROVIDER",
      resourceType: "provider",
      resourceId: provider.id,
      newValue: providerResponse(provider)
    });

    return { success: true, data: { provider: providerResponse(provider) } };
  });

  app.put("/providers/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldProvider = await repositories.admin.getProviderById(id);

    if (oldProvider === null) {
      throw new AppError("NOT_FOUND", "Provider was not found.", 404);
    }

    const input = providerUpdateInput(parseBody(providerUpdateSchema, request.body));

    if (input.platformSlug !== undefined) {
      const platforms = await repositories.admin.listPlatforms();
      const platform = platforms.find((p) => p.slug === input.platformSlug);
      if (!platform) {
        throw new AppError(
          "VALIDATION_FAILED",
          `Platform '${input.platformSlug}' tidak ditemukan. Pilih platform yang tersedia.`,
          400
        );
      }
    }

    const targetSlug = input.slug ?? oldProvider.slug;
    const targetPlatformSlug = input.platformSlug ?? oldProvider.platformSlug;
    const existing = await repositories.admin.listProviders();
    if (existing.some((p) => p.id !== id && p.slug === targetSlug && p.platformSlug === targetPlatformSlug)) {
      throw new AppError(
        "CONFLICT",
        `Provider dengan slug '${targetSlug}' untuk platform '${targetPlatformSlug}' sudah ada.`,
        409
      );
    }

    let provider;
    try {
      provider = await repositories.admin.updateProvider(id, input);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err) {
        if ((err as { code: string }).code === "23505") {
          throw new AppError(
            "CONFLICT",
            `Provider dengan slug '${targetSlug}' untuk platform '${targetPlatformSlug}' sudah ada.`,
            409
          );
        }
        if ((err as { code: string }).code === "23503") {
          throw new AppError(
            "VALIDATION_FAILED",
            `Platform '${targetPlatformSlug}' tidak ditemukan.`,
            400
          );
        }
      }
      throw err;
    }

    if (provider === null) {
      throw new AppError("NOT_FOUND", "Provider was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "UPDATE_PROVIDER",
      resourceType: "provider",
      resourceId: id,
      oldValue: providerResponse(oldProvider),
      newValue: providerResponse(provider)
    });

    return { success: true, data: { provider: providerResponse(provider) } };
  });

  app.delete("/providers/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldProvider = await repositories.admin.getProviderById(id);
    const provider = await repositories.admin.deleteProvider(id);

    if (oldProvider === null || provider === null) {
      throw new AppError("NOT_FOUND", "Provider was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "DELETE_PROVIDER",
      resourceType: "provider",
      resourceId: id,
      oldValue: providerResponse(oldProvider),
      newValue: providerResponse(provider)
    });

    return { success: true, data: { provider: providerResponse(provider) } };
  });

  app.get("/ads", async () => ({
    success: true,
    data: {
      ads: (await repositories.admin.listAdSlots()).map(adResponse)
    }
  }));

  app.put("/ads/:slot", { preHandler: requireCsrfToken }, async (request) => {
    const { slot } = parseParams(adSlotParamSchema, request.params);
    const oldAdSlot = await repositories.admin.getAdSlot(slot);
    const adSlot = await repositories.admin.updateAdSlot(slot, adUpdateInput(parseBody(adUpdateSchema, request.body)));

    if (oldAdSlot === null || adSlot === null) {
      throw new AppError("NOT_FOUND", "Ad slot was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "UPDATE_AD_SLOT",
      resourceType: "ad_slot",
      resourceId: slot,
      oldValue: oldAdSlot,
      newValue: adSlot
    });

    return { success: true, data: { ad: adResponse(adSlot) } };
  });

  app.get("/security/blocked-domains", async () => ({
    success: true,
    data: {
      blocked_domains: (await repositories.admin.listBlockedDomains()).map(blockedDomainResponse)
    }
  }));

  app.post("/security/blocked-domains", { preHandler: requireCsrfToken }, async (request) => {
    const input = parseBody(blockedDomainCreateSchema, request.body);
    const domain = await repositories.admin.createBlockedDomain({
      domain: normalizeDomain(input.domain),
      reason: input.reason ?? null,
      createdBy: requireAdminContext(request).adminUserId
    });

    await auditMutation(repositories, request, {
      action: "CREATE_BLOCKED_DOMAIN",
      resourceType: "blocked_domain",
      resourceId: domain.id,
      newValue: domain
    });

    return { success: true, data: { blocked_domain: blockedDomainResponse(domain) } };
  });

  app.delete("/security/blocked-domains/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldDomain = await repositories.admin.getBlockedDomainById(id);
    const domain = await repositories.admin.deleteBlockedDomain(id);

    if (oldDomain === null || domain === null) {
      throw new AppError("NOT_FOUND", "Blocked domain was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "DELETE_BLOCKED_DOMAIN",
      resourceType: "blocked_domain",
      resourceId: id,
      oldValue: oldDomain
    });

    return { success: true, data: { blocked_domain: blockedDomainResponse(domain) } };
  });

  app.get("/security/url-patterns", async () => ({
    success: true,
    data: {
      url_patterns: (await repositories.admin.listBlockedPatterns()).map(blockedPatternResponse)
    }
  }));

  app.post("/security/url-patterns", { preHandler: requireCsrfToken }, async (request) => {
    const input = parseBody(blockedPatternCreateSchema, request.body);
    validatePattern(input.pattern, input.pattern_type);
    const pattern = await repositories.admin.createBlockedPattern({
      pattern: input.pattern,
      patternType: input.pattern_type,
      reason: input.reason ?? null,
      isActive: input.is_active ?? true,
      createdBy: requireAdminContext(request).adminUserId
    });

    await auditMutation(repositories, request, {
      action: "CREATE_BLOCKED_PATTERN",
      resourceType: "blocked_pattern",
      resourceId: pattern.id,
      newValue: pattern
    });

    return { success: true, data: { url_pattern: blockedPatternResponse(pattern) } };
  });

  app.delete("/security/url-patterns/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldPattern = await repositories.admin.getBlockedPatternById(id);
    const pattern = await repositories.admin.deleteBlockedPattern(id);

    if (oldPattern === null || pattern === null) {
      throw new AppError("NOT_FOUND", "Blocked URL pattern was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "DELETE_BLOCKED_PATTERN",
      resourceType: "blocked_pattern",
      resourceId: id,
      oldValue: oldPattern
    });

    return { success: true, data: { url_pattern: blockedPatternResponse(pattern) } };
  });

  app.get("/security/rate-rules", async () => ({
    success: true,
    data: {
      rate_rules: (await repositories.admin.listRateLimitRules()).map(rateRuleResponse)
    }
  }));

  app.put("/security/rate-rules/:id", { preHandler: requireCsrfToken }, async (request) => {
    const { id } = parseParams(uuidParamSchema, request.params);
    const oldRule = await repositories.admin.getRateLimitRuleById(id);
    const rule = await repositories.admin.updateRateLimitRule(
      id,
      rateRuleUpdateInput(parseBody(rateRuleUpdateSchema, request.body))
    );

    if (oldRule === null || rule === null) {
      throw new AppError("NOT_FOUND", "Rate limit rule was not found.", 404);
    }

    await auditMutation(repositories, request, {
      action: "UPDATE_RATE_LIMIT_RULE",
      resourceType: "rate_limit_rule",
      resourceId: id,
      oldValue: oldRule,
      newValue: rule
    });

    return { success: true, data: { rate_rule: rateRuleResponse(rule) } };
  });

  app.get("/logs/requests", async (request) => {
    const query = parseQuery(requestLogQuerySchema, request.query);
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const dateFrom = dateOrUndefined(query.date_from);
    const dateTo = dateOrUndefined(query.date_to);

    return {
      success: true,
      data: {
        logs: (
          await repositories.admin.listRequestLogs({
            limit,
            offset,
            ...(query.status === undefined ? {} : { status: query.status }),
            ...(query.platform === undefined ? {} : { platformSlug: query.platform }),
            ...(dateFrom === undefined ? {} : { dateFrom }),
            ...(dateTo === undefined ? {} : { dateTo })
          })
        ).map(requestLogResponse),
        pagination: {
          limit,
          offset
        }
      }
    };
  });

  app.get("/logs/audit", async (request) => {
    const query = parseQuery(auditLogQuerySchema, request.query);
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const dateFrom = dateOrUndefined(query.date_from);
    const dateTo = dateOrUndefined(query.date_to);

    return {
      success: true,
      data: {
        logs: (
          await repositories.admin.listAuditLogs({
            limit,
            offset,
            ...(query.action === undefined ? {} : { action: query.action }),
            ...(query.resource_type === undefined ? {} : { resourceType: query.resource_type }),
            ...(dateFrom === undefined ? {} : { dateFrom }),
            ...(dateTo === undefined ? {} : { dateTo })
          })
        ).map(auditLogResponse),
        pagination: {
          limit,
          offset
        }
      }
    };
  });
}
