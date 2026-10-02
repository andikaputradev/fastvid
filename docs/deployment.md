# Deployment

FastVid production deployment targets:

- Frontend: Vercel (or Cloudflare Pages) serving `apps/web/dist` with custom domain `fastvid.my.id`.
- Backend API: Fastify Web Service (Render / Railway / VPS / Cloud Run) running `apps/api`.
- Database: Supabase PostgreSQL.

Never put backend secrets in `VITE_*` variables or public hosting environment variables.

Before deploying or pointing DNS, run the local production simulation in `docs/local-production-check.md`.

## Vercel Deployment (Frontend: fastvid.my.id)

FastVid is configured out-of-the-box for Vercel deployment via `vercel.json`.

### Option A: Monorepo Root Deployment (Recommended)
1. Import the Git repository in Vercel.
2. Root Directory: `./` (leave empty/root).
3. Framework Preset: `Vite`.
4. Build Command: `pnpm --filter @vidsaveid/web build` (automatically picked from `vercel.json`).
5. Output Directory: `apps/web/dist`.
6. Environment Variables:
   - `VITE_SITE_URL`: `https://fastvid.my.id`
   - `VITE_API_BASE_URL`: `https://api.fastvid.my.id` (or your backend API URL)
7. Custom Domain:
   - In Vercel Project Settings -> Domains, add `fastvid.my.id` and `www.fastvid.my.id`.
   - Set up the DNS A/CNAME record pointed to Vercel's IP (`76.76.21.21`) or `cname.vercel-dns.com`.

### Option B: Apps/Web Root Directory
1. Root Directory: `apps/web`.
2. Build Command: `pnpm build`.
3. Output Directory: `dist`.

Security and SEO automatically handled by `vercel.json`:
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000`.
- Asset caching: 1-year immutable caching on `/assets/*`.
- Admin bot protection: `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin/*`.
- SPA rewrites: Serves prerendered static SEO pages directly, falling back to `/index.html` for client and admin routes.

## Cloudflare Pages (Alternative)

Use the repository root as the Cloudflare project root so pnpm workspace dependencies resolve correctly.

- Framework preset: None.
- App: `apps/web`.
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @vidsaveid/web build`
- Build output directory: `apps/web/dist`
- Node.js version: `20`

Required frontend environment variables:

- `VITE_API_BASE_URL`: public API origin, for example `https://your-api-domain.example`.
- `VITE_SITE_URL`: canonical frontend origin, for example `https://your-frontend-domain.example`.

Do not configure Supabase service role keys, database URLs, session secrets, encryption keys, provider keys, or API keys in Cloudflare Pages.

Routing and SEO:

- `apps/web/public/_redirects` provides SPA fallback for client routes, including `/admin/*`.
- Static prerendered files remain in `apps/web/dist` after build.
- `apps/web/public/_headers` adds `X-Robots-Tag: noindex, nofollow` for `/admin/*`.
- `robots.txt` disallows `/admin/`.
- `sitemap.xml` contains public canonical routes only.

## Render API

`render.yaml` defines the API web service. Manual setup can use the same values:

- Runtime: Node.js 20.
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @vidsaveid/api build`
- Start command: `pnpm --filter @vidsaveid/api start`
- Health check path: `/health`

Render provides `PORT`; the API maps `PORT` to `API_PORT` when `API_PORT` is not set. Keep `API_HOST=0.0.0.0`.

Required backend environment variables:

- `NODE_ENV=production`
- `API_HOST=0.0.0.0`
- `WEB_ORIGIN=https://your-frontend-domain.example`
- `PUBLIC_API_BASE_URL=https://your-api-domain.example`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IP_HASH_SECRET`
- `API_KEY_ENCRYPTION_KEY`
- `ADMIN_SESSION_SECRET`

Secret expectations:

- `IP_HASH_SECRET`: at least 32 random characters.
- `ADMIN_SESSION_SECRET`: at least 32 random characters.
- `API_KEY_ENCRYPTION_KEY`: base64 string that decodes to exactly 32 bytes.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and all security secrets must exist only on backend/server environments.

Backend security behavior:

- CORS allows only `WEB_ORIGIN`.
- Admin session cookies are `Secure` in production.
- Admin mutations still require authenticated admin session, CSRF, validation, and audit logging.
- If Supabase Auth env vars are missing, admin auth fails closed.

## Supabase

Use Supabase PostgreSQL for `DATABASE_URL`.

Before the first production deploy, run migrations as a controlled release step:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:seed:verify
```

Do not run `pnpm db:seed:dev` in production.

Admin bootstrap:

1. Create the first admin user in Supabase Auth.
2. Assign `app_metadata.role = "admin"` from the Supabase dashboard or with the server-side bootstrap command.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` on the API/server only.

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com pnpm admin:bootstrap
```

## First Deploy Checklist

- Set Cloudflare Pages public env: `VITE_API_BASE_URL`, `VITE_SITE_URL`.
- Set Render backend env with placeholders replaced by real private values in Render only.
- Confirm Render `/health` returns `{ "status": "ok" }`.
- Run `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:seed:verify`.
- Deploy API first, then frontend.
- Confirm frontend `sitemap.xml` has no `/admin` entries.
- Confirm frontend `robots.txt` disallows `/admin/`.
- Confirm `/admin/*` responses include `X-Robots-Tag: noindex, nofollow`.

## Post-Deploy Smoke

Replace domains with production values:

```bash
curl -fsS https://your-api-domain.example/health
curl -fsS https://your-api-domain.example/api/v1/status
curl -fsS https://your-frontend-domain.example/sitemap.xml
curl -fsS https://your-frontend-domain.example/robots.txt
curl -fsSI https://your-frontend-domain.example/admin/
```

Expected:

- API health returns `status: ok`.
- CORS works only for the production frontend origin.
- Public pages serve prerendered HTML with title, meta description, canonical URL, H1, and FAQ JSON-LD where configured.
- Admin pages remain noindexed.
- No real secrets are visible in frontend source or built assets.

## Search Console

After production DNS is live:

- Verify the frontend domain property.
- Submit `https://your-frontend-domain.example/sitemap.xml`.
- Inspect `/`, `/download-video-sosmed`, and the supporting SEO pages.
- Monitor indexing, Core Web Vitals, and crawl errors.
- Ranking is not guaranteed; keep content compliant and avoid unsupported provider claims.

## Local Admin Smoke

After admin bootstrap, run the local admin auth smoke workflow with live admin credentials:

```bash
ADMIN_SMOKE_EMAIL=admin@example.com ADMIN_SMOKE_PASSWORD=... pnpm admin:smoke
```

The smoke workflow verifies login, HttpOnly session cookie, CSRF cookie, `/auth/me`, and logout. It must not print passwords, cookies, tokens, or plaintext email.
