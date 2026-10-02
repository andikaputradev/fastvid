import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type {
  AdSetting,
  AdminAuditLog,
  ApiProvider,
  BlockedDomain,
  BlockedUrlPattern,
  RateLimitRule,
  RequestLog,
  SiteSetting,
  SocialPlatform
} from "@vidsaveid/db";
import type { AdminAuthProvider, AdminIdentity } from "./auth/adminAuthProvider.js";
import type { CreateAdminAuditLogInput } from "./repositories/audit.repository.js";
import type {
  AdminRepository,
  CreateBlockedDomainInput,
  CreateBlockedPatternInput,
  CreatePlatformInput,
  CreateProviderInput,
  RequestLogFilters,
  UpdateAdSlotInput,
  UpdatePlatformInput,
  UpdateProviderInput,
  UpdateRateLimitRuleInput
} from "./repositories/admin.repository.js";
import type { ApiRepositories } from "./repositories/index.js";
import type { CreateRequestLogInput } from "./repositories/log.repository.js";
import type { PlatformRecord, PublicPlatform } from "./repositories/platform.repository.js";
import type { PublicSettings } from "./repositories/settings.repository.js";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-crud-tests";

const validAdminEmail = "admin@example.com";
const validPassword = "correct-password";
const ADMIN_SESSION_COOKIE_NAME = "fastvid_admin_session";
const ADMIN_CSRF_COOKIE_NAME = "fastvid_admin_csrf";
const adminUserId = "11111111-1111-4111-8111-111111111111";
const adminEmailHash = "a".repeat(64);
const now = new Date("2026-01-01T00:00:00.000Z");

const validAdmin: AdminIdentity = {
  id: adminUserId,
  emailHash: adminEmailHash,
  role: "admin"
};

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

interface InjectedResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

interface TestRepositoryState {
  auditEvents: CreateAdminAuditLogInput[];
  requestLogInputs: CreateRequestLogInput[];
  settings: SiteSetting[];
  platforms: SocialPlatform[];
  providers: ApiProvider[];
  adSlots: AdSetting[];
  blockedDomains: BlockedDomain[];
  blockedPatterns: BlockedUrlPattern[];
  rateRules: RateLimitRule[];
  requestRows: RequestLog[];
  auditRows: AdminAuditLog[];
}

