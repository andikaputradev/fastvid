# VidSaveID Database Schema

VidSaveID uses Drizzle ORM with Supabase PostgreSQL 15. The schema is designed to be RLS-ready and to avoid storing sensitive request data in plaintext.

## Sensitive Data Policy

- API provider keys are stored only in `api_key_encrypted`.
- IP addresses are stored only as `ip_hash`.
- Submitted URLs are stored only as `url_hash`.
- User-Agent values are stored only as `user_agent_hash`.
- Admin email values are stored only as `admin_email_hash`.
- Request and audit logs must not include plaintext IP addresses, submitted URLs, User-Agent strings, API keys, cookies, private tokens, or downloaded media paths.

## Tables

### `site_settings`

Stores public and private site configuration as typed key/value records.

- `key` is unique and indexed.
- `value_type` is constrained to `string`, `boolean`, `number`, or `json`.
- `is_public` is indexed for fast public settings reads.
- `updated_by_admin` is nullable so safe seed and system updates do not need an admin user.

### `social_platforms`

Stores platform metadata and allowlist-oriented domain configuration.

- `slug` is unique and indexed.
- `base_domains` stores the platform domain allowlist as JSONB.
- `allowed_url_patterns` and `blocked_url_patterns` are optional JSONB arrays.
- `is_active` defaults to `false`.
- `status` is constrained to `active`, `inactive`, or `maintenance`.

### `api_providers`

Stores compliant provider adapter configuration per platform.

- `platform_slug` references `social_platforms.slug`.
- `api_key_encrypted` is nullable and must contain encrypted API key material only.
- `slug` plus `platform_slug` is unique.
- Provider selection queries are supported by an index on `platform_slug`, `is_active`, and `priority`.
- Daily usage reset queries are supported by an index on `daily_reset_at`.

### `ad_settings`

Stores isolated ad slot settings.

- `slot_key` is unique and constrained to `header`, `in_content`, `sidebar`, or `footer`.
- `ad_code` is nullable.
- All seed ad slots default to inactive.

### `request_logs`

Stores operational request telemetry without plaintext sensitive data.

- `url_hash`, `ip_hash`, and `user_agent_hash` are the only URL/IP/User-Agent fields.
- `status` is constrained to `success`, `failed`, `blocked`, `rate_limited`, or `maintenance`.
- Indexes support rate-limit lookups, platform analytics, status dashboards, and recent-log queries.

### `admin_audit_logs`

Stores audit events for admin mutations.

- `admin_user_id`, `admin_email_hash`, `action`, `resource_type`, `resource_id`, `old_value`, `new_value`, and `ip_hash` capture mutation context.
- No plaintext admin email or IP address is stored.
- Indexes support admin history, resource history, and action history queries.

### `blocked_domains`

Stores exact blocked domains used by the URL safety pipeline.

- `domain` is unique and indexed.
- `created_by` records the admin user UUID that created the block.

### `blocked_url_patterns`

Stores URL blocking patterns used after URL sanitization and domain checks.

- `pattern_type` is constrained to `regex`, `glob`, or `exact`.
- `is_active` is indexed for filtering active rules.

### `rate_limit_rules`

Stores configurable rate-limit rules.

- `scope` is constrained to `global`, `per_ip`, or `per_platform`.
- `platform_slug` is nullable for global and per-IP rules.
- Indexes support scope, platform, and active-rule lookups.

### `system_health_logs`

Stores health-check snapshots for internal services and dependencies.

- `status` is constrained to `healthy`, `degraded`, or `down`.
- Indexes support service timeline and status dashboard queries.
- `metadata` is nullable JSONB and must not include secrets.

## Seed Data

The seed scaffold creates:

- Site settings: `site_name`, `site_title`, `meta_description`, `tagline`, `logo_url`, `favicon_url`, `site_status`, `maintenance_mode`, `maintenance_message`, `turnstile_enabled`, and `rate_limit_public_per_minute`.
- Social platforms: `tiktok`, `instagram`, `facebook`, `twitter`, `pinterest`, `threads`, `snackvideo`, and `likee`.
- Ad slots: `header`, `in_content`, `sidebar`, and `footer`.
- Rate-limit rules: `global_public` and `per_ip_default`.

All seeded platforms and ad slots default to inactive. No provider credentials are seeded.

`db:seed` is idempotent and safe to re-run. It restores the production-safe default state: the site is active, maintenance mode is off, Turnstile is enabled, default public rate limiting is 10 requests per minute, all default platforms are inactive, and all ad slots are inactive with no ad code.

`db:seed:verify` checks that the required settings, eight default platforms, four ad slots, and two rate-limit rules exist. It also verifies that the default seed has no active platforms and no API provider key material in the seeded database.

`db:seed:dev` is local/development only. It runs the default seed first, then activates only `tiktok` and `instagram` with `is_active = true` and `status = active`. It does not seed provider API keys, provider integrations, downloaded media, cookies, tokens, or private-content access. Use it only when local API smoke tests need `/api/v1/download` to reach the expected `PROVIDER_NOT_IMPLEMENTED` response.

## Migration Commands

Run Drizzle commands from the database package with a real `DATABASE_URL` in the shell environment:

```bash
pnpm --filter @vidsaveid/db db:generate
pnpm --filter @vidsaveid/db db:migrate
pnpm --filter @vidsaveid/db db:seed
pnpm --filter @vidsaveid/db db:seed:verify
pnpm --filter @vidsaveid/db db:seed:dev
```

From the repository root, the same seed commands are available as:

```bash
pnpm db:seed
pnpm db:seed:verify
pnpm db:seed:dev
```

`DATABASE_URL` is required for all seed commands. Do not commit real `DATABASE_URL` values or generated secrets.
