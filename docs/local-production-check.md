# Local Production Check

Use this workflow before buying a domain or deploying VidSaveID. It runs the compiled API and built frontend locally, then checks production-like routing, SEO output, admin noindex behavior, and frontend secret leakage.

Local URLs:

- Web: `http://localhost:4173`
- API: `http://localhost:4000`

## Required Local Env

Frontend public env for `apps/web`:

- `VITE_API_BASE_URL=http://localhost:4000`
- `VITE_SITE_URL=http://localhost:4173`

Backend env for `apps/api`:

- `NODE_ENV=production`
- `API_HOST=0.0.0.0`
- `API_PORT=4000`
- `WEB_ORIGIN=http://localhost:4173`
- `PUBLIC_API_BASE_URL=http://localhost:4000`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IP_HASH_SECRET`
- `API_KEY_ENCRYPTION_KEY`
- `ADMIN_SESSION_SECRET`

Public API smoke checks need the API and database-backed public endpoints to work. Supabase Auth values are required when testing admin login/bootstrap locally, but the local smoke script does not submit admin credentials.

Safe secret generation:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use the first two outputs for `IP_HASH_SECRET` and `ADMIN_SESSION_SECRET`. Use the base64 output for `API_KEY_ENCRYPTION_KEY`; it must decode to exactly 32 bytes.

Do not commit real `.env` values.

## Build Once

From the repository root:

```bash
corepack pnpm build
```

The web build prerenders public pages and runs `seo:check`.

## Start API From Compiled JS

PowerShell example:

```powershell
$env:NODE_ENV = "production"
$env:API_HOST = "0.0.0.0"
$env:API_PORT = "4000"
$env:WEB_ORIGIN = "http://localhost:4173"
$env:PUBLIC_API_BASE_URL = "http://localhost:4000"
$env:DATABASE_URL = "postgres://..."
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "replace-with-anon-key"
$env:SUPABASE_SERVICE_ROLE_KEY = "replace-with-service-role-key"
$env:IP_HASH_SECRET = "replace-with-random-hex-at-least-32-chars"
$env:API_KEY_ENCRYPTION_KEY = "replace-with-32-byte-base64-key"
$env:ADMIN_SESSION_SECRET = "replace-with-random-hex-at-least-32-chars"
corepack pnpm --filter @vidsaveid/api start
```

The API should serve:

- `http://localhost:4000/health`
- `http://localhost:4000/api/v1/status`
- `http://localhost:4000/api/v1/platforms`

## Serve Web Dist Locally

Open a second terminal:

```powershell
$env:VITE_API_BASE_URL = "http://localhost:4000"
$env:VITE_SITE_URL = "http://localhost:4173"
corepack pnpm --filter @vidsaveid/web build
corepack pnpm --filter @vidsaveid/web preview
```

The preview server should serve `http://localhost:4173`.

## Run Local Smoke

Open a third terminal:

```bash
corepack pnpm smoke:local
```

Optional custom origins:

```bash
LOCAL_SITE_URL=http://localhost:4173 LOCAL_API_URL=http://localhost:4000 corepack pnpm smoke:local
```

The smoke script checks:

- API `/health`, `/api/v1/status`, and `/api/v1/platforms`.
- Web `/`, `/platforms`, `/download-video-sosmed`, `/download-video-tanpa-login`, `/video-downloader-online`, `/faq`.
- `robots.txt` disallows `/admin/`.
- `sitemap.xml` excludes `/admin`.
- Public pages have title, meta description, canonical, H1, no admin content, no `noindex`, and no forbidden compliance phrases.
- `/admin` and `/admin/login` are noindexed by response header, HTML meta, or Cloudflare `_headers` config.
- Built frontend files do not contain secret-like markers such as `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`, `API_KEY_ENCRYPTION_KEY`, `IP_HASH_SECRET`, `service_role`, or `SECRET_KEY`.

The script prints pass/fail summaries only. It does not print cookies, tokens, API keys, submitted URLs, or full HTML bodies.

## Troubleshooting Local Errors

If `/health` returns 200 but `/api/v1/status` returns 500, the API process is running but cannot read database-backed public settings. Check the API terminal for the matching `requestId` and `unexpected_request_error` log, then verify:

- `DATABASE_URL` points to the intended local/Supabase PostgreSQL database.
- `corepack pnpm db:migrate` has been run for that database.
- `corepack pnpm db:seed` has been run once for safe production seed data.
- `corepack pnpm db:seed:verify` passes.
- The API terminal was restarted after changing environment variables.

If the admin login page shows `Unable to reach the admin API.`, check:

- API is running at `http://localhost:4000`.
- Web dist was rebuilt with `VITE_API_BASE_URL=http://localhost:4000`.
- API was started with `WEB_ORIGIN=http://localhost:4173`.
- Browser DevTools Network shows the login request going to `http://localhost:4000/api/v1/admin/auth/login`.

## Full Local Production Gate

If the API and web preview servers are already running:

```bash
corepack pnpm check:local-production
```

This runs:

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- local smoke in optional mode

If local servers are not running, the smoke step is skipped with manual commands.

## Verify Admin Login Locally

After creating a Supabase Auth user and assigning `app_metadata.role = "admin"`:

```bash
ADMIN_SMOKE_EMAIL=admin@example.com ADMIN_SMOKE_PASSWORD=... corepack pnpm admin:smoke
```

The admin smoke workflow verifies login, HttpOnly session cookie, CSRF cookie, `/auth/me`, and logout. It must not print passwords, cookies, tokens, or plaintext email.

## Manual Admin CRUD QA

After the API and web preview are running, open `http://localhost:4173/admin/login` and sign in with the local admin account.

- Open `/admin` and confirm dashboard counters, maintenance state, and status cards render without console errors.
- Open `/admin/settings`, update a safe text setting, toggle maintenance mode off again if changed, save, and confirm the setting reloads.
- Open `/admin/platforms`, create a safe test platform such as `local-test-platform` with `example.com`, edit it, then disable it.
- Open `/admin/providers`, create a safe test provider for the test platform with a fake non-secret key, confirm the key is never displayed, edit it, then disable it.
- Open `/admin/ads`, update a slot with harmless placeholder text, confirm the ad code is displayed as text, then disable the slot if needed.
- Open `/admin/security`, create and delete a blocked domain, create and delete a blocked URL pattern, and update a rate-limit rule.
- Open `/admin/request-logs` and confirm only hash fields are visible for URL, IP, and User-Agent identifiers.
- Open `/admin/audit-logs` and confirm old/new values do not show plaintext API keys, emails, IPs, submitted URLs, or encrypted provider key material.
- Open `/admin/system-status` and confirm API health/status are visible without secret values.
- Log out and confirm `/admin` redirects back through the login flow.

## Checklist Before Buying Domain Or Deploying

- `corepack pnpm typecheck` passes.
- `corepack pnpm build` passes.
- `corepack pnpm lint` passes.
- `corepack pnpm test` passes.
- API starts from compiled JS with `NODE_ENV=production`.
- Web serves from `apps/web/dist`.
- `corepack pnpm smoke:local` passes.
- Admin pages remain noindexed.
- `sitemap.xml` excludes `/admin`.
- `robots.txt` disallows `/admin/`.
- Built frontend output has no private env or secret-like markers.
- No real secrets are committed.
