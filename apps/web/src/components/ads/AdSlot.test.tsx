import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdSlot } from "./AdSlot";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("AdSlot", () => {
  it("renders custom ad banner with secure link attributes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: [
              {
                slotKey: "header",
                providerName: "custom",
                adType: "custom",
                adCode: null,
                customAd: {
                  imageUrl: "https://example.com/banner.png",
                  targetUrl: "https://example.com/promo",
                  altText: "Promo Spesial FastVid"
                }
              }
            ]
          }
        })
      )
    );

    renderWithProviders(<AdSlot slot="header" />);

    const img = await screen.findByRole("img", { name: /Promo Spesial FastVid/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/banner.png");

    const link = img.closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/promo");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow sponsored");
  });

  it("does not render anything when slot has no active ad", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: []
          }
        })
      )
    );

    const { container } = renderWithProviders(<AdSlot slot="sidebar" />);
    expect(container.firstChild).toBeNull();
  });
});
