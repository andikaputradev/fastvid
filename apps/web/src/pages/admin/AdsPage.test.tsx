import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdsPage } from "./AdsPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("AdsPage", () => {
  it("renders ad code as text and does not execute it as HTML", async () => {
    const adCode = '<script>window.__adExecuted = true</script><div data-testid="ad-html">Unsafe</div>';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: [
              {
                ad_code: adCode,
                id: "00000000-0000-4000-8000-000000000001",
                is_active: true,
                provider_name: "adsense",
                slot_key: "header",
                updated_at: "2026-01-01T00:00:00.000Z"
              }
            ]
          }
        })
      )
    );

    const { container } = renderWithProviders(<AdsPage />);

    expect(await screen.findByText(/window.__adExecuted/u)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByTestId("ad-html")).not.toBeInTheDocument();
  });

  it("does not use dangerouslySetInnerHTML in the admin ad editor", () => {
    const source = readFileSync("src/pages/admin/AdsPage.tsx", "utf8");

    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
