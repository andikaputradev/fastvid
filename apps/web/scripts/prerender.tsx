import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToString } from "react-dom/server";
import { Route, Routes } from "react-router-dom";
import { StaticRouter } from "react-router-dom/server";
import { PublicLayout } from "../src/components/layout/PublicLayout";
import { publicSeoRoutes } from "../src/lib/publicSeoRoutes";
import { canonicalUrl, siteUrl } from "../src/lib/seo";
import { seoContentPages } from "../src/lib/seoContent";
import { AboutPage } from "../src/pages/public/AboutPage";
import { ContactPage } from "../src/pages/public/ContactPage";
import { DMCAPage } from "../src/pages/public/DMCAPage";
import { HomePage } from "../src/pages/public/HomePage";
import { PrivacyPolicyPage } from "../src/pages/public/PrivacyPolicyPage";
import { SeoLandingPage } from "../src/pages/public/SeoLandingPage";
import { SupportedPlatformsPage } from "../src/pages/public/SupportedPlatformsPage";
import { TermsOfServicePage } from "../src/pages/public/TermsOfServicePage";

const distDir = path.resolve("dist");
const templatePath = path.join(distDir, "index.html");
const template = readFileSync(templatePath, "utf8");
const defaultImageUrl = `${siteUrl()}/og-image.png`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function stripManagedHeadTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/iu, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/giu, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/giu, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/giu, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/giu, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/giu, "")
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/giu, "");
}

function renderHead(route: (typeof publicSeoRoutes)[number]): string {
  const canonical = canonicalUrl(route.path);
  const jsonLd = route.jsonLd?.();
  const jsonLdTag = jsonLd
    ? `\n    <script type="application/ld+json" data-fastvid-jsonld="true">${safeJson(jsonLd)}</script>`
    : "";

  return [
    `    <title>${escapeHtml(route.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(route.description)}" />`,
    '    <meta name="robots" content="index,follow" />',
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '    <meta property="og:type" content="website" />',
    `    <meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `    <meta property="og:image" content="${escapeHtml(defaultImageUrl)}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(defaultImageUrl)}" />${jsonLdTag}`
  ].join("\n");
}

function publicRoutes() {
  return (
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/platforms" element={<SupportedPlatformsPage />} />
      {seoContentPages.map((config) => (
        <Route key={config.path} path={config.path} element={<SeoLandingPage config={config} />} />
      ))}
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/dmca" element={<DMCAPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Route>
  );
}

function renderRouteBody(routePath: string): string {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: false,
        retry: false
      }
    }
  });

  return renderToString(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={routePath}>
          <Routes>{publicRoutes()}</Routes>
        </StaticRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

function outputPath(routePath: string): string {
  if (routePath === "/") {
    return templatePath;
  }

  return path.join(distDir, routePath.slice(1), "index.html");
}

function renderSitemap(): string {
  const urls = publicSeoRoutes
    .map((route) => `  <url>\n    <loc>${canonicalUrl(route.path)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function renderRobots(): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${canonicalUrl("/sitemap.xml")}\n`;
}

for (const route of publicSeoRoutes) {
  const routeHtml = stripManagedHeadTags(template)
    .replace("</head>", `${renderHead(route)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${renderRouteBody(route.path)}</div>`);
  const filePath = outputPath(route.path);

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, routeHtml, "utf8");
}

writeFileSync(path.join(distDir, "sitemap.xml"), renderSitemap(), "utf8");
writeFileSync(path.join(distDir, "robots.txt"), renderRobots(), "utf8");

console.log(`Prerendered ${publicSeoRoutes.length} public routes.`);
