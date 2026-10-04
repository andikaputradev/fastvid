import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { DnsAddress } from "@vidsaveid/security";
import type { ApiRepositories } from "./repositories/index.js";
import type { CreateAdminAuditLogInput } from "./repositories/audit.repository.js";
import type { CreateRequestLogInput } from "./repositories/log.repository.js";
import type { PlatformRecord, PublicPlatform } from "./repositories/platform.repository.js";
import type { PublicSettings } from "./repositories/settings.repository.js";
import { createNoopAdminRepository } from "./testHelpers/adminRepository.js";
import type { ProviderAdapter } from "./providers/providerAdapter.js";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "a".repeat(32);

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
  settings: PublicSettings;
  platforms: PlatformRecord[];
  blockedDomains: string[];
  blockedPatterns: Array<{ pattern: string; patternType: "exact" | "glob" | "regex" }>;
  auditLogs: CreateAdminAuditLogInput[];
  logs: CreateRequestLogInput[];
}

const publicDnsResolver = async (): Promise<readonly DnsAddress[]> => [
  { address: "93.184.216.34", family: 4 }
];

const defaultSettings: PublicSettings = {
  siteName: "FastVid",
  siteTitle: "FastVid - Public Video Tools",
  tagline: "Save public videos safely.",
  maintenanceMode: false,
  maintenanceMessage: null,
  status: "ok"
};

const activePlatform: PlatformRecord = {
  name: "TikTok",
  slug: "tiktok",
  baseDomains: ["tiktok.com"],
  isActive: true,
  status: "active",
  iconUrl: "https://cdn.example.test/tiktok.png",
  description: "TikTok public videos"
};

const inactivePlatform: PlatformRecord = {
  ...activePlatform,
  slug: "instagram",
  name: "Instagram",
  baseDomains: ["instagram.com"],
  isActive: false,
  status: "inactive"
};

const maintenancePlatform: PlatformRecord = {
  ...activePlatform,
  slug: "facebook",
  name: "Facebook",
  baseDomains: ["facebook.com"],
  status: "maintenance"
};

function isHostAllowed(hostname: string, domains: readonly string[]): boolean {
  const normalizedHost = hostname.toLowerCase();

  return domains.some((domain) => {
    const normalizedDomain = domain.toLowerCase();

    return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
  });
}

function publicPlatform(platform: PlatformRecord): PublicPlatform {
  return {
    name: platform.name,
    slug: platform.slug,
    iconUrl: platform.iconUrl,
    description: platform.description,
    status: platform.status
  };
}

function patternMatches(
  url: string,
  pattern: TestRepositoryState["blockedPatterns"][number]
): boolean {
  if (pattern.patternType === "exact") {
    return url === pattern.pattern;
  }

  if (pattern.patternType === "glob") {
    return url.includes(pattern.pattern.replaceAll("*", ""));
  }

  return new RegExp(pattern.pattern, "u").test(url);
}