function nextId(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function createMockAuthProvider(): AdminAuthProvider {
  return {
    async authenticate(credentials) {
      return credentials.email === validAdminEmail && credentials.password === validPassword
        ? validAdmin
        : null;
    }
  };
}

function siteSetting(overrides: Partial<SiteSetting>): SiteSetting {
  return {
    id: nextId(1),
    key: "site_name",
    value: "FastVid",
    valueType: "string",
    isPublic: true,
    description: null,
    updatedAt: now,
    updatedByAdmin: null,
    ...overrides
  };
}

function socialPlatform(overrides: Partial<SocialPlatform>): SocialPlatform {
  return {
    id: nextId(2),
    name: "TikTok",
    slug: "tiktok",
    baseDomains: ["tiktok.com"],
    allowedUrlPatterns: null,
    blockedUrlPatterns: null,
    isActive: false,
    iconUrl: null,
    description: null,
    maxRequestsPerMinute: 10,
    status: "inactive",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function apiProvider(overrides: Partial<ApiProvider>): ApiProvider {
  return {
    id: nextId(3),
    name: "Mock Provider",
    slug: "mock-provider",
    platformSlug: "tiktok",
    baseUrl: "https://provider.example.com/",
    apiKeyEncrypted: "encrypted-existing-key",
    priority: 1,
    dailyLimit: 1000,
    dailyUsed: 0,
    dailyResetAt: now,
    isActive: false,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function adSlot(overrides: Partial<AdSetting>): AdSetting {
  return {
    id: nextId(4),
    slotKey: "header",
    providerName: null,
    adCode: null,
    isActive: false,
    updatedAt: now,
    ...overrides
  };
}

function rateRule(overrides: Partial<RateLimitRule>): RateLimitRule {
  return {
    id: nextId(5),
    ruleName: "global_public",
    scope: "global",
    platformSlug: null,
    maxRequests: 100,
    windowSeconds: 60,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function requestLog(overrides: Partial<RequestLog>): RequestLog {
  return {
    id: nextId(6),
    requestId: "request-id",
    platformSlug: "tiktok",
    providerSlug: null,
    urlHash: "u".repeat(64),
    ipHash: "i".repeat(64),
    userAgentHash: "g".repeat(64),
    status: "failed",
    errorCode: "PROVIDER_NOT_IMPLEMENTED",
    responseTimeMs: 3,
    countryCode: null,
    createdAt: now,
    ...overrides
  };
}

function adminAuditLog(overrides: Partial<AdminAuditLog>): AdminAuditLog {
  return {
    id: nextId(7),
    adminUserId,
    adminEmailHash,
    action: "UPDATE_PROVIDER",
    resourceType: "provider",
    resourceId: nextId(3),
    oldValue: null,
    newValue: null,
    ipHash: "p".repeat(64),
    createdAt: now,
    ...overrides
  };
}

function createAdminRepository(state: TestRepositoryState): AdminRepository {
  return {
    async listSettings() {
      return state.settings;
    },
    async getSettingByKey(key) {
      return state.settings.find((setting) => setting.key === key) ?? null;
    },
    async updateSetting(key, value, updatedByAdmin) {
      const setting = state.settings.find((item) => item.key === key);

      if (setting === undefined) {
        return null;
      }

      setting.value = value;
      setting.updatedByAdmin = updatedByAdmin;
      setting.updatedAt = new Date();
      return setting;
    },
    async listPlatforms() {
      return state.platforms;
    },
    async getPlatformById(id) {
      return state.platforms.find((platform) => platform.id === id) ?? null;
    },
    async createPlatform(input: CreatePlatformInput) {
      const platform = socialPlatform({
        id: nextId(20 + state.platforms.length),
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
      });
      state.platforms.push(platform);
      return platform;
    },
    async updatePlatform(id, input: UpdatePlatformInput) {
      const platform = state.platforms.find((item) => item.id === id);

      if (platform === undefined) {
        return null;
      }

      Object.assign(platform, input, { updatedAt: new Date() });
      return platform;
    },
    async deletePlatform(id) {
      return this.updatePlatform(id, { isActive: false, status: "inactive" });
    },
    async listProviders() {
      return state.providers;
    },
    async getProviderById(id) {
      return state.providers.find((provider) => provider.id === id) ?? null;
    },
    async createProvider(input: CreateProviderInput) {
      const provider = apiProvider({
        id: nextId(30 + state.providers.length),
        name: input.name,
        slug: input.slug,
        platformSlug: input.platformSlug,
        baseUrl: input.baseUrl,
        apiKeyEncrypted: input.apiKeyEncrypted,
        priority: input.priority,
        dailyLimit: input.dailyLimit,
        isActive: input.isActive
      });
      state.providers.push(provider);
      return provider;
    },
    async updateProvider(id, input: UpdateProviderInput) {
      const provider = state.providers.find((item) => item.id === id);

      if (provider === undefined) {
        return null;
      }

      Object.assign(provider, input, { updatedAt: new Date() });
      return provider;
    },
    async deleteProvider(id) {
      return this.updateProvider(id, { isActive: false });
    },
    async listAdSlots() {
      return state.adSlots;
    },
    async getAdSlot(slotKey) {
      return state.adSlots.find((slot) => slot.slotKey === slotKey) ?? null;
    },
    async updateAdSlot(slotKey, input: UpdateAdSlotInput) {
      const slot = state.adSlots.find((item) => item.slotKey === slotKey);

      if (slot === undefined) {
        return null;
      }

      Object.assign(slot, input, { updatedAt: new Date() });
      return slot;
    },
    async listBlockedDomains() {
      return state.blockedDomains;
    },
    async getBlockedDomainById(id) {
      return state.blockedDomains.find((domain) => domain.id === id) ?? null;
    },
    async createBlockedDomain(input: CreateBlockedDomainInput) {
      const domain = {
        id: nextId(40 + state.blockedDomains.length),
        domain: input.domain,
        reason: input.reason,
        createdBy: input.createdBy,
        createdAt: now
      };
      state.blockedDomains.push(domain);
      return domain;
    },
    async deleteBlockedDomain(id) {
      const index = state.blockedDomains.findIndex((domain) => domain.id === id);

      if (index === -1) {
        return null;
      }

      return state.blockedDomains.splice(index, 1)[0] ?? null;
    },
    async listBlockedPatterns() {
      return state.blockedPatterns;
    },
    async getBlockedPatternById(id) {
      return state.blockedPatterns.find((pattern) => pattern.id === id) ?? null;
    },
    async createBlockedPattern(input: CreateBlockedPatternInput) {
      const pattern = {
        id: nextId(50 + state.blockedPatterns.length),
        pattern: input.pattern,
        patternType: input.patternType,
        reason: input.reason,
        isActive: input.isActive,
        createdBy: input.createdBy,
        createdAt: now
      };
      state.blockedPatterns.push(pattern);
      return pattern;
    },
    async deleteBlockedPattern(id) {
      const index = state.blockedPatterns.findIndex((pattern) => pattern.id === id);

      if (index === -1) {
        return null;
      }

      return state.blockedPatterns.splice(index, 1)[0] ?? null;
    },
    async listRateLimitRules() {
      return state.rateRules;
    },
    async getRateLimitRuleById(id) {
      return state.rateRules.find((rule) => rule.id === id) ?? null;
    },
    async updateRateLimitRule(id, input: UpdateRateLimitRuleInput) {
      const rule = state.rateRules.find((item) => item.id === id);

      if (rule === undefined) {
        return null;
      }

      Object.assign(rule, input, { updatedAt: new Date() });
      return rule;
    },
    async listRequestLogs(filters: RequestLogFilters) {
      return state.requestRows.slice(filters.offset, filters.offset + filters.limit);
    },
    async listAuditLogs() {
      return state.auditRows;
    }
  };
}

function createMockRepositories(): {
  repositories: ApiRepositories;
  state: TestRepositoryState;
} {
  const publicSettings: PublicSettings = {
    siteName: "FastVid",
    siteTitle: "FastVid",
    tagline: "Save public videos safely.",
    maintenanceMode: false,
    maintenanceMessage: null,
    status: "ok"
  };
  const publicPlatformRecord: PlatformRecord = {
    name: "TikTok",
    slug: "tiktok",
    baseDomains: ["tiktok.com"],
    isActive: false,
    status: "inactive",
    iconUrl: null,
    description: null
  };
  const state: TestRepositoryState = {
    auditEvents: [],
    requestLogInputs: [],
    settings: [
      siteSetting({ key: "site_name", value: "FastVid", valueType: "string" }),
      siteSetting({ id: nextId(8), key: "maintenance_mode", value: "false", valueType: "boolean" })
    ],
    platforms: [socialPlatform({ id: nextId(9) })],
    providers: [apiProvider({ id: nextId(10) })],
    adSlots: [adSlot({ id: nextId(11) })],
    blockedDomains: [],
    blockedPatterns: [],
    rateRules: [rateRule({ id: nextId(12) })],
    requestRows: [requestLog({ id: nextId(13) })],
    auditRows: [
      adminAuditLog({
        id: nextId(14),
        newValue: {
          apiKeyEncrypted: "secret-ciphertext",
          safe: "value"
        }
      })
    ]
  };

  return {
    state,
    repositories: {
      admin: createAdminRepository(state),
      audit: {
        async createAdminAuditLog(input) {
          state.auditEvents.push(input);
        }
      },
      settings: {
        async getPublicSettings() {
          return publicSettings;
        },
        async getSettingByKey(key) {
          const setting = state.settings.find((item) => item.key === key);

          return setting?.value ?? null;
        },
        async getMaintenanceStatus() {
          return {
            maintenanceMode: false,
            maintenanceMessage: null,
            status: "ok"
          };
        },
        async getActiveAds() {
          return [];
        }
      },
      platforms: {
        async getActivePlatforms(): Promise<readonly PublicPlatform[]> {
          return [];
        },
        async getPlatformByDomain(): Promise<PlatformRecord | null> {
          return publicPlatformRecord;
        },
        async getPlatformBySlug(): Promise<PlatformRecord | null> {
          return publicPlatformRecord;
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
        async isDomainBlocked() {
          return false;
        },
        async findMatchingBlockedPattern() {
          return null;
        }
      },
      requestLogs: {
        async createRequestLog(input) {
          state.requestLogInputs.push(input);
        }
      }
    }
  };
}

async function buildTestApp(repositories: ApiRepositories): Promise<FastifyInstance> {
  const { buildApp } = await import("./app.js");

  return buildApp({
    logger: false,
    repositories,
    adminAuthProvider: createMockAuthProvider()
  });
}

async function inject(
  app: FastifyInstance,
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  options: {
    cookie?: string;
    csrfToken?: string;
    payload?: Record<string, unknown>;
  } = {}
): Promise<InjectedResponse> {
  const response = await app.inject({
    method,
    url,
    headers: {
      "user-agent": "vidsaveid-admin-crud-test",
      "x-forwarded-for": "203.0.113.20",
      ...(options.payload === undefined ? {} : { "content-type": "application/json" }),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.csrfToken ? { "x-csrf-token": options.csrfToken } : {})
    },
    ...(options.payload === undefined ? {} : { payload: JSON.stringify(options.payload) })
  });

  return response as unknown as InjectedResponse;
}

function setCookieHeaders(response: InjectedResponse): string[] {
  const rawHeader = response.headers["set-cookie"];

  if (rawHeader === undefined) {
    return [];
  }

  return Array.isArray(rawHeader) ? rawHeader : [rawHeader];
}

function cookieValue(setCookies: readonly string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));

  if (cookie === undefined) {
    assert.fail(`Missing cookie ${name}.`);
  }

  return decodeURIComponent(cookie.split(";")[0]?.split("=").slice(1).join("=") ?? "");
}

function cookieHeaderFromSetCookies(setCookies: readonly string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function login(app: FastifyInstance): Promise<{
  cookie: string;
  csrfToken: string;
}> {
  const response = await inject(app, "POST", "/api/v1/admin/auth/login", {
    payload: {
      email: validAdminEmail,
      password: validPassword
    }
  });
  const cookies = setCookieHeaders(response);
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));

  assert.equal(response.statusCode, 200, response.body);
  assert.notEqual(sessionCookie, undefined);

  return {
    cookie: cookieHeaderFromSetCookies(cookies),
    csrfToken: cookieValue(cookies, ADMIN_CSRF_COOKIE_NAME)
  };
}

function parseError(body: string): ApiErrorResponse {
  return JSON.parse(body) as ApiErrorResponse;
}

test("admin CRUD routes reject missing session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "GET", "/api/v1/admin/settings");
    const body = parseError(response.body);

    assert.equal(response.statusCode, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("admin CRUD mutations reject missing CSRF token", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "PUT", "/api/v1/admin/settings/site_name", {
      cookie,
      payload: { value: "New Name" }
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  } finally {
    await app.close();
  }
});

test("GET /api/v1/admin/settings succeeds with valid admin session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/settings", { cookie });
    const body = JSON.parse(response.body) as ApiSuccessResponse<{ settings: Array<{ key: string }> }>;

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(
      body.data.settings.map((setting) => setting.key),
      ["site_name", "maintenance_mode"]
    );
  } finally {
    await app.close();
  }
});

test("admin setting update writes audit log", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "PUT", "/api/v1/admin/settings/site_name", {
      cookie,
      csrfToken,
      payload: { value: "FastVid Admin" }
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(state.auditEvents.some((event) => event.action === "UPDATE_SETTING"), true);
    assert.equal(JSON.stringify(state.auditEvents).includes(validAdminEmail), false);
  } finally {
    await app.close();
  }
});

test("admin platform create validates domain and normalizes slug", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const invalidResponse = await inject(app, "POST", "/api/v1/admin/platforms", {
      cookie,
      csrfToken,
      payload: {
        name: "Localhost",
        slug: "local",
        base_domains: ["localhost"]
      }
    });
    const validResponse = await inject(app, "POST", "/api/v1/admin/platforms", {
      cookie,
      csrfToken,
      payload: {
        name: "Threads",
        slug: "Threads_App",
        base_domains: ["threads.net"]
      }
    });
    const body = JSON.parse(validResponse.body) as ApiSuccessResponse<{ platform: { slug: string } }>;

    assert.equal(invalidResponse.statusCode, 400, invalidResponse.body);
    assert.equal(validResponse.statusCode, 200, validResponse.body);
    assert.equal(body.data.platform.slug, "threads-app");
  } finally {
    await app.close();
  }
});

