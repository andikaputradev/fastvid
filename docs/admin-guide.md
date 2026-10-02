# Admin Guide

Admin authentication uses Supabase Auth. Admin users must already exist in Supabase Auth and must have:

```json
{
  "app_metadata": {
    "role": "admin"
  }
}
```

The API checks `app_metadata.role` returned by Supabase. It does not trust client-submitted role values.

## First Admin

Create the first Supabase Auth user from the Supabase dashboard. Then assign the admin role from the API environment:

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com pnpm --filter @vidsaveid/api admin:bootstrap
```

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_BOOTSTRAP_EMAIL`
- `IP_HASH_SECRET`
- `ADMIN_SESSION_SECRET`
- `API_KEY_ENCRYPTION_KEY`

The bootstrap command does not create users. It finds an existing Auth user by email and sets `app_metadata.role = "admin"`. Output is limited to user id, hashed email, and assigned role.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code, `VITE_*` variables, browser logs, or client bundles.

## Live Smoke

After the API has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, and the required API secrets, run:

```bash
ADMIN_SMOKE_EMAIL=admin@example.com ADMIN_SMOKE_PASSWORD=... pnpm --filter @vidsaveid/api admin:smoke
```

The smoke command uses Fastify injection against the local API app. It verifies login, HttpOnly session cookie, CSRF cookie, `/auth/me`, and logout. It does not print passwords, cookies, tokens, or plaintext email.

## Protected Admin API

Admin API routes live under `/api/v1/admin`. Every CRUD route requires a valid HttpOnly admin session cookie. Mutating routes also require the readable CSRF cookie value to be sent in the `X-CSRF-Token` header.

Authentication routes:

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/logout`
- `GET /api/v1/admin/auth/me`

Protected CRUD routes:

- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings/:key`
- `GET /api/v1/admin/platforms`
- `POST /api/v1/admin/platforms`
- `PUT /api/v1/admin/platforms/:id`
- `DELETE /api/v1/admin/platforms/:id`
- `GET /api/v1/admin/providers`
- `POST /api/v1/admin/providers`
- `PUT /api/v1/admin/providers/:id`
- `DELETE /api/v1/admin/providers/:id`
- `GET /api/v1/admin/ads`
- `PUT /api/v1/admin/ads/:slot`
- `GET /api/v1/admin/security/blocked-domains`
- `POST /api/v1/admin/security/blocked-domains`
- `DELETE /api/v1/admin/security/blocked-domains/:id`
- `GET /api/v1/admin/security/url-patterns`
- `POST /api/v1/admin/security/url-patterns`
- `DELETE /api/v1/admin/security/url-patterns/:id`
- `GET /api/v1/admin/security/rate-rules`
- `PUT /api/v1/admin/security/rate-rules/:id`
- `GET /api/v1/admin/logs/requests`
- `GET /api/v1/admin/logs/audit`

Admin mutations write audit events with hashed admin email and hashed IP only. Provider API keys are encrypted before storage and are never returned by admin API responses; provider responses expose only `has_api_key`.

Request logs expose stored hash fields only. They must not contain plaintext submitted URLs, IP addresses, or user-agent values.

## Admin Dashboard UI

The admin dashboard is served by `apps/web` under `/admin`. `/admin/login` is public; every other `/admin/*` page validates the current admin session through `GET /api/v1/admin/auth/me` before rendering.

Dashboard pages:

- `/admin`: overview and API status.
- `/admin/settings`: site metadata, maintenance, Turnstile, and public rate limit settings.
- `/admin/platforms`: platform list, create, update, and soft-disable.
- `/admin/providers`: provider configuration list, create, update, and soft-disable.
- `/admin/ads`: ad slot updates.
- `/admin/security`: blocked domains, blocked URL patterns, and rate-limit rules.
- `/admin/request-logs`: read-only request logs.
- `/admin/audit-logs`: read-only audit logs.
- `/admin/system-status`: basic health and public status.

Admin API calls from the dashboard use `credentials: "include"`. The HttpOnly session cookie is never read by frontend JavaScript. Admin mutations read only the readable CSRF cookie and send it as `X-CSRF-Token`.

Provider API keys are write-only in the dashboard. Existing provider rows show only whether a key is configured, and edit forms never prefill API key values.

Ad code is edited and displayed as text only in admin. It is not executed or rendered as HTML in the dashboard.

All admin pages set `robots` to `noindex,nofollow` and are not linked from public navigation.

## Local Dashboard QA

1. Start the API with valid local admin auth and database environment.
2. Start the web app with `VITE_API_BASE_URL` pointing at the local API.
3. Visit `/admin/login` and sign in with an admin Supabase Auth user.
4. Confirm `/admin/settings` loads and a setting mutation succeeds.
5. Confirm `/admin/providers` never displays plaintext or encrypted API key material.
6. Confirm `/admin/ads` shows ad code as text.
7. Confirm `/admin/request-logs` and `/admin/audit-logs` show hash/redacted fields only.
8. Confirm a direct visit to `/admin` while logged out redirects to `/admin/login`.
