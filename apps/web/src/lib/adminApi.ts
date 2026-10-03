import { readAdminCsrfToken, setAdminCsrfToken } from "./csrf";
import { getApiBaseUrl } from "./env";

const mutationMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export class AdminApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
  }
}

interface ApiSuccess<TData> {
  success: true;
  data: TData;
}

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

type ApiEnvelope<TData> = ApiFailure | ApiSuccess<TData>;

export interface AdminIdentity {
  id: string;
  emailHash: string;
  role: "admin";
}

export interface AdminSetting {
  key: string;
  value: string;
  value_type: "boolean" | "json" | "number" | "string";
  is_public: boolean;
  description: string | null;
  updated_at: string;
}

export type PlatformStatus = "active" | "inactive" | "maintenance";

export interface AdminPlatform {
  id: string;
  name: string;
  slug: string;
  base_domains: string[];
  allowed_url_patterns: string[] | null;
  blocked_url_patterns: string[] | null;
  is_active: boolean;
  icon_url: string | null;
  description: string | null;
  max_requests_per_minute: number;
  status: PlatformStatus;
  created_at: string;
  updated_at: string;
}

export interface PlatformInput {
  name: string;
  slug: string;
  base_domains: string[];
  allowed_url_patterns?: string[] | null;
  blocked_url_patterns?: string[] | null;
  is_active?: boolean;
  icon_url?: string | null;
  description?: string | null;
  max_requests_per_minute?: number;
  status?: PlatformStatus;
}

