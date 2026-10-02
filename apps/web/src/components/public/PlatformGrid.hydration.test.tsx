import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformGrid } from "./PlatformGrid";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json"
    },
    status: 200
  });
}

function renderWithClient(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <PlatformGrid />
    </QueryClientProvider>
  );
}

describe("PlatformGrid hydration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates from prerendered fallback without markup mismatch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            platforms: []
          }
        })
      )
    );
    const serverClient = new QueryClient({
      defaultOptions: {
        queries: {
          enabled: false,
          retry: false
        }
      }
    });
    const browserClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });
    const serverHtml = renderToString(renderWithClient(serverClient));
    const container = document.createElement("div");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    container.innerHTML = serverHtml;
    expect(container).toHaveTextContent("Platform sedang disiapkan.");

    const root = hydrateRoot(container, renderWithClient(browserClient));

    await act(async () => {
      await Promise.resolve();
    });

    const hydrationErrors = errorSpy.mock.calls.filter((call) =>
      call.some((part) => typeof part === "string" && /hydration|did not match|server html/iu.test(part))
    );

    expect(hydrationErrors).toEqual([]);

    root.unmount();
    serverClient.clear();
    browserClient.clear();
  });
});
