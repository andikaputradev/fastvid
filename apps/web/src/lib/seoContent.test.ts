import { describe, expect, it } from "vitest";
import { publicSeoRoutes } from "./publicSeoRoutes";
import { allPublicSeoContentPages, supportingSeoPages } from "./seoContent";

const forbiddenTerms = ["bypass DRM", "private video downloader", "cookie login", "token extraction"];
const supportingPaths = [
  "/cara-download-video-sosmed",
  "/download-video-tanpa-login",
  "/video-downloader-online",
  "/simpan-video-publik",
  "/faq"
];

describe("SEO content architecture", () => {
  it("registers the supporting SEO routes", () => {
    expect(supportingSeoPages.map((page) => page.path)).toEqual(supportingPaths);
    expect(publicSeoRoutes.map((route) => route.path)).toEqual(expect.arrayContaining(supportingPaths));
  });

  it("keeps SEO titles and descriptions unique", () => {
    const titles = publicSeoRoutes.map((route) => route.title);
    const descriptions = publicSeoRoutes.map((route) => route.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("keeps related links inside public routes", () => {
    const publicPaths = new Set(publicSeoRoutes.map((route) => route.path));

    for (const page of allPublicSeoContentPages) {
      expect(page.relatedLinks.length).toBeGreaterThan(0);

      for (const link of page.relatedLinks) {
        expect(publicPaths.has(link.path)).toBe(true);
        expect(link.path.startsWith("/admin")).toBe(false);
      }
    }
  });

  it("keeps forbidden compliance terms out of public content", () => {
    const content = JSON.stringify(allPublicSeoContentPages).toLowerCase();

    for (const term of forbiddenTerms) {
      expect(content).not.toContain(term.toLowerCase());
    }
  });
});
