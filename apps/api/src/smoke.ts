import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";

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

interface PublicPlatformResponse {
  platforms: Array<{
    slug: string;
    status: string;
  }>;
}

interface SmokeResult {
  check: string;
  status: "passed" | "skipped";
}

const devPlatformUrls: Record<string, string> = {
  instagram: "https://www.instagram.com/reel/local-smoke/",
  tiktok: "https://www.tiktok.com/@vidsaveid/video/local-smoke"
};

function ensureSmokeEnvironment(): void {
  process.env.NODE_ENV ??= "development";
  process.env.IP_HASH_SECRET ??= "local-smoke-ip-hash-secret-value-32";
  process.env.ADMIN_SESSION_SECRET ??= "local-smoke-admin-session-secret-32";
  process.env.API_KEY_ENCRYPTION_KEY ??= Buffer.alloc(32, 2).toString("base64");
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

function assertStatus(
  response: { statusCode: number; body: string },
  expectedStatus: number,
  check: string
): void {
  if (response.statusCode !== expectedStatus) {
    throw new Error(
      `${check} expected HTTP ${expectedStatus}, received ${response.statusCode}: ${response.body}`
    );
  }
}

function assertSuccess<TData>(
  body: ApiSuccessResponse<TData> | ApiErrorResponse,
  check: string
): asserts body is ApiSuccessResponse<TData> {
  if (!body.success) {
    throw new Error(`${check} expected success response, received ${body.error.code}.`);
  }
}

function assertError(
  body: ApiSuccessResponse<unknown> | ApiErrorResponse,
  expectedCode: string,
  check: string
): asserts body is ApiErrorResponse {
  if (body.success || body.error.code !== expectedCode) {
    throw new Error(`${check} expected ${expectedCode}.`);
  }
}

async function runSmoke(): Promise<readonly SmokeResult[]> {
  if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL.trim().length === 0) {
    throw new Error("DATABASE_URL is required to run API smoke tests against DB-backed routes.");
  }

  ensureSmokeEnvironment();
  const { buildApp } = await import("./app.js");
  const app: FastifyInstance = await buildApp({
    logger: false,
    ssrfResolveHostname: async () => [{ address: "93.184.216.34", family: 4 }]
  });
  const results: SmokeResult[] = [];

  try {
    const statusResponse = await app.inject({
      method: "GET",
      url: "/api/v1/status"
    });
    assertStatus(statusResponse, 200, "GET /api/v1/status");
    assertSuccess(
      parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(statusResponse.body),
      "GET /api/v1/status"
    );
    results.push({ check: "GET /api/v1/status", status: "passed" });

    const platformsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/platforms"
    });
    assertStatus(platformsResponse, 200, "GET /api/v1/platforms");
    const platformsBody = parseJson<ApiSuccessResponse<PublicPlatformResponse> | ApiErrorResponse>(
      platformsResponse.body
    );
    assertSuccess(platformsBody, "GET /api/v1/platforms");
    results.push({ check: "GET /api/v1/platforms", status: "passed" });

    const unsupportedResponse = await app.inject({
      method: "POST",
      url: "/api/v1/download",
      headers: {
        "content-type": "application/json",
        "user-agent": "vidsaveid-api-smoke"
      },
      payload: {
        url: "https://unsupported.example/video/local-smoke"
      }
    });
    assertStatus(unsupportedResponse, 400, "POST /api/v1/download unsupported domain");
    assertError(
      parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(unsupportedResponse.body),
      "UNSUPPORTED_DOMAIN",
      "POST /api/v1/download unsupported domain"
    );
    results.push({ check: "POST /api/v1/download unsupported domain", status: "passed" });

    const activeDevPlatform = platformsBody.data.platforms.find(
      (platform) => devPlatformUrls[platform.slug] !== undefined
    );

    if (activeDevPlatform === undefined) {
      results.push({
        check: "POST /api/v1/download active dev platform",
        status: "skipped"
      });
    } else {
      const devPlatformResponse = await app.inject({
        method: "POST",
        url: "/api/v1/download",
        headers: {
          "content-type": "application/json",
          "user-agent": "vidsaveid-api-smoke"
        },
        payload: {
          url: devPlatformUrls[activeDevPlatform.slug]
        }
      });
      assertStatus(devPlatformResponse, 501, "POST /api/v1/download active dev platform");
      assertError(
        parseJson<ApiSuccessResponse<unknown> | ApiErrorResponse>(devPlatformResponse.body),
        "PROVIDER_NOT_IMPLEMENTED",
        "POST /api/v1/download active dev platform"
      );
      results.push({ check: "POST /api/v1/download active dev platform", status: "passed" });
    }
  } finally {
    await app.close();
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmoke()
    .then((results) => {
      console.info({
        status: "passed",
        results
      });
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
