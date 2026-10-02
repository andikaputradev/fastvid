import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { supportingSeoPages } from "../../lib/seoContent";
import { renderWithRouter } from "../../test/render";
import { SeoLandingPage } from "./SeoLandingPage";

describe("SeoLandingPage", () => {
  it.each(supportingSeoPages)("renders the supporting SEO route H1 for $path", (config) => {
    renderWithRouter(<SeoLandingPage config={config} />, [config.path]);

    expect(screen.getByRole("heading", { level: 1, name: config.h1 })).toBeInTheDocument();
  });

  it("renders internal links and FAQ JSON-LD from visible FAQ content", async () => {
    const config = supportingSeoPages.find((page) => page.path === "/video-downloader-online");

    if (!config) {
      throw new Error("Missing /video-downloader-online SEO content.");
    }

    renderWithRouter(<SeoLandingPage config={config} />, [config.path]);

    expect(screen.getByRole("link", { name: "Download Video Sosmed" })).toHaveAttribute(
      "href",
      "/download-video-sosmed"
    );

    await waitFor(() => {
      const jsonLd = document.querySelector<HTMLScriptElement>("script[type='application/ld+json']");
      expect(jsonLd).toBeInTheDocument();
      expect(jsonLd?.textContent).toContain(config.faq[0]?.question);
      expect(jsonLd?.textContent).toContain(config.faq[0]?.answer);
    });
  });
});
