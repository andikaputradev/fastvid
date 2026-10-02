import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicSeoRoutes } from "./lib/publicSeoRoutes";
import { canonicalUrl } from "./lib/seo";

describe("public SEO assets", () => {
  it("robots.txt disallows admin routes", () => {
    const robots = readFileSync("public/robots.txt", "utf8");

    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Sitemap: https://fastvid.my.id/sitemap.xml");
  });

  it("sitemap.xml includes canonical public routes only", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");

    for (const route of publicSeoRoutes) {
      expect(sitemap).toContain(`<loc>${canonicalUrl(route.path)}</loc>`);
    }

    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("localhost");
  });

  it("configures Cloudflare Pages fallback and admin noindex header", () => {
    const redirects = readFileSync("public/_redirects", "utf8");
    const headers = readFileSync("public/_headers", "utf8");

    expect(redirects).toContain("/admin/* /index.html 200");
    expect(redirects).toContain("/* /index.html 200");
    expect(headers).toContain("/admin/*");
    expect(headers).toContain("X-Robots-Tag: noindex, nofollow");
  });
});
