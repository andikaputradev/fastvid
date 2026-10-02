import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { publicSeoRoutes } from "../src/lib/publicSeoRoutes";
import { canonicalUrl } from "../src/lib/seo";

const distDir = path.resolve("dist");
const forbiddenPublicHtmlTerms = ["bypass drm", "private video downloader", "cookie login", "token extraction"];

function htmlPath(routePath: string): string {
  if (routePath === "/") {
    return path.join(distDir, "index.html");
  }

  return path.join(distDir, routePath.slice(1), "index.html");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function readRequiredFile(filePath: string): string {
  assert(existsSync(filePath), `Missing file: ${filePath}`);
  return readFileSync(filePath, "utf8");
}

for (const route of publicSeoRoutes) {
  const html = readRequiredFile(htmlPath(route.path));
  const h1Count = html.match(/<h1(?:\s|>)/giu)?.length ?? 0;
  const hasFaqJsonLd = html.includes('"@type":"FAQPage"');
  const hasVisibleFaq = route.faq.length > 0;

  assert(html.includes(`<title>${route.title}</title>`), `${route.path} is missing route title`);
  assert(html.includes(`name="description" content="${route.description}"`), `${route.path} is missing meta description`);
  assert(html.includes(`rel="canonical" href="${canonicalUrl(route.path)}"`), `${route.path} is missing canonical URL`);
  assert(html.includes('name="robots" content="index,follow"'), `${route.path} is missing index robots meta`);
  assert(html.includes('property="og:title"'), `${route.path} is missing Open Graph tags`);
  assert(html.includes('name="twitter:card"'), `${route.path} is missing Twitter card tags`);
  assert(h1Count === 1, `${route.path} must have exactly one H1`);
  assert(html.includes(route.h1), `${route.path} is missing route-specific H1 text`);
  assert(!html.includes("FastVid Admin") && !html.includes("VidSaveID Admin"), `${route.path} contains admin content`);
  assert(!html.includes("noindex,nofollow"), `${route.path} contains admin robots content`);
  assert(hasFaqJsonLd === hasVisibleFaq, `${route.path} FAQ JSON-LD must match visible FAQ content`);

  for (const term of forbiddenPublicHtmlTerms) {
    assert(!html.toLowerCase().includes(term), `${route.path} contains forbidden public HTML term: ${term}`);
  }

  if (route.content) {
    assert(html.includes(route.content.disclaimer), `${route.path} is missing visible compliance disclaimer`);
  }

  if (route.path === "/") {
    assert(html.includes("Download Video Sosmed Tanpa Login"), "Home HTML is missing core landing phrase");
  }
}

const sitemap = readRequiredFile(path.join(distDir, "sitemap.xml"));
const robots = readRequiredFile(path.join(distDir, "robots.txt"));

for (const route of publicSeoRoutes) {
  assert(sitemap.includes(`<loc>${canonicalUrl(route.path)}</loc>`), `Sitemap is missing ${route.path}`);
}

assert(!sitemap.includes("/admin"), "Sitemap must not contain admin routes");
assert(!sitemap.includes("localhost"), "Sitemap must not contain localhost URLs");
assert(robots.includes("Disallow: /admin/"), "robots.txt must disallow /admin/");
assert(robots.includes(`Sitemap: ${canonicalUrl("/sitemap.xml")}`), "robots.txt must include canonical sitemap URL");

console.log(`SEO check passed for ${publicSeoRoutes.length} prerendered routes.`);