function createMockRepositories(overrides: Partial<TestRepositoryState> = {}): {
  repositories: ApiRepositories;
  state: TestRepositoryState;
} {
  const state: TestRepositoryState = {
    settings: defaultSettings,
    platforms: [activePlatform, inactivePlatform, maintenancePlatform],
    blockedDomains: [],
    blockedPatterns: [],
    auditLogs: [],
    logs: [],
    ...overrides
  };
  const repositories: ApiRepositories = {
    admin: createNoopAdminRepository(),
    audit: {
      async createAdminAuditLog(input) {
        state.auditLogs.push(input);
      }
    },
    settings: {
      async getPublicSettings() {
        return state.settings;
      },
      async getSettingByKey(key) {
        const values: Record<string, string | null> = {
          maintenance_mode: state.settings.maintenanceMode ? "true" : "false",
          maintenance_message: state.settings.maintenanceMessage,
          site_status: state.settings.status
        };

        return values[key] ?? null;
      },
      async getMaintenanceStatus() {
        return {
          maintenanceMode: state.settings.maintenanceMode,
          maintenanceMessage: state.settings.maintenanceMessage,
          status: state.settings.status
        };
      },
      async getActiveAds() {
        return [];
      }
    },
    platforms: {
      async getActivePlatforms() {
        return state.platforms
          .filter((platform) => platform.isActive && platform.status === "active")
          .map(publicPlatform);
      },
      async getPlatformByDomain(hostname) {
        return (
          state.platforms.find((platform) => isHostAllowed(hostname, platform.baseDomains)) ?? null
        );
      },
      async getPlatformBySlug(slug) {
        return state.platforms.find((platform) => platform.slug === slug) ?? null;
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
      async isDomainBlocked(hostname) {
        return isHostAllowed(hostname, state.blockedDomains);
      },
      async findMatchingBlockedPattern(url) {
        return state.blockedPatterns.find((pattern) => patternMatches(url, pattern)) ?? null;
      }
    },
    requestLogs: {
      async createRequestLog(input) {
        state.logs.push(input);
      }
    }
  };

  return {
    repositories,
    state
  };
}

async function buildTestApp(repositories: ApiRepositories): Promise<FastifyInstance> {
  const { buildApp } = await import("./app.js");

  return buildApp({
    logger: false,
    repositories,
    ssrfResolveHostname: publicDnsResolver
  });
}

async function inject(
  repositories: ApiRepositories,
  method: "GET" | "POST",
  url: string,
  payload?: Record<string, unknown>
): Promise<InjectedResponse> {
  const app = await buildTestApp(repositories);

  try {
    const response = await app.inject({
      method,
      url,
      headers: {
        "content-type": "application/json",
        "user-agent": "vidsaveid-test",
        "x-forwarded-for": "203.0.113.10"
      },
      ...(payload === undefined ? {} : { payload: JSON.stringify(payload) })
    });

    return response as unknown as InjectedResponse;
  } finally {
    await app.close();
  }
}

async function injectDownload(
  repositories: ApiRepositories,
  payload: Record<string, unknown>
): Promise<InjectedResponse> {
  return inject(repositories, "POST", "/api/v1/download", payload);
}

function parseErrorResponse(body: string): ApiErrorResponse {
  return JSON.parse(body) as ApiErrorResponse;
}

test("GET /api/v1/status returns public settings from repository", async () => {
  const { repositories } = createMockRepositories();
  const response = await inject(repositories, "GET", "/api/v1/status");
  const body = JSON.parse(response.body) as ApiSuccessResponse<Record<string, unknown>>;

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.siteName, "FastVid");
  assert.equal(body.data.siteTitle, "FastVid - Public Video Tools");
  assert.equal(body.data.tagline, "Save public videos safely.");
});

test("GET /api/v1/status does not expose private settings", async () => {
  const { repositories } = createMockRepositories();
  const response = await inject(repositories, "GET", "/api/v1/status");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.includes("turnstile_enabled"), false);
  assert.equal(response.body.includes("rate_limit_public_per_minute"), false);
});

test("GET /api/v1/platforms returns only active public platforms", async () => {
  const { repositories } = createMockRepositories();
  const response = await inject(repositories, "GET", "/api/v1/platforms");
  const body = JSON.parse(response.body) as ApiSuccessResponse<{ platforms: PublicPlatform[] }>;

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    body.data.platforms.map((platform) => platform.slug),
    ["tiktok"]
  );
});

test("GET /api/v1/platforms does not expose provider or internal fields", async () => {
  const { repositories } = createMockRepositories();
  const response = await inject(repositories, "GET", "/api/v1/platforms");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.includes("baseDomains"), false);
  assert.equal(response.body.includes("allowedUrlPatterns"), false);
  assert.equal(response.body.includes("blockedUrlPatterns"), false);
  assert.equal(response.body.includes("maxRequestsPerMinute"), false);
});

test("POST /api/v1/download rejects unsupported domain", async () => {
  const { repositories, state } = createMockRepositories();
  const response = await injectDownload(repositories, { url: "https://example.com/video" });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.error.code, "UNSUPPORTED_DOMAIN");
  assert.equal(state.logs[0]?.error_code, "UNSUPPORTED_DOMAIN");
});

test("POST /api/v1/download rejects inactive platform", async () => {
  const { repositories, state } = createMockRepositories();
  const response = await injectDownload(repositories, { url: "https://instagram.com/reel/1" });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.error.code, "PLATFORM_INACTIVE");
  assert.equal(state.logs[0]?.platform_slug, "instagram");
});