test("admin platform update writes audit log", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const platformId = state.platforms[0]?.id ?? assert.fail("Missing platform fixture.");
    const response = await inject(app, "PUT", `/api/v1/admin/platforms/${platformId}`, {
      cookie,
      csrfToken,
      payload: {
        is_active: true,
        status: "active"
      }
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(state.auditEvents.some((event) => event.action === "UPDATE_PLATFORM"), true);
  } finally {
    await app.close();
  }
});

test("admin platform list normalizes repository JSON string arrays", async () => {
  const { repositories, state } = createMockRepositories();
  state.platforms = [
    socialPlatform({
      baseDomains: "[\"example.com\",\"www.example.com\"]" as unknown as string[],
      allowedUrlPatterns: "[\"/video/\"]" as unknown as string[],
      blockedUrlPatterns: "" as unknown as string[]
    })
  ];
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/platforms", { cookie });
    const body = JSON.parse(response.body) as ApiSuccessResponse<{
      platforms: Array<{
        allowed_url_patterns: string[] | null;
        base_domains: string[];
        blocked_url_patterns: string[] | null;
      }>;
    }>;

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(body.data.platforms[0]?.base_domains, ["example.com", "www.example.com"]);
    assert.deepEqual(body.data.platforms[0]?.allowed_url_patterns, ["/video/"]);
    assert.equal(body.data.platforms[0]?.blocked_url_patterns, null);
  } finally {
    await app.close();
  }
});

