import { strict as assert } from "node:assert";
import { Buffer } from "node:buffer";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { AdminAuthProvider, AdminIdentity } from "./auth/adminAuthProvider.js";
import type { CreateAdminAuditLogInput } from "./repositories/audit.repository.js";
import type { ApiRepositories } from "./repositories/index.js";
import type { CreateRequestLogInput } from "./repositories/log.repository.js";
import type { PlatformRecord, PublicPlatform } from "./repositories/platform.repository.js";
import type { PublicSettings } from "./repositories/settings.repository.js";
import { createNoopAdminRepository } from "./testHelpers/adminRepository.js";

process.env.NODE_ENV = "test";
process.env.IP_HASH_SECRET = "i".repeat(32);
process.env.API_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.ADMIN_SESSION_SECRET = "admin-session-secret-for-tests-12345";

const validAdminEmail = "admin@example.com";
const validAdmin: AdminIdentity = {
  id: "11111111-1111-4111-8111-111111111111",
  emailHash: "a".repeat(64),
  role: "admin"
};
const validPassword = "correct-password";
const ADMIN_SESSION_COOKIE_NAME = "fastvid_admin_session";
const ADMIN_CSRF_COOKIE_NAME = "fastvid_admin_csrf";

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
  auditLogs: CreateAdminAuditLogInput[];
  requestLogs: CreateRequestLogInput[];
}

const defaultSettings: PublicSettings = {
  siteName: "FastVid",
  siteTitle: "FastVid",
  tagline: "Save public videos safely.",
  maintenanceMode: false,
  maintenanceMessage: null,
  status: "ok"
};

function createMockAuthProvider(): AdminAuthProvider {
  return {
    async authenticate(credentials) {
      return credentials.email === validAdminEmail && credentials.password === validPassword
        ? validAdmin
        : null;
    }
  };
}

function createMockRepositories(): {
  repositories: ApiRepositories;
  state: TestRepositoryState;
} {
  const state: TestRepositoryState = {
    settings: defaultSettings,
    platforms: [],
    auditLogs: [],
    requestLogs: []
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
      async getActivePlatforms(): Promise<readonly PublicPlatform[]> {
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
      async isDomainBlocked() {
        return false;
      },
      async findMatchingBlockedPattern() {
        return null;
      }
    },
    requestLogs: {
      async createRequestLog(input) {
        state.requestLogs.push(input);
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
    adminAuthProvider: createMockAuthProvider()
  });
}

async function inject(
  app: FastifyInstance,
  method: "GET" | "POST",
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
      "user-agent": "vidsaveid-admin-auth-test",
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
  response: InjectedResponse;
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

  return {
    response,
    cookie: cookieHeaderFromSetCookies(cookies),
    csrfToken: cookieValue(cookies, ADMIN_CSRF_COOKIE_NAME)
  };
}

function parseError(body: string): ApiErrorResponse {
  return JSON.parse(body) as ApiErrorResponse;
}

test("POST /api/v1/admin/auth/login rejects invalid body", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "POST", "/api/v1/admin/auth/login", {
      payload: {
        email: "not-an-email",
        password: validPassword
      }
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "VALIDATION_FAILED");
  } finally {
    await app.close();
  }
});

test("POST /api/v1/admin/auth/login rejects invalid credentials", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "POST", "/api/v1/admin/auth/login", {
      payload: {
        email: validAdminEmail,
        password: "wrong-password"
      }
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 401);
    assert.equal(body.error.code, "INVALID_CREDENTIALS");
    assert.equal(state.auditLogs[0]?.action, "LOGIN_FAILED");
  } finally {
    await app.close();
  }
});