test("POST /api/v1/download rejects platform maintenance", async () => {
  const { repositories, state } = createMockRepositories();
  const response = await injectDownload(repositories, { url: "https://facebook.com/watch/1" });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 503);
  assert.equal(body.error.code, "PLATFORM_MAINTENANCE");
  assert.equal(state.logs[0]?.status, "maintenance");
});

test("POST /api/v1/download rejects blocked domain", async () => {
  const { repositories, state } = createMockRepositories({
    blockedDomains: ["tiktok.com"]
  });
  const response = await injectDownload(repositories, {
    url: "https://www.tiktok.com/@wahyu/video/1"
  });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.error.code, "BLOCKED_DOMAIN");
  assert.equal(state.logs[0]?.error_code, "BLOCKED_DOMAIN");
});

test("POST /api/v1/download rejects blocked URL pattern", async () => {
  const { repositories, state } = createMockRepositories({
    blockedPatterns: [{ pattern: "blocked-token", patternType: "regex" }]
  });
  const response = await injectDownload(repositories, {
    url: "https://www.tiktok.com/@wahyu/video/blocked-token"
  });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(body.error.code, "BLOCKED_URL_PATTERN");
  assert.equal(state.logs[0]?.error_code, "BLOCKED_URL_PATTERN");
});

test("POST /api/v1/download returns PROVIDER_NOT_IMPLEMENTED for active allowed platform", async () => {
  const { repositories, state } = createMockRepositories();
  const response = await injectDownload(repositories, {
    url: "https://www.tiktok.com/@wahyu/video/1#fragment"
  });
  const body = parseErrorResponse(response.body);

  assert.equal(response.statusCode, 501);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "PROVIDER_NOT_IMPLEMENTED");
  assert.equal(body.error.message, "Provider integration is not implemented yet.");
  assert.equal(state.logs[0]?.error_code, "PROVIDER_NOT_IMPLEMENTED");
});

test("POST /api/v1/download writes request log with hashes only", async () => {
  const { repositories, state } = createMockRepositories();
  const plaintextUrl = "https://www.tiktok.com/@wahyu/video/1";

  await injectDownload(repositories, { url: plaintextUrl });

  const log = state.logs[0];

  assert.notEqual(log, undefined);
  assert.equal(log?.url_hash.length, 64);
  assert.equal(log?.ip_hash.length, 64);
  assert.equal(log?.user_agent_hash?.length, 64);
  assert.notEqual(log?.url_hash, plaintextUrl);
  assert.equal(JSON.stringify(log).includes(plaintextUrl), false);
  assert.equal(JSON.stringify(log).includes("203.0.113.10"), false);
  assert.equal(JSON.stringify(log).includes("vidsaveid-test"), false);
});

test("POST /api/v1/download response never includes plaintext submitted URL", async () => {
  const { repositories } = createMockRepositories();
  const plaintextUrl = "https://example.com/video?token=secret-value";
  const response = await injectDownload(repositories, { url: plaintextUrl });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.includes(plaintextUrl), false);
  assert.equal(response.body.includes("secret-value"), false);
});

test("POST /api/v1/download returns request ID in header and body", async () => {
  const { repositories } = createMockRepositories();
  const response = await injectDownload(repositories, { url: "https://tiktok.com/@wahyu/video/1" });
  const body = parseErrorResponse(response.body);
  const headerRequestId = response.headers["x-request-id"];

  assert.equal(response.statusCode, 501);
  assert.equal(typeof headerRequestId, "string");
  assert.equal(body.requestId, headerRequestId);
});

test("GET /api/v1/download/stream rejects invalid or expired token", async () => {
  const { repositories } = createMockRepositories();
  const response = await inject(repositories, "GET", "/api/v1/download/stream?token=invalid-token");

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.includes("INVALID_TOKEN"), true);
});