test("admin provider create encrypts API key and never returns plaintext", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);
  const plaintextApiKey = "plain-provider-secret";

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/providers", {
      cookie,
      csrfToken,
      payload: {
        name: "Provider",
        slug: "provider",
        platform_slug: "tiktok",
        base_url: "https://provider.example.com",
        api_key: plaintextApiKey
      }
    });
    const createdProvider = state.providers.at(-1);

    assert.equal(response.statusCode, 200, response.body);
    assert.notEqual(createdProvider?.apiKeyEncrypted, null);
    assert.notEqual(createdProvider?.apiKeyEncrypted, plaintextApiKey);
    assert.equal(response.body.includes(plaintextApiKey), false);
    assert.equal(response.body.includes("apiKeyEncrypted"), false);
    assert.equal(response.body.includes("api_key_encrypted"), false);
    assert.equal(response.body.includes('"has_api_key":true'), true);
  } finally {
    await app.close();
  }
});

test("admin provider list masks API key material", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/providers", { cookie });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes("encrypted-existing-key"), false);
    assert.equal(response.body.includes("apiKeyEncrypted"), false);
    assert.equal(response.body.includes('"has_api_key":true'), true);
  } finally {
    await app.close();
  }
});

test("admin ad update writes audit log", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "PUT", "/api/v1/admin/ads/header", {
      cookie,
      csrfToken,
      payload: {
        provider_name: "adsense",
        ad_code: "<ins data-ad-slot=\"safe\"></ins>",
        is_active: true
      }
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(state.auditEvents.some((event) => event.action === "UPDATE_AD_SLOT"), true);
  } finally {
    await app.close();
  }
});

