import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";

interface SmokeResult {
  check: string;
  status: "passed";
}

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

const csrfCookieName = "vidsaveid_admin_csrf";
const sessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-vidsaveid_admin_session"
    : "vidsaveid_admin_session";

function ensureSmokeEnvironment(): void {
  process.env.NODE_ENV ??= "development";
  process.env.IP_HASH_SECRET ??= "local-admin-smoke-ip-hash-secret-32";
  process.env.ADMIN_SESSION_SECRET ??= "local-admin-smoke-session-secret-32";
  process.env.API_KEY_ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString("base64");
}

function requireRuntimeValue(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required for admin auth smoke testing.`);
  }

  return value;
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

function setCookieHeaders(response: {
  headers: Record<string, number | string | string[] | undefined>;
}): string[] {
  const rawHeader = response.headers["set-cookie"];

  if (rawHeader === undefined) {
    return [];
  }

  if (Array.isArray(rawHeader)) {
    return rawHeader;
  }

  return typeof rawHeader === "string" ? [rawHeader] : [];
}

function cookieValue(setCookies: readonly string[], name: string): string {
  const cookie = setCookies.find((value) => value.startsWith(`${name}=`));

  if (cookie === undefined) {
    throw new Error(`${name} cookie was not set.`);
  }

  return decodeURIComponent(cookie.split(";")[0]?.split("=").slice(1).join("=") ?? "");
}

function cookieHeaderFromSetCookies(setCookies: readonly string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function assertSuccess<TData>(
  body: ApiSuccessResponse<TData> | ApiErrorResponse,
  check: string
): asserts body is ApiSuccessResponse<TData> {
  if (!body.success) {
    throw new Error(`${check} failed with ${body.error.code}.`);
  }
}

function assertStatus(
  response: { body: string; statusCode: number },
  statusCode: number,
  check: string
): void {
  if (response.statusCode !== statusCode) {
    throw new Error(`${check} expected HTTP ${statusCode}, received ${response.statusCode}.`);
  }
}

async function runSmoke(): Promise<readonly SmokeResult[]> {
  const email = requireRuntimeValue("ADMIN_SMOKE_EMAIL");
  const password = requireRuntimeValue("ADMIN_SMOKE_PASSWORD");
  const { buildApp } = await import("../app.js");
  const app: FastifyInstance = await buildApp({
    logger: false
  });
  const results: SmokeResult[] = [];

  try {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      headers: {
        "content-type": "application/json",
        "user-agent": "vidsaveid-admin-auth-smoke"
      },
      payload: {
        email,
        password
      }
    });
    assertStatus(loginResponse, 200, "admin login");
    assertSuccess(
      parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(loginResponse.body),
      "admin login"
    );
    const cookies = setCookieHeaders(loginResponse);
    const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${sessionCookieName}=`));
    const csrfToken = cookieValue(cookies, csrfCookieName);

    if (sessionCookie === undefined || !sessionCookie.includes("HttpOnly")) {
      throw new Error("HttpOnly admin session cookie was not set.");
    }

    results.push({ check: "login", status: "passed" });
    results.push({ check: "session_cookie", status: "passed" });
    results.push({ check: "csrf_cookie", status: "passed" });

    const cookieHeader = cookieHeaderFromSetCookies(cookies);
    const meResponse = await app.inject({
      method: "GET",
      url: "/api/v1/admin/auth/me",
      headers: {
        cookie: cookieHeader,
        "user-agent": "vidsaveid-admin-auth-smoke"
      }
    });
    assertStatus(meResponse, 200, "admin me");
    assertSuccess(
      parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(meResponse.body),
      "admin me"
    );
    results.push({ check: "me", status: "passed" });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/logout",
      headers: {
        cookie: cookieHeader,
        "user-agent": "vidsaveid-admin-auth-smoke",
        "x-csrf-token": csrfToken
      }
    });
    assertStatus(logoutResponse, 200, "admin logout");
    assertSuccess(
      parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(logoutResponse.body),
      "admin logout"
    );
    results.push({ check: "logout", status: "passed" });
  } finally {
    await app.close();
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureSmokeEnvironment();
  runSmoke()
    .then((results) => {
      console.info({
        status: "passed",
        results
      });
    })
    .catch((error: unknown) => {
      console.error({
        status: "failed",
        message: error instanceof Error ? error.message : "Admin auth smoke test failed."
      });
      process.exitCode = 1;
    });
}