export interface AdminProvider {
  id: string;
  name: string;
  slug: string;
  platform_slug: string;
  base_url: string;
  has_api_key: boolean;
  priority: number;
  daily_limit: number;
  daily_used: number;
  daily_reset_at: string;
  is_active: boolean;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderInput {
  name: string;
  slug: string;
  platform_slug: string;
  base_url: string;
  api_key?: string | null;
  priority?: number;
  daily_limit?: number;
  is_active?: boolean;
}

export interface AdminCustomAd {
  imageUrl: string;
  targetUrl: string;
  altText: string;
}

export interface AdminAdSlot {
  id: string;
  slot_key: "footer" | "header" | "in_content" | "sidebar";
  provider_name: string | null;
  ad_code: string | null;
  ad_type?: "code" | "custom";
  custom_ad?: AdminCustomAd | null;
  is_active: boolean;
  updated_at: string;
}

export interface AdSlotInput {
  provider_name?: string | null | undefined;
  ad_code?: string | null | undefined;
  ad_type?: "code" | "custom" | undefined;
  image_url?: string | null | undefined;
  target_url?: string | null | undefined;
  alt_text?: string | null | undefined;
  is_active: boolean;
}

export interface BlockedDomain {
  id: string;
  domain: string;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export interface BlockedPattern {
  id: string;
  pattern: string;
  pattern_type: "exact" | "glob" | "regex";
  reason: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface RateLimitRule {
  id: string;
  rule_name: string;
  scope: "global" | "per_ip" | "per_platform";
  platform_slug: string | null;
  max_requests: number;
  window_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestLog {
  id: string;
  request_id: string;
  platform_slug: string | null;
  provider_slug: string | null;
  url_hash: string;
  ip_hash: string;
  user_agent_hash: string | null;
  status: "blocked" | "failed" | "maintenance" | "rate_limited" | "success";
  error_code: string | null;
  response_time_ms: number | null;
  country_code: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email_hash: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_hash: string;
  created_at: string;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export interface StatusResponse {
  siteName?: string;
  siteTitle?: string;
  tagline?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  status?: string;
  providersEnabled?: boolean;
}

type UnknownRecord = Record<string, unknown>;

function isApiFailure(payload: unknown): payload is ApiFailure {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    (payload as { success: unknown }).success === false
  );
}

function headersFor(method: string, headers: HeadersInit | undefined, csrf: boolean): HeadersInit {
  const isBodyMethod = method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD";
  const baseHeaders: Record<string, string> = isBodyMethod
    ? { "content-type": "application/json" }
    : {};

  if (csrf && mutationMethods.has(method.toUpperCase())) {
    const csrfToken = readAdminCsrfToken();

    if (csrfToken === null || csrfToken.length === 0) {
      throw new AdminApiError("CSRF_TOKEN_MISSING", "Admin request could not be verified.", 403);
    }

    baseHeaders["x-csrf-token"] = csrfToken;
  }

  return {
    ...baseHeaders,
    ...headers
  };
}

function queryString(params: Record<string, number | string | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordFrom(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function read(record: UnknownRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return numberValue(value);
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function platformStatus(value: unknown): PlatformStatus {
  return value === "active" || value === "maintenance" || value === "inactive" ? value : "inactive";
}

function adSlotKey(value: unknown): AdminAdSlot["slot_key"] {
  return value === "footer" || value === "in_content" || value === "sidebar" || value === "header" ? value : "header";
}

function patternType(value: unknown): BlockedPattern["pattern_type"] {
  return value === "exact" || value === "glob" || value === "regex" ? value : "exact";
}

function rateRuleScope(value: unknown): RateLimitRule["scope"] {
  return value === "global" || value === "per_ip" || value === "per_platform" ? value : "global";
}

function requestStatus(value: unknown): RequestLog["status"] {
  return value === "success" ||
    value === "failed" ||
    value === "blocked" ||
    value === "rate_limited" ||
    value === "maintenance"
    ? value
    : "failed";
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function normalizeSetting(value: unknown): AdminSetting {
  const setting = recordFrom(value);
  const valueType = read(setting, "value_type", "valueType");

  return {
    key: stringValue(read(setting, "key")),
    value: String(read(setting, "value") ?? ""),
    value_type:
      valueType === "boolean" || valueType === "json" || valueType === "number" || valueType === "string"
        ? valueType
        : "string",
    is_public: booleanValue(read(setting, "is_public", "isPublic")),
    description: nullableString(read(setting, "description")),
    updated_at: stringValue(read(setting, "updated_at", "updatedAt"))
  };
}

function normalizePlatform(value: unknown): AdminPlatform {
  const platform = recordFrom(value);

  return {
    id: stringValue(read(platform, "id")),
    name: stringValue(read(platform, "name")),
    slug: stringValue(read(platform, "slug")),
    base_domains: stringArray(read(platform, "base_domains", "baseDomains")),
    allowed_url_patterns: nullableStringArray(read(platform, "allowed_url_patterns", "allowedUrlPatterns")),
    blocked_url_patterns: nullableStringArray(read(platform, "blocked_url_patterns", "blockedUrlPatterns")),
    is_active: booleanValue(read(platform, "is_active", "isActive")),
    icon_url: nullableString(read(platform, "icon_url", "iconUrl")),
    description: nullableString(read(platform, "description")),
    max_requests_per_minute: numberValue(read(platform, "max_requests_per_minute", "maxRequestsPerMinute"), 10),
    status: platformStatus(read(platform, "status")),
    created_at: stringValue(read(platform, "created_at", "createdAt")),
    updated_at: stringValue(read(platform, "updated_at", "updatedAt"))
  };
}

function normalizeProvider(value: unknown): AdminProvider {
  const provider = recordFrom(value);
  const hasApiKey = read(provider, "has_api_key", "hasApiKey");
  const legacyEncryptedKey = read(provider, "api_key_encrypted", "apiKeyEncrypted");

  return {
    id: stringValue(read(provider, "id")),
    name: stringValue(read(provider, "name")),
    slug: stringValue(read(provider, "slug")),
    platform_slug: stringValue(read(provider, "platform_slug", "platformSlug")),
    base_url: stringValue(read(provider, "base_url", "baseUrl")),
    has_api_key: booleanValue(hasApiKey, typeof legacyEncryptedKey === "string" && legacyEncryptedKey.length > 0),
    priority: numberValue(read(provider, "priority"), 1),
    daily_limit: numberValue(read(provider, "daily_limit", "dailyLimit"), 1000),
    daily_used: numberValue(read(provider, "daily_used", "dailyUsed")),
    daily_reset_at: stringValue(read(provider, "daily_reset_at", "dailyResetAt")),
    is_active: booleanValue(read(provider, "is_active", "isActive")),
    last_error: nullableString(read(provider, "last_error", "lastError")),
    created_at: stringValue(read(provider, "created_at", "createdAt")),
    updated_at: stringValue(read(provider, "updated_at", "updatedAt"))
  };
}

function normalizeAdSlot(value: unknown): AdminAdSlot {
  const ad = recordFrom(value);
  const adCode = nullableString(read(ad, "ad_code", "adCode"));
  let customAd: AdminCustomAd | null = null;
  let adType: "code" | "custom" = "code";

  if (adCode && adCode.startsWith('{"type":"custom"')) {
    try {
      const parsed = JSON.parse(adCode) as Record<string, unknown>;
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
    id: stringValue(read(ad, "id")),
    slot_key: adSlotKey(read(ad, "slot_key", "slotKey")),
    provider_name: nullableString(read(ad, "provider_name", "providerName")),
    ad_code: adCode,
    ad_type: adType,
    custom_ad: customAd,
    is_active: booleanValue(read(ad, "is_active", "isActive")),
    updated_at: stringValue(read(ad, "updated_at", "updatedAt"))
  };
}

function normalizeBlockedDomain(value: unknown): BlockedDomain {
  const domain = recordFrom(value);

  return {
    id: stringValue(read(domain, "id")),
    domain: stringValue(read(domain, "domain")),
    reason: nullableString(read(domain, "reason")),
    created_by: stringValue(read(domain, "created_by", "createdBy")),
    created_at: stringValue(read(domain, "created_at", "createdAt"))
  };
}

function normalizeBlockedPattern(value: unknown): BlockedPattern {
  const pattern = recordFrom(value);

  return {
    id: stringValue(read(pattern, "id")),
    pattern: stringValue(read(pattern, "pattern")),
    pattern_type: patternType(read(pattern, "pattern_type", "patternType")),
    reason: nullableString(read(pattern, "reason")),
    is_active: booleanValue(read(pattern, "is_active", "isActive"), true),
    created_by: stringValue(read(pattern, "created_by", "createdBy")),
    created_at: stringValue(read(pattern, "created_at", "createdAt"))
  };
}

function normalizeRateRule(value: unknown): RateLimitRule {
  const rule = recordFrom(value);

  return {
    id: stringValue(read(rule, "id")),
    rule_name: stringValue(read(rule, "rule_name", "ruleName")),
    scope: rateRuleScope(read(rule, "scope")),
    platform_slug: nullableString(read(rule, "platform_slug", "platformSlug")),
    max_requests: numberValue(read(rule, "max_requests", "maxRequests"), 1),
    window_seconds: numberValue(read(rule, "window_seconds", "windowSeconds"), 60),
    is_active: booleanValue(read(rule, "is_active", "isActive")),
    created_at: stringValue(read(rule, "created_at", "createdAt")),
    updated_at: stringValue(read(rule, "updated_at", "updatedAt"))
  };
}

function normalizeRequestLog(value: unknown): RequestLog {
  const log = recordFrom(value);

  return {
    id: stringValue(read(log, "id")),
    request_id: stringValue(read(log, "request_id", "requestId")),
    platform_slug: nullableString(read(log, "platform_slug", "platformSlug")),
    provider_slug: nullableString(read(log, "provider_slug", "providerSlug")),
    url_hash: stringValue(read(log, "url_hash", "urlHash")),
    ip_hash: stringValue(read(log, "ip_hash", "ipHash")),
    user_agent_hash: nullableString(read(log, "user_agent_hash", "userAgentHash")),
    status: requestStatus(read(log, "status")),
    error_code: nullableString(read(log, "error_code", "errorCode")),
    response_time_ms: nullableNumber(read(log, "response_time_ms", "responseTimeMs")),
    country_code: nullableString(read(log, "country_code", "countryCode")),
    created_at: stringValue(read(log, "created_at", "createdAt"))
  };
}

function normalizeAuditLog(value: unknown): AuditLog {
  const log = recordFrom(value);

  return {
    id: stringValue(read(log, "id")),
    admin_user_id: stringValue(read(log, "admin_user_id", "adminUserId")),
    admin_email_hash: stringValue(read(log, "admin_email_hash", "adminEmailHash")),
    action: stringValue(read(log, "action")),
    resource_type: stringValue(read(log, "resource_type", "resourceType")),
    resource_id: nullableString(read(log, "resource_id", "resourceId")),
    old_value: objectOrNull(read(log, "old_value", "oldValue")),
    new_value: objectOrNull(read(log, "new_value", "newValue")),
    ip_hash: stringValue(read(log, "ip_hash", "ipHash")),
    created_at: stringValue(read(log, "created_at", "createdAt"))
  };
}

function normalizePagination(value: unknown, fallback: Pagination): Pagination {
  const pagination = recordFrom(value);

  return {
    limit: numberValue(read(pagination, "limit"), fallback.limit),
    offset: numberValue(read(pagination, "offset"), fallback.offset)
  };
}

export async function adminRequest<TData>(
  path: string,
  init: RequestInit & { csrf?: boolean; method?: string } = {}
): Promise<TData> {
  const method = init.method ?? "GET";
  const csrf = init.csrf ?? true;
  const { csrf: _csrf, ...requestInit } = init;

  let headers: HeadersInit;
  try {
    headers = headersFor(method, init.headers, csrf);
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }
    throw new AdminApiError("CSRF_TOKEN_MISSING", "Admin request could not be verified.", 403);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      credentials: "include",
      method,
      headers
    });
  } catch {
    throw new AdminApiError("NETWORK_ERROR", "Unable to reach the admin API.", 0);
  }

  const responseCsrf = response.headers?.get?.("x-csrf-token");
  if (responseCsrf) {
    setAdminCsrfToken(responseCsrf);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new AdminApiError("INVALID_RESPONSE", "Admin API returned an invalid response.", response.status);
  }

  if (!response.ok || isApiFailure(payload)) {
    const failure = isApiFailure(payload) ? payload.error : null;
    throw new AdminApiError(
      failure?.code ?? "REQUEST_FAILED",
      failure?.message ?? "Admin request failed.",
      response.status
    );
  }

  return (payload as ApiEnvelope<TData> & { success: true }).data;
}

function jsonBody(body: unknown): RequestInit {
  return {
    body: JSON.stringify(body)
  };
}

export const adminApi = {
  login: async (body: { email: string; password: string }) => {
    const data = await adminRequest<{ admin: AdminIdentity; csrfToken?: string }>("/api/v1/admin/auth/login", {
      csrf: false,
      method: "POST",
      ...jsonBody(body)
    });

    if (data.csrfToken) {
      setAdminCsrfToken(data.csrfToken);
    }

    return { admin: data.admin };
  },
  logout: async () => {
    try {
      return await adminRequest<{ loggedOut: boolean }>("/api/v1/admin/auth/logout", {
        method: "POST"
      });
    } finally {
      setAdminCsrfToken(null);
    }
  },
  me: async () => {
    const data = await adminRequest<{ admin: AdminIdentity; csrfToken?: string }>("/api/v1/admin/auth/me");

    if (data.csrfToken) {
      setAdminCsrfToken(data.csrfToken);
    }

    return { admin: data.admin };
  },
  status: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/status"));
    const siteName = nullableString(read(data, "siteName", "site_name"));
    const siteTitle = nullableString(read(data, "siteTitle", "site_title"));
    const tagline = nullableString(read(data, "tagline"));

    return {
      maintenanceMessage: nullableString(read(data, "maintenanceMessage", "maintenance_message")),
      maintenanceMode: booleanValue(read(data, "maintenanceMode", "maintenance_mode")),
      providersEnabled: booleanValue(read(data, "providersEnabled", "providers_enabled")),
      status: stringValue(read(data, "status"), "unknown"),
      ...(siteName === null ? {} : { siteName }),
      ...(siteTitle === null ? {} : { siteTitle }),
      ...(tagline === null ? {} : { tagline })
    } satisfies StatusResponse;
  },
  health: () => adminRequest<{ status: string }>("/health"),
  listSettings: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/settings"));

    return { settings: unknownArray(read(data, "settings")).map(normalizeSetting) };
  },
  updateSetting: async (key: string, value: unknown) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        ...jsonBody({ value })
      })
    );

