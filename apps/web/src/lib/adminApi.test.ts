import { describe, expect, it, vi } from "vitest";
import { adminApi, adminRequest, AdminApiError } from "./adminApi";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () => jsonResponse(payload, status)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestInit(fetchMock: ReturnType<typeof mockFetch>): RequestInit {
  return fetchMock.mock.calls[0]?.[1] ?? {};
}

function requestHeaders(fetchMock: ReturnType<typeof mockFetch>): Record<string, string> {
  return requestInit(fetchMock).headers as Record<string, string>;
}

describe("adminApi", () => {
  it("uses credentials include", async () => {
    const fetchMock = mockFetch({ success: true, data: { admin: { id: "1", emailHash: "a".repeat(64), role: "admin" } } });

    await adminApi.me();

    expect(requestInit(fetchMock).credentials).toBe("include");
  });

  it("sends X-CSRF-Token for POST, PUT, PATCH, and DELETE", async () => {
    document.cookie = "vidsaveid_admin_csrf=csrf-token; path=/";
    const fetchMock = mockFetch({ success: true, data: { ok: true } });

    await adminApi.logout();
    await adminApi.updateSetting("site_name", "VidSaveID");
    await adminRequest<{ ok: boolean }>("/api/v1/admin/test", { method: "PATCH" });
    await adminApi.deleteProvider("00000000-0000-4000-8000-000000000001");

    for (const call of fetchMock.mock.calls) {
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers["x-csrf-token"]).toBe("csrf-token");
    }
  });

  it("does not send CSRF for GET", async () => {
    document.cookie = "vidsaveid_admin_csrf=csrf-token; path=/";
    const fetchMock = mockFetch({ success: true, data: { admin: { id: "1", emailHash: "a".repeat(64), role: "admin" } } });

    await adminApi.me();

    expect(requestHeaders(fetchMock)["x-csrf-token"]).toBeUndefined();
  });

  it("normalizes API errors safely", async () => {
    mockFetch(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Safe message"
        },
        stack: "internal stack"
      },
      500
    );

    await expect(adminApi.me()).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Safe message",
      status: 500
    });
  });

  it("does not expose raw internal error objects", async () => {
    mockFetch(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Sanitized"
        },
        debug: {
          password: "secret-password",
          stack: "Error: internal"
        }
      },
      500
    );

    try {
      await adminApi.me();
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(AdminApiError);
      expect(String(error)).not.toContain("secret-password");
      expect(String(error)).not.toContain("internal");
      expect(String(error)).toContain("Sanitized");
    }
  });

  it("normalizes platform arrays from legacy string-backed response fields", async () => {
    mockFetch({
      success: true,
      data: {
        platforms: [
          {
            baseDomains: "[\"example.com\",\"www.example.com\"]",
            id: "00000000-0000-4000-8000-000000000001",
            isActive: "true",
            maxRequestsPerMinute: "25",
            name: "Example",
            slug: "example",
            status: "active"
          }
        ]
      }
    });

    const result = await adminApi.listPlatforms();

    expect(result.platforms[0]?.base_domains).toEqual(["example.com", "www.example.com"]);
    expect(result.platforms[0]?.is_active).toBe(true);
    expect(result.platforms[0]?.max_requests_per_minute).toBe(25);
  });

  it("maps provider hasApiKey without returning encrypted key material", async () => {
    mockFetch({
      success: true,
      data: {
        providers: [
          {
            apiKeyEncrypted: "encrypted-provider-secret",
            baseUrl: "https://provider.example.com",
            dailyLimit: "1000",
            hasApiKey: true,
            id: "00000000-0000-4000-8000-000000000001",
            name: "Provider",
            platformSlug: "tiktok",
            priority: "1",
            slug: "provider"
          }
        ]
      }
    });

    const result = await adminApi.listProviders();

    expect(result.providers[0]?.has_api_key).toBe(true);
    expect(JSON.stringify(result)).not.toContain("encrypted-provider-secret");
    expect(JSON.stringify(result)).not.toContain("apiKeyEncrypted");
  });

  it("normalizes paginated request logs with camelCase fields", async () => {
    mockFetch({
      success: true,
      data: {
        logs: [
          {
            createdAt: "2026-01-01T00:00:00.000Z",
            id: "00000000-0000-4000-8000-000000000001",
            ipHash: "i".repeat(64),
            requestId: "request-id",
            responseTimeMs: "42",
            status: "success",
            urlHash: "u".repeat(64)
          }
        ],
        pagination: {
          limit: "25",
          offset: "0"
        }
      }
    });

    const result = await adminApi.listRequestLogs({ limit: 25, offset: 0 });

    expect(result.logs[0]?.request_id).toBe("request-id");
    expect(result.logs[0]?.response_time_ms).toBe(42);
    expect(result.pagination).toEqual({ limit: 25, offset: 0 });
  });
});