test("admin custom ad update succeeds with valid public URLs", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "PUT", "/api/v1/admin/ads/header", {
      cookie,
      csrfToken,
      payload: {
        provider_name: "custom",
        ad_type: "custom",
        image_url: "https://example.com/banner.png",
        target_url: "https://example.com/promo",
        alt_text: "Promo Spesial",
        is_active: true
      }
    });

    assert.equal(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body) as { success: boolean; data: { ad: { ad_type: string; custom_ad: { imageUrl: string; targetUrl: string; altText: string } } } };
    assert.equal(body.success, true);
    assert.equal(body.data.ad.ad_type, "custom");
    assert.equal(body.data.ad.custom_ad.imageUrl, "https://example.com/banner.png");
    assert.equal(body.data.ad.custom_ad.targetUrl, "https://example.com/promo");
    assert.equal(body.data.ad.custom_ad.altText, "Promo Spesial");
  } finally {
    await app.close();
  }
});

test("admin custom ad update rejects SSRF localhost or private IPs", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "PUT", "/api/v1/admin/ads/header", {
      cookie,
      csrfToken,
      payload: {
        provider_name: "custom",
        ad_type: "custom",
        image_url: "http://127.0.0.1/banner.png",
        target_url: "https://example.com/promo",
        is_active: true
      }
    });

    assert.equal(response.statusCode, 400, response.body);
  } finally {
    await app.close();
  }
});