    return { setting: normalizeSetting(read(data, "setting")) };
  },
  listPlatforms: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/platforms"));

    return { platforms: unknownArray(read(data, "platforms")).map(normalizePlatform) };
  },
  createPlatform: async (body: PlatformInput) => {
    const data = recordFrom(
      await adminRequest<unknown>("/api/v1/admin/platforms", {
        method: "POST",
        ...jsonBody(body)
      })
    );

    return { platform: normalizePlatform(read(data, "platform")) };
  },
  updatePlatform: async (id: string, body: Partial<PlatformInput>) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/platforms/${id}`, {
        method: "PUT",
        ...jsonBody(body)
      })
    );

    return { platform: normalizePlatform(read(data, "platform")) };
  },
  deletePlatform: async (id: string) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/platforms/${id}`, {
        method: "DELETE"
      })
    );

    return { platform: normalizePlatform(read(data, "platform")) };
  },
  listProviders: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/providers"));

    return { providers: unknownArray(read(data, "providers")).map(normalizeProvider) };
  },
  createProvider: async (body: ProviderInput) => {
    const data = recordFrom(
      await adminRequest<unknown>("/api/v1/admin/providers", {
        method: "POST",
        ...jsonBody(body)
      })
    );

    return { provider: normalizeProvider(read(data, "provider")) };
  },
  updateProvider: async (id: string, body: Partial<ProviderInput>) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/providers/${id}`, {
        method: "PUT",
        ...jsonBody(body)
      })
    );

    return { provider: normalizeProvider(read(data, "provider")) };
  },
  deleteProvider: async (id: string) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/providers/${id}`, {
        method: "DELETE"
      })
    );

    return { provider: normalizeProvider(read(data, "provider")) };
  },
  listAds: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/ads"));

    return { ads: unknownArray(read(data, "ads")).map(normalizeAdSlot) };
  },
  updateAdSlot: async (slot: AdminAdSlot["slot_key"], body: AdSlotInput) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/ads/${slot}`, {
        method: "PUT",
        ...jsonBody(body)
      })
    );

    return { ad: normalizeAdSlot(read(data, "ad")) };
  },
  listBlockedDomains: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/security/blocked-domains"));

    return { blocked_domains: unknownArray(read(data, "blocked_domains", "blockedDomains")).map(normalizeBlockedDomain) };
  },
  createBlockedDomain: async (body: { domain: string; reason?: string | null }) => {
    const data = recordFrom(
      await adminRequest<unknown>("/api/v1/admin/security/blocked-domains", {
        method: "POST",
        ...jsonBody(body)
      })
    );

    return { blocked_domain: normalizeBlockedDomain(read(data, "blocked_domain", "blockedDomain")) };
  },
  deleteBlockedDomain: async (id: string) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/security/blocked-domains/${id}`, {
        method: "DELETE"
      })
    );

    return { blocked_domain: normalizeBlockedDomain(read(data, "blocked_domain", "blockedDomain")) };
  },
  listBlockedPatterns: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/security/url-patterns"));

    return { url_patterns: unknownArray(read(data, "url_patterns", "urlPatterns")).map(normalizeBlockedPattern) };
  },
  createBlockedPattern: async (body: {
    is_active?: boolean;
    pattern: string;
    pattern_type: BlockedPattern["pattern_type"];
    reason?: string | null;
  }) => {
    const data = recordFrom(
      await adminRequest<unknown>("/api/v1/admin/security/url-patterns", {
        method: "POST",
        ...jsonBody(body)
      })
    );

    return { url_pattern: normalizeBlockedPattern(read(data, "url_pattern", "urlPattern")) };
  },
  deleteBlockedPattern: async (id: string) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/security/url-patterns/${id}`, {
        method: "DELETE"
      })
    );

    return { url_pattern: normalizeBlockedPattern(read(data, "url_pattern", "urlPattern")) };
  },
  listRateRules: async () => {
    const data = recordFrom(await adminRequest<unknown>("/api/v1/admin/security/rate-rules"));

    return { rate_rules: unknownArray(read(data, "rate_rules", "rateRules")).map(normalizeRateRule) };
  },
  updateRateRule: async (id: string, body: Omit<RateLimitRule, "created_at" | "id" | "rule_name" | "updated_at">) => {
    const data = recordFrom(
      await adminRequest<unknown>(`/api/v1/admin/security/rate-rules/${id}`, {
        method: "PUT",
        ...jsonBody(body)
      })
    );

    return { rate_rule: normalizeRateRule(read(data, "rate_rule", "rateRule")) };
  },
  listRequestLogs: async (pagination: Pagination) => {
    const data = recordFrom(
      await adminRequest<unknown>(
        `/api/v1/admin/logs/requests${queryString({ limit: pagination.limit, offset: pagination.offset })}`
      )
    );

    return {
      logs: unknownArray(read(data, "logs")).map(normalizeRequestLog),
      pagination: normalizePagination(read(data, "pagination"), pagination)
    };
  },
  listAuditLogs: async (pagination: Pagination) => {
    const data = recordFrom(
      await adminRequest<unknown>(
        `/api/v1/admin/logs/audit${queryString({ limit: pagination.limit, offset: pagination.offset })}`
      )
    );

    return {
      logs: unknownArray(read(data, "logs")).map(normalizeAuditLog),
      pagination: normalizePagination(read(data, "pagination"), pagination)
    };
  }
};
