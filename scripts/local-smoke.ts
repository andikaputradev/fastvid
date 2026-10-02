import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const localSiteUrl = normalizeOrigin(process.env.LOCAL_SITE_URL ?? "http://localhost:4173");
const localApiUrl = normalizeOrigin(process.env.LOCAL_API_URL ?? "http://localhost:4000");
const optional = process.argv.includes("--optional");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDistDir = path.join(rootDir, "apps", "web", "dist");
const publicHtmlRoutes = [
  "/",
  "/platforms",
  "/download-video-sosmed",
  "/download-video-tanpa-login",
  "/video-downloader-online",
  "/faq"
];
const forbiddenPublicHtmlTerms = [
  "bypass drm",
  "private video downloader",
  "cookie login",
  "token extraction"
];
const forbiddenDistTerms = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "ADMIN_SESSION_SECRET",
  "API_KEY_ENCRYPTION_KEY",
  "IP_HASH_SECRET",
  "xnd_",
  "service_role",
  "PRIVATE_",
  "SECRET_KEY"
];

interface SmokeResult {
  detail?: string;
  name: string;
}

class SmokeFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmokeFailure";
  }
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/u, "");
}

function urlFor(origin: string, routePath: string): string {
  return `${origin}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new SmokeFailure(message);
  }
}

async function fetchText(origin: string, routePath: string): Promise<{ headers: Headers; status: number; text: string }> {
  const response = await fetch(urlFor(origin, routePath), {
    headers: {
      accept: "text/html,application/json,text/plain,*/*"
    },
    redirect: "manual"
  });

  return {
    headers: response.headers,
    status: response.status,
    text: await response.text()
  };
}

async function fetchJson(origin: string, routePath: string): Promise<unknown> {
  const response = await fetch(urlFor(origin, routePath), {
    headers: {
      accept: "application/json"
    }
  });
  const text = await response.text();

  assert(response.ok, `${routePath} returned HTTP ${response.status}${apiErrorDetail(text)}`);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SmokeFailure(`${routePath} did not return valid JSON`);
  }
}

function apiErrorDetail(text: string): string {
  try {
    const payload = JSON.parse(text) as unknown;

    if (typeof payload !== "object" || payload === null) {
      return "";
    }

    const record = payload as Record<string, unknown>;
    const error = record.error;
    const requestId = typeof record.requestId === "string" ? record.requestId : undefined;
    const code =
      typeof error === "object" &&
      error !== null &&
      typeof (error as Record<string, unknown>).code === "string"
        ? (error as Record<string, string>).code
        : undefined;

    if (code === undefined && requestId === undefined) {
      return "";
    }

    return ` (${[code, requestId === undefined ? undefined : `requestId: ${requestId}`]
      .filter((part): part is string => part !== undefined)
      .join(", ")})`;
  } catch {
    return "";
  }
}

function hasNonEmptyMatch(html: string, pattern: RegExp): boolean {
  const match = html.match(pattern);

  return typeof match?.[1] === "string" && match[1].trim().length > 0;
}

function checkPublicHtml(routePath: string, html: string): void {
  const lowerHtml = html.toLowerCase();

  assert(hasNonEmptyMatch(html, /<title>([^<]+)<\/title>/iu), `${routePath} missing title`);
  assert(/<meta\s+name=["']description["'][^>]+content=["'][^"']+["'][^>]*>/iu.test(html), `${routePath} missing meta description`);
  assert(/<link\s+rel=["']canonical["'][^>]+href=["'][^"']+["'][^>]*>/iu.test(html), `${routePath} missing canonical`);
  assert(/<h1(?:\s|>)[\s\S]*?<\/h1>/iu.test(html), `${routePath} missing H1`);
  assert(!html.includes("VidSaveID Admin"), `${routePath} contains admin content`);
  assert(!lowerHtml.includes("noindex"), `${routePath} contains noindex`);

  for (const term of forbiddenPublicHtmlTerms) {
    assert(!lowerHtml.includes(term), `${routePath} contains forbidden compliance term: ${term}`);
  }
}

function listDistFiles(dir = webDistDir): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...listDistFiles(entryPath));
    } else if (stats.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function checkDistSecretLeaks(): void {
  assert(existsSync(webDistDir), "apps/web/dist does not exist. Run the web build first.");

  for (const filePath of listDistFiles()) {
    const relativePath = path.relative(webDistDir, filePath);
    const content = readFileSync(filePath, "utf8");
    const lowerContent = content.toLowerCase();

    for (const term of forbiddenDistTerms) {
      assert(
        !lowerContent.includes(term.toLowerCase()),
        `Frontend dist file contains forbidden secret-like marker "${term}" in ${relativePath}`
      );
    }
  }
}

function checkFrontendApiBase(): void {
  const jsFiles = listDistFiles().filter((filePath) => filePath.endsWith(".js"));
  const combinedJs = jsFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n");

  assert(combinedJs.includes(localApiUrl), `Frontend bundle does not reference LOCAL_API_URL (${localApiUrl})`);
}

function checkRobotsAndSitemap(robots: string, sitemap: string): void {
  assert(robots.includes("Disallow: /admin/"), "robots.txt must disallow /admin/");
  assert(!sitemap.includes("/admin"), "sitemap.xml must not contain admin routes");

  for (const routePath of publicHtmlRoutes) {
    assert(sitemap.includes(routePath === "/" ? "<loc>" : routePath), `sitemap.xml missing ${routePath}`);
  }
}

function headersConfigHasAdminNoindex(): boolean {
  const headersPath = path.join(webDistDir, "_headers");

  if (!existsSync(headersPath)) {
    return false;
  }

  const headers = readFileSync(headersPath, "utf8").toLowerCase();

  return headers.includes("/admin/*") && headers.includes("x-robots-tag: noindex, nofollow");
}

function checkAdminNoindex(routePath: string, response: { headers: Headers; text: string }): void {
  const headerValue = response.headers.get("x-robots-tag")?.toLowerCase() ?? "";
  const html = response.text.toLowerCase();
  const hasHeaderNoindex = headerValue.includes("noindex");
  const hasMetaNoindex = /<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/iu.test(html);

  assert(
    hasHeaderNoindex || hasMetaNoindex || headersConfigHasAdminNoindex(),
    `${routePath} must be noindexed by response header, HTML meta, or Cloudflare _headers config`
  );
}

async function runSmoke(): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];

  const health = await fetchJson(localApiUrl, "/health");
  assert(typeof health === "object" && health !== null && (health as { status?: unknown }).status === "ok", "/health returned unexpected payload");
  results.push({ name: "API /health" });

  await fetchJson(localApiUrl, "/api/v1/status");
  results.push({ name: "API /api/v1/status" });

  const platforms = await fetchJson(localApiUrl, "/api/v1/platforms");
  assert(
    typeof platforms === "object" && platforms !== null && "success" in platforms,
    "/api/v1/platforms returned unexpected payload"
  );
  results.push({ name: "API /api/v1/platforms" });

  for (const routePath of publicHtmlRoutes) {
    const response = await fetchText(localSiteUrl, routePath);

    assert(response.status >= 200 && response.status < 400, `${routePath} returned HTTP ${response.status}`);
    checkPublicHtml(routePath, response.text);
    results.push({ name: `Frontend ${routePath}` });
  }

  const robots = await fetchText(localSiteUrl, "/robots.txt");
  const sitemap = await fetchText(localSiteUrl, "/sitemap.xml");

  assert(robots.status >= 200 && robots.status < 400, `/robots.txt returned HTTP ${robots.status}`);
  assert(sitemap.status >= 200 && sitemap.status < 400, `/sitemap.xml returned HTTP ${sitemap.status}`);
  checkRobotsAndSitemap(robots.text, sitemap.text);
  results.push({ name: "Frontend robots.txt and sitemap.xml" });

  for (const routePath of ["/admin", "/admin/login"]) {
    const response = await fetchText(localSiteUrl, routePath);

    assert(response.status >= 200 && response.status < 500, `${routePath} returned HTTP ${response.status}`);
    checkAdminNoindex(routePath, response);
    results.push({ name: `Admin noindex ${routePath}` });
  }

  checkDistSecretLeaks();
  results.push({ name: "Frontend dist secret-like marker scan" });

  checkFrontendApiBase();
  results.push({ name: "Frontend bundle API base URL" });

  return results;
}

function isLikelyServerUnavailable(error: unknown): boolean {
  return error instanceof TypeError && error.message.toLowerCase().includes("fetch failed");
}

try {
  const results = await runSmoke();

  for (const result of results) {
    console.log(`ok - ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
  }

  console.log(`Local production smoke passed for ${localSiteUrl} and ${localApiUrl}.`);
} catch (error) {
  if (optional && isLikelyServerUnavailable(error)) {
    console.log("skip - local production smoke: local API or web server is not running.");
    console.log("Run API: corepack pnpm --filter @vidsaveid/api build; set production-like API env; corepack pnpm --filter @vidsaveid/api start");
    console.log("Run web: set VITE_API_BASE_URL=http://localhost:4000 and VITE_SITE_URL=http://localhost:4173; corepack pnpm --filter @vidsaveid/web build; corepack pnpm --filter @vidsaveid/web preview");
  } else {
    const message = error instanceof Error ? error.message : "Unknown local smoke failure";

    console.error(`Local production smoke failed: ${message}`);
    process.exitCode = 1;
  }
}
