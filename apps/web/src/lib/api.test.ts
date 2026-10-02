import { describe, expect, it, vi } from "vitest";
import { api, PublicApiError } from "./api";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}

describe("public api client", () => {
  it("does not send credentials for public endpoints", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        jsonResponse({
          success: true,
          data: {
            maintenanceMode: false,
            siteName: "FastVid",
            siteTitle: "FastVid",
            status: "active",
            tagline: "Simpan video publik"
          }
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.getStatus();

    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBeUndefined();
  });

  it("normalizes public API errors without raw internals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            success: false,
            error: {
              code: "UNSUPPORTED_DOMAIN",
              message: "https://example.com/private-token"
            },
            debug: {
              stack: "internal stack"
            }
          },
          400
        )
      )
    );

    await expect(api.requestDownload({ url: "https://example.com/private-token" })).rejects.toMatchObject({
      code: "UNSUPPORTED_DOMAIN",
      message: "Link tidak dapat diproses. Pastikan link bersifat publik dan platform didukung."
    });

    try {
      await api.requestDownload({ url: "https://example.com/private-token" });
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicApiError);
      expect(String(error)).not.toContain("private-token");
      expect(String(error)).not.toContain("internal stack");
    }
  });
});