test("GET /api/v1/download/stream streams media with upstream headers and attachment disposition", async () => {
  const { repositories } = createMockRepositories();
  const { createStreamToken } = await import("./services/streamToken.js");
  const token = createStreamToken(
    {
      url: "https://cdn.example.test/video.mp4",
      headers: { Referer: "https://m.tiktok.com/" },
      filename: "test_video.mp4",
      expiresAt: Date.now() + 60_000
    },
    process.env.API_KEY_ENCRYPTION_KEY!
  );

  const { buildApp } = await import("./app.js");
  let capturedHeaders: Record<string, string> | undefined;

  const mockFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    capturedHeaders = init?.headers as Record<string, string> | undefined;
    return new Response(Buffer.from("dummy video stream content"), {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "content-length": "26"
      }
    });
  };

  const app = await buildApp({
    logger: false,
    repositories,
    ssrfResolveHostname: publicDnsResolver
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as typeof fetch;

  try {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/download/stream?token=${token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["content-type"], "video/mp4");
    assert.equal(res.headers["content-disposition"], 'attachment; filename="test_video.mp4"');
    assert.equal(res.body, "dummy video stream content");
    assert.equal(capturedHeaders?.Referer, "https://m.tiktok.com/");
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});

test("POST /api/v1/download tunnels external video and audio URLs and hides secrets", async () => {
  const { repositories } = createMockRepositories();
  const mockProvider = {
    id: "provider-1",
    name: "Kyzzz TikTok",
    slug: "kyzzz-tiktok",
    platformSlug: "tiktok",
    baseUrl: "https://api.kyzzz.xyz/api/download/tiktok",
    apiKeyEncrypted: null,
    priority: 1,
    dailyLimit: 1000,
    dailyUsed: 0,
    isActive: true
  };

  repositories.providers.getActiveProvidersForPlatform = async () => [mockProvider];

  const sensitiveProviderStreamUrl =
    "https://api.kyzzz.xyz/api/download/tiktok?action=stream&url=https%3A%2F%2Fv16-webapp-prime.tiktok.com%2Fvideo%2Ftos%2F&apikey=kyzz3327503284211";

  const mockAdapter = {
    async extractMedia() {
      return {
        title: "Test Video Clip",
        platform: "tiktok",
        thumbnailUrl: "https://cdn.example.test/thumb.jpg",
        duration: 15,
        author: "creator",
        media: [
          {
            format: "mp4",
            hasAudio: true,
            quality: "HD (No Watermark)",
            url: sensitiveProviderStreamUrl
          },
          {
            format: "mp3",
            hasAudio: true,
            quality: "Audio (MP3)",
            url: "https://cdn.example.test/music.mp3"
          }
        ]
      };
    }
  };

  const { buildApp } = await import("./app.js");
  const app = await buildApp({
    logger: false,
    repositories,
    ssrfResolveHostname: publicDnsResolver,
    providerAdapter: mockAdapter as unknown as ProviderAdapter
  });

  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/download",
      headers: {
        "content-type": "application/json",
        "user-agent": "vidsaveid-test",
        "x-forwarded-for": "203.0.113.10"
      },
      payload: JSON.stringify({ url: "https://www.tiktok.com/@wahyu/video/1" })
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.media.length, 2);

    // Both video and audio must be tunneled via /api/v1/download/stream
    assert.match(body.data.media[0].url, /^\/api\/v1\/download\/stream\?token=/);
    assert.match(body.data.media[1].url, /^\/api\/v1\/download\/stream\?token=/);

    // Upstream URL and API key must never appear in response body
    assert.equal(res.body.includes("api.kyzzz.xyz"), false);
    assert.equal(res.body.includes("kyzz3327503284211"), false);
  } finally {
    await app.close();
  }
});


const _validRequestLogInput: CreateRequestLogInput = {
  request_id: "request-id",
  platform_slug: "tiktok",
  provider_slug: null,
  url_hash: "u".repeat(64),
  ip_hash: "i".repeat(64),
  user_agent_hash: "a".repeat(64),
  status: "failed",
  error_code: "PROVIDER_NOT_IMPLEMENTED",
  response_time_ms: 1,
  country_code: null
};

const _requestLogInputRejectsPlaintext: CreateRequestLogInput = {
  ..._validRequestLogInput,
  // @ts-expect-error request logs must not accept plaintext submitted URLs.
  url: "https://www.tiktok.com/@wahyu/video/1"
};
