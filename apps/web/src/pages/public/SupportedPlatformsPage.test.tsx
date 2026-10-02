import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { SupportedPlatformsPage } from "./SupportedPlatformsPage";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("SupportedPlatformsPage", () => {
  it("renders public platform API data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            platforms: [
              {
                description: "Video publik TikTok",
                iconUrl: null,
                name: "TikTok",
                slug: "tiktok",
                status: "active"
              }
            ]
          }
        })
      )
    );

    renderWithRouter(<SupportedPlatformsPage />, ["/platforms"]);

    expect(await screen.findByText("TikTok")).toBeInTheDocument();
    expect(screen.getByText("Video publik TikTok")).toBeInTheDocument();
    expect(screen.queryByText("baseDomains")).not.toBeInTheDocument();
  });

  it("renders empty state when no platform is active", async () => {
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

    renderWithRouter(<SupportedPlatformsPage />, ["/platforms"]);

    expect(await screen.findByText("Platform sedang disiapkan.")).toBeInTheDocument();
  });
});
