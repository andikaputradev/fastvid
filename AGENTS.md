# AGENTS.md

Rules for all future Codex tasks in FastVid.

## Mission

Build FastVid by Wahyu Andika Putra as a production-ready, secure, maintainable, and clean web application.

Prioritize:
- Security
- Type safety
- Maintainability
- Performance
- Minimal complexity
- Clean code
- Small focused changes
- Token-efficient responses

## Core Rules

- Follow the existing FastVid architecture.
- Keep every task narrow and focused.
- Do not rewrite unrelated files.
- Do not introduce unnecessary libraries.
- Do not over-engineer simple features.
- Do not expose secrets to the frontend.
- Do not hardcode credentials, tokens, API keys, or private configuration.
- Do not store downloaded media files.
- Do not store plaintext IP addresses, User-Agent values, submitted URLs, or API keys.
- Do not implement DRM bypass, cookie login, token extraction, private-content access, or platform circumvention.
- Use only documented and compliant provider integrations.
- All code must compile before final response.

## TypeScript Rules

- Use strict TypeScript.
- Avoid `any`.
- Prefer explicit types for public functions.
- Use shared types from `@FastVid/shared` when possible.
- Validate external input with Zod.
- Keep frontend and backend contracts consistent.
- Do not duplicate shared schemas across apps.

## Security Rules

- All public URL processing must pass:
  - URL sanitizer
  - SSRF guard
  - domain allowlist
  - blocked domain check
  - blocked pattern check
  - rate limit check

- All admin mutations must require:
  - authenticated admin session
  - CSRF protection
  - request validation
  - audit logging

- API keys must be encrypted before storage.
- Sensitive values must never appear in logs.
- Production errors must not expose stack traces.
- CORS must use explicit allowlists.
- Cookies must use secure production settings.
- Security code must fail closed, not fail open.

## Frontend Rules

- Use React, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query, Zustand, React Hook Form, and Zod.
- Keep UI components small and reusable.
- Keep admin pages protected.
- Do not place secrets in `VITE_*` variables.
- Public pages must remain SEO-friendly.
- Admin pages must not be indexed.
- Ad code must be isolated in dedicated ad components.

## Backend Rules

- Use Fastify with TypeScript.
- Use centralized error handling.
- Use structured logging with redaction.
- Use request IDs.
- Use environment validation.
- Do not require real external services during build.
- Do not require real database connection during typecheck or build.
- Provider logic must use adapter pattern.
- Provider failures must return sanitized errors.

## Database Rules

- Use Supabase PostgreSQL with Drizzle ORM.
- Schema changes must be migration-ready.
- Keep sensitive data hashed or encrypted.
- Use indexes for admin logs, request logs, platform status, and rate limit queries.
- Seed data must be safe and non-secret.
- RLS-ready design is required.

## Code Quality Rules

- Write clean code without unnecessary comments.
- Comments are allowed only when explaining security-critical decisions.
- Prefer readable names over explanatory comments.
- Remove dead code.
- Remove unused imports.
- Keep functions small.
- Keep modules single-purpose.
- Do not leave broken TODOs.
- Do not leave failing tests.

## Testing Rules

Before final response, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build