test("GET /api/v1/ads returns active ads", async () => {
  const { repositories } = createMockRepositories();
  repositories.settings.getActiveAds = async () => [
    {
      slotKey: "header",
      providerName: "custom",
      adType: "custom",
      adCode: null,
      customAd: {
        imageUrl: "https://example.com/banner.png",
        targetUrl: "https://example.com/promo",
        altText: "Promo Spesial"
      }
    }
  ];
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "GET", "/api/v1/ads");
    assert.equal(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body) as { success: boolean; data: { ads: Array<{ slotKey: string; adType: string }> } };
    assert.equal(body.success, true);
    assert.equal(body.data.ads.length, 1);
    assert.equal(body.data.ads[0]?.slotKey, "header");
    assert.equal(body.data.ads[0]?.adType, "custom");
  } finally {
    await app.close();
  }
});

test("admin blocked domain create validates domain", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/security/blocked-domains", {
      cookie,
      csrfToken,
      payload: {
        domain: "127.0.0.1",
        reason: "private host"
      }
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  } finally {
    await app.close();
  }
});

test("admin blocked regex pattern rejects invalid regex", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/security/url-patterns", {
      cookie,
      csrfToken,
      payload: {
        pattern: "[",
        pattern_type: "regex",
        reason: "invalid"
      }
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  } finally {
    await app.close();
  }
});

test("admin request logs endpoint returns paginated hash-only logs", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/logs/requests?limit=1&offset=0", { cookie });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes("u".repeat(64)), true);
    assert.equal(response.body.includes("https://"), false);
    assert.equal(response.body.includes("203.0.113.20"), false);
    assert.equal(response.body.includes("vidsaveid-admin-crud-test"), false);
  } finally {
    await app.close();
  }
});

test("admin audit logs endpoint redacts sensitive key material", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/logs/audit", { cookie });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes("secret-ciphertext"), false);
    assert.equal(response.body.includes("[redacted]"), true);
  } finally {
    await app.close();
  }
});

test("admin audit logs endpoint redacts plaintext identity and URL fields in JSON values", async () => {
  const { repositories, state } = createMockRepositories();
  state.auditRows = [
    adminAuditLog({
      newValue: {
        adminEmail: "admin@example.com",
        ipAddress: "203.0.113.20",
        submittedUrl: "https://example.com/private",
        safe: "value"
      }
    })
  ];
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/logs/audit", { cookie });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes("admin@example.com"), false);
    assert.equal(response.body.includes("203.0.113.20"), false);
    assert.equal(response.body.includes("https://example.com/private"), false);
    assert.equal(response.body.includes("[redacted]"), true);
    assert.equal(response.body.includes("value"), true);
  } finally {
    await app.close();
  }
});

test("admin CRUD error responses are sanitized", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/security/url-patterns", {
      cookie,
      csrfToken,
      payload: {
        pattern: "[",
        pattern_type: "regex",
        reason: "invalid"
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.includes("stack"), false);
    assert.equal(response.body.includes("Error:"), false);
    assert.equal(response.body.includes(validAdminEmail), false);
    assert.equal(response.body.includes(validPassword), false);
    assert.equal(response.body.includes(process.env.ADMIN_SESSION_SECRET ?? ""), false);
  } finally {
    await app.close();
  }
});