test("POST /api/v1/admin/auth/login success sets HttpOnly session cookie", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { response } = await login(app);
    const cookies = setCookieHeaders(response);
    const sessionCookie = cookies.find((cookie) =>
      cookie.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`)
    );

    assert.equal(response.statusCode, 200, response.body);
    assert.notEqual(sessionCookie, undefined);
    assert.equal(sessionCookie?.includes("HttpOnly"), true);
    assert.equal(sessionCookie?.includes("SameSite=Lax"), true);
    assert.equal(sessionCookie?.includes("Path=/"), true);
  } finally {
    await app.close();
  }
});

test("POST /api/v1/admin/auth/login success sets readable CSRF cookie", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { response, csrfToken } = await login(app);
    const cookies = setCookieHeaders(response);
    const csrfCookie = cookies.find((cookie) => cookie.startsWith(`${ADMIN_CSRF_COOKIE_NAME}=`));

    assert.equal(response.statusCode, 200, response.body);
    assert.notEqual(csrfCookie, undefined);
    assert.equal(csrfToken.length > 32, true);
    assert.equal(csrfCookie?.includes("HttpOnly"), false);
  } finally {
    await app.close();
  }
});

test("GET /api/v1/admin/auth/me rejects missing session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "GET", "/api/v1/admin/auth/me");
    const body = parseError(response.body);

    assert.equal(response.statusCode, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("GET /api/v1/admin/auth/me accepts valid session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/auth/me", {
      cookie
    });
    const body = JSON.parse(response.body) as ApiSuccessResponse<{
      admin: { id: string; emailHash: string; role: string };
    }>;

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(body.success, true);
    assert.equal(body.data.admin.id, validAdmin.id);
    assert.equal(body.data.admin.emailHash.length, 64);
    assert.equal(body.data.admin.role, "admin");
    assert.equal(response.body.includes(validAdminEmail), false);
  } finally {
    await app.close();
  }
});

test("POST /api/v1/admin/auth/logout clears session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/auth/logout", {
      cookie,
      csrfToken
    });
    const cookies = setCookieHeaders(response);
    const clearedSession = cookies.find((value) =>
      value.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`)
    );

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(clearedSession?.includes("Max-Age=0"), true);
  } finally {
    await app.close();
  }
});

test("admin mutation without CSRF rejects", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/auth/logout", {
      cookie
    });
    const body = parseError(response.body);

    assert.equal(response.statusCode, 403, response.body);
    assert.equal(body.error.code, "FORBIDDEN");
  } finally {
    await app.close();
  }
});

test("admin mutation with CSRF passes middleware-level check", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie, csrfToken } = await login(app);
    const response = await inject(app, "POST", "/api/v1/admin/auth/logout", {
      cookie,
      csrfToken
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(
      state.auditLogs.some((log) => log.action === "LOGOUT"),
      true
    );
  } finally {
    await app.close();
  }
});

test("audit log receives hash-only fields", async () => {
  const { repositories, state } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    await login(app);
    const auditLog = state.auditLogs[0];
    const serializedAuditLog = JSON.stringify(auditLog);

    assert.notEqual(auditLog, undefined);
    assert.equal(auditLog?.adminEmailHash.length, 64);
    assert.equal(auditLog?.ipHash.length, 64);
    assert.equal(serializedAuditLog.includes(validAdminEmail), false);
    assert.equal(serializedAuditLog.includes("127.0.0.1"), false);
    assert.equal(serializedAuditLog.includes(validPassword), false);
  } finally {
    await app.close();
  }
});

test("admin auth responses never expose password, session secret, or stack trace", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "POST", "/api/v1/admin/auth/login", {
      payload: {
        email: validAdminEmail,
        password: "plain-password"
      }
    });

    assert.equal(response.body.includes("plain-password"), false);
    assert.equal(response.body.includes(validAdminEmail), false);
    assert.equal(response.body.includes("access-token"), false);
    assert.equal(response.body.includes("refresh-token"), false);
    assert.equal(response.body.includes(process.env.ADMIN_SESSION_SECRET ?? ""), false);
    assert.equal(response.body.includes("stack"), false);
    assert.equal(response.body.includes("Error:"), false);
  } finally {
    await app.close();
  }
});

test("GET /api/v1/admin/auth/csrf rejects missing session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const response = await inject(app, "GET", "/api/v1/admin/auth/csrf");
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test("GET /api/v1/admin/auth/csrf issues and sets CSRF token cookie and response data for authenticated session", async () => {
  const { repositories } = createMockRepositories();
  const app = await buildTestApp(repositories);

  try {
    const { cookie } = await login(app);
    const response = await inject(app, "GET", "/api/v1/admin/auth/csrf", { cookie });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body) as ApiSuccessResponse<{ csrfToken: string }>;
    assert.equal(body.success, true);
    assert.ok(typeof body.data?.csrfToken === "string" && body.data.csrfToken.length > 0);

    const cookies = setCookieHeaders(response);
    const csrfCookie = cookieValue(cookies, ADMIN_CSRF_COOKIE_NAME);
    assert.ok(csrfCookie.length > 0);
  } finally {
    await app.close();
  }
});

