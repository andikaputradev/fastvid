import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { FirstVisitAdModal } from "./FirstVisitAdModal";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

describe("FirstVisitAdModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders ad modal on first visit and closes upon clicking button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: [
              {
                slotKey: "popup",
                providerName: "Mitra Sponsor",
                adType: "custom",
                adCode: null,
                customAd: {
                  imageUrl: "https://example.com/ad-popup.jpg",
                  targetUrl: "https://example.com/diskon",
                  altText: "Promo Selamat Datang"
                }
              }
            ]
          }
        })
      )
    );

    renderWithProviders(<FirstVisitAdModal />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const bannerImg = screen.getByRole("img", { name: /Promo Selamat Datang/i });
    expect(bannerImg).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /Lanjutkan ke Website/i });
    fireEvent.click(closeButton);

    expect(localStorage.getItem("fastvid_first_visit_ad_shown")).toBe("true");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not render when user has already seen the popup", async () => {
    localStorage.setItem("fastvid_first_visit_ad_shown", "true");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          data: {
            ads: [
              {
                slotKey: "popup",
                providerName: "Mitra Sponsor",
                adType: "custom",
                adCode: null,
                customAd: {
                  imageUrl: "https://example.com/ad-popup.jpg",
                  targetUrl: "https://example.com/diskon",
                  altText: "Promo Selamat Datang"
                }
              }
            ]
          }
        })
      )
    );

    const { container } = renderWithProviders(<FirstVisitAdModal />);
    expect(container.firstChild).toBeNull();
  });
});